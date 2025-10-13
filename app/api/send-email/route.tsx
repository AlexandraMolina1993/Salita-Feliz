import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// 🚨 IMPORTACIÓN CRÍTICA: Importa el cliente de Supabase Y la función de log
import { supabase, logNotification } from '@/lib/database'; 

// Configura la clave API de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!); 

// -------------------------------------------------------------
// 1. FUNCIÓN AUXILIAR PARA OBTENER EL EMAIL REAL DEL PACIENTE
// (Se deja como estaba, ya que esta es correcta)
// -------------------------------------------------------------
async function getPatientEmail(patientId: string): Promise<string | null> {
    
    // Consulta la tabla 'patients' en Supabase
    const { data, error } = await supabase
        .from('patients')    
        .select('email')     
        .eq('id', patientId) 
        .single();           

    if (error) {
        console.error("Error al buscar email del paciente en Supabase:", error);
        return null;
    }

    return data?.email || null; 
}


// -------------------------------------------------------------
// 2. EL HANDLER PRINCIPAL DE LA API (Función POST) - CON LOG
// -------------------------------------------------------------
export async function POST(req: Request) {
    
    // Declaramos 'patientEmail' fuera del try para que esté disponible en el catch si falla la base de datos
    let patientEmail: string | null = null; 
    const { patientId, subject, message, scheduledDate, scheduledTime } = await req.json();

    try {
        // 1. Obtener el email real del paciente y el remitente verificado
        patientEmail = await getPatientEmail(patientId); 
        const emailFrom = process.env.EMAIL_FROM;

        if (!patientEmail || !emailFrom) {
            console.warn("Fallo la validación de email:", { patientEmail, emailFrom });
            return NextResponse.json(
                { error: 'El email del paciente no se encontró o falta el email del remitente (EMAIL_FROM).' }, 
                { status: 400 }
            );
        }

        // 2. Construir el cuerpo del correo (HTML)
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #1e88e5;">Recordatorio de Turno en Salita Feliz</h2>
                <p>Estimado/a paciente, este es un **RECORDATORIO** de su próximo turno de vacunación:</p>
                <ul style="list-style-type: none; padding: 0;">
                    <li style="margin-bottom: 8px;"><strong>Fecha:</strong> ${scheduledDate}</li>
                    <li style="margin-bottom: 8px;"><strong>Hora:</strong> ${scheduledTime}</li>
                </ul>
                ${message ? `<p style="margin-top: 15px; padding: 10px; background-color: #f0f8ff; border-left: 3px solid #1e88e5;"><strong>Mensaje Adicional:</strong> ${message}</p>` : ''}
                <p style="margin-top: 20px;">Por favor, llegue a tiempo. ¡Te esperamos!</p>
                <p style="font-size: 12px; color: #757575; margin-top: 30px;">*Este es un correo automático, por favor, no lo responda.</p>
            </div>
        `;

        // 3. Preparar el objeto de envío de SendGrid
        const msg = {
            to: patientEmail,
            from: emailFrom,
            subject: `Recordatorio de Turno: ${subject}`,
            html: htmlContent,
        };

        // 4. Enviar el correo
        const [response] = await sgMail.send(msg);
        
        // 5. Verificar éxito y registrar el log en la BD
        if (response.statusCode === 202) {
            
            // 🚨 LOG DE NOTIFICACIÓN: Se llama a la función de la base de datos
            try {
                await logNotification({
                    patient_id: patientId,
                    type: 'EMAIL',
                    title: `Recordatorio de Turno: ${subject}`, // Mapeado a 'title'
                    message: `Turno: ${scheduledDate} a las ${scheduledTime}. Mensaje: ${message}`, // Mapeado a 'message'
                    sent_at: new Date().toISOString(), // Mapeado a 'sent_at'
                    status: 'SENT',
                });
            } catch (logError) {
                // Si falla el registro, el correo ya se envió. Solo avisamos en consola.
                console.error("ERROR al guardar el log de notificación en la BD:", logError);
            }
            
            return NextResponse.json({ message: 'Email enviado y registrado con éxito!' }, { status: 200 });
        } else {
            // Si SendGrid devuelve un estado diferente a 202, lanzamos error
            throw new Error(`Error de envío de SendGrid (Status: ${response.statusCode})`);
        }

    } catch (error) {
        // 6. Manejo de errores
        console.error('Error al enviar email o registrar:', error);
        
        // Si el error ocurrió después de obtener el email, registramos el fallo
        if (patientEmail && error instanceof Error && error.message.includes('SendGrid')) {
             try {
                await logNotification({
                    patient_id: patientId,
                    type: 'EMAIL',
                    title: `FALLO DE ENVÍO: ${subject}`,
                    message: `Fallo al intentar enviar a ${patientEmail}. Detalles: ${error.message}`,
                    sent_at: new Date().toISOString(),
                    status: 'FAILED',
                });
            } catch (logError) {
                console.error("ERROR al registrar el FALLO en la BD:", logError);
            }
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido de la API.';
        
        return NextResponse.json(
            { error: 'Fallo la API de Correo.', details: errorMessage }, 
            { status: 500 }
        );
    }
}