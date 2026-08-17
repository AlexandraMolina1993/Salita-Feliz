/**
 * Types & Interfaces for In-App System Notifications
 * Salita Feliz - Enterprise Healthcare System
 */

export type NotificationType = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface CreateSystemNotificationParams {
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}
