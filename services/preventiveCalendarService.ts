/**
 * Servicio del Agente IA de Calendario Preventivo
 * Salita Feliz - Enterprise Healthcare System
 *
 * Cobertura completa del Calendario Nacional de Vacunación de la República Argentina:
 * 1. Hitos Pediátricos (< 2 años):
 *    - Recién Nacido (0 meses): BCG, Hepatitis B
 *    - 2 Meses: Rotavirus, Neumococo Conjugada, Quíntuple (Pentavalente), Polio (IPV)
 *    - 3 Meses: Meningococo
 *    - 4 Meses: Rotavirus, Neumococo Conjugada, Quíntuple, Polio (IPV)
 *    - 6 Meses: Quíntuple, Polio (IPV)
 *    - 12 Meses: Triple Viral, Hepatitis A, Neumococo Conjugada (Refuerzo)
 *    - 15 Meses: Meningococo, Varicela
 *    - 18 Meses: Quíntuple, Polio (IPV)
 * 2. Hitos Escolares / Adolescentes:
 *    - 5 Años: Ingreso Escolar (IPV, Triple Viral, Triple Bacteriana Celular DTP, Varicela)
 *    - 11 Años: VPH, Triple Bacteriana Acelular dTpa, Meningococo, Fiebre Amarilla
 * 3. Hitos Adultos:
 *    - Refuerzo Decenal (cada 10 años: 16, 26, 36, 46, 56... años): Doble Adultos dT, Hepatitis B
 *    - 65 Años: Adulto Mayor (Antigripal anual, Neumococo conjugada/polisacárida, Doble Adultos dT)
 */

import { supabase } from '@/lib/supabase';
import {
  getArgentinaCurrentDateTimeInfo,
  getArgentinaTodayDateString,
} from '@/lib/dateUtils';
import {
  sendPatientEmailNotification,
  sendPatientTelegramNotification,
} from '@/services/appointmentReminderService';
import { sendTelegramAlert } from '@/lib/telegram';
import type {
  PreventiveMilestone,
  PreventiveCandidate,
  PreventiveDispatchItemResult,
  PreventiveCalendarReport,
  RunPreventiveCalendarOptions,
} from '@/types/preventiveCalendar';

// ==============================================================================
// 1. DICCIONARIO COMPLETO DEL CALENDARIO NACIONAL DE VACUNACIÓN (ARGENTINA)
// ==============================================================================

