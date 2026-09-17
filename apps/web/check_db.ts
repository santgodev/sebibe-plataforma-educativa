import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey as string);

async function main() {
  const { data: accounts, error: aErr } = await supabase.from('accounts').select('id, name, email');
  console.log("ACCOUNTS:", accounts, aErr);

  const { data: roles, error: rErr } = await supabase.from('user_roles').select('*');
  console.log("ROLES:", roles, rErr);

  const { data: cohorts, error: cErr } = await supabase.from('cohorts').select('*');
  console.log("COHORTS:", cohorts, cErr);

  const { data: enrolls, error: eErr } = await supabase.from('cohort_enrollments').select('*');
  console.log("ENROLLS:", enrolls, eErr);
}

main().catch(console.error);
