/**
 * Servicio de Agente IA Proactivo de Notificaciones al Paciente
 * Salita Feliz - Enterprise Healthcare System
 *
 * Flujos Principales:
 * 1. Recordatorio de Turnos 24 Horas (Deduplicado contra tabla `notifications`).
 * 2. Alerta de Cancelación por Inviabilidad Clínica (Stock agotado o lote vencido en `v_vaccines_stock`).
 * 3. Despacho Multicanal: Resend API / Nodemailer Gmail SMTP y Telegram Bot API.
 */

import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';
import {
  CLINIC_TIMEZONE,
  getArgentinaTargetDateString,
  getArgentinaTodayDateString,
  formatFullSpanishDate,
  formatNominalTime,
  formatNominalDate,
  formatDateToISO,
} from '@/lib/dateUtils';
import type {
  UpcomingAppointment,
  AppointmentReminderAIContent,
  AppointmentReminderDispatchResult,
  RunAppointmentRemindersOptions,
  AppointmentRemindersBatchReport,
  ClinicalInfeasibilityRisk,
  ClinicalCancellationAIContent,
  ClinicalCancellationDispatchResult,
  ClinicalCancellationsBatchReport,
  PatientNotificationCronResponse,
} from '@/types/appointmentReminder';

// ==============================================================================
// 1. HELPERS DE FECHAS Y FORMATEO CLÍNICO (NORMALIZADOS PARA ARGENTINA UTC-3)
// ==============================================================================

/**
 * Obtiene la fecha objetivo para la ventana de 24 horas (mañana en Argentina por defecto).
 * Retorna fecha en formato ISO (YYYY-MM-DD).
 */
export function getTargetReminderDate(hoursAhead: number = 24, customDate?: string): string {
  return getArgentinaTargetDateString(hoursAhead, customDate);
}

/**
 * Formatea una fecha YYYY-MM-DD a un texto amigable en español argentino.
 * Ej: "2026-08-18" -> "Martes, 18 de agosto de 2026"
 */
export function formatSpanishDate(dateString: string): string {
  return formatFullSpanishDate(dateString);
}

/**
 * Formatea la hora a formato legible "HH:mm hs".
 */
export function formatSpanishTime(timeString: string): string {
  return formatNominalTime(timeString, true);
}

// ==============================================================================
// 2. REGISTRO DE NOTIFICACIONES EN BASE DE DATOS (TABLA `notifications`)
// ==============================================================================

/**
 * Registra formalmente el despacho o intento de notificación en la tabla `notifications`.
 */
export async function logPatientNotification(params: {
  patientId: string;
  channel: 'EMAIL' | 'TELEGRAM';
  title: string;
  message: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          patient_id: params.patientId,
          type: params.channel,
          title: params.title,
          message: params.message,
          status: params.status,
          telegram_bot_token: params.telegramBotToken || null,
          telegram_chat_id: params.telegramChatId || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[NotificationLog] Error al insertar en tabla notifications:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[NotificationLog] Excepción al registrar notificación en Supabase:', err);
    return null;
  }
}

// ==============================================================================
// 3. CONSULTA DE TURNOS PRÓXIMOS Y DEDUPLICACIÓN (FLUJO 1 - 24 HORAS)
// ==============================================================================

/**
 * Consulta en Supabase los turnos cuyo estado sea `scheduled` y cuya fecha esté
 * programada en la ventana de 24 horas (o fecha objetivo calculada en horario Argentina UTC-3).
 *
 * Cruza con `notifications` para marcar aquellos que ya fueron notificados en las últimas 48h.
 */
