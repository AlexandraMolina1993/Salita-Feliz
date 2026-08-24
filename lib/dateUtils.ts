/**
 * Utilidades Centralizadas de Normalización de Fechas y Zonas Horarias
 * Salita Feliz - Enterprise Healthcare System
 *
 * Zona Horaria Operacional: America/Argentina/Buenos_Aires (UTC-3)
 *
 * Resuelve:
 * 1. Anti-desfasaje de fechas nominales (evita que '2026-08-17' retroceda a '2026-08-16' por conversión UTC).
 * 2. Formateo determinista y amigable en español argentino ('es-AR').
 * 3. Cálculos de ventanas temporales (24h / 48h) en hora oficial de Argentina.
 * 4. Extracción segura de 'YYYY-MM-DD' para consultas y almacenamiento en Supabase.
 */

export const CLINIC_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const CLINIC_UTC_OFFSET = '-03:00';

/**
 * Convierte un string nominal de fecha ("YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss...")
 * en un objeto Date garantizando el año, mes y día nominales.
 * Usa mediodía local (12:00:00) para evitar desbordes por husos horarios del navegador.
 */
export function parseLocalDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const clean = String(dateInput).trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }

  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formatea un objeto Date o string a formato ISO nominal estándar "YYYY-MM-DD"
 * utilizando el calendario nominal local sin desfasaje UTC.
 */
export function formatDateToISO(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const d = typeof dateInput === 'string' ? parseLocalDate(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual en la zona horaria de Argentina ('America/Argentina/Buenos_Aires')
 * en formato "YYYY-MM-DD".
 */
export function getArgentinaTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Formato en-CA siempre retorna YYYY-MM-DD
}

/**
 * Obtiene la fecha objetivo en Argentina sumando N horas al momento actual (o fecha personalizada).
 * Retorna fecha en formato "YYYY-MM-DD".
 */
export function getArgentinaTargetDateString(hoursAhead: number = 24, customDate?: string): string {
  if (customDate) {
    return formatDateToISO(customDate);
  }
  const targetMs = Date.now() + hoursAhead * 60 * 60 * 1000;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date(targetMs));
}

/**
 * Formatea una fecha a texto estándar argentino:
 * - 'short': "17/08/2026"
 * - 'short-text': "17 de ago. de 2026"
 * - 'medium': "17 de agosto de 2026"
 * - 'full': "Lunes, 17 de agosto de 2026"
 */
export function formatNominalDate(
  dateInput: string | Date | null | undefined,
  style: 'short' | 'short-text' | 'medium' | 'full' = 'short'
): string {
  if (!dateInput) return 'N/A';
  const d = parseLocalDate(dateInput);
  if (!d) return typeof dateInput === 'string' ? dateInput : 'N/A';

  if (style === 'short') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const formatter = new Intl.DateTimeFormat('es-AR', {
    weekday: style === 'full' ? 'long' : undefined,
    year: 'numeric',
    month: style === 'short-text' ? 'short' : 'long',
    day: 'numeric',
  });

  const formatted = formatter.format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Formatea la fecha de un elemento del historial unificado (replenishment, incident, movement, consumption).
 * Previene el desfase de zona horaria (UTC-3) para fechas nominales y muestra hora sólo cuando es un timestamp real.
 */
export function formatUnifiedHistoryDate(
  dateInput: string | Date | null | undefined,
  itemType?: string
): string {
  if (!dateInput) return 'N/A';

  // Si es reposición o un string que solo contiene fecha (YYYY-MM-DD o YYYY-MM-DDT00:00:00...)
  const isDateOnly =
    itemType === 'replenishment' ||
    (typeof dateInput === 'string' &&
      (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim()) ||
        /^\d{4}-\d{2}-\d{2}T00:00(:00(\.000)?)?Z?$/i.test(dateInput.trim())));

  if (isDateOnly) {
    const d = parseLocalDate(dateInput);
    if (!d) return typeof dateInput === 'string' ? dateInput : 'N/A';
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  }

  // Timestamp real con hora (created_at en UTC)
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return typeof dateInput === 'string' ? dateInput : 'N/A';
  }

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Comprueba de manera determinista si una vacuna vence en los próximos 30 días,
 * sin verse afectada por desfases de zona horaria.
 */
export function isVaccineExpiringSoon(expirationDate?: string | Date | null | undefined): boolean {
  if (!expirationDate) return false;
  const d = parseLocalDate(expirationDate);
  if (!d) return false;
  const today = parseLocalDate(getArgentinaTodayDateString());
  if (!today) return false;
  const diffTime = d.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
}

/**
 * Comprueba de manera determinista si una vacuna ya expiró,
 * sin verse afectada por desfases de zona horaria.
 */
export function isVaccineExpired(expirationDate?: string | Date | null | undefined): boolean {
  if (!expirationDate) return false;
  const d = parseLocalDate(expirationDate);
  if (!d) return false;
  const today = parseLocalDate(getArgentinaTodayDateString());
  if (!today) return false;
  return d.getTime() < today.getTime();
}

export const isExpiringSoon = isVaccineExpiringSoon;
export const isExpired = isVaccineExpired;

/**
 * Formato completo con día de la semana en español: "Lunes, 17 de agosto de 2026"
 */
export function formatFullSpanishDate(dateInput: string | Date | null | undefined): string {
  return formatNominalDate(dateInput, 'full');
}

/**
 * Formatea un horario a formato legible: "11:00" o "11:00 hs".
 */
export function formatNominalTime(timeStr?: string | null, includeSuffix: boolean = false): string {
  if (!timeStr) return includeSuffix ? '09:00 hs' : '09:00';
  const parts = String(timeStr).trim().split(':');
  const hh = (parts[0] || '00').padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  return includeSuffix ? `${hh}:${mm} hs` : `${hh}:${mm}`;
}

/**
 * Comprueba si una fecha coincide con el día de HOY en la zona horaria de Argentina.
 */
export function isTodayInArgentina(dateInput: string | Date | null | undefined): boolean {
  if (!dateInput) return false;
  const targetISO = formatDateToISO(dateInput);
  const todayISO = getArgentinaTodayDateString();
  return targetISO === todayISO;
}

/**
 * Comprueba si dos fechas corresponden al mismo día nominal (YYYY-MM-DD).
 */
export function isSameNominalDay(
  date1: string | Date | null | undefined,
  date2: string | Date | null | undefined
): boolean {
  if (!date1 || !date2) return false;
  return formatDateToISO(date1) === formatDateToISO(date2);
}

/**
 * Construye el timestamp en milisegundos de un turno en la zona horaria oficial de la clínica (UTC-3).
 * dateStr: "2026-08-17", timeStr: "11:00" -> Timestamp correspondiente a 2026-08-17T11:00:00-03:00
 */
export function getAppointmentArgentinaTimestamp(dateStr: string, timeStr?: string): number {
  const dateISO = formatDateToISO(dateStr);
  const time = formatNominalTime(timeStr, false);
  const isoWithOffset = `${dateISO}T${time}:00${CLINIC_UTC_OFFSET}`;
  const ts = new Date(isoWithOffset).getTime();
  return isNaN(ts) ? Date.now() : ts;
}

/**
 * Devuelve la diferencia en horas exactas entre un turno clínico en Argentina y el momento actual.
 * Retorna número positivo si el turno es en el futuro.
 */
export function getHoursUntilAppointment(dateStr: string, timeStr?: string): number {
  const appointmentTs = getAppointmentArgentinaTimestamp(dateStr, timeStr);
  const diffMs = appointmentTs - Date.now();
  return diffMs / (1000 * 60 * 60);
}

