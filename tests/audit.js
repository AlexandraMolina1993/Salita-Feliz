const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function runLighthouseAudit() {
  // 1. Iniciar Chrome en segundo plano
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  // 2. Importar Lighthouse de forma dinámica compatible con CommonJS
  const lighthouse = (await import('lighthouse')).default;

  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  // 3. Ejecutar la auditoría no funcional sobre la pantalla de login
  const runnerResult = await lighthouse('http://localhost:3000/login', options);

  // 4. Guardar el reporte HTML resultante
  fs.writeFileSync('lighthouse-report.html', runnerResult.report);

  console.log('¡Auditoría de Lighthouse completada con éxito! Reporte guardado como lighthouse-report.html');

  // 5. Cerrar Chrome
  await chrome.kill();
}

runLighthouseAudit();