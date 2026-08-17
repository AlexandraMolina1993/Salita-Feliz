import { NextRequest, NextResponse } from 'next/server';
import { runProactivePatientNotificationEngine } from '@/services/appointmentReminderService';
import type { RunAppointmentRemindersOptions } from '@/types/appointmentReminder';

/**
 * Endpoint de Cron Seguro para el Agente IA de Notificaciones Proactivas a Pacientes
 *
 * Flujos automatizados:
 * 1. Recordatorio 24 Horas: Notifica a pacientes con turnos en las próximas 24h.
 * 2. Alerta y Cancelación de Seguridad Clínica: Monitorea stock e inviabilidad de lotes futuros en `v_vaccines_stock`.
 *
 * Seguridad:
 * - Valida el header `Authorization: Bearer <CRON_SECRET>` o `x-cron-secret: <CRON_SECRET>` o `?secret=<CRON_SECRET>`.
 */

function validateCronSecret(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET;

  // Si no está configurado el secreto en el servidor, permitir solo en modo de desarrollo con aviso
  if (!configuredSecret) {
    console.warn('[Cron:PatientNotifications] ADVERTENCIA: CRON_SECRET no está configurado en las variables de entorno.');
    return process.env.NODE_ENV === 'development';
  }

  // 1. Verificar header Authorization (Bearer <token>)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    if (token === configuredSecret) {
      return true;
    }
  }

  // 2. Verificar custom header x-cron-secret
  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && customHeader.trim() === configuredSecret) {
    return true;
  }

  // 3. Verificar query param ?secret=...
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  if (querySecret && querySecret.trim() === configuredSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  // 1. Verificación de Seguridad
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Invalid or missing CRON_SECRET.',
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const hoursAheadParam = searchParams.get('hoursAhead');
    const targetDate = searchParams.get('targetDate') || undefined;
    const forceResend = searchParams.get('forceResend') === 'true';

    const options: RunAppointmentRemindersOptions = {
      hoursAhead: hoursAheadParam ? parseInt(hoursAheadParam, 10) : 24,
      targetDate,
      forceResend,
    };

    console.log('[Cron:PatientNotifications] Iniciando ejecución del Agente IA Proactivo...');
    const result = await runProactivePatientNotificationEngine(options);

    console.log('[Cron:PatientNotifications] Ejecución finalizada con resumen:', result.summary);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[Cron:PatientNotifications] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // 1. Verificación de Seguridad
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Invalid or missing CRON_SECRET.',
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body opcional
    }

    const { searchParams } = new URL(request.url);
    const hoursAhead = body.hoursAhead || (searchParams.get('hoursAhead') ? parseInt(searchParams.get('hoursAhead')!, 10) : 24);
    const targetDate = body.targetDate || searchParams.get('targetDate') || undefined;
    const forceResend = body.forceResend ?? (searchParams.get('forceResend') === 'true');
    const specificAppointmentId = body.specificAppointmentId || searchParams.get('specificAppointmentId') || undefined;

    const options: RunAppointmentRemindersOptions = {
      hoursAhead,
      targetDate,
      forceResend,
      specificAppointmentId,
    };

    console.log('[Cron:PatientNotifications (POST)] Ejecutando Agente IA Proactivo...');
    const result = await runProactivePatientNotificationEngine(options);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[Cron:PatientNotifications (POST)] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
