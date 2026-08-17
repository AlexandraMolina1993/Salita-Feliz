/**
 * Script de Automatización DevOps & Base de Datos: Carga de Stock Inicial y Consolidación de Vista
 * Salita Feliz - Enterprise Healthcare System
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

const migrationFile = path.join(__dirname, '09-seed-initial-stock-movements.sql');

async function run() {
  console.log('================================================================');
  console.log('📦 SALITA FELIZ - INITIAL STOCK & V_VACCINES_STOCK MIGRATION');
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
      console.log('📜 Ejecutando script SQL 09-seed-initial-stock-movements.sql...');
      await client.query(sql);
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log('✅ Migración SQL ejecutada exitosamente.');
      await client.end();
    } catch (err) {
      console.warn('⚠️  Nota de conexión PostgreSQL directa:', err.message);
    }
  }

  // Validación y sincronización mediante cliente Supabase
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('\n🔍 Consultando vista v_vaccines_stock...');
    const { data: vStock, error: vsErr } = await supabase.from('v_vaccines_stock').select('*');
    if (vsErr) {
      console.error('❌ Error al consultar v_vaccines_stock:', vsErr.message);
    } else {
      console.log(`✅ ${vStock.length} vacunas consolidadas en tiempo real:\n`);
      console.table(vStock.map(v => ({
        ID: v.vaccine_id.slice(0, 8),
        Nombre: v.name,
        'Dosis (ml)': v.dose_amount,
        'Contenido Neto (ml)': v.net_content,
        'Total ml': v.total_ml,
        'Viales Físicos': v.current_stock_vials || v.physical_vials_for_repos,
        'Dosis Clínicas Disponibles': v.available_doses_for_clinic,
        Estado: v.stock_status
      })));
    }
  }

  console.log('\n🎉 ¡Proceso de inicialización de stock completado!');
}

run().catch(console.error);
