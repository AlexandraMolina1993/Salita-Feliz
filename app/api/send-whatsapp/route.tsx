import { NextResponse } from 'next/server';
import twilio from 'twilio'; 

// Importa el cliente de Supabase y la función de log
import { supabase, logNotification } from '@/lib/database'; 

// Inicialización del cliente de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN deben estar definidos en .env.local');
}
const client = twilio(accountSid, authToken);

// -------------------------------------------------------------
// 1. FUNCIÓN PARA OBTENER TELÉFONOS DE MÚLTIPLES PACIENTES
// -------------------------------------------------------------
async function getPatientsContactInfo(patientIds: string[]): Promise<Array<{ id: string, phone_number: string | null, full_name: string | null }>> {
    
    // Consulta la tabla 'patients' buscando múltiples IDs
    const { data, error } = await supabase
        .from('patients')    
        // 🚨 REVISA: Incluye el nombre y el teléfono para el log
        .select('id, phone_number, full_name') 
        .in('id', patientIds);

    if (error) {
        console.error("Error al buscar contactos en Supabase:", error);
        return [];
    }
    
    // Filtra y mapea los datos para asegurar que los IDs están presentes
    return data || []; 
}


// -------------------------------------------------------------
// 2. EL HANDLER PRINCIPAL DE LA API (Función POST) - Envío Múltiple
// -------------------------------------------------------------
export async function POST(req: Request) {
    
    const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;
    const templateSid = process.env.TWILIO_TEMPLATE_SID;

    if (!twilioFrom || !templateSid) {
        return NextResponse.json(
            { error: 'Faltan credenciales de Twilio (TWILIO_WHATSAPP_NUMBER o TWILIO_TEMPLATE_SID).' }, 
            { status: 500 }
        );
    }
    
    const body = await req.json();
    // 🚨 CAMBIO CLAVE: Esperamos un arreglo de IDs
    const { patientIds, subject, scheduledDate, scheduledTime, message } = body; 
    
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
        return NextResponse.json({ error: 'Se requiere una lista de patientIds.' }, { status: 400 });
    }

    const patients = await getPatientsContactInfo(patientIds);
    let successfulSends = 0;
    let failedSends: { id: string, error: string }[] = [];

    // 3. Iterar y enviar a cada paciente
    const sendPromises = patients.map(async (patient) => {
        const { id: patientId, phone_number: patientPhoneNumber, full_name } = patient;
        
        // --- 3.1. Validar contacto ---
        if (!patientPhoneNumber) {
            failedSends.push({ id: patientId, error: `Número de teléfono no encontrado o nulo.` });
            return;
        }

        // 🚨 CRÍTICO: El número 'To' debe incluir el prefijo 'whatsapp:'
        const toWhatsAppNumber = `whatsapp:${patientPhoneNumber}`;
        const fromWhatsAppNumber = twilioFrom; 
        
        let status = 'SENT';
        let logMessage = `Turno: ${scheduledDate} a las ${scheduledTime}. Mensaje: ${message}.`;

        try {
            // --- 3.2. Enviar mensaje ---
            const twilioResponse = await client.messages.create({
                from: fromWhatsAppNumber,
                to: toWhatsAppNumber,
                contentSid: templateSid,
                contentVariables: JSON.stringify({
                    '1': scheduledDate, 
                    '2': scheduledTime, 
                }),
            });
            successfulSends++;
            logMessage += ` Twilio SID: ${twilioResponse.sid}`;

        } catch (error) {
            // --- 3.3. Manejar fallos de Twilio ---
            status = 'FAILED';
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido de Twilio.';
            failedSends.push({ id: patientId, error: errorMessage });
            logMessage = `Fallo al intentar enviar a ${patientPhoneNumber}. Error: ${errorMessage}`;
        }
        
        // --- 3.4. Registrar en la BD (LogNotification) ---
        try {
            await logNotification({
                patient_id: patientId,
                type: 'WHATSAPP',
                title: `Recordatorio [${status}]: ${subject}`, 
                message: logMessage, 
                sent_at: new Date().toISOString(), 
                status: status as 'SENT' | 'FAILED',
            });
        } catch (logError) {
            console.error(`ERROR al guardar el log para ${patientId}:`, logError);
        }
    });

    // Esperar a que se completen todos los envíos y registros
    await Promise.all(sendPromises);

    // 4. Devolver un resumen del resultado
    return NextResponse.json(
        { 
            message: `Proceso completado. ${successfulSends} envíos exitosos. ${failedSends.length} fallidos.`,
            successful: successfulSends,
            failed: failedSends
        }, 
        { status: 200 }
    );
}