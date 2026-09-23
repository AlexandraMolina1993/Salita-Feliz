/**
 * Tipos de datos para el Agente IA de Calendario Preventivo
 * Salita Feliz - Enterprise Healthcare System
 *
 * Cobertura completa del Calendario Nacional de Vacunación de Argentina:
 * - Hitos Pediátricos: Recién Nacido (0m), 2m, 3m, 4m, 6m, 12m, 15m, 18m.
 * - Hitos Escolares / Adolescentes: 5 años, 11 años.
 * - Hitos Adultos: Refuerzos cada 10 años (16, 26, 36, 46...), 65 años (Adulto Mayor).
 */

export type PreventiveMilestoneCategory = 'PEDIATRIC' | 'SCHOOL' | 'ADULT';

export type PreventiveMilestoneKey =
  | 'ALL'
  | 'NEWBORN'
  | '2_MONTHS'
  | '3_MONTHS'
  | '4_MONTHS'
  | '6_MONTHS'
  | '12_MONTHS'
  | '15_MONTHS'
  | '18_MONTHS'
  | '5_YEARS'
  | '11_YEARS'
  | 'ADULT_10Y'
  | '65_YEARS';

export interface PreventiveMilestone {
  key: PreventiveMilestoneKey | string;
  category: PreventiveMilestoneCategory;
  targetUnit: 'MONTHS' | 'YEARS';
  ageMonths?: number;
  ageYears?: number;
  title: string;
  subtitle: string;
  isPediatric: boolean;
  vaccines: {
    name: string;
    doses: string;
    description: string;
  }[];
  clinicalGuidelines: string[];
}

export interface PreventiveCandidate {
  patientId: string;
  fullName: string;
  dni: string;
  birthDate: string;
  currentAgeYears: number;
  currentAgeMonths?: number;
  ageDisplay: string;
  email?: string | null;
  phone?: string | null;
  milestone: PreventiveMilestone;
}

export interface PreventiveDispatchChannelResult {
  attempted: boolean;
  success: boolean;
  error?: string;
  logId?: string;
}

export interface PreventiveDispatchItemResult {
  candidate: PreventiveCandidate;
  channels: {
    email: PreventiveDispatchChannelResult;
    telegram: PreventiveDispatchChannelResult;
  };
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  alreadyNotifiedRecently: boolean;
}

export interface PreventiveCalendarReport {
  executedAt: string;
  targetMonth: number;
  targetYear: number;
  totalActivePatientsChecked: number;
  eligibleCandidatesCount: number;
  notificationsSentCount: number;
  notificationsFailedCount: number;
  alreadyNotifiedCount: number;
  results: PreventiveDispatchItemResult[];
  summary: string;
}

export interface RunPreventiveCalendarOptions {
  targetMonth?: number; // 1 - 12 (default: mes actual en Argentina)
  targetYear?: number;
  forceResend?: boolean; // ignora si ya fue notificado en los últimos 30 días
  milestoneKey?: string; // clave del hito (ej: 'NEWBORN', '2_MONTHS', 'ADULT_10Y', 'ALL')
  milestoneAge?: number | string; // filtro opcional numérico o string por compatibilidad
  notifyEmail?: boolean;
  notifyTelegram?: boolean;
}
