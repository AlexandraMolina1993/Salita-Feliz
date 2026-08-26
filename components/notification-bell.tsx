'use client';

/**
 * In-App System Notification Bell Component
 * Salita Feliz - Enterprise Healthcare System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import {
  getSystemNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from '@/app/actions/notifications';
import type { SystemNotification } from '@/types/notification';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getSystemNotificationsAction(30);
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('[NotificationBell] Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Polling regular cada 45 segundos
    const interval = setInterval(fetchNotifications, 45000);

    // Suscripción Realtime en Supabase con nombre de canal único
    const channelName = `sys_notifs_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Actualización optimista en UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationAsReadAction(id);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsLoading(true);
    // Actualización optimista
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsReadAction();
    setIsLoading(false);
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);

      if (diffMinutes < 1) return 'Hace un momento';
      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;

      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />,
          badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          borderClass: 'border-l-rose-500',
        };
      case 'WARNING':
        return {
          icon: <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />,
          badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          borderClass: 'border-l-amber-500',
        };
      default:
        return {
          icon: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
          badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          borderClass: 'border-l-blue-500',
        };
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Notificaciones del Sistema"
          aria-label="Ver notificaciones del sistema"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-xl border-border bg-card text-card-foreground rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-foreground">Notificaciones</h4>
            {unreadCount > 0 ? (
              <Badge variant="destructive" className="text-[11px] px-1.5 py-0 h-5 font-medium">
                {unreadCount} sin leer
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-5 font-normal text-muted-foreground">
                Al día
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 flex items-center gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Marcar todas</span>
            </Button>
          )}
        </div>

        {/* Listado de Notificaciones */}
        <ScrollArea className="max-h-80 divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-foreground">Sin notificaciones pendientes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Las alertas de stock y avisos clínicos aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => {
                const styles = getTypeStyles(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                    className={`flex items-start gap-3 p-3.5 text-left border-l-4 transition-colors ${
                      styles.borderClass
                    } ${
                      notif.is_read
                        ? 'bg-card opacity-70 hover:opacity-100 hover:bg-accent/40'
                        : 'bg-accent/30 hover:bg-accent/60 font-medium'
                    }`}
                  >
                    <div className="mt-0.5">{styles.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {notif.title}
                        </span>
                        <span suppressHydrationWarning className="text-[10px] text-muted-foreground shrink-0">
                          {formatTimestamp(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {!notif.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="h-6 w-6 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 shrink-0 mt-0.5"
                        title="Marcar como leída"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-muted/20 text-center">
          <span className="text-[11px] text-muted-foreground">
            Monitoreo en tiempo real de inventario y clínica
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
export default NotificationBell;
