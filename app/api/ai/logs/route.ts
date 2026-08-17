import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const offset = Number(searchParams.get('offset')) || 0;
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('ai_notifications_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (channel && channel !== 'ALL') {
      query = query.eq('channel', channel.toUpperCase());
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`recipient.ilike.${term},message.ilike.${term}`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.warn('[API /api/ai/logs] Error al consultar ai_notifications_log:', error.message);
      // Si la tabla no existe aún o hay un error, devolver array vacío con estadísticas en 0 para no romper la UI
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        stats: {
          total: 0,
          sent: 0,
          failed: 0,
          pending: 0,
          telegramCount: 0,
          gmailCount: 0,
          successRate: 100,
          appointmentRemindersCount: 0,
          stockAlertsCount: 0,
        },
        warning: error.message,
      });
    }

    // Consulta de estadísticas generales agregadas
    const { data: allLogs } = await supabase
      .from('ai_notifications_log')
      .select('channel, status, context, created_at')
      .limit(1000);

    const rawList = allLogs || [];
    const totalCount = rawList.length;
    const sentCount = rawList.filter((l) => l.status === 'SENT').length;
    const failedCount = rawList.filter((l) => l.status === 'FAILED').length;
    const pendingCount = rawList.filter((l) => l.status === 'PENDING').length;
    const telegramCount = rawList.filter((l) => l.channel === 'TELEGRAM').length;
    const gmailCount = rawList.filter((l) => l.channel === 'GMAIL').length;
    const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

    const appointmentRemindersCount = rawList.filter(
      (l) => (l.context as any)?.type === 'APPOINTMENT_REMINDER_24H'
    ).length;
    const stockAlertsCount = rawList.filter(
      (l) => (l.context as any)?.type === 'PREDICTIVE_STOCK_ALERT'
    ).length;

    return NextResponse.json({
      success: true,
      data: logs || [],
      total: count || (logs?.length ?? 0),
      stats: {
        total: totalCount,
        sent: sentCount,
        failed: failedCount,
        pending: pendingCount,
        telegramCount,
        gmailCount,
        successRate,
        appointmentRemindersCount,
        stockAlertsCount,
      },
    });
  } catch (err: any) {
    console.error('[API /api/ai/logs] Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error interno al consultar logs de auditoría.',
      },
      { status: 500 }
    );
  }
}
