import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// 🔐 Cliente de Supabase para el Backend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✉️ Inicializamos Resend con su API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// -------------------------------------------------------------
// 1. FUNCIÓN AUXILIAR PARA OBTENER EL EMAIL DEL PACIENTE
// -------------------------------------------------------------
async function getPatientEmail(patientId: string): Promise<string | null> {
    const cleanId = patientId?.trim();
    if (!cleanId) return null;

    const { data, error } = await supabase
        .from('patients')    
        .select('email')     
        .eq('id', cleanId) 
        .maybeSingle();       

    if (error) {
        console.error("Error en Supabase al buscar el paciente:", error.message);
        return null;
    }
    return data?.email || null; 
}

// -------------------------------------------------------------
// 2. HANDLER PRINCIPAL (POST) - CON RESEND Y LOG DIRECTO
// -------------------------------------------------------------
export async function POST(req: Request) {
    let patientEmail: string | null = null; 
    
    try {
        const body = await req.json();
        const patientId = body.patientId || body.patientID;
        const { subject, message, scheduledDate, scheduledTime } = body;

        // Buscamos el correo real en Supabase
        patientEmail = await getPatientEmail(patientId); 

        if (!patientEmail) {
            return NextResponse.json(
                { 
                    error: 'No se encontró el email del paciente.',
                    details: `La query a Supabase con el ID "${patientId}" devolvió vacío.` 
                }, 
                { status: 400 }
            );
        }

        // Construimos el HTML del recordatorio
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #1e88e5;">Recordatorio de Turno - Salita Feliz</h2>
                <p>Estimado/a paciente, este es un <strong>RECORDATORIO</strong> de su próximo turno de vacunación:</p>
                <ul style="list-style-type: none; padding: 0;">
                    <li style="margin-bottom: 8px;"><strong>Fecha:</strong> ${scheduledDate}</li>
                    <li style="margin-bottom: 8px;"><strong>Hora:</strong> ${scheduledTime}</li>
                </ul>
                ${message ? `<p style="margin-top: 15px; padding: 10px; background-color: #f0f8ff; border-left: 3px solid #1e88e5;"><strong>Mensaje Adicional:</strong> ${message}</p>` : ''}
                <p style="margin-top: 20px;">Por favor, llegue a tiempo. ¡Te esperamos!</p>
            </div>
        `;

        // Enviamos el correo usando la SDK de Resend
        const { data: resendData, error: resendError } = await resend.emails.send({
            from: 'Salita Feliz <onboarding@resend.dev>', 
            to: patientEmail,
            subject: `Recordatorio de Turno: ${subject}`,
            html: htmlContent,
        });

        if (resendError) {
            throw new Error(`Error devuelto por Resend: ${resendError.message}`);
        }

        // 📝 INSERCIÓN DIRECTA EN LA TABLA 'NOTIFICATIONS'
        const { error: insertError } = await supabase
            .from('notifications')
            .insert([
                {
                    patient_id: patientId, 
                    type: 'EMAIL',
                    title: `Recordatorio de Turno: ${subject}`,
                    message: `Turno: ${scheduledDate} a las ${scheduledTime}. Mensaje: ${message}`,
                    status: 'SENT',
                    created_at: new Date().toISOString()
                }
            ]);

        // 🚨 Si las políticas RLS están bien pero las columnas no coinciden, saltará acá:
        if (insertError) {
            console.error("Error de inserción en Supabase:", insertError.message);
            return NextResponse.json({ 
                error: 'Email enviado, pero falló el registro en Supabase.', 
                details: insertError.message 
            }, { status: 400 });
        }
        
        return NextResponse.json({ message: 'Email enviado con éxito y registrado en Supabase!' }, { status: 200 });

    } catch (error) {
        console.error('Error crítico en la API de Resend:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor.';
        
        return NextResponse.json(
            { error: 'Falló la API de Correo con Resend.', details: errorMessage }, 
            { status: 500 }
        );
    }
}