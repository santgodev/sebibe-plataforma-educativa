import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignAdmin() {
  const email = 'santgodev@gmail.com';
  console.log(`Buscando usuario ${email}...`);
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError.message);
    return;
  }
  
  const user = usersData.users.find(u => u.email === email);
  let userId;
  
  if (!user) {
    console.log(`Usuario ${email} no encontrado. Creando usuario...`);
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: 'TemporalPassword123!',
      email_confirm: true,
      user_metadata: { first_name: 'Santiago', last_name: 'Admin' }
    });
    if (createError) {
      console.error('Error creating user:', createError.message);
      return;
    }
    userId = newUserData.user.id;
    console.log(`Usuario creado con ID: ${userId}`);
  } else {
    userId = user.id;
    console.log(`Usuario encontrado con ID: ${userId}`);
  }
  
  console.log(`Asignando rol 'administrador' a ${userId}...`);
  const { error: upsertError } = await supabase
    .from('user_roles')
    .upsert({ id: userId, role: 'administrador' }, { onConflict: 'id' });
    
  if (upsertError) {
    console.error('Error assigning role:', upsertError.message);
  } else {
    console.log('¡Rol asignado exitosamente!');
  }
}

assignAdmin();
