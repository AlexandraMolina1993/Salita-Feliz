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
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (channel && channel !== 'ALL') {
      if (channel === 'TELEGRAM') {
        query = query.or('type.ilike.%TELEGRAM%,telegram_chat_id.not.is.null');
      } else if (channel === 'GMAIL' || channel === 'EMAIL') {
        query = query.or('type.ilike.%EMAIL%,type.ilike.%GMAIL%');
      }
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},message.ilike.${term}`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: rawData, error, count } = await query;

    if (error) {
      console.warn('[API /api/ai/logs] Error al consultar tabla notifications:', error.message);
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

    const logs = (rawData || []).map((n: any) => {
      const isTelegram = (n.type || '').toUpperCase().includes('TELEGRAM') || Boolean(n.telegram_chat_id);
      const channelType = isTelegram ? 'TELEGRAM' : 'GMAIL';
      const recipient = n.telegram_chat_id 
        ? `Telegram Chat: ${n.telegram_chat_id}` 
        : (n.patient_id ? `Paciente ID: ${n.patient_id}` : 'Administrador');

      let contextType = 'SYSTEM_NOTIFICATION';
      const titleLower = (n.title || '').toLowerCase();
      if (titleLower.includes('recordatorio') || titleLower.includes('turno')) {
        contextType = 'APPOINTMENT_REMINDER_24H';
      } else if (titleLower.includes('stock') || titleLower.includes('inventario') || titleLower.includes('agotamiento')) {
        contextType = 'PREDICTIVE_STOCK_ALERT';
      } else if (titleLower.includes('cancelac')) {
        contextType = 'CLINICAL_CANCELLATION';
      }

      return {
        id: n.id,
        channel: channelType,
        recipient,
        message: n.message || n.title || '',
        status: (n.status || 'SENT').toUpperCase(),
        context: {
          type: contextType,
          title: n.title,
          patient_id: n.patient_id,
          telegram_chat_id: n.telegram_chat_id,
        },
        error_detail: n.status === 'FAILED' ? n.message : null,
        created_at: n.created_at,
        sent_at: n.sent_at || n.created_at,
      };
    });

    // Consulta de estadísticas generales agregadas desde la tabla notifications
    const { data: allData } = await supabase
      .from('notifications')
      .select('type, status, title, telegram_chat_id, created_at')
      .limit(1000);

    const rawList = allData || [];
    const totalCount = rawList.length;
    const sentCount = rawList.filter((l) => (l.status || '').toUpperCase() === 'SENT').length;
    const failedCount = rawList.filter((l) => (l.status || '').toUpperCase() === 'FAILED').length;
    const pendingCount = rawList.filter((l) => (l.status || '').toUpperCase() === 'PENDING').length;
    const telegramCount = rawList.filter(
      (l) => (l.type || '').toUpperCase().includes('TELEGRAM') || Boolean(l.telegram_chat_id)
    ).length;
    const gmailCount = rawList.filter(
      (l) => (l.type || '').toUpperCase().includes('EMAIL') || (l.type || '').toUpperCase().includes('GMAIL') || !(l.type || '').toUpperCase().includes('TELEGRAM')
    ).length;
    const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

    const appointmentRemindersCount = rawList.filter(
      (l) => (l.title || '').toLowerCase().includes('recordatorio') || (l.title || '').toLowerCase().includes('turno')
    ).length;
    const stockAlertsCount = rawList.filter(
      (l) => (l.title || '').toLowerCase().includes('stock') || (l.title || '').toLowerCase().includes('inventario')
    ).length;

    return NextResponse.json({
      success: true,
      data: logs,
      total: count || logs.length,
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
        error: err?.message || 'Error interno al consultar logs de notificaciones.',
      },
      { status: 500 }
    );
  }
}
