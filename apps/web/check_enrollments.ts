import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey as string);

async function main() {
  const { data: enrollments } = await supabase.from('cohort_enrollments').select(`
    cohort_id,
    cohorts (name),
    student_id,
    accounts (email, name)
  `);
  console.log("ALL ENROLLMENTS:");
  console.dir(enrollments, { depth: null });
}

main().catch(console.error);
