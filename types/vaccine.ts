/**
 * Types and Interfaces for Vaccine Management & Event-Driven Stock Architecture
 * Salita Feliz - Enterprise Healthcare System
 */

/**
 * Categoría de estado de stock calculado por la vista en tiempo real.
 */
export type VaccineStockStatus = 'OPTIMAL' | 'CRITICAL_LOW' | 'OUT_OF_STOCK';

/**
 * Tipos de movimientos registrados en el ledger inmutable de inventario (stock_movements).
 */
export type StockMovementType = 'ADJUSTMENT' | 'CONSUMPTION' | 'INCIDENT' | 'REPLENISHMENT';

/**
 * Interfaz que mapea las columnas de la vista en tiempo real `v_vaccines_stock`.
 * Agrega el catálogo de vacunas con el libro mayor de movimientos (stock_movements).
 */
export interface VaccineStockView {
  vaccine_id: string;
  name: string;
  laboratory: string | null;
  type: string | null;
  dose_amount: number;
  net_content?: number;
  min_stock_level: number;
  is_active: boolean;
  expiration_date: string | null;
  current_stock_fraction?: number;
  total_ml: number;
  physical_vials?: number;
  physical_vials_for_repos: number;
  available_doses_for_clinic: number;
  current_stock_vials: number;
  current_stock_ml: number;
  stock_status: VaccineStockStatus;
}

/**
 * Parámetros en formato frontend / aplicación para completar un turno
 * y procesar atómicamente la deducción de inventario clínico.
 */
export interface CompleteAppointmentParams {
  appointmentId: string;
  doseMl: number;
  nurseId?: string | null;
  notes?: string | null;
  sideEffects?: string | null;
  lotNumber?: string | null;
  siteOfInjection?: string | null;
}

/**
 * Parámetros con el formato exacto de argumentos para la función RPC
 * de PostgreSQL `process_appointment_completion`.
 */
export interface ProcessAppointmentCompletionRPCParams {
  p_appointment_id: string;
  p_dose_ml: number;
  p_nurse_id?: string | null;
  p_notes?: string | null;
  p_side_effects?: string | null;
  p_lot_number?: string | null;
  p_site_of_injection?: string | null;
}

/**
 * Resultado estructurado devuelto por la función RPC `process_appointment_completion`.
 */
export interface AppointmentCompletionResult {
  success: boolean;
  appointment_id: string;
  vaccine_id: string;
  vaccine_name: string;
  applied_dose_ml: number;
  fraction_consumed?: number;
  vials_consumed?: number;
  net_content_ml?: number;
  remaining_stock_vials: number;
  movement_id: string;
  timestamp: string;
}

/**
 * Registro individual del libro mayor inmutable de movimientos de stock.
 */
export interface StockMovement {
  id: string;
  vaccine_id: string;
  appointment_id?: string | null;
  type: StockMovementType;
  quantity_vials: number;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Opciones de consulta para listar el stock de vacunas.
 */
export interface GetVaccineStockOptions {
  onlyActive?: boolean;
  status?: VaccineStockStatus;
  searchTerm?: string;
  orderBy?: keyof VaccineStockView;
  ascending?: boolean;
}

/**
 * Nivel de urgencia clínica de reposición de vacunas.
 */
export type StockUrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'OPTIMAL';

/**
 * Canales de comunicación soportados para alertas autónomas.
 */
export type AINotificationChannel = 'TELEGRAM' | 'GMAIL';

/**
 * Estado de despacho de la notificación de auditoría.
 */
export type AINotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

/**
 * Resultado del análisis de run-rate y proyección de agotamiento de una vacuna.
 */
export interface StockRunRateAnalysis {
  vaccine_id: string;
  name: string;
  laboratory: string | null;
  type: string | null;
  dose_amount: number;
  min_stock_level: number;
  stock_status: VaccineStockStatus;
  current_stock_vials: number;
  current_stock_ml: number;
  daily_consumption_ml: number;
  daily_consumption_vials: number;
  days_remaining: number;
  is_critical: boolean;
  urgency_level: StockUrgencyLevel;
  analysis_period_days: number;
  total_consumed_ml_period: number;
  total_consumed_vials_period: number;
  recommended_reorder_vials: number;
  reorder_reason: string;
}

/**
 * Registro de auditoría para la tabla `notifications`.
 */
export interface AINotificationRecord {
  id?: string;
  channel: AINotificationChannel;
  recipient: string;
  message: string;
  status: AINotificationStatus;
  context: Record<string, unknown> | null;
  error_detail?: string | null;
  created_at?: string;
  sent_at?: string | null;
}

/**
 * Contenido estructurado generado por el Agente de IA para alertas clínicas.
 */
export interface AIGeneratedAlertContent {
  headline: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  clinical_assessment: string;
  telegram_message: string;
  email_subject: string;
  email_html: string;
  operational_recommendations: string[];
}

/**
 * Reporte consolidado de ejecución del motor predictivo y despacho de alertas.
 */
export interface PredictiveStockReport {
  timestamp: string;
  total_vaccines_analyzed: number;
  critical_vaccines_count: number;
  window_days: number;
  analyses: StockRunRateAnalysis[];
  critical_items: StockRunRateAnalysis[];
  ai_alert?: AIGeneratedAlertContent | null;
  dispatch_results: {
    telegram: {
      attempted: boolean;
      success: boolean;
      recipient?: string;
      log_id?: string;
      error?: string;
    };
    gmail: {
      attempted: boolean;
      success: boolean;
      recipient?: string;
      log_id?: string;
      error?: string;
    };
  };
}