export const PREVENTIVE_MILESTONES: PreventiveMilestone[] = [
  // --- HITOS PEDIÁTRICOS (MESES) ---
  {
    key: 'NEWBORN',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 0,
    title: 'Hito Recién Nacido (0 Meses) • Primeras Horas de Vida',
    subtitle: 'Inmunización neonatal esencial previa al egreso de la maternidad',
    isPediatric: true,
    vaccines: [
      {
        name: 'BCG (Bacilo Calmette-Guérin)',
        doses: 'Dosis única neonatal',
        description: 'Protege contra las formas graves y diseminadas de tuberculosis (meningitis tuberculosa y sepsis miliar).',
      },
      {
        name: 'Hepatitis B Pediátrica',
        doses: 'Dosis neonatal dentro de las 12h de vida',
        description: 'Bloquea la transmisión vertical madre-hijo y previene la infección aguda o crónica de hepatitis B.',
      },
    ],
    clinicalGuidelines: [
      'Aplicar de forma prioritaria antes del egreso hospitalario o sanatorial.',
      'Asentar en la Libreta Sanitaria Infantil / Certificado de Nacimiento Oficial.',
      'No requiere orden médica por estar garantizada en el Calendario Nacional Gratuito.',
    ],
  },
  {
    key: '2_MONTHS',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 2,
    title: 'Hito 2 Meses • Protección Inicial del Lactante',
    subtitle: 'Inicio del esquema primario contra patógenos respiratorios y digestivos',
    isPediatric: true,
    vaccines: [
      {
        name: 'Rotavirus',
        doses: '1ra dosis (Vía oral)',
        description: 'Previene gastroenteritis agudas graves, deshidratación e internaciones pediátricas.',
      },
      {
        name: 'Neumococo Conjugada 13-valente',
        doses: '1ra dosis',
        description: 'Protege contra neumonía invasiva, bacteriemia, meningitis neumocócica y otitis media.',
      },
      {
        name: 'Quíntuple / Pentavalente (DTP-HB-Hib)',
        doses: '1ra dosis',
        description: 'Protección combinada contra Difteria, Tétanos, Tos Convulsa, Hepatitis B y Haemophilus influenzae b.',
      },
      {
        name: 'Poliomielitis Inactivada (IPV / Salk)',
        doses: '1ra dosis inyectable',
        description: 'Inmunidad segura contra los poliovirus tipo 1, 2 y 3 sin riesgo de poliovirus vacunal.',
      },
    ],
    clinicalGuidelines: [
      'Presentar la Libreta Sanitaria Infantil / Carnet de Vacunación del menor.',
      'La vacuna contra Rotavirus es oral; procurar que el lactante se encuentre sereno para evitar regurgitaciones.',
      'Consultar pautas de puericultura y control térmico con el equipo de enfermería.',
    ],
  },
  {
    key: '3_MONTHS',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 3,
    title: 'Hito 3 Meses • Protección contra Meningococo',
    subtitle: 'Prevención de enfermedad meningocócica invasiva aguda',
    isPediatric: true,
    vaccines: [
      {
        name: 'Meningococo tetravalente (MenACWY)',
        doses: '1ra dosis',
        description: 'Protege contra serogrupos A, C, W e Y de Neisseria meningitidis (meningitis bacteriana y sepsis).',
      },
    ],
    clinicalGuidelines: [
      'Concurrir con la Libreta de Salud del menor y DNI físico.',
      'Intervalo mínimo respetado con las dosis de los 2 meses.',
      'Vacuna intramuscular gratuita sin orden médica previa.',
    ],
  },
  {
    key: '4_MONTHS',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 4,
    title: 'Hito 4 Meses • Segunda Dosis del Lactante',
    subtitle: 'Consolidación de títulos de anticuerpos del esquema primario',
    isPediatric: true,
    vaccines: [
      {
        name: 'Rotavirus',
        doses: '2da dosis (Vía oral)',
        description: 'Completa la serie de inmunidad digestiva infantil.',
      },
      {
        name: 'Neumococo Conjugada 13-valente',
        doses: '2da dosis',
        description: 'Afianza la protección frente a cepas invasivas de Streptococcus pneumoniae.',
      },
      {
        name: 'Quíntuple / Pentavalente (DTP-HB-Hib)',
        doses: '2da dosis',
        description: 'Refuerzo de defensas bacterianas y virales pediátricas.',
      },
      {
        name: 'Poliomielitis Inactivada (IPV / Salk)',
        doses: '2da dosis',
        description: 'Continuidad del esquema de erradicación de polio.',
      },
    ],
    clinicalGuidelines: [
      'Presentar Libreta de Vacunación del bebé y DNI.',
      'Respetar el intervalo de 60 días con la primera serie de los 2 meses.',
      'Supervisar tolerancia habitual y pautas de hidratación posvacunal.',
    ],
  },
  {
    key: '6_MONTHS',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 6,
    title: 'Hito 6 Meses • Tercera Dosis e Inmunización Semestral',
    subtitle: 'Culminación del esquema básico del primer semestre de vida',
    isPediatric: true,
    vaccines: [
      {
        name: 'Quíntuple / Pentavalente (DTP-HB-Hib)',
        doses: '3ra dosis',
        description: 'Completa la serie primaria trivalente de base bacteriana y viral.',
      },
      {
        name: 'Poliomielitis Inactivada (IPV / Salk)',
        doses: '3ra dosis',
        description: 'Cierra el esquema primario inyectable contra poliovirus.',
      },
    ],
    clinicalGuidelines: [
      'Presentar Libreta de Salud Infantil para asentar el cierre del primer semestre.',
      'A los 6 meses corresponde además evaluar la indicación de vacuna Antigripal pediátrica estacional.',
      'Vacunación libre y gratuita en Salita Feliz.',
    ],
  },
  {
    key: '12_MONTHS',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 12,
    title: 'Hito 12 Meses (1 Año) • Hito del Primer Año',
    subtitle: 'Inmunización con vacunas a virus vivos y refuerzo neumocócico',
    isPediatric: true,
    vaccines: [
      {
        name: 'Triple Viral (SRP)',
        doses: '1ra dosis',
        description: 'Protege contra Sarampión, Rubéola y Paperas (parotiditis epidémica).',
      },
      {
        name: 'Hepatitis A',
        doses: 'Dosis única oficial',
        description: 'Erradicó el trasplante hepático fulminante en pediatría en la Argentina.',
      },
      {
        name: 'Neumococo Conjugada',
        doses: 'Dosis de refuerzo anual',
        description: 'Refuerzo de consolidación de inmunidad respiratoria.',
      },
    ],
    clinicalGuidelines: [
      'Concurrir con Libreta de Vacunas y DNI del niño/a.',
      'Hito sanitario central de la infancia: celebrar el primer año con carnet al día.',
      'Pueden administrarse conjuntamente en sitios anatómicos diferenciados.',
    ],
  },
  {
    key: '15_MONTHS',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 15,
    title: 'Hito 15 Meses • Refuerzo Meningococo y Varicela',
    subtitle: 'Inmunización cutánea y refuerzo meningocócico',
    isPediatric: true,
    vaccines: [
      {
        name: 'Meningococo tetravalente (MenACWY)',
        doses: 'Dosis de refuerzo',
        description: 'Refuerzo prolongado para sostener anticuerpos contra la sepsis meningocócica.',
      },
      {
        name: 'Varicela',
        doses: '1ra dosis',
        description: 'Previene la varicela típica y sus complicaciones dérmicas y sobreinfecciones bacterianas.',
      },
    ],
    clinicalGuidelines: [
      'Llevar Libreta Sanitaria Infantil para asentar ambas aplicaciones.',
      'Vigilar eventuales exantemas leves benignos típicos de vacunas a virus atenuados.',
    ],
  },
  {
    key: '18_MONTHS',
    category: 'PEDIATRIC',
    targetUnit: 'MONTHS',
    ageMonths: 18,
    title: 'Hito 18 Meses (1 Año y Medio) • Refuerzo Quíntuple e IPV',
    subtitle: 'Refuerzo de inmunidad bacteriana y antipoliomielítica antes de los 2 años',
    isPediatric: true,
    vaccines: [
      {
        name: 'Quíntuple / Pentavalente (DTP-HB-Hib)',
        doses: '1er refuerzo',
        description: 'Refuerza títulos de anticuerpos contra difteria, tétanos, pertussis e Hib.',
      },
      {
        name: 'Poliomielitis Inactivada (IPV / Salk)',
        doses: '1er refuerzo',
        description: 'Refuerzo inyectable de IPV.',
      },
    ],
    clinicalGuidelines: [
      'Presentar Libreta de Vacunación del menor.',
      'Oportunidad para verificar estado completo de esquemas antes de cumplir los 2 años de vida.',
    ],
  },

  // --- HITOS ESCOLARES Y ADOLESCENTES ---
  {
    key: '5_YEARS',
    category: 'SCHOOL',
    targetUnit: 'YEARS',
    ageYears: 5,
    title: 'Hito 5 Años • Ingreso Escolar',
    subtitle: 'Refuerzo esencial para la etapa escolar inicial',
    isPediatric: true,
    vaccines: [
      {
        name: 'Poliomielitis Inactivada (IPV / Salk)',
        doses: 'Refuerzo de ingreso escolar',
        description: 'Protección contra parálisis flácida aguda y poliovirus.',
      },
      {
        name: 'Triple Viral (SRP)',
        doses: '2da dosis obligatoria',
        description: 'Cubre Sarampión, Rubéola y Paperas para evitar brotes comunitarios en las escuelas.',
      },
      {
        name: 'Triple Bacteriana Celular (DTP)',
        doses: '2do refuerzo',
        description: 'Refuerzo contra Difteria, Tétanos y Tos Convulsa.',
      },
      {
        name: 'Varicela',
        doses: '2da dosis',
        description: 'Garantiza protección duradera de por vida contra la varicela.',
      },
    ],
    clinicalGuidelines: [
      'Requisito indispensable para la matriculación e inicio del ciclo lectivo primario.',
      'Asistir con la Libreta Sanitaria Infantil / Carnet de Vacunación y DNI del alumno/a.',
      'En caso de esquemas incompletos, el equipo de enfermería actualizará las dosis pendientes.',
    ],
  },
  {
    key: '11_YEARS',
    category: 'SCHOOL',
    targetUnit: 'YEARS',
    ageYears: 11,
    title: 'Hito 11 Años • Vacunación Adolescente',
    subtitle: 'Protección integral previa al egreso escolar primario',
    isPediatric: true,
    vaccines: [
      {
        name: 'VPH (Virus del Papiloma Humano)',
        doses: 'Dosis única (esquema nacional oficial simplificado)',
        description: 'Previene cánceres asociados a VPH (cuello uterino, ano, orofaringe) y verrugas genitales.',
      },
      {
        name: 'Triple Bacteriana Acelular (dTpa)',
        doses: 'Refuerzo de los 11 años',
        description: 'Protege contra Difteria, Tétanos y Tos Convulsa / Coqueluche con componente acelular de alta tolerancia.',
      },
      {
        name: 'Meningococo tetravalente (MenACWY)',
        doses: 'Dosis única a los 11 años',
        description: 'Previene meningitis y sepsis meningocócica en la etapa adolescente.',
      },
      {
        name: 'Fiebre Amarilla (Zonas de riesgo)',
        doses: 'Refuerzo a los 11 años si reside en zona endémica',
        description: 'Para residentes de Misiones, Corrientes y zonas limítrofes indicadas.',
      },
    ],
    clinicalGuidelines: [
      'Presentar Documento Nacional de Identidad (DNI) y Libreta de Salud / Carnet de Vacunas.',
      'No se requiere orden médica por estar incluidas en el Calendario Nacional Gratuito.',
      'Pueden coadministrarse en el mismo acto de vacunación en brazos opuestos.',
    ],
  },

  // --- HITOS ADULTOS ---
  {
    key: 'ADULT_10Y',
    category: 'ADULT',
    targetUnit: 'YEARS',
    title: 'Hito Adultos • Refuerzo Decenal (Cada 10 Años)',
    subtitle: 'Mantenimiento continuo de títulos protectores contra Tétanos y Difteria',
    isPediatric: false,
    vaccines: [
      {
        name: 'Doble Adultos / Doble Bacteriana (dT)',
        doses: 'Refuerzo cada 10 años',
        description: 'Garantiza protección permanente contra el Tétanos (ante cortes, heridas o cirugías) y la Difteria.',
      },
      {
        name: 'Hepatitis B Adultos',
        doses: 'Iniciar o completar esquema de 3 dosis',
        description: 'Vacunación universal de por vida para todos los adultos que no hayan completado el esquema.',
      },
    ],
    clinicalGuidelines: [
      'Presentar Documento Nacional de Identidad (DNI) físico.',
      'Llevar carnet de vacunación previo si dispone de constancias anteriores.',
      'Vacunación libre, universal y gratuita en el vacunatorio sin orden médica.',
    ],
  },
  {
    key: '65_YEARS',
    category: 'ADULT',
    targetUnit: 'YEARS',
    ageYears: 65,
    title: 'Hito 65 Años • Protección del Adulto Mayor',
    subtitle: 'Inmunización prioritaria respiratoria y refuerzos decenales',
    isPediatric: false,
    vaccines: [
      {
        name: 'Vacuna Antigripal',
        doses: '1 dosis anual obligatoria',
        description: 'Reduce complicaciones respiratorias, neumonías, internaciones y cuadros graves de influenza.',
      },
      {
        name: 'Neumococo (Esquema Secuencial Conjugada / Polisacárida)',
        doses: 'Esquema según antecedentes clínicos',
        description: 'Protege contra neumonía invasiva, bacteriemia y meningitis neumocócica.',
      },
      {
        name: 'Doble Adultos (dT)',
        doses: 'Refuerzo decenal (cada 10 años)',
        description: 'Refuerzo continuo antitetánico y antidiftérico.',
      },
    ],
    clinicalGuidelines: [
      'Vacunación libre y 100% gratuita sin necesidad de prescripción médica para mayores de 65.',
      'Concurrir con DNI físico y carnet de vacunas previo si dispone del mismo.',
      'La vacuna antigripal y antineumocócica pueden coadministrarse en sitios anatómicos diferentes.',
    ],
  },
];

