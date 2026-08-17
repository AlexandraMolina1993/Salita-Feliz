const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
  const adminClient = createClient(supabaseUrl, supabaseKey);
  const anonClient = createClient(supabaseUrl, supabaseAnon);

  const { data: adminStock, error: adminErr } = await adminClient.from('v_vaccines_stock').select('*');
  console.log('Admin v_vaccines_stock count:', adminStock?.length, 'error:', adminErr);

  const { data: anonStock, error: anonErr } = await anonClient.from('v_vaccines_stock').select('*');
  console.log('Anon v_vaccines_stock count:', anonStock?.length, 'error:', anonErr);

  const { data: adminVac, error: adminVacErr } = await adminClient.from('vaccines').select('*');
  console.log('Admin vaccines count:', adminVac?.length, 'error:', adminVacErr);

  const { data: anonVac, error: anonVacErr } = await anonClient.from('vaccines').select('*');
  console.log('Anon vaccines count:', anonVac?.length, 'error:', anonVacErr);

  console.log('Admin stock samples:', JSON.stringify(adminStock?.[0], null, 2));
}

check().catch(console.error);
