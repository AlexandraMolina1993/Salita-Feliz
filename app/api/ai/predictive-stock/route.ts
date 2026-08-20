import { NextResponse } from 'next/server';
import {
  calculateVaccineRunRate,
  runAutonomousStockAlertEngine,
} from '@/services/aiNotificationService';

/**
 * GET /api/ai/predictive-stock
 * Obtiene el diagnóstico en tiempo real del Run-Rate de vacunas sin disparar alertas externas.
 * Útil para alimentar componentes del frontend, dashboards y tablas de stock predictivo.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const windowDays = Number(searchParams.get('days')) || 30;

    const analyses = await calculateVaccineRunRate(windowDays);
    const criticalItems = analyses.filter((i) => i.is_critical);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        total_analyzed: analyses.length,
        critical_count: criticalItems.length,
        window_days: windowDays,
        data: analyses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/ai/predictive-stock GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno al calcular run-rate.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/predictive-stock
 * Ejecuta el ciclo autónomo completo de predicción de stock y despacho de alertas con IA:
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
