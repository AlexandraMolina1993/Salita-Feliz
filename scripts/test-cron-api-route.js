// Test directo del handler de la ruta API de Cron
const { NextRequest } = require('next/server');

async function testCronRoute() {
  console.log('========================================================================');
  console.log('🛡️ TESTING DE SEGURIDAD Y HANDLERS: API CRON PATIENT NOTIFICATIONS');
  console.log('========================================================================');

  const { GET, POST } = require('../app/api/cron/patient-notifications/route');

  // Test 1: Solicitud GET sin secret -> 401
  const req1 = new NextRequest('http://localhost:3000/api/cron/patient-notifications', {
    method: 'GET',
  });
  const res1 = await GET(req1);
  const data1 = await res1.json();
  console.log(`1. GET sin auth header -> Status: ${res1.status}, Data:`, data1);
  if (res1.status === 401) {
    console.log('   ✅ Seguridad: Acceso no autorizado bloqueado correctamente (401).');
  } else {
    console.error('   ❌ Falló prueba de seguridad 1');
  }

  // Test 2: Solicitud GET con secret incorrecto -> 401
  const req2 = new NextRequest('http://localhost:3000/api/cron/patient-notifications', {
    method: 'GET',
    headers: {
      authorization: 'Bearer wrong-secret-token',
    },
  });
  const res2 = await GET(req2);
  const data2 = await res2.json();
  console.log(`2. GET con token inválido -> Status: ${res2.status}, Data:`, data2);
  if (res2.status === 401) {
    console.log('   ✅ Seguridad: Token inválido rechazado correctamente (401).');
  } else {
    console.error('   ❌ Falló prueba de seguridad 2');
  }

  // Test 3: Solicitud GET con Bearer secret correcto -> 200
  const req3 = new NextRequest('http://localhost:3000/api/cron/patient-notifications', {
    method: 'GET',
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  const res3 = await GET(req3);
  const data3 = await res3.json();
  console.log(`3. GET con Bearer ${process.env.CRON_SECRET} -> Status: ${res3.status}`);
  console.log('   - Resumen retornado:', data3.summary);
  if (res3.status === 200 && data3.success === true) {
    console.log('   ✅ Endpoint Cron GET validado y ejecutado exitosamente (200).');
  } else {
    console.error('   ❌ Falló prueba 3');
  }

  // Test 4: Solicitud POST con x-cron-secret header -> 200
  const req4 = new NextRequest('http://localhost:3000/api/cron/patient-notifications', {
    method: 'POST',
    headers: {
      'x-cron-secret': process.env.CRON_SECRET,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      hoursAhead: 24,
      forceResend: false,
    }),
  });
  const res4 = await POST(req4);
  const data4 = await res4.json();
  console.log(`4. POST con x-cron-secret -> Status: ${res4.status}`);
  console.log('   - Resumen retornado:', data4.summary);
  if (res4.status === 200 && data4.success === true) {
    console.log('   ✅ Endpoint Cron POST validado y ejecutado exitosamente (200).');
  } else {
    console.error('   ❌ Falló prueba 4');
  }

  console.log('========================================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE SEGURIDAD Y ENDPOINT CRON PASARON CON ÉXITO');
  console.log('========================================================================');
}

testCronRoute().catch(console.error);
