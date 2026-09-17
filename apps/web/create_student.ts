import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey as string);

async function main() {
  const email = 'estudiante.demo@ejemplo.com';
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { name: 'Estudiante Demo' }
  });

  if (authError && !authError.message.includes('already exists')) {
    console.error('Error creating user:', authError.message);
    return;
  }

  const { data: existingUsers } = await supabase.from('accounts').select('id').eq('email', email);
  
  if (existingUsers && existingUsers.length > 0) {
    const userId = existingUsers[0].id;
    console.log('User ID:', userId);

    await supabase.from('user_roles').upsert({ id: userId, role: 'alumno' });

    const { data: cohorts } = await supabase.from('cohorts').select('id, name').limit(1);
    if (cohorts && cohorts.length > 0) {
      const cohort = cohorts[0];
      console.log('Found Cohort:', cohort.name);
      
      const { error: enrollError } = await supabase.from('cohort_enrollments').upsert({
        cohort_id: cohort.id,
        student_id: userId
      });

      if (enrollError) {
        console.error('Error enrolling:', enrollError.message);
      } else {
        console.log('Student successfully enrolled in cohort:', cohort.name);
      }
    } else {
      console.log('No cohorts found. Please create one first.');
    }
  }
}

main().catch(console.error);
