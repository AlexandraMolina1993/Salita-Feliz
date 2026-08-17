const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        env[key.trim()] = values.join('=').trim().replace(/^["'](.*)["']$/, '$1');
      }
    }
  });
}

const dbUrl = env.DATABASE_URL || (env.SUPABASE_DB_PASSWORD ? `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.yoefhvrhgjomdcvbofsv.supabase.co:5432/postgres` : null);

async function check() {
  if (!dbUrl) {
    console.log('No DB URL');
    return;
  }
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rls = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);
  console.log('Tables RLS:', rls.rows);

  const pol = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public';
  `);
  console.log('Policies:', pol.rows);

  await client.end();
}

check().catch(console.error);