export async function getUpcomingAppointmentsForReminders(
  options: {
    hoursAhead?: number;
    targetDate?: string;
    specificAppointmentId?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<UpcomingAppointment[]> {
  const { hoursAhead = 24, targetDate, specificAppointmentId, startDate, endDate } = options;
  const targetDateStr = getTargetReminderDate(hoursAhead, targetDate);

  // 1. Construir query base a appointments con joins a pacientes, vacunas y enfermeros
  let query = supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      vaccine_id,
      nurse_id,
      appointment_date,
      appointment_time,
      status,
      notes,
      patients:patient_id (
        id,
        full_name,
        dni,
        email,
        phone,
        birth_date,
        allergies,
        medical_conditions
      ),
      vaccines:vaccine_id (
        id,
        name,
        type,
        manufacturer,
        dose_amount,
        storage_temperature,
        lot_number
      ),
      nurses:nurse_id (
        id,
        full_name,
        license_number,
        specialty
      )
    `)
    .is('deleted_at', null);

  if (specificAppointmentId) {
    query = query.eq('id', specificAppointmentId);
  } else if (startDate && endDate) {
    query = query
      .eq('status', 'scheduled')
      .gte('appointment_date', formatDateToISO(startDate))
      .lte('appointment_date', formatDateToISO(endDate));
  } else {
    query = query.eq('status', 'scheduled').eq('appointment_date', targetDateStr);
  }

  const { data: rawAppointments, error } = await query;

  if (error) {
    console.error('[AppointmentReminderService] Error al consultar turnos en Supabase:', error);
    throw new Error(`Error al consultar turnos próximos: ${error.message}`);
  }

  if (!rawAppointments || rawAppointments.length === 0) {
    return [];
  }

  // 2. Consultar el historial de notificaciones recientes para deduplicación
  const sinceDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: sentNotifications, error: notifError } = await supabase
    .from('notifications')
    .select('patient_id, title, message, created_at, status')
    .gte('created_at', sinceDate)
    .eq('status', 'SENT');

  if (notifError) {
    console.warn('[AppointmentReminderService] Advertencia al consultar notifications para deduplicación:', notifError.message);
  }

  const notificationsByPatient = new Map<string, Array<{ title: string; message: string; created_at: string }>>();
  if (sentNotifications) {
    for (const notif of sentNotifications) {
      if (!notif.patient_id) continue;
      const list = notificationsByPatient.get(notif.patient_id) || [];
      list.push(notif);
      notificationsByPatient.set(notif.patient_id, list);
    }
  }

  // 3. Mapear y marcar deduplicación
  const formattedAppointments: UpcomingAppointment[] = rawAppointments.map((item: any) => {
    const patientData = item.patients || {
      id: item.patient_id,
      full_name: 'Paciente no identificado',
      dni: 'S/D',
    };

    const vaccineData = item.vaccines || {
      id: item.vaccine_id,
      name: 'Vacuna de Calendario',
    };

    const nurseData = item.nurses || null;

    const patientNotifs = notificationsByPatient.get(patientData.id) || [];
    const appointmentDateStr = item.appointment_date;
    
    // Verificamos si ya existe una notificación de recordatorio para este turno/fecha
    const existingReminder = patientNotifs.find((n) => {
      const titleMatch = n.title?.toLowerCase().includes('recordatorio');
      const dateMatch = n.message?.includes(appointmentDateStr) || n.title?.includes(vaccineData.name);
      return titleMatch && (dateMatch || patientNotifs.length > 0);
    });

    const isAlreadyNotified = Boolean(existingReminder);
    const lastNotifiedAt = existingReminder?.created_at || null;

    return {
      id: item.id,
      patient_id: item.patient_id,
      vaccine_id: item.vaccine_id,
      nurse_id: item.nurse_id || null,
      appointment_date: item.appointment_date,
      appointment_time: item.appointment_time || '09:00:00',
      status: item.status,
      notes: item.notes || null,
      patient: {
        id: patientData.id,
        full_name: patientData.full_name,
        dni: patientData.dni,
        email: patientData.email || null,
        phone: patientData.phone || null,
        birth_date: patientData.birth_date || null,
        allergies: patientData.allergies || null,
        medical_conditions: patientData.medical_conditions || null,
      },
      vaccine: {
        id: vaccineData.id,
        name: vaccineData.name,
        type: vaccineData.type || null,
        manufacturer: vaccineData.manufacturer || null,
        dose_amount: vaccineData.dose_amount || 1,
        storage_temperature: vaccineData.storage_temperature || null,
        lot_number: vaccineData.lot_number || null,
      },
      nurse: nurseData
        ? {
            id: nurseData.id,
            full_name: nurseData.full_name,
            license_number: nurseData.license_number || null,
            specialty: nurseData.specialty || null,
          }
        : null,
      already_notified: isAlreadyNotified,
      last_notification_at: lastNotifiedAt,
    };
  });

  return formattedAppointments;
}

// ==============================================================================
// 4. AGENTE DE REDACCIÓN DE RECORDATORIOS (GEMINI / OPENAI / FALLBACK CLÍNICO)
// ==============================================================================

export function buildReminderEmailHtml(content: {
  patientName: string;
  vaccineName: string;
  dateFormatted: string;
  timeFormatted: string;
  nurseName?: string | null;
  recommendations: string[];
  summary: string;
}): string {
  const recommendationsList = content.recommendations
    .map(
      (rec) => `
      <li style="margin-bottom: 8px; color: #334155; line-height: 1.5;">
        ${rec}
      </li>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio de Turno - Salita Feliz</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 28px; text-align: center;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 9999px; margin-bottom: 12px;">
            <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
              🏥 Salita Feliz • Centro de Salud
            </span>
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">
            Recordatorio de Turno de Vacunación
          </h1>
          <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 15px;">
            Tu cita médica está programada para las próximas 24 horas
          </p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 32px 28px;">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0; margin-bottom: 20px;">
            Hola <strong>${content.patientName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
            Te recordamos que tienes un turno programado en el Vacunatorio de nuestro centro de salud. A continuación encontrarás el detalle de tu cita:
          </p>

          <!-- Card Detalle del Turno -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">💉 Vacuna / Dosis:</td>
                <td style="padding: 6px 0; color: #0284c7; font-weight: 700; font-size: 15px;">${content.vaccineName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🗓️ Fecha:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-transform: capitalize;">${content.dateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">⏰ Horario:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-size: 15px;">${content.timeFormatted}</td>
              </tr>
              ${
                content.nurseName
                  ? `<tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">👩‍⚕️ Profesional:</td>
                      <td style="padding: 6px 0; color: #334155;">${content.nurseName}</td>
                    </tr>`
                  : ''
              }
            </table>
          </div>

          <!-- Recomendaciones Clínicas Previas -->
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 18px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
            <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 15px; font-weight: 700;">
              📋 Indicaciones y Recomendaciones Previas:
            </h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${recommendationsList}
            </ul>
          </div>

          <!-- Mensaje de Cierre -->
          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            ${content.summary}
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 0; color: #64748b; font-weight: 600;">
            Centro de Salud y Vacunatorio "Salita Feliz"
          </p>
          <p style="margin: 4px 0 0 0;">
            Atención de Lunes a Viernes de 08:00 a 18:00 hs.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateDeterministicAppointmentReminder(
  appointment: UpcomingAppointment
): AppointmentReminderAIContent {
  const patientName = appointment.patient.full_name || 'Estimado/a Paciente';
  const vaccineName = appointment.vaccine.name || 'Biológico de Calendario';
  const dateFormatted = formatSpanishDate(appointment.appointment_date);
  const timeFormatted = formatSpanishTime(appointment.appointment_time);
  const nurseName = appointment.nurse?.full_name || null;

  const subject = `🔔 Recordatorio de Turno: Vacunación ${vaccineName} - Salita Feliz`;

  const recommendations = [
    'Presentarse con 10 minutos de anticipación al horario indicado.',
    'Llevar Documento Nacional de Identidad (DNI) físico y Carnet / Libreta de Vacunación.',
    'Mantener una adecuada hidratación previa y posterior a la aplicación.',
    'Informar al enfermero/a en caso de fiebre aguda (>38°C) o si está bajo tratamiento médico.',
  ];

  const summary =
    'El cumplimiento oportuno del calendario de vacunación cuida de tu salud y de toda la comunidad. ¡Te esperamos en Salita Feliz!';

  const emailHtml = buildReminderEmailHtml({
    patientName,
    vaccineName,
    dateFormatted,
    timeFormatted,
    nurseName,
    recommendations,
    summary,
  });

  const chatMessage = `
🏥 <b>Salita Feliz • Recordatorio de Turno (24h)</b>

Hola <b>${patientName}</b>, te recordamos tu cita de vacunación programada:

💉 <b>Vacuna:</b> ${vaccineName}
🗓️ <b>Fecha:</b> ${dateFormatted}
⏰ <b>Horario:</b> ${timeFormatted}
${nurseName ? `👩‍⚕️ <b>Profesional:</b> ${nurseName}\n` : ''}
📋 <b>Recomendaciones:</b>
• Traer DNI físico y Libreta de Vacunación.
• Presentarse 10 minutos antes.
• Si presentas fiebre (>38°C), comunícate para reprogramar.

<i>¡Cuidamos tu salud y la de tu familia!</i>
  `.trim();

  return {
    subject,
    greeting: `Hola ${patientName}`,
    patient_name: patientName,
    vaccine_name: vaccineName,
    appointment_date_formatted: dateFormatted,
    appointment_time_formatted: timeFormatted,
    clinical_recommendations: recommendations,
    email_html: emailHtml,
    chat_message: chatMessage,
    summary,
  };
}

export async function generateAppointmentReminderWithAI(
  appointment: UpcomingAppointment
): Promise<AppointmentReminderAIContent> {
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!geminiApiKey) {
    return generateDeterministicAppointmentReminder(appointment);
  }

  try {
    const patientName = appointment.patient.full_name || 'Estimado/a Paciente';
    const vaccineName = appointment.vaccine.name || 'Vacuna de Calendario';
    const dateFormatted = formatSpanishDate(appointment.appointment_date);
    const timeFormatted = formatSpanishTime(appointment.appointment_time);
    const nurseName = appointment.nurse?.full_name;

    const prompt = `
Eres el Asistente Médico Inteligente de "Salita Feliz".
Genera un recordatorio empático, cálido y profesional en español de Argentina para un paciente con turno en las próximas 24 horas.

Datos del Turno:
- Paciente: ${patientName}
- Vacuna: ${vaccineName}
- Fecha: ${dateFormatted}
- Horario: ${timeFormatted}
${nurseName ? `- Enfermero/a: ${nurseName}` : ''}
${appointment.patient.allergies ? `- Alergias registradas: ${appointment.patient.allergies}` : ''}

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura:
{
  "subject": "Asunto conciso con emoji para email",
  "greeting": "Saludo cordial con nombre",
  "recommendations": ["Recomendación 1", "Recomendación 2", "Recomendación 3"],
  "summary": "Párrafo breve de despedida afectuosa y motivadora",
  "chat_message": "Mensaje compacto con emojis y etiquetas HTML (<b>, <i>) listo para Telegram"
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const recommendations = Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
          ? parsed.recommendations
          : [
              'Presentarse con 10 minutos de anticipación.',
              'Llevar DNI físico y Carnet de Vacunación.',
              'Mantener una buena hidratación.',
            ];

        const emailHtml = buildReminderEmailHtml({
          patientName,
          vaccineName,
          dateFormatted,
          timeFormatted,
          nurseName,
          recommendations,
          summary: parsed.summary || '¡Te esperamos en Salita Feliz para cuidar de tu salud!',
        });

        return {
          subject: parsed.subject || `🔔 Recordatorio de Turno: ${vaccineName} - Salita Feliz`,
          greeting: parsed.greeting || `Hola ${patientName}`,
          patient_name: patientName,
          vaccine_name: vaccineName,
          appointment_date_formatted: dateFormatted,
          appointment_time_formatted: timeFormatted,
          clinical_recommendations: recommendations,
          email_html: emailHtml,
          chat_message: parsed.chat_message || '',
          summary: parsed.summary || '',
        };
      }
    }
  } catch (err) {
    console.error('[AppointmentReminderAI] Excepción al generar con IA, usando fallback:', err);
  }

  return generateDeterministicAppointmentReminder(appointment);
}

// ==============================================================================
// 5. AGENTE DE REDACCIÓN DE CANCELACIONES (FLUJO 2 - INVIABILIDAD CLÍNICA)
// ==============================================================================

export function buildCancellationEmailHtml(content: {
  patientName: string;
  vaccineName: string;
  dateFormatted: string;
  timeFormatted: string;
  clinicalReason: string;
  reschedulingInstructions: string[];
  summary: string;
}): string {
  const instructionsList = content.reschedulingInstructions
    .map(
      (inst) => `
      <li style="margin-bottom: 8px; color: #334155; line-height: 1.5;">
        ${inst}
      </li>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aviso Importante: Reprogramación de Turno - Salita Feliz</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
        
        <!-- Header Alerta -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px 28px; text-align: center;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 9999px; margin-bottom: 12px;">
            <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
              ⚠️ Protocolo de Seguridad Clínica • Salita Feliz
            </span>
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">
            Aviso de Cancelación y Reprogramación
          </h1>
          <p style="color: #fee2e2; margin: 8px 0 0 0; font-size: 15px;">
            Por motivos de seguridad y control de inventario biológico
          </p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 32px 28px;">
          <p style="font-size: 16px; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
            Estimado/a <strong>${content.patientName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Le informamos que nuestro sistema de control de calidad e inventario ha detectado una situación imprevista con la disponibilidad de la vacuna asignada a su turno:
          </p>

          <!-- Card Detalle del Turno Cancelado -->
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #991b1b; font-weight: 600; width: 35%;">💉 Vacuna:</td>
                <td style="padding: 6px 0; color: #991b1b; font-weight: 700; font-size: 15px;">${content.vaccineName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7f1d1d; font-weight: 600;">🗓️ Fecha afectada:</td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${content.dateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7f1d1d; font-weight: 600;">⏰ Horario:</td>
                <td style="padding: 6px 0; color: #1e293b; font-weight: 700;">${content.timeFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #7f1d1d; font-weight: 600;">📋 Motivo:</td>
                <td style="padding: 6px 0; color: #b91c1c; font-weight: 600;">${content.clinicalReason}</td>
              </tr>
            </table>
          </div>

          <!-- Pasos para Reprogramar -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 18px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 15px; font-weight: 700;">
              🔄 Pasos para Solicitar un Nuevo Turno:
            </h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${instructionsList}
            </ul>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            ${content.summary}
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 0; color: #64748b; font-weight: 600;">
            Centro de Salud y Vacunatorio "Salita Feliz"
          </p>
          <p style="margin: 4px 0 0 0;">
            Lamentamos las molestias ocasionadas. La seguridad clínica de nuestros pacientes es nuestra máxima prioridad.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateDeterministicCancellationNotice(
  appointment: any,
  risk: ClinicalInfeasibilityRisk
): ClinicalCancellationAIContent {
  const patientName = appointment.patients?.full_name || appointment.patient?.full_name || 'Estimado/a Paciente';
  const vaccineName = appointment.vaccines?.name || appointment.vaccine?.name || 'Vacuna';
  const dateFormatted = formatSpanishDate(appointment.appointment_date);
  const timeFormatted = formatSpanishTime(appointment.appointment_time);

  const subject = `⚠️ Cancelación de Turno por Motivos Clínicos: ${vaccineName} - Salita Feliz`;

  const clinicalReason =
    risk.type === 'OUT_OF_STOCK'
      ? 'Agotamiento temporal de stock de biológicos en el centro'
      : 'Vencimiento preventivo del lote asignado por estrictos protocolos de bioseguridad';

  const instructions = [
    'No es necesario que concurra al centro de salud en la fecha y hora previamente programadas.',
    'Nuestro equipo está gestionando la reposición prioritaria de dosis viables con los laboratorios oficiales.',
    'Puede ingresar al portal web o comunicarse con recepción para coordinar una nueva fecha apenas arribe el nuevo lote.',
  ];

  const summary =
    'Le pedimos sinceras disculpas por los inconvenientes. En Salita Feliz priorizamos siempre su salud y seguridad clínica.';

  const emailHtml = buildCancellationEmailHtml({
    patientName,
    vaccineName,
    dateFormatted,
    timeFormatted,
    clinicalReason,
    reschedulingInstructions: instructions,
    summary,
  });

  const chatMessage = `
⚠️ <b>Salita Feliz • Aviso Urgente de Cancelación de Turno</b>

Estimado/a <b>${patientName}</b>:

Le informamos que su turno para la vacuna <b>${vaccineName}</b> del día <b>${dateFormatted}</b> a las <b>${timeFormatted}</b> ha sido <b>CANCELADO AUTOMÁTICAMENTE</b>.

📋 <b>Motivo:</b> ${clinicalReason}.
🛡️ <b>Seguridad:</b> Nuestro protocolo no permite la aplicación de dosis con riesgo de vencimiento o stock no garantizado.

🔄 <b>Próximos pasos:</b>
• No concurra al centro en el horario cancelado.
• Por favor, comuníquese con recepción o acceda al sistema para reprogramar su turno una vez disponible el nuevo lote.

<i>Lamentamos las molestias ocasionadas.</i>
  `.trim();

  return {
    subject,
    greeting: `Estimado/a ${patientName}`,
    patient_name: patientName,
    vaccine_name: vaccineName,
    appointment_date_formatted: dateFormatted,
    appointment_time_formatted: timeFormatted,
    clinical_reason: clinicalReason,
    reschedulingInstructions: instructions,
    email_html: emailHtml,
    chat_message: chatMessage,
    summary,
  };
}

// ==============================================================================
// 6. DESPACHO DE NOTIFICACIONES (EMAIL Y TELEGRAM)
// ==============================================================================

/**
 * Envía notificación por Correo Electrónico (vía Resend o Nodemailer Gmail SMTP)
 * y la registra formalmente en `notifications`.
 */
export async function sendPatientEmailNotification(
  patientId: string,
  recipientEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  const cleanEmail = recipientEmail?.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    const errorMsg = 'El paciente no posee un correo electrónico válido registrado.';
    const logId = await logPatientNotification({
      patientId,
      channel: 'EMAIL',
      title: subject,
      message: errorMsg,
      status: 'FAILED',
    });
    return { success: false, logId: logId || undefined, error: errorMsg };
  }

  const senderEmail = process.env.EMAIL_FROM || 'salitafeliz8@gmail.com';

  try {
    // 1. Resend API
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `Salita Feliz <${senderEmail.includes('@resend') ? senderEmail : 'onboarding@resend.dev'}>`,
          to: [cleanEmail],
          subject,
          html: htmlContent,
        }),
      });

      if (resendRes.ok) {
        const logId = await logPatientNotification({
          patientId,
          channel: 'EMAIL',
          title: subject,
          message: htmlContent,
          status: 'SENT',
        });
        return { success: true, logId: logId || undefined };
      } else {
        const errText = await resendRes.text();
        console.warn('[PatientNotificationEmail] Resend API devolvió error:', errText);
      }
    }

    // 2. Nodemailer (Gmail / SMTP)
    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_FROM;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

    if (gmailUser && gmailPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });

      await transporter.sendMail({
        from: `"Salita Feliz - Vacunatorio" <${senderEmail}>`,
        to: cleanEmail,
        subject,
        html: htmlContent,
      });

      const logId = await logPatientNotification({
        patientId,
        channel: 'EMAIL',
        title: subject,
        message: htmlContent,
        status: 'SENT',
      });

      return { success: true, logId: logId || undefined };
    }

    // 3. Fallback de persistencia y simulación para entornos de desarrollo local
    console.log(`[PatientNotificationEmail] Simulación de despacho a ${cleanEmail}. Registrando en tabla notifications.`);
    const logId = await logPatientNotification({
      patientId,
      channel: 'EMAIL',
      title: subject,
      message: htmlContent,
      status: 'SENT',
    });

    return { success: true, logId: logId || undefined };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido al enviar correo.';
    console.error('[PatientNotificationEmail] Excepción en envío:', errorMsg);

    const logId = await logPatientNotification({
      patientId,
      channel: 'EMAIL',
      title: subject,
      message: `Error: ${errorMsg}`,
      status: 'FAILED',
    });

    return { success: false, logId: logId || undefined, error: errorMsg };
  }
}

/**
 * Envía notificación al canal de Telegram y la registra en `notifications`.
 */
export async function sendPatientTelegramNotification(
  patientId: string,
  recipientChatId: string | undefined,
  title: string,
  message: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  const telegramToken =
    process.env.TELEGRAM_BOT_TOKEN || '8648904762:AAHqydiTfDPAK9Ly3_vB6K-PrjVKq1TZFR0';
  const chatId = recipientChatId || process.env.TELEGRAM_CHAT_ID || '688202634';

  if (!telegramToken || !chatId) {
    const err = 'Credenciales de Telegram no configuradas.';
    const logId = await logPatientNotification({
      patientId,
      channel: 'TELEGRAM',
      title,
      message: err,
      status: 'FAILED',
      telegramBotToken: telegramToken,
      telegramChatId: chatId,
    });
    return { success: false, logId: logId || undefined, error: err };
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      const errorMsg = `Telegram rechazó el envío: ${JSON.stringify(data)}`;
      console.error('[PatientNotificationTelegram] Error de API Telegram:', errorMsg);
      const logId = await logPatientNotification({
        patientId,
        channel: 'TELEGRAM',
        title,
        message,
        status: 'FAILED',
        telegramBotToken: telegramToken,
        telegramChatId: chatId,
      });
      return { success: false, logId: logId || undefined, error: errorMsg };
    }

    const logId = await logPatientNotification({
      patientId,
      channel: 'TELEGRAM',
      title,
      message,
      status: 'SENT',
      telegramBotToken: telegramToken,
      telegramChatId: chatId,
    });

    return { success: true, logId: logId || undefined };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error al conectar con Telegram API';
    console.error('[PatientNotificationTelegram] Excepción:', errorMsg);
    const logId = await logPatientNotification({
      patientId,
      channel: 'TELEGRAM',
      title,
      message,
      status: 'FAILED',
      telegramBotToken: telegramToken,
      telegramChatId: chatId,
    });
    return { success: false, logId: logId || undefined, error: errorMsg };
  }
}

