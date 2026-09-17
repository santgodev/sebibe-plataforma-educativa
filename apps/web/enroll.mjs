import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdglyyyrjjorrvbagvdd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function enroll() {
  const email = 'santgodev@gmail.com';

  console.log(`Intentando enrolar al usuario ${email} mediante RPC...`);

  const { error } = await supabase.rpc('enroll_by_email', {
    user_email: email,
    course_slug: 'introduccion-al-antiguo-testamento',
  });

  if (error) {
    console.error('❌ Error al darle acceso:', error);
  } else {
    console.log(`✅ ¡Éxito! El usuario ${email} ahora tiene acceso al curso.`);
  }
}

enroll();
