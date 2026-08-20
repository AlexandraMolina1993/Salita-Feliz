import { Resend } from 'resend';

// Inicializamos Resend con la clave de tu entorno
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un reporte administrativo o alerta crítica por correo electrónico.
 */
export async function sendGmailReport(subject: string, message: string) {
    try {
        // Tu correo administrativo (el que verificaste en la cuenta de Resend)
        const adminEmail = process.env.ADMIN_EMAIL || 'TU_CORREO_AQUI@gmail.com';

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #d32f2f; border-radius: 8px; background-color: #fff9f9;">
                <h2 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">
                    🚨 Alerta Predictiva de Inventario
                </h2>
                <div style="font-size: 16px; color: #333; line-height: 1.5; white-space: pre-wrap;">
                    ${message}
                </div>
                <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
                    🤖 Este es un mensaje generado automáticamente por el Agente IA de Salita Feliz.
                </p>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: 'Salita Feliz IA <onboarding@resend.dev>',
            to: adminEmail, // A dónde llega la alerta
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error('[Resend Utility] Error devuelto por Resend:', error.message);
            return false;
        }

        console.log('[Resend Utility] Correo de alerta enviado con éxito:', data?.id);
        return true;

    } catch (error) {
        console.error('[Resend Utility] Error crítico enviando el reporte:', error);
        return false;
    }
}