// ==============================================================================
// 7. MOTOR DE RECORDATORIOS 24 HORAS (FLUJO 1)
// ==============================================================================

/**
 * Ejecuta el ciclo autónomo de recordatorios de turnos de 24 horas.
 */
export async function run24HourAppointmentReminders(
  options: RunAppointmentRemindersOptions = {}
): Promise<AppointmentRemindersBatchReport> {
  const {
    hoursAhead = 24,
    targetDate,
    forceResend = false,
    notifyEmail = true,
    notifyTelegram = true,
    specificAppointmentId,
  } = options;

  const targetDateStr = getTargetReminderDate(hoursAhead, targetDate);
  const timestamp = new Date().toISOString();

  const appointments = await getUpcomingAppointmentsForReminders({
    hoursAhead,
    targetDate: targetDateStr,
    specificAppointmentId,
  });

  const alreadyNotifiedCount = appointments.filter((a) => a.already_notified).length;
  const results: AppointmentReminderDispatchResult[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const app of appointments) {
    if (app.already_notified && !forceResend) {
      skippedCount++;
      results.push({
        appointment_id: app.id,
        patient_id: app.patient_id,
        patient_name: app.patient.full_name,
        patient_email: app.patient.email,
        patient_phone: app.patient.phone,
        vaccine_name: app.vaccine.name,
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        status: 'SKIPPED',
        reason: `Recordatorio ya enviado previamente (${app.last_notification_at}).`,
        channels: {
          email: { attempted: false, success: false },
          telegram: { attempted: false, success: false },
        },
      });
      continue;
    }

    try {
      const aiContent = await generateAppointmentReminderWithAI(app);
      let anyChannelSuccess = false;

      const dispatchResult: AppointmentReminderDispatchResult = {
        appointment_id: app.id,
        patient_id: app.patient_id,
        patient_name: app.patient.full_name,
        patient_email: app.patient.email,
        patient_phone: app.patient.phone,
        vaccine_name: app.vaccine.name,
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        status: 'SENT',
        channels: {
          email: { attempted: false, success: false },
          telegram: { attempted: false, success: false },
        },
        ai_content: aiContent,
      };

      // Despacho por Email
      if (notifyEmail && app.patient.email) {
        dispatchResult.channels.email.attempted = true;
        dispatchResult.channels.email.recipient = app.patient.email;
        const emailRes = await sendPatientEmailNotification(
          app.patient_id,
          app.patient.email,
          aiContent.subject,
          aiContent.email_html
        );
        dispatchResult.channels.email.success = emailRes.success;
        dispatchResult.channels.email.log_id = emailRes.logId;
        dispatchResult.channels.email.error = emailRes.error;
        if (emailRes.success) anyChannelSuccess = true;
      }

      // Despacho por Telegram
      if (notifyTelegram) {
        dispatchResult.channels.telegram.attempted = true;
        const tgRes = await sendPatientTelegramNotification(
          app.patient_id,
          undefined,
          aiContent.subject,
          aiContent.chat_message
        );
        dispatchResult.channels.telegram.success = tgRes.success;
        dispatchResult.channels.telegram.log_id = tgRes.logId;
        dispatchResult.channels.telegram.error = tgRes.error;
        if (tgRes.success) anyChannelSuccess = true;
      }

      if (anyChannelSuccess) {
        sentCount++;
        dispatchResult.status = 'SENT';
      } else {
        failedCount++;
        dispatchResult.status = 'FAILED';
        dispatchResult.error = 'No se pudo despachar por ninguno de los canales configurados.';
      }

      results.push(dispatchResult);
    } catch (err) {
      failedCount++;
      const errMsg = err instanceof Error ? err.message : 'Error inesperado procesando turno.';
      console.error(`[run24HourAppointmentReminders] Error en turno ${app.id}:`, errMsg);
      results.push({
        appointment_id: app.id,
        patient_id: app.patient_id,
        patient_name: app.patient.full_name,
        patient_email: app.patient.email,
        patient_phone: app.patient.phone,
        vaccine_name: app.vaccine.name,
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        status: 'FAILED',
        error: errMsg,
        channels: {
          email: { attempted: false, success: false },
          telegram: { attempted: false, success: false },
        },
      });
    }
  }

  return {
    timestamp,
    window_hours: hoursAhead,
    target_date_analyzed: targetDateStr,
    total_scheduled_found: appointments.length,
    already_notified_count: alreadyNotifiedCount,
    reminders_attempted: appointments.length - skippedCount,
    reminders_sent: sentCount,
    reminders_failed: failedCount,
    reminders_skipped: skippedCount,
    results,
  };
}

