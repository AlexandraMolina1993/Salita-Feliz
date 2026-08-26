import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousAppointmentReminders } from '@/services/appointmentReminderService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/appointment-reminders
 *
 * Endpoint disparado de manera automatizada por Vercel Cron Jobs (0 13 * * *).
 * Requiere encabezado `Authorization: Bearer ${process.env.CRON_SECRET}` para asegurar
 * que únicamente Vercel pueda disparar el agente en producción.
 *
 * Query Params opcionales:
 * - `hoursAhead` o `hours`: Ventana horaria en horas (por defecto 24).
 * - `targetDate` o `date`: Fecha específica en formato YYYY-MM-DD.
 * - `forceResend`: boolean (default: false).
 * - `appointmentId`: ID de un turno puntual para procesar.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[API /api/ai/appointment-reminders GET (Cron)] Intento no autorizado o CRON_SECRET inválido.');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Header Authorization no coincide con CRON_SECRET.',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const hoursAhead = Number(searchParams.get('hoursAhead') || searchParams.get('hours')) || 24;
    const targetDate = searchParams.get('targetDate') || searchParams.get('date') || undefined;
    const forceResend = searchParams.get('forceResend') === 'true';
    const appointmentId = searchParams.get('appointmentId') || undefined;

    const report = await runAutonomousAppointmentReminders({
      hoursAhead,
      targetDate,
      forceResend,
      notifyEmail: true,
      notifyTelegram: true,
      specificAppointmentId: appointmentId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Ciclo autónomo de recordatorios de turnos (24h) ejecutado con éxito vía Cron.',
        report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/ai/appointment-reminders GET (Cron)] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error interno al ejecutar el agente de recordatorios de turnos vía Cron.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/appointment-reminders
 *
 * Disparador manual / orquestador para el Agente Autónomo de Recordatorios de Turnos (24h).
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
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[API /api/ai/appointment-reminders POST] Advertencia: header de autorización no coincide con CRON_SECRET.');
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
