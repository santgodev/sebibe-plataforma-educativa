import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdglyyyrjjorrvbagvdd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // From .env.local

const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_KEY);

async function check() {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, instructor_id');
  if (error) {
    console.error(error);
    return;
  }
  console.log('All courses:');
  console.table(courses);
}
check();
