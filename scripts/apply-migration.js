/**
 * Script de Automatización DevOps & Base de Datos: Aplicación de Migraciones en Supabase
 * Salita Feliz - Enterprise Healthcare System
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Cargar variables de entorno desde .env.local si no existen en process.env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        const val = values.join('=').trim().replace(/^["'](.*)["']$/, '$1');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  });
}

// 2. Determinar la cadena de conexión o parámetros
const argDbUrl = process.argv[2];
const dbUrl =
  argDbUrl ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL ||
  (process.env.SUPABASE_DB_PASSWORD
    ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.yoefhvrhgjomdcvbofsv.supabase.co:5432/postgres`
    : null);

const migrationFile = path.join(__dirname, '06-uom-fractional-stock-migration.sql');

async function runMigration() {
  console.log('================================================================');
  console.log('🚀 SALITA FELIZ - UOM & FRACTIONAL STOCK MIGRATION RUNNER');
  console.log('================================================================\n');

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Error: Archivo de migración no encontrado en: ${migrationFile}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationFile, 'utf8');

  if (!dbUrl) {
    console.log('⚠️  No se detectó DATABASE_URL ni SUPABASE_DB_PASSWORD en el entorno.');
    console.log('ℹ️  Puedes ejecutar este script proporcionando la conexión directamente:');
    console.log('    node scripts/apply-migration.js "postgresql://postgres:[TU_PASSWORD]@db.yoefhvrhgjomdcvbofsv.supabase.co:5432/postgres"\n');
    console.log('O bien, copia y pega el contenido de `scripts/06-uom-fractional-stock-migration.sql`');
    console.log('en el SQL Editor del panel de Supabase: https://supabase.com/dashboard/project/yoefhvrhgjomdcvbofsv/sql\n');
    process.exit(2);
  }

  console.log('🔌 Conectando a PostgreSQL en Supabase...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Conexión establecida exitosamente con la base de datos remota.');

    console.log('\n📜 Aplicando script de migración `06-uom-fractional-stock-migration.sql`...');
    await client.query(sqlContent);
    console.log('✅ DDL, Vista UOM y RPC aplicados correctamente en una transacción atómica.');

    console.log('\n🔄 Notificando recarga de Schema Cache a PostgREST...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('✅ Notificación emitida exitosamente.');

    // 4. Verificación de Integridad y Vista
    console.log('\n🔍 Validando estructura de la Vista `v_vaccines_stock`:');
    const viewCols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'v_vaccines_stock' ORDER BY ordinal_position;"
    );
    viewCols.rows.forEach(col => {
      console.log(`    • ${col.column_name} (${col.data_type})`);
    });

    const sampleView = await client.query(
      "SELECT name, current_stock_fraction, total_ml, physical_vials_for_repos, available_doses_for_clinic FROM v_vaccines_stock LIMIT 5;"
    );
    console.log('\n📊 Muestra de proyección de inventario en tiempo real (v_vaccines_stock):');
    console.table(sampleView.rows);

    console.log('\n🎉 ¡Migración UOM y lógica fraccional completadas con éxito!');
  } catch (err) {
    console.error('\n❌ Error durante la ejecución de la migración:', err.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

runMigration();
