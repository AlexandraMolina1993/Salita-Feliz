import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousStockAlertEngine } from '@/services/aiNotificationService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/predictive-stock
 *
 * Endpoint disparado de manera automatizada por Vercel Cron Jobs (0 8 * * *).
 * Requiere encabezado `Authorization: Bearer ${process.env.CRON_SECRET}` para asegurar
 * que únicamente Vercel pueda disparar el motor autónomo de predicción y despacho de alertas.
 *
 * Query Params opcionales:
 * - `daysWindow` o `days`: Ventana de histórico a analizar en días (por defecto 30).
 * - `forceAlert`: boolean (default: false).
 * - `recipientEmail`: string (destinatario específico).
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[API /api/ai/predictive-stock GET (Cron)] Intento no autorizado o CRON_SECRET inválido.');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Header Authorization no coincide con CRON_SECRET.',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const daysWindow = Number(searchParams.get('daysWindow') || searchParams.get('days')) || 30;
    const forceAlert = searchParams.get('forceAlert') === 'true';
    const recipientEmail = searchParams.get('recipientEmail') || undefined;

    const report = await runAutonomousStockAlertEngine({
      daysWindow,
      forceAlert,
      notifyTelegram: true,
      notifyEmail: true,
      recipientEmail,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Motor predictivo de stock y alertas autónomas ejecutado con éxito vía Cron.',
        report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/ai/predictive-stock GET (Cron)] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al ejecutar el motor de alertas de IA vía Cron.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/predictive-stock
 *
 * Disparador manual / orquestador del ciclo completo de predicción de stock y despacho de alertas con IA:
 * 1. Análisis de Run-Rate sobre stock_movements.
 * 2. Generación de alerta clínica contextual (Google Gemini / OpenAI / Fallback Clínico).
 * 3. Despacho a Telegram Bot API y Nodemailer (Gmail / SMTP / Resend).
 * 4. Registro inmutable en la tabla de auditoría `notifications`.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const {
      daysWindow = 30,
      forceAlert = false,
      notifyTelegram = true,
      notifyEmail = true,
      recipientEmail,
    } = body;

    const report = await runAutonomousStockAlertEngine({
      daysWindow,
      forceAlert,
      notifyTelegram,
      notifyEmail,
      recipientEmail,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Motor predictivo de stock y alertas autónomas ejecutado con éxito.',
        report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/ai/predictive-stock POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al ejecutar el motor de alertas de IA.',
      },
      { status: 500 }
    );
  }
}
