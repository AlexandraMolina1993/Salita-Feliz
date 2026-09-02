/**
 * Tipos e Interfaces para el Agente Autónomo de Recordatorios de Turnos (24 Horas)
 * Salita Feliz - Enterprise Healthcare System
 */

export interface PatientBasicInfo {
  id: string;
  full_name: string;
  dni: string;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
}

export interface VaccineBasicInfo {
  id: string;
  name: string;
  type?: string | null;
  manufacturer?: string | null;
  dose_amount?: number | null;
  storage_temperature?: string | null;
  lot_number?: string | null;
}

export interface NurseBasicInfo {
  id: string;
  full_name: string;
  license_number?: string | null;
  specialty?: string | null;
}

/**
 * Representa un turno próximo a ser atendido con sus entidades relacionadas.
 */
export interface UpcomingAppointment {
  id: string;
  patient_id: string;
  vaccine_id: string;
  nurse_id?: string | null;
  appointment_date: string; // Formato YYYY-MM-DD
  appointment_time: string; // Formato HH:mm:ss o HH:mm
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string | null;
  patient: PatientBasicInfo;
  vaccine: VaccineBasicInfo;
  nurse?: NurseBasicInfo | null;
  already_notified: boolean;
  last_notification_at?: string | null;
}

/**
 * Contenido generado por el Agente de IA para el recordatorio clínico del paciente.
 */
export interface AppointmentReminderAIContent {
  subject: string;
  greeting: string;
  patient_name: string;
  vaccine_name: string;
  appointment_date_formatted: string;
  appointment_time_formatted: string;
  clinical_recommendations: string[];
  email_html: string;
  chat_message: string; // Formato para Telegram / WhatsApp / SMS
  summary: string;
}

/**
 * Resultado del despacho de notificación para un turno individual.
 */
export interface AppointmentReminderDispatchResult {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  patient_email?: string | null;
  patient_phone?: string | null;
  vaccine_name: string;
  appointment_date: string;
  appointment_time: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  reason?: string;
  channels: {
    email: {
      attempted: boolean;
      success: boolean;
      recipient?: string;
      log_id?: string;
      error?: string;
    };
    telegram: {
      attempted: boolean;
      success: boolean;
      recipient?: string;
      log_id?: string;
      error?: string;
    };
  };
  ai_content?: AppointmentReminderAIContent;
  error?: string;
}

/**
 * Opciones para la ejecución del motor de recordatorios.
 */
export interface RunAppointmentRemindersOptions {
  hoursAhead?: number; // Ventana horaria (por defecto 24h)
  targetDate?: string; // Fecha específica YYYY-MM-DD (opcional)
  forceResend?: boolean; // Si es true, reenvía incluso a los ya notificados
  notifyEmail?: boolean; // Por defecto true
  notifyTelegram?: boolean; // Por defecto true
  specificAppointmentId?: string; // Para disparar un turno individual específico
}

/**
 * Reporte de lote devuelto por el motor de recordatorios de turnos (24 Horas).
 */
export interface AppointmentRemindersBatchReport {
  timestamp: string;
  window_hours: number;
  target_date_analyzed: string;
  total_scheduled_found: number;
  already_notified_count: number;
  reminders_attempted: number;
  reminders_sent: number;
  reminders_failed: number;
  reminders_skipped: number;
  results: AppointmentReminderDispatchResult[];
}

/**
 * Tipos para Flujo 2: Cancelación por Inviabilidad Clínica
 */
export interface ClinicalInfeasibilityRisk {
  type: 'OUT_OF_STOCK' | 'EXPIRED_BATCH' | 'NEAR_EXPIRATION_BEFORE_APPOINTMENT';
  description: string;
  available_doses: number;
  expiration_date: string | null;
  appointment_date: string;
}

export interface ClinicalCancellationAIContent {
  subject: string;
  greeting: string;
  patient_name: string;
  vaccine_name: string;
  appointment_date_formatted: string;
  appointment_time_formatted: string;
  clinical_reason: string;
  rescheduling_instructions: string[];
  email_html: string;
  chat_message: string;
  summary: string;
}

export interface ClinicalCancellationDispatchResult {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  patient_email?: string | null;
  patient_phone?: string | null;
  vaccine_id: string;
  vaccine_name: string;
  appointment_date: string;
  appointment_time: string;
  risk: ClinicalInfeasibilityRisk;
  cancelled_in_db: boolean;
  notification_status: 'SENT' | 'FAILED' | 'SKIPPED';
  channels: {
    email: {
      attempted: boolean;
      success: boolean;
      recipient?: string;
      error?: string;
    };
    telegram: {
      attempted: boolean;
      success: boolean;
      recipient?: string;
      error?: string;
    };
  };
  ai_content?: ClinicalCancellationAIContent;
  error?: string;
}

export interface ClinicalCancellationsBatchReport {
  timestamp: string;
  total_future_scheduled_checked: number;
  at_risk_appointments_found: number;
  appointments_cancelled: number;
  notifications_sent: number;
  notifications_failed: number;
  results: ClinicalCancellationDispatchResult[];
}

/**
 * Reporte consolidado unificado del Cron de Notificaciones a Pacientes
 */
export interface PatientNotificationCronResponse {
  success: boolean;
  timestamp: string;
  summary: {
    reminders_found: number;
    reminders_sent: number;
    reminders_skipped: number;
    reminders_failed: number;
    cancellations_at_risk_found: number;
    cancellations_executed: number;
    cancellations_notified: number;
    cancellations_failed: number;
  };
  reminders_24h: AppointmentRemindersBatchReport;
  clinical_cancellations: ClinicalCancellationsBatchReport;
  error?: string;
}

