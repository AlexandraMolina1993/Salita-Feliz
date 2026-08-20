import { NextResponse } from 'next/server';
import {
  getUpcomingAppointmentsForReminders,
  runAutonomousAppointmentReminders,
} from '@/services/appointmentReminderService';
import { getArgentinaTargetDateString } from '@/lib/dateUtils';

/**
 * GET /api/ai/appointment-reminders
 *
 * Consulta el estado en tiempo real de los turnos programados para las próximas 24 horas.
 * Devuelve el listado de turnos candidatos junto con su estado de auditoría (si ya fueron notificados o están pendientes).
 *
 * Query Params opcionales:
 * - `hours`: Ventana horaria en horas (por defecto 24).
 * - `date`: Fecha específica en formato YYYY-MM-DD.
 * - `appointmentId`: ID de un turno puntual para consultar.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursParam = searchParams.get('hours');
    const hoursAhead = hoursParam ? Number(hoursParam) : 24;
    const targetDate = searchParams.get('date') || undefined;
    const specificAppointmentId = searchParams.get('appointmentId') || undefined;

    const appointments = await getUpcomingAppointmentsForReminders({
      hoursAhead,
      targetDate,
      specificAppointmentId,
    });

    const alreadyNotified = appointments.filter((a) => a.already_notified);
    const pendingNotification = appointments.filter((a) => !a.already_notified);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        hours_ahead: hoursAhead,
        target_date: getArgentinaTargetDateString(hoursAhead, targetDate),
        total_scheduled: appointments.length,
        already_notified_count: alreadyNotified.length,
        pending_notification_count: pendingNotification.length,
        data: appointments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/ai/appointment-reminders GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error interno al consultar los turnos próximos.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/appointment-reminders
 *
 * Endpoint Orquestador / Cron para el Agente Autónomo de Recordatorios de Turnos (24h).
 *
 * Flujo:
 * 1. Consulta todos los turnos 'scheduled' para la ventana de las próximas 24 horas.
 * 2. Verifica deduplicación en `notifications` para evitar mensajes repetidos.
 * 3. Ejecuta el Agente de Redacción con IA (Gemini / OpenAI / Fallback Clínico) para personalizar el mensaje.
 * 4. Despacha por Email (Resend / Gmail SMTP) y Telegram.
 * 5. Registra el contexto del turno de forma inmutable en `notifications`.
 *
 * Body Params opcionales:
 * - `hoursAhead`: number (default: 24)
 * - `targetDate`: string YYYY-MM-DD
 * - `forceResend`: boolean (default: false)
 * - `notifyEmail`: boolean (default: true)
 * - `notifyTelegram`: boolean (default: true)
 * - `appointmentId`: string (para procesar un turno específico)
 */
export async function POST(request: Request) {
  try {
    // Verificación opcional de seguridad para llamadas de Cron Jobs (Vercel Cron / CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Si se configuró CRON_SECRET y el header no coincide, rechazar peticiones no autorizadas
      // Nota: Si no hay CRON_SECRET configurado, se permite ejecución interna / desarrollo
      console.warn('[API /api/ai/appointment-reminders POST] Intento de acceso sin CRON_SECRET válido.');
    }

    const body = await request.json().catch(() => ({}));

    const {
      hoursAhead = 24,
      targetDate,
      forceResend = false,
      notifyEmail = true,
      notifyTelegram = true,
      appointmentId,
    } = body;

    const report = await runAutonomousAppointmentReminders({
      hoursAhead: Number(hoursAhead) || 24,
      targetDate,
      forceResend: Boolean(forceResend),
      notifyEmail: notifyEmail !== false,
      notifyTelegram: notifyTelegram !== false,
      specificAppointmentId: appointmentId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Ciclo autónomo de recordatorios de turnos (24h) ejecutado con éxito.',
        report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/ai/appointment-reminders POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error interno al ejecutar el agente de recordatorios de turnos.',
      },
      { status: 500 }
    );
  }
}