// ==============================================================================
// 2. GENERADOR DINÁMICO DE MENSAJES Y PLANTILLAS HTML CLÍNICAS
// ==============================================================================

function buildPreventiveEmailHtml(candidate: PreventiveCandidate): string {
  const { fullName, milestone, ageDisplay } = candidate;
  const isPediatric = milestone.isPediatric;

  const vaccinesListHtml = milestone.vaccines
    .map(
      (v) => `
      <li style="margin-bottom: 12px; line-height: 1.5;">
        <strong style="color: #0f766e; font-size: 14px;">${v.name}</strong> 
        <span style="color: #64748b; font-size: 12px;">(${v.doses})</span><br/>
        <span style="color: #334155; font-size: 13px;">${v.description}</span>
      </li>
    `
    )
    .join('');

  const guidelinesHtml = milestone.clinicalGuidelines
    .map(
      (g) => `
      <li style="margin-bottom: 6px; color: #475569; font-size: 13px;">
        ${g}
      </li>
    `
    )
    .join('');

  // Texto adaptado dinámicamente si es paciente menor o adulto
  const saludo = isPediatric
    ? `Estimada familia y adultos responsables de <strong>${fullName}</strong>,`
    : `Estimado/a <strong>${fullName}</strong>,`;

  const descripcionCuerpo = isPediatric
    ? `Nuestro sistema de vigilancia preventiva de <strong>Salita Feliz</strong> ha detectado que en este mes <strong>${fullName}</strong> alcanza el hito sanitario de <strong>${ageDisplay}</strong>, una etapa clave del Calendario Nacional de Vacunación Gratuito y Obligatorio.`
    : `Le informamos que en este mes alcanza los <strong>${ageDisplay}</strong>, momento estipulado en las normas sanitarias nacionales para la actualización de sus refuerzos del Calendario Nacional de Vacunación.`;

  const cierreTexto = isPediatric
    ? 'Recordá que la vacunación oportuna en la infancia previene enfermedades graves y protege a toda la comunidad educativa y familiar. ¡Los esperamos en Salita Feliz!'
    : 'Mantener al día tus refuerzos es una decisión fundamental para tu salud y bienestar cotidiano. ¡Te esperamos en Salita Feliz!';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${milestone.title} - Salita Feliz</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #ccfbf1; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 118, 110, 0.08);">
        
        <!-- Header Clínico -->
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 32px 28px; text-align: center;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 6px 14px; border-radius: 9999px; margin-bottom: 12px;">
            <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
              🛡️ Calendario Nacional de Vacunación Gratuito
            </span>
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">
            ${milestone.title}
          </h1>
          <p style="color: #ccfbf1; margin: 8px 0 0 0; font-size: 14px;">
            ${milestone.subtitle}
          </p>
        </div>

        <!-- Contenido -->
        <div style="padding: 28px;">
          <p style="font-size: 15px; color: #1e293b; margin-top: 0; margin-bottom: 16px;">
            ${saludo}
          </p>

          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
            ${descripcionCuerpo}
          </p>

          <!-- Vacunas correspondientes -->
          <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 14px 0; color: #115e59; font-size: 15px; font-weight: 700;">
              💉 Vacunas gratuitas correspondientes para esta etapa:
            </h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${vaccinesListHtml}
            </ul>
          </div>

          <!-- Pautas para concurrir (Libreta para menor / DNI para adulto) -->
          <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
            <h4 style="margin: 0 0 8px 0; color: #0f766e; font-size: 14px; font-weight: 700;">
              📋 Pautas y Documentación Requerida:
            </h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${guidelinesHtml}
            </ul>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            ${cierreTexto}
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 0; color: #0f766e; font-weight: 700;">
            Centro de Salud y Vacunatorio "Salita Feliz"
          </p>
          <p style="margin: 4px 0 0 0; color: #64748b;">
            Horario de Vacunatorio: Lunes a Viernes de 08:00 a 18:00 hs.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildPreventiveTelegramMessage(candidate: PreventiveCandidate): string {
  const { fullName, milestone, ageDisplay } = candidate;
  const isPediatric = milestone.isPediatric;

  const vaccinesText = milestone.vaccines
    .map((v) => `• <b>${v.name}:</b> ${v.doses}`)
    .join('\n');

  if (isPediatric) {
    return `
👶 <b>Salita Feliz • Vacunación Pediátrica Preventiva</b>

Hola familia de <b>${fullName}</b>:
🎈 Les informamos que en este mes alcanza los <b>${ageDisplay}</b>.
🛡️ <b>${milestone.title}</b>

💉 <b>Vacunas gratuitas y obligatorias indicadas:</b>
${vaccinesText}

📋 <b>Recomendaciones:</b>
• Traer la <b>Libreta Sanitaria Infantil / Carnet de Vacunación</b> del menor.
• Presentar <b>DNI físico</b> del niño/a.
• Concurrir acompañado por madre, padre o adulto responsable.
• No se requiere orden médica previa.

<i>¡Cuidar el calendario de vacunación desde el inicio de la vida es proteger su futuro!</i>
    `.trim();
  }

  // Adultos
  return `
🏥 <b>Salita Feliz • Calendario Preventivo de Adultos</b>

Hola <b>${fullName}</b>:
🎂 Te informamos que en este mes de tu cumpleaños (${ageDisplay}) te corresponde actualizar tus refuerzos de calendario.
🛡️ <b>${milestone.title}</b>

💉 <b>Vacunas gratuitas indicadas:</b>
${vaccinesText}

📋 <b>Recomendaciones:</b>
• Presentar <b>DNI físico</b>.
• Llevar carnet de vacunación previo si disponés de él.
• Vacunación 100% gratuita y sin turno previo.

<i>¡Mantener tus defensas al día es salud para vos y para toda la comunidad!</i>
  `.trim();
}

// ==============================================================================
// 3. MOTOR DE EVALUACIÓN Y DESPACHO
// ==============================================================================

/**
 * Evalúa a un paciente frente a la totalidad de los hitos del Calendario Nacional:
 * - Menores de 2 años (0 a 23 meses): evalúa la edad exacta en meses (`diffMonths`).
 * - A partir de los 2 años: evalúa pacientes en su mes de cumpleaños (`bMonth === targetMonth`)
 *   en los hitos específicos (5 años, 11 años, 65 años) y refuerzos decenales de adultos
 *   (a partir de los 16 años cada 10 años: 16, 26, 36, 46, 56, 76, 86...).
 */
export function matchPatientWithPreventiveMilestone(
  birthDateString: string,
  targetYear: number,
  targetMonth: number,
  filterKey?: string
): { milestone: PreventiveMilestone; ageDisplay: string; currentAgeYears: number; currentAgeMonths: number } | null {
  const parts = birthDateString.split('-');
  if (parts.length < 3) return null;

  const bYear = parseInt(parts[0], 10);
  const bMonth = parseInt(parts[1], 10);
  if (isNaN(bYear) || isNaN(bMonth)) return null;

  // 1. Diferencia en meses exactos desde el nacimiento hasta el mes objetivo
  const diffMonths = (targetYear - bYear) * 12 + (targetMonth - bMonth);
  const isBirthMonth = (bMonth === targetMonth);
  const ageYears = targetYear - bYear;

  // Si aún no nació en el mes evaluado, descartar
  if (diffMonths < 0) return null;

  let matchedMilestone: PreventiveMilestone | null = null;
  let ageDisplay = '';

  // A) Hitos Pediátricos (< 24 meses) evaluados por meses exactos
  if (diffMonths <= 23) {
    if (diffMonths === 0) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === 'NEWBORN') || null;
      ageDisplay = 'Recién Nacido (0 meses)';
    } else if (diffMonths === 2) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '2_MONTHS') || null;
      ageDisplay = '2 Meses';
    } else if (diffMonths === 3) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '3_MONTHS') || null;
      ageDisplay = '3 Meses';
    } else if (diffMonths === 4) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '4_MONTHS') || null;
      ageDisplay = '4 Meses';
    } else if (diffMonths === 6) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '6_MONTHS') || null;
      ageDisplay = '6 Meses';
    } else if (diffMonths === 12) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '12_MONTHS') || null;
      ageDisplay = '12 Meses (1 año)';
    } else if (diffMonths === 15) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '15_MONTHS') || null;
      ageDisplay = '15 Meses';
    } else if (diffMonths === 18) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '18_MONTHS') || null;
      ageDisplay = '18 Meses (1 año y medio)';
    }
  }

  // B) Hitos Escolares, Adolescentes y Adultos (a partir de los 2 años, en su mes de cumpleaños)
  if (!matchedMilestone && isBirthMonth && ageYears >= 2) {
    if (ageYears === 5) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '5_YEARS') || null;
      ageDisplay = '5 Años';
    } else if (ageYears === 11) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '11_YEARS') || null;
      ageDisplay = '11 Años';
    } else if (ageYears === 65) {
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === '65_YEARS') || null;
      ageDisplay = '65 Años';
    } else if (ageYears >= 16 && (ageYears - 6) % 10 === 0 && ageYears !== 65) {
      // Regla clínica de adultos: a partir de los 16 años en múltiplos de 10 (16, 26, 36, 46, 56, 76, 86...)
      // 10 años después del refuerzo escolar de los 6 años.
      matchedMilestone = PREVENTIVE_MILESTONES.find((m) => m.key === 'ADULT_10Y') || null;
      ageDisplay = `${ageYears} Años (Refuerzo Decenal)`;
    }
  }

  if (!matchedMilestone) return null;

  // Filtrado opcional solicitado por la UI o el cron
  if (filterKey && filterKey !== 'ALL') {
    // Soporte para claves directas o compatibilidad con '5', '11', '65'
    const isKeyMatch = matchedMilestone.key === filterKey;
    const isLegacyAgeMatch =
      (filterKey === '5' && matchedMilestone.key === '5_YEARS') ||
      (filterKey === '11' && matchedMilestone.key === '11_YEARS') ||
      (filterKey === '65' && matchedMilestone.key === '65_YEARS');

    if (!isKeyMatch && !isLegacyAgeMatch) {
      return null;
    }
  }

  return {
    milestone: matchedMilestone,
    ageDisplay,
    currentAgeYears: ageYears,
    currentAgeMonths: diffMonths,
  };
}

