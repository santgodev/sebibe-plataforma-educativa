import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdglyyyrjjorrvbagvdd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // From .env.local

const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_KEY);

async function findInstructor() {
  console.log('Fetching an existing course to copy instructor_id...');
  const { data: courses, error } = await supabase
    .from('courses')
    .select('instructor_id')
    .limit(1);

  if (error || !courses || courses.length === 0) {
    console.log('No courses found. Cannot determine instructor_id.');
    return null;
  }

  return courses[0]?.instructor_id;
}

findInstructor()
  .then((id) => console.log('Found instructor_id:', id))
  .catch(console.error);
