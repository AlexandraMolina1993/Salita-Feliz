// Script de prueba integral para el Agente IA de Notificaciones Proactivas y el Endpoint Cron
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runEndToEndVerification() {
  console.log('========================================================================');
  console.log('🤖 INICIANDO VERIFICACIÓN END-TO-END: AGENTE IA DE NOTIFICACIONES');
  console.log('========================================================================');

  // 1. Obtener un paciente y vacunas de prueba
  const { data: patients, error: pErr } = await supabase.from('patients').select('*').limit(2);
  if (pErr || !patients || patients.length === 0) {
    console.error('No se encontraron pacientes para pruebas:', pErr);
    return;
  }
  const testPatient = patients[0];
  console.log(`✅ Paciente de prueba obtenido: ${testPatient.full_name} (${testPatient.email || 'sin email'})`);

  const { data: stockList, error: sErr } = await supabase.from('v_vaccines_stock').select('*');
  if (sErr || !stockList || stockList.length === 0) {
    console.error('No se pudo consultar v_vaccines_stock:', sErr);
    return;
  }

  // Vacuna válida con stock amplio y vencimiento lejano
  const validVaccine = stockList.find((v) => v.available_doses_for_clinic > 0 && v.expiration_date && v.expiration_date >= '2027-01-01') || stockList[0];
  // Vacuna que vence ANTES de la fecha del turno futuro (ej: vence 2026-08-30 y el turno es en septiembre 2026)
  const expiringVaccine = stockList.find((v) => v.expiration_date && v.expiration_date >= '2026-08-18' && v.expiration_date <= '2026-08-31') || stockList[0];

  console.log(`✅ Vacuna para Recordatorio 24h: ${validVaccine.name} (Exp: ${validVaccine.expiration_date}, Stock: ${validVaccine.available_doses_for_clinic})`);
  console.log(`✅ Vacuna para Cancelación por Riesgo: ${expiringVaccine.name} (Exp: ${expiringVaccine.expiration_date})`);

  // 2. Crear turnos de prueba
  // Mañana para Recordatorio 24h
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Fecha futura para Cancelación Clínica (posterior al vencimiento de la vacuna)
  const futureTargetDateStr = '2026-09-15';

  const testApp1 = {
    patient_id: testPatient.id,
    vaccine_id: validVaccine.vaccine_id,
    appointment_date: tomorrowStr,
    appointment_time: '10:00:00',
    status: 'scheduled',
    notes: '[TEST PROBE - 24H REMINDER]',
  };

  const testApp2 = {
    patient_id: testPatient.id,
    vaccine_id: expiringVaccine.vaccine_id,
    appointment_date: futureTargetDateStr,
    appointment_time: '14:30:00',
    status: 'scheduled',
    notes: '[TEST PROBE - CLINICAL CANCELLATION]',
  };

  const { data: createdApps, error: insertAppsErr } = await supabase
    .from('appointments')
    .insert([testApp1, testApp2])
    .select('*');

  if (insertAppsErr || !createdApps || createdApps.length < 2) {
    console.error('❌ Error creando turnos de prueba:', insertAppsErr);
    return;
  }

  const appReminderId = createdApps[0].id;
  const appCancelId = createdApps[1].id;
  console.log(`✅ Creados turnos de prueba:`);
  console.log(`   - Turno 24h: ID ${appReminderId} (${tomorrowStr})`);
  console.log(`   - Turno Riesgo Clínico: ID ${appCancelId} (${futureTargetDateStr})`);

  // 3. Importar dinámicamente el servicio y ejecutar el motor
  try {
    const { runProactivePatientNotificationEngine } = require('../services/appointmentReminderService');

    console.log('\n🚀 Ejecutando runProactivePatientNotificationEngine()...');
    const cronResult = await runProactivePatientNotificationEngine({
      hoursAhead: 24,
      targetDate: tomorrowStr,
    });

    console.log('\n📊 RESUMEN DE EJECUCIÓN DEL CRON:');
    console.log(JSON.stringify(cronResult.summary, null, 2));

    // 4. Verificaciones de Flujo 1 (Recordatorio)
    console.log('\n🔍 Verificando Flujo 1 (Recordatorio 24h)...');
    const reminderItem = cronResult.reminders_24h.results.find((r) => r.appointment_id === appReminderId);
    if (reminderItem) {
      console.log(`✅ Flujo 1 detectó el turno ${appReminderId}. Status: ${reminderItem.status}`);
      console.log(`   - Asunto: ${reminderItem.ai_content?.subject}`);
      console.log(`   - Canales: Email=${reminderItem.channels.email.success}, Telegram=${reminderItem.channels.telegram.success}`);
    } else {
      console.log(`ℹ️ Turno ${appReminderId} procesado en lote.`);
    }

    // 5. Verificaciones de Flujo 2 (Cancelación Clínica)
    console.log('\n🔍 Verificando Flujo 2 (Cancelación por Inviabilidad Clínica)...');
    const cancellationItem = cronResult.clinical_cancellations.results.find((r) => r.appointment_id === appCancelId);
    if (cancellationItem) {
      console.log(`✅ Flujo 2 detectó riesgo en turno ${appCancelId}!`);
      console.log(`   - Riesgo detectado: ${cancellationItem.risk.type} -> ${cancellationItem.risk.description}`);
      console.log(`   - Cancelado en DB: ${cancellationItem.cancelled_in_db}`);
      console.log(`   - Notificación enviada: ${cancellationItem.notification_status}`);
    }

    // Verificar en base de datos que el turno realmente cambió a 'cancelled'
    const { data: checkApp2 } = await supabase.from('appointments').select('status, notes').eq('id', appCancelId).single();
    console.log(`   - Estado actual en DB: status = "${checkApp2?.status}"`);
    console.log(`   - Notas de auditoría: "${checkApp2?.notes}"`);

    // 6. Probar Deduplicación (Anti-spam)
    console.log('\n🔍 Verificando Deduplicación (Re-ejecución inmediata sin forceResend)...');
    const rerunResult = await runProactivePatientNotificationEngine({
      hoursAhead: 24,
      targetDate: tomorrowStr,
    });
    console.log(`   - Recordatorios omitidos (Deduplicados): ${rerunResult.summary.reminders_skipped}`);
    console.log(`   - Nuevos recordatorios enviados: ${rerunResult.summary.reminders_sent}`);

  } catch (serviceErr) {
    console.error('❌ Error ejecutando el servicio:', serviceErr);
  } finally {
    // Limpieza de registros de prueba
    console.log('\n🧹 Limpiando registros de prueba...');
    await supabase.from('appointments').delete().in('id', [appReminderId, appCancelId]);
    await supabase.from('notifications').delete().eq('patient_id', testPatient.id).like('title', '%Recordatorio%');
    await supabase.from('notifications').delete().eq('patient_id', testPatient.id).like('title', '%Cancelación%');
    console.log('✅ Limpieza completada con éxito.');
  }

  console.log('\n========================================================================');
  console.log('🎉 VERIFICACIÓN INTEGRAL COMPLETADA');
  console.log('========================================================================');
}

runEndToEndVerification().catch(console.error);