/**
 * Ejecuta el ciclo del Agente de Calendario Preventivo sobre la base de pacientes activos:
 * 1. Resuelve mes y año objetivo oficial.
 * 2. Consulta a los pacientes activos en Supabase.
 * 3. Ejecuta el cruce de hitos cronológicos pediátricos, escolares y adultos.
 * 4. Deduplica contra la tabla `notifications` (30 días).
 * 5. Despacha por Gmail y Telegram.
 * 6. Registra auditoría y despacha resumen ejecutivo administrativo.
 */
export async function runPreventiveCalendarEngine(
  options: RunPreventiveCalendarOptions = {}
): Promise<PreventiveCalendarReport> {
  const dtInfo = getArgentinaCurrentDateTimeInfo();
  const todayStr = getArgentinaTodayDateString();
  const [todayYear, todayMonth] = todayStr.split('-').map(Number);

  const targetMonth = options.targetMonth ?? todayMonth; // 1-12
  const targetYear = options.targetYear ?? todayYear;
  const forceResend = options.forceResend ?? false;
  const filterKey = options.milestoneKey || (options.milestoneAge ? String(options.milestoneAge) : 'ALL');
  const notifyEmail = options.notifyEmail ?? true;
  const notifyTelegram = options.notifyTelegram ?? true;

  console.log('================================================================================');
  console.log('🗓️ [Agente Calendario Preventivo] INICIANDO AUDITORÍA CLÍNICA EXPANDIDA');
  console.log(`   📅 Mes Objetivo: ${targetMonth} / ${targetYear}`);
  console.log(`   🔄 Forzar Reenvío: ${forceResend ? 'SÍ' : 'NO'}`);
  console.log(`   🎯 Filtro de Hito: ${filterKey}`);
  console.log('================================================================================');

  // 1. Consultar pacientes activos en Supabase
  const { data: rawPatients, error: patientsError } = await supabase
    .from('patients')
    .select('id, full_name, dni, birth_date, email, phone, is_active')
    .eq('is_active', true)
    .not('birth_date', 'is', null);

  if (patientsError) {
    console.error('❌ [Agente Calendario Preventivo] Error al consultar pacientes:', patientsError);
    throw new Error(`Error en consulta de pacientes: ${patientsError.message}`);
  }

  const activePatients = rawPatients || [];
  console.log(`👥 [Agente Calendario Preventivo] Pacientes activos con fecha de nacimiento: ${activePatients.length}`);

  // 2. Identificar candidatos según la regla de hitos cronológicos
  const candidates: PreventiveCandidate[] = [];

  for (const patient of activePatients) {
    if (!patient.birth_date) continue;

    const match = matchPatientWithPreventiveMilestone(
      patient.birth_date,
      targetYear,
      targetMonth,
      filterKey
    );

    if (match) {
      candidates.push({
        patientId: patient.id,
        fullName: patient.full_name || 'Paciente',
        dni: patient.dni || 'Sin DNI',
        birthDate: patient.birth_date,
        currentAgeYears: match.currentAgeYears,
        currentAgeMonths: match.currentAgeMonths,
        ageDisplay: match.ageDisplay,
        email: patient.email || null,
        phone: patient.phone || null,
        milestone: match.milestone,
      });
    }
  }

  console.log(`🎯 [Agente Calendario Preventivo] Candidatos identificados para hitos de vacunación: ${candidates.length}`);

  // 3. Consultar notificaciones previas en los últimos 30 días para deduplicación
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('patient_id, title, created_at')
    .gte('created_at', thirtyDaysAgo);

  const recentSet = new Set<string>();
  if (recentNotifications) {
    for (const notif of recentNotifications) {
      if (notif.patient_id) {
        recentSet.add(notif.patient_id);
      }
    }
  }

  // 4. Despacho a pacientes y registro de auditoría
  const results: PreventiveDispatchItemResult[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const candidate of candidates) {
    const alreadyNotified = recentSet.has(candidate.patientId);

    if (alreadyNotified && !forceResend) {
      console.log(`⏭️ [Agente Calendario Preventivo] Paciente ${candidate.fullName} omitido (ya notificado en los últimos 30 días).`);
      skippedCount++;
      results.push({
        candidate,
        channels: {
          email: { attempted: false, success: false },
          telegram: { attempted: false, success: false },
        },
        status: 'SKIPPED',
        alreadyNotifiedRecently: true,
      });
      continue;
    }

    const emailSubject = `🛡️ Calendario Preventivo: Vacunación ${candidate.ageDisplay} - Salita Feliz`;
    const emailHtml = buildPreventiveEmailHtml(candidate);
    const telegramMessage = buildPreventiveTelegramMessage(candidate);

    let emailResult = { attempted: false, success: false as boolean, error: undefined as string | undefined, logId: undefined as string | undefined };
    let telegramResult = { attempted: false, success: false as boolean, error: undefined as string | undefined, logId: undefined as string | undefined };

    // Envío por Email si está habilitado y tiene correo registrado
    if (notifyEmail && candidate.email) {
      emailResult.attempted = true;
      try {
        const res = await sendPatientEmailNotification(
          candidate.patientId,
          candidate.email,
          emailSubject,
          emailHtml
        );
        emailResult.success = res.success;
        emailResult.error = res.error;
        emailResult.logId = res.logId;
      } catch (e: any) {
        emailResult.error = e.message || 'Error desconocido en email';
      }
    }

    // Envío por Telegram
    if (notifyTelegram) {
      telegramResult.attempted = true;
      try {
        const res = await sendPatientTelegramNotification(
          candidate.patientId,
          candidate.phone || undefined,
          emailSubject,
          telegramMessage
        );
        telegramResult.success = res.success;
        telegramResult.error = res.error;
        telegramResult.logId = res.logId;
      } catch (e: any) {
        telegramResult.error = e.message || 'Error desconocido en Telegram';
      }
    }

    const anySent = emailResult.success || telegramResult.success;
    const anyFailed = (emailResult.attempted && !emailResult.success) || (telegramResult.attempted && !telegramResult.success);

    if (anySent) {
      sentCount++;
    } else if (anyFailed) {
      failedCount++;
    }

    results.push({
      candidate,
      channels: {
        email: emailResult,
        telegram: telegramResult,
      },
      status: anySent ? 'SENT' : anyFailed ? 'FAILED' : 'SKIPPED',
      alreadyNotifiedRecently: false,
    });
  }

  // 5. Alerta ejecutiva para el equipo médico / administrativo en Telegram con formato HTML renderizado
  if (candidates.length > 0) {
    try {
      const summaryMsg = `
🔔 <b>Agente IA • Reporte de Calendario Preventivo</b>
🗓️ <b>Mes evaluado:</b> ${targetMonth}/${targetYear}
👥 <b>Pacientes en Hitos de Vacunación:</b> ${candidates.length}
📨 <b>Notificados:</b> ${sentCount} | ⏭️ <b>Omitidos:</b> ${skippedCount} | ❌ <b>Fallidos:</b> ${failedCount}

<i>Candidatos:</i>
${candidates.slice(0, 5).map((c) => `• ${c.fullName} (${c.ageDisplay} - ${c.milestone.title})`).join('\n')}${candidates.length > 5 ? `\n... y ${candidates.length - 5} más.` : ''}
      `.trim();
      await sendTelegramAlert(summaryMsg, 'HTML');
    } catch (tgErr) {
      console.warn('⚠️ [Agente Calendario Preventivo] No se pudo enviar el resumen ejecutivo a Telegram:', tgErr);
    }
  }

  const report: PreventiveCalendarReport = {
    executedAt: dtInfo.nowUTC,
    targetMonth,
    targetYear,
    totalActivePatientsChecked: activePatients.length,
    eligibleCandidatesCount: candidates.length,
    notificationsSentCount: sentCount,
    notificationsFailedCount: failedCount,
    alreadyNotifiedCount: skippedCount,
    results,
    summary: `Auditoría completada para el mes ${targetMonth}/${targetYear}. ${candidates.length} candidatos detectados, ${sentCount} despachos concretados.`,
  };

  console.log('================================================================================');
  console.log(`✅ [Agente Calendario Preventivo] FIN DE AUDITORÍA: ${report.summary}`);
  console.log('================================================================================');

  return report;
}