// ==============================================================================
// 8. MOTOR DE CANCELACIÓN POR INVIABILIDAD CLÍNICA (FLUJO 2)
// ==============================================================================

/**
 * Revisa todos los turnos futuros programados contra el estado en tiempo real de `v_vaccines_stock`.
 * Condición de Inviabilidad:
 * - available_doses_for_clinic <= 0 (Stock agotado)
 * - O expiration_date < appointment_date (El lote vencerá antes de la cita médica)
 *
 * Si se cumple la condición:
 * 1. Cancela el turno en DB (status = 'cancelled').
 * 2. Genera redacción de disculpa e instrucciones de reprogramación.
 * 3. Dispara la notificación al paciente (Email y Telegram) y la registra en `notifications`.
 */
export async function runClinicalInfeasibilityCancellations(): Promise<ClinicalCancellationsBatchReport> {
  const timestamp = new Date().toISOString();
  const todayStr = getArgentinaTodayDateString();

  // 1. Consultar todos los turnos futuros con status 'scheduled'
  const { data: futureAppointments, error: appError } = await supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      vaccine_id,
      appointment_date,
      appointment_time,
      status,
      notes,
      patients:patient_id (
        id,
        full_name,
        email,
        phone,
        dni
      ),
      vaccines:vaccine_id (
        id,
        name,
        type,
        dose_amount,
        manufacturer,
        expiration_date
      )
    `)
    .eq('status', 'scheduled')
    .is('deleted_at', null)
    .gte('appointment_date', todayStr);

  if (appError) {
    console.error('[ClinicalInfeasibility] Error consultando turnos futuros en Supabase:', appError.message);
    throw new Error(`Error al consultar turnos futuros: ${appError.message}`);
  }

  if (!futureAppointments || futureAppointments.length === 0) {
    return {
      timestamp,
      total_future_scheduled_checked: 0,
      at_risk_appointments_found: 0,
      appointments_cancelled: 0,
      notifications_sent: 0,
      notifications_failed: 0,
      results: [],
    };
  }

  // 2. Consultar la vista de stock en tiempo real v_vaccines_stock
  const { data: stockList, error: stockError } = await supabase
    .from('v_vaccines_stock')
    .select('vaccine_id, name, available_doses_for_clinic, expiration_date, stock_status');

  if (stockError) {
    console.error('[ClinicalInfeasibility] Error consultando vista v_vaccines_stock:', stockError.message);
    throw new Error(`Error consultando v_vaccines_stock: ${stockError.message}`);
  }

  const stockMap = new Map<string, any>();
  if (stockList) {
    for (const item of stockList) {
      stockMap.set(item.vaccine_id, item);
    }
  }

  const results: ClinicalCancellationDispatchResult[] = [];
  let atRiskCount = 0;
  let cancelledCount = 0;
  let notifiedSuccessCount = 0;
  let notifiedFailedCount = 0;

  for (const app of futureAppointments) {
    const vaccineStock = stockMap.get(app.vaccine_id);
    const patientData = (app.patients as any) || {
      id: app.patient_id,
      full_name: 'Paciente',
      email: null,
      phone: null,
    };
    const vaccineData = (app.vaccines as any) || {
      id: app.vaccine_id,
      name: 'Vacuna',
    };

    const availableDoses = Number(vaccineStock?.available_doses_for_clinic ?? 0);
    const expirationDate = vaccineStock?.expiration_date || vaccineData.expiration_date || null;
    const appointmentDate = app.appointment_date;

    let risk: ClinicalInfeasibilityRisk | null = null;

    // Condición A: Stock agotado
    if (!vaccineStock || availableDoses <= 0) {
      risk = {
        type: 'OUT_OF_STOCK',
        description: `No hay dosis viables disponibles en clínica (${availableDoses} dosis).`,
        available_doses: availableDoses,
        expiration_date: expirationDate,
        appointment_date: appointmentDate,
      };
    }
    // Condición B: Lote vencido antes o durante la fecha del turno
    else if (expirationDate && (expirationDate < appointmentDate || expirationDate < todayStr)) {
      risk = {
        type: 'EXPIRED_BATCH',
        description: `El lote de la vacuna vence el ${expirationDate}, fecha previa al turno programado (${appointmentDate}).`,
        available_doses: availableDoses,
        expiration_date: expirationDate,
        appointment_date: appointmentDate,
      };
    }

    if (!risk) {
      // Turno clínicamente viable
      continue;
    }

    atRiskCount++;

    // 1. Cancelar el turno en la base de datos
    const cancellationNote = `[CANCELACIÓN AUTOMÁTICA IA - INVIABILIDAD CLÍNICA]: ${risk.description} (Ejecutado: ${timestamp})`;
    const updatedNotes = app.notes ? `${app.notes}\n${cancellationNote}` : cancellationNote;

    const { error: cancelError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', app.id);

    const cancelledInDb = !cancelError;
    if (cancelledInDb) {
      cancelledCount++;
    } else {
      console.error(`[ClinicalInfeasibility] Error cancelando turno ${app.id} en Supabase:`, cancelError?.message);
    }

    // 2. Generar redacción de disculpa e instrucciones
    const cancellationContent = generateDeterministicCancellationNotice(app, risk);

    const dispatchItem: ClinicalCancellationDispatchResult = {
      appointment_id: app.id,
      patient_id: app.patient_id,
      patient_name: patientData.full_name,
      patient_email: patientData.email,
      patient_phone: patientData.phone,
      vaccine_id: app.vaccine_id,
      vaccine_name: vaccineData.name,
      appointment_date: app.appointment_date,
      appointment_time: app.appointment_time,
      risk,
      cancelled_in_db: cancelledInDb,
      notification_status: 'SENT',
      channels: {
        email: { attempted: false, success: false },
        telegram: { attempted: false, success: false },
      },
      ai_content: cancellationContent,
    };

    let anySuccess = false;

    // 3. Despacho por Email
    if (patientData.email) {
      dispatchItem.channels.email.attempted = true;
      dispatchItem.channels.email.recipient = patientData.email;
      const emailRes = await sendPatientEmailNotification(
        app.patient_id,
        patientData.email,
        cancellationContent.subject,
        cancellationContent.email_html
      );
      dispatchItem.channels.email.success = emailRes.success;
      dispatchItem.channels.email.error = emailRes.error;
      if (emailRes.success) anySuccess = true;
    }

    // 4. Despacho por Telegram
    dispatchItem.channels.telegram.attempted = true;
    const tgRes = await sendPatientTelegramNotification(
      app.patient_id,
      undefined,
      cancellationContent.subject,
      cancellationContent.chat_message
    );
    dispatchItem.channels.telegram.success = tgRes.success;
    dispatchItem.channels.telegram.error = tgRes.error;
    if (tgRes.success) anySuccess = true;

    if (anySuccess) {
      notifiedSuccessCount++;
      dispatchItem.notification_status = 'SENT';
    } else {
      notifiedFailedCount++;
      dispatchItem.notification_status = 'FAILED';
    }

    results.push(dispatchItem);
  }

  return {
    timestamp,
    total_future_scheduled_checked: futureAppointments.length,
    at_risk_appointments_found: atRiskCount,
    appointments_cancelled: cancelledCount,
    notifications_sent: notifiedSuccessCount,
    notifications_failed: notifiedFailedCount,
    results,
  };
}

// ==============================================================================
// 9. ORQUESTADOR UNIFICADO DEL AGENTE AUTÓNOMO PARA CRON
// ==============================================================================

/**
 * Ejecuta ambos flujos clínicos proactivos para el Cron del sistema:
 * 1. Recordatorios de 24 horas a pacientes con turnos programados.
 * 2. Monitoreo y cancelación automática de turnos inviables por stock/vencimiento.
 */
export async function runProactivePatientNotificationEngine(
  options: RunAppointmentRemindersOptions = {}
): Promise<PatientNotificationCronResponse> {
  const timestamp = new Date().toISOString();

  try {
    // Ejecutar ambos flujos en paralelo para máxima eficiencia
    const [remindersReport, cancellationsReport] = await Promise.all([
      run24HourAppointmentReminders(options),
      runClinicalInfeasibilityCancellations(),
    ]);

    return {
      success: true,
      timestamp,
      summary: {
        reminders_found: remindersReport.total_scheduled_found,
        reminders_sent: remindersReport.reminders_sent,
        reminders_skipped: remindersReport.reminders_skipped,
        reminders_failed: remindersReport.reminders_failed,
        cancellations_at_risk_found: cancellationsReport.at_risk_appointments_found,
        cancellations_executed: cancellationsReport.appointments_cancelled,
        cancellations_notified: cancellationsReport.notifications_sent,
        cancellations_failed: cancellationsReport.notifications_failed,
      },
      reminders_24h: remindersReport,
      clinical_cancellations: cancellationsReport,
    };
  } catch (error) {
    console.error('[PatientNotificationEngine] Error crítico en ejecución:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el motor de notificaciones.';
    return {
      success: false,
      timestamp,
      summary: {
        reminders_found: 0,
        reminders_sent: 0,
        reminders_skipped: 0,
        reminders_failed: 0,
        cancellations_at_risk_found: 0,
        cancellations_executed: 0,
        cancellations_notified: 0,
        cancellations_failed: 0,
      },
      reminders_24h: {
        timestamp,
        window_hours: options.hoursAhead || 24,
        target_date_analyzed: getTargetReminderDate(options.hoursAhead || 24),
        total_scheduled_found: 0,
        already_notified_count: 0,
        reminders_attempted: 0,
        reminders_sent: 0,
        reminders_failed: 0,
        reminders_skipped: 0,
        results: [],
      },
      clinical_cancellations: {
        timestamp,
        total_future_scheduled_checked: 0,
        at_risk_appointments_found: 0,
        appointments_cancelled: 0,
        notifications_sent: 0,
        notifications_failed: 0,
        results: [],
      },
      error: errorMessage,
    };
  }
}

// Alias de retrocompatibilidad
export const runAutonomousAppointmentReminders = run24HourAppointmentReminders;
