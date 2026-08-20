import { NextRequest, NextResponse } from 'next/server';
import { runProactivePatientNotificationEngine } from '@/services/appointmentReminderService';
import type { RunAppointmentRemindersOptions } from '@/types/appointmentReminder';
import { runProactiveInventoryEngine } from '@/services/inventoryPredictionService';

/**
 * Endpoint de Cron Seguro para el Agente IA de Notificaciones Proactivas a Pacientes y Control de Stock
 *
 * Flujos automatizados:
 * 1. Recordatorio 24 Horas: Notifica a pacientes con turnos en las próximas 24h.
 * 2. Agente Predictivo de Inventario: Monitorea el ritmo de consumo y alerta sobre posibles quiebres de stock.
 *
 * Seguridad:
 * - Valida el header `Authorization: Bearer <CRON_SECRET>` o `x-cron-secret: <CRON_SECRET>` o `?secret=<CRON_SECRET>`.
 */

function validateCronSecret(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    console.warn('[Cron:Agent] ADVERTENCIA: CRON_SECRET no está configurado en las variables de entorno.');
    return process.env.NODE_ENV === 'development';
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    if (token === configuredSecret) {
      return true;
    }
  }

  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && customHeader.trim() === configuredSecret) {
    return true;
  }

  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  if (querySecret && querySecret.trim() === configuredSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET.', timestamp: new Date().toISOString() },
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

    console.log('[Cron:Agent] Iniciando ejecución de los Agentes IA Proactivos...');

    // Ejecución concurrente de ambos motores
    const [patientResult, inventoryResult] = await Promise.all([
      runProactivePatientNotificationEngine(options),
      runProactiveInventoryEngine()
    ]);

    console.log('[Cron:Agent] Resumen Pacientes:', patientResult.summary);
    console.log('[Cron:Agent] Resumen Inventario:', inventoryResult.summary);

    const allSuccess = patientResult.success && inventoryResult.success;

    return NextResponse.json({
      success: allSuccess,
      patients: patientResult,
      inventory: inventoryResult,
      timestamp: new Date().toISOString()
    }, { status: allSuccess ? 200 : 207 }); // 207 significa Multi-Status (si alguno falla pero el otro no)

  } catch (error) {
    console.error('[Cron:Agent] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET.', timestamp: new Date().toISOString() },
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

    console.log('[Cron:Agent (POST)] Ejecutando Agentes IA Proactivos...');

    const [patientResult, inventoryResult] = await Promise.all([
      runProactivePatientNotificationEngine(options),
      runProactiveInventoryEngine()
    ]);

    const allSuccess = patientResult.success && inventoryResult.success;

    return NextResponse.json({
      success: allSuccess,
      patients: patientResult,
      inventory: inventoryResult,
      timestamp: new Date().toISOString()
    }, { status: allSuccess ? 200 : 207 });

  } catch (error) {
    console.error('[Cron:Agent (POST)] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}