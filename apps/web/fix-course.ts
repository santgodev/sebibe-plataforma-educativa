import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdglyyyrjjorrvbagvdd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // From .env.local

const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_KEY);

async function fix() {
  const { error } = await supabase
    .from('courses')
    .update({ instructor_id: '9d194a54-363e-4411-b8db-8faab1ed5df3' })
    .eq('id', '207766e5-bf1c-4fe1-8fa7-c6ce3246eb6a');

  if (error) {
    console.error(error);
  } else {
    console.log('Fixed successfully!');
  }
}
fix();
