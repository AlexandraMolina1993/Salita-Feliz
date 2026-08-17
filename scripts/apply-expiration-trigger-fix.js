const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

const argDbUrl = process.argv[2];
const dbUrl =
  argDbUrl ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL ||
  (process.env.SUPABASE_DB_PASSWORD
    ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.yoefhvrhgjomdcvbofsv.supabase.co:5432/postgres`
    : null);

const migrationFile = path.join(__dirname, '10-fix-appointment-expiration-trigger.sql');

async function run() {
  console.log('================================================================');
  console.log('🔧 SALITA FELIZ - FIX APPOINTMENT EXPIRATION TRIGGER');
  console.log('================================================================\n');

  if (!dbUrl) {
    console.log('ℹ️  Para aplicar en PostgreSQL directamente ejecuta:');
    console.log('    node scripts/apply-expiration-trigger-fix.js "postgresql://postgres:[PASSWORD]@db.yoefhvrhgjomdcvbofsv.supabase.co:5432/postgres"\n');
    console.log('O copia y pega el contenido de `scripts/10-fix-appointment-expiration-trigger.sql`');
    console.log('en el SQL Editor de Supabase: https://supabase.com/dashboard/project/yoefhvrhgjomdcvbofsv/sql\n');
    return;
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('🔌 Conectado a PostgreSQL...');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await client.query(sql);
    console.log('✅ Trigger check_vaccine_expiration_on_appointment actualizado correctamente.');
  } catch (err) {
    console.error('❌ Error aplicando migración:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

run();
