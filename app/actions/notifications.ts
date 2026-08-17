'use server';

/**
 * Server Actions for In-App System Notifications
 * Salita Feliz - Enterprise Healthcare System
 */

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import type { SystemNotification, CreateSystemNotificationParams } from '@/types/notification';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Obtiene las notificaciones del sistema ordenadas cronológicamente (más recientes primero).
 */
export async function getSystemNotificationsAction(
  limit = 30
): Promise<ActionResponse<SystemNotification[]>> {
  try {
    // 1. Intentar consultar system_notifications si existe
    const { data: sysData, error: sysError } = await supabase
      .from('system_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!sysError && sysData) {
      return {
        success: true,
        data: sysData as SystemNotification[],
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Fallback resiliente: consultar tabla 'notifications'
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (notifError) {
      return {
        success: false,
        error: notifError.message,
        timestamp: new Date().toISOString(),
      };
    }

    const mapped: SystemNotification[] = (notifData || []).map((n: any) => ({
      id: n.id,
      title: n.title || 'Notificación',
      message: n.message || '',
      type: n.title?.toLowerCase().includes('cancelaci') ? 'CRITICAL' : n.title?.toLowerCase().includes('aviso') ? 'WARNING' : 'INFO',
      is_read: Boolean(n.is_read || n.active === false),
      created_at: n.created_at || new Date().toISOString(),
      metadata: {
        patient_id: n.patient_id,
        channel: n.type,
        status: n.status,
      },
    }));

    return {
      success: true,
      data: mapped,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al obtener notificaciones.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Marca una notificación individual como leída (`is_read = true`).
 */
export async function markNotificationAsReadAction(
  notificationId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!notificationId) {
      return {
        success: false,
        error: 'El ID de la notificación es obligatorio.',
        timestamp: new Date().toISOString(),
      };
    }

    const { error } = await supabase
      .from('system_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationAction: markNotificationAsRead] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }

    revalidatePath('/dashboard');

    return {
      success: true,
      data: { id: notificationId },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[NotificationAction: markNotificationAsRead] Error inesperado:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al actualizar notificación.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Marca todas las notificaciones no leídas como leídas.
 */
export async function markAllNotificationsAsReadAction(): Promise<ActionResponse<{ count: number }>> {
  try {
    const { data, error } = await supabase
      .from('system_notifications')
      .update({ is_read: true })
      .eq('is_read', false)
      .select('id');

    if (error) {
      console.error('[NotificationAction: markAllNotificationsAsRead] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }

    revalidatePath('/dashboard');

    return {
      success: true,
      data: { count: data ? data.length : 0 },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[NotificationAction: markAllNotificationsAsRead] Error inesperado:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al marcar todas las notificaciones.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Inserta una nueva notificación en la tabla `system_notifications`.
 */
export async function createSystemNotificationAction(
  params: CreateSystemNotificationParams
): Promise<ActionResponse<SystemNotification>> {
  try {
    const { data, error } = await supabase
      .from('system_notifications')
      .insert({
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        metadata: params.metadata || {},
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('[NotificationAction: createSystemNotification] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }

    revalidatePath('/dashboard');

    return {
      success: true,
      data: data as SystemNotification,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[NotificationAction: createSystemNotification] Error inesperado:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al crear notificación.',
      timestamp: new Date().toISOString(),
    };
  }
}
