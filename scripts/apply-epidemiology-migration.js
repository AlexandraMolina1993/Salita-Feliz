/**
 * Script de Automatización: Migración de tabla regional_statistics en Supabase
 * Salita Feliz - Vigilancia Epidemiológica NOMIVAC
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno desde .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        const val = values.join('=').trim().replace(/^["'](.*)["']$/, '$1');
        env[key.trim()] = val;
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  });
}

const migrationFile = path.join(__dirname, '03-create-epidemiology-table.sql');

async function run() {
  console.log('================================================================');
  console.log('📊 SALITA FELIZ - REGIONAL STATISTICS (NOMIVAC) MIGRATION');
  console.log('================================================================\n');

  const dbUrl =
    process.argv[2] ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    (process.env.SUPABASE_DB_PASSWORD
      ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.yoefhvrhgjomdcvbofsv.supabase.co:5432/postgres`
      : null);

  if (dbUrl) {
    console.log('🔌 Conectando a PostgreSQL en Supabase...');
    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log('✅ Conexión establecida con la base de datos.');
      const sql = fs.readFileSync(migrationFile, 'utf8');
      console.log('📜 Ejecutando script SQL 03-create-epidemiology-table.sql...');
      await client.query(sql);
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log('✅ Migración SQL ejecutada exitosamente.');
      await client.end();
    } catch (err) {
      console.warn('⚠️  Nota de conexión PostgreSQL directa:', err.message);
    }
  } else {
    console.log('ℹ️  No se proporcionó DATABASE_URL ni SUPABASE_DB_PASSWORD.');
    console.log('ℹ️  Puedes ejecutar este script pasando la cadena de conexión o');
    console.log('    ejecutar el script `scripts/03-create-epidemiology-table.sql` en el SQL Editor de Supabase:');
    console.log('    https://supabase.com/dashboard/project/yoefhvrhgjomdcvbofsv/sql\n');
  }

  // Verificación mediante cliente Supabase
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔍 Consultando tabla regional_statistics en Supabase...');
    const { data, error } = await supabase.from('regional_statistics').select('*').limit(10);
    if (error) {
      console.log('ℹ️  Tabla aún no disponible en schema cache (ejecuta el script SQL en Supabase SQL Editor si no lo has hecho):', error.message);
    } else {
      console.log(`✅ ${data.length} registros encontrados en regional_statistics:\n`);
      console.table(data);
    }
  }
}

run().catch(console.error);
