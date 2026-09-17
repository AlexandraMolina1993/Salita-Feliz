'use client';

/**
 * In-App System Notification Bell Component
 * Salita Feliz - Enterprise Healthcare System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

  // NUEVO ESTADO: Controla qué notificación está abierta en el modal
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);

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

    const interval = setInterval(fetchNotifications, 45000);

    const channelName = `sys_notifs_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationAsReadAction(id);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsReadAction();
    setIsLoading(false);
  };

  // NUEVA FUNCIÓN: Maneja el clic en la tarjeta para abrir el modal y marcar como leída
  const handleOpenNotification = (notif: SystemNotification) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    setSelectedNotification(notif);
    // Opcional: setIsOpen(false) si quisieras que el menú se cierre al abrir el modal.
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

  const stripHtmlTags = (html: string) => {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n'); // Mantenemos saltos de línea para el modal
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<[^>]*>?/gm, '');
    text = text.replace(/&nbsp;/g, ' ');
    return text.trim();
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />,
          borderClass: 'border-l-rose-500',
        };
      case 'WARNING':
        return {
          icon: <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />,
          borderClass: 'border-l-amber-500',
        };
      default:
        return {
          icon: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
          borderClass: 'border-l-blue-500',
        };
    }
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Notificaciones del Sistema"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[420px] p-0 shadow-xl border-border bg-card text-card-foreground rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40 shrink-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-foreground">Notificaciones Enviadas</h4>
              {unreadCount > 0 ? (
                <Badge variant="destructive" className="text-[11px] px-2 py-0.5 whitespace-nowrap font-medium">
                  {unreadCount} sin leer
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5 whitespace-nowrap font-normal text-muted-foreground">
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

          {/* LISTA LIMPIA: Eliminado el scroll horizontal. Ahora corta en 2 líneas. */}
          <div className="h-[450px] max-h-[60vh] overflow-y-auto overflow-x-hidden divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Sin notificaciones pendientes</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => {
                  const styles = getTypeStyles(notif.type);
                  const cleanMessage = stripHtmlTags(notif.message);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleOpenNotification(notif)}
                      className={`flex items-start gap-3 p-3.5 text-left border-l-4 transition-colors cursor-pointer group ${styles.borderClass
                        } ${notif.is_read
                          ? 'bg-card opacity-70 hover:opacity-100 hover:bg-accent/40'
                          : 'bg-accent/10 hover:bg-accent/30 font-medium'
                        }`}
                    >
                      <div className="mt-0.5 shrink-0">{styles.icon}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis pr-2 group-hover:text-primary transition-colors">
                            {notif.title}
                          </span>
                          <span suppressHydrationWarning className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                            {formatTimestamp(notif.created_at)}
                          </span>
                        </div>

                        {/* El mensaje ahora se corta automáticamente en la segunda línea (line-clamp-2) */}
                        <p className="text-xs text-muted-foreground line-clamp-2 pr-2 leading-relaxed">
                          {cleanMessage}
                        </p>
                      </div>

                      {!notif.is_read && (
                        <div className="shrink-0 h-2 w-2 rounded-full bg-rose-500 mt-2 mr-1 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-muted/20 text-center shrink-0">
            <span className="text-[11px] text-muted-foreground">
              Registro Histórico de Auditoría
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {/* =========================================
          NUEVO MODAL PARA LEER EL MENSAJE COMPLETO
          ========================================= */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="bg-card text-card-foreground w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic adentro
          >
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-border bg-muted/30">
              <div className="flex gap-3">
                <div className="mt-1 bg-background p-2 rounded-full shadow-sm">
                  {getTypeStyles(selectedNotification.type).icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight text-foreground">
                    {selectedNotification.title}
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium mt-1 inline-block">
                    {new Date(selectedNotification.created_at).toLocaleString('es-AR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-background hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0"
                onClick={() => setSelectedNotification(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Cuerpo del Mensaje con Scroll Vertical Propio */}
            <div className="p-6 overflow-y-auto max-h-[60vh] bg-background">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {stripHtmlTags(selectedNotification.message)}
              </p>
            </div>

            {/* Pie del Modal */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end">
              <Button onClick={() => setSelectedNotification(null)}>
                Cerrar Mensaje
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default NotificationBell;