import { NextRequest, NextResponse } from 'next/server';
import { runPreventiveCalendarEngine } from '@/services/preventiveCalendarService';
import type { RunPreventiveCalendarOptions } from '@/types/preventiveCalendar';

export const dynamic = 'force-dynamic';

/**
 * Valida la autorización para la ejecución del Cron Job.
 * Compatible con:
 * - Vercel Cron Header: Authorization: Bearer <CRON_SECRET>
 * - Custom Header: x-cron-secret: <CRON_SECRET>
 * - Query Parameter: ?secret=<CRON_SECRET>
 */
function validateCronSecret(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    console.warn('[Cron:CalendarioPreventivo] ADVERTENCIA: CRON_SECRET no está configurado en variables de entorno.');
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

/**
 * GET /api/cron/calendario-preventivo
 *
 * Disparado de manera programada por Vercel Cron Jobs (ej. 1 de cada mes al mediodía).
 * Valida el secreto de seguridad de Cron.
 */
export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Header Authorization o secreto de Cron inválido.',
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const forceResend = searchParams.get('forceResend') === 'true';
    const targetMonthParam = searchParams.get('targetMonth') || searchParams.get('month');
    const milestoneKeyParam = searchParams.get('milestoneKey') || searchParams.get('milestone');
    const milestoneAgeParam = searchParams.get('milestoneAge') || searchParams.get('age');

    const options: RunPreventiveCalendarOptions = {
      forceResend,
      targetMonth: targetMonthParam ? parseInt(targetMonthParam, 10) : undefined,
      milestoneKey: milestoneKeyParam || undefined,
      milestoneAge: milestoneAgeParam || undefined,
      notifyEmail: true,
      notifyTelegram: true,
    };

    console.log('[Cron:CalendarioPreventivo] Iniciando ejecución automática vía Cron...');
    const report = await runPreventiveCalendarEngine(options);

    return NextResponse.json(
      {
        success: true,
        message: 'Agente de Calendario Preventivo ejecutado con éxito vía Cron.',
        report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Cron:CalendarioPreventivo GET] Error inesperado:', error);
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

/**
 * POST /api/cron/calendario-preventivo
 *
 * Disparador manual / orquestador para el Dashboard Monitor IA.
 * Permite ejecutar auditorías bajo demanda con parámetros de filtro.
 */
export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body opcional
    }

    const { searchParams } = new URL(request.url);

    const forceResend = body.forceResend ?? (searchParams.get('forceResend') === 'true');
    const targetMonth = body.targetMonth || (searchParams.get('targetMonth') ? parseInt(searchParams.get('targetMonth')!, 10) : undefined);
    const milestoneKey = body.milestoneKey || searchParams.get('milestoneKey') || undefined;
    const milestoneAge = body.milestoneAge || searchParams.get('milestoneAge') || undefined;
    const notifyEmail = body.notifyEmail ?? true;
    const notifyTelegram = body.notifyTelegram ?? true;

    console.log('[Cron:CalendarioPreventivo POST] Disparador manual recibido desde Monitor IA...');

    const report = await runPreventiveCalendarEngine({
      forceResend,
      targetMonth,
      milestoneKey,
      milestoneAge,
      notifyEmail,
      notifyTelegram,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Auditoría de Calendario Preventivo completada.',
        report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Cron:CalendarioPreventivo POST] Error crítico:', error);
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
