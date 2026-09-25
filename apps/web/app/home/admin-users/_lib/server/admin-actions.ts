'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export async function createStudentUser(formData: FormData) {
  // Verificamos que quien ejecuta esto está logueado
  await requireUserInServerComponent();
  
  const adminClient = getSupabaseServerAdminClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const role = formData.get('role') as string;

  if (!email || !password || !firstName || !lastName || !role) {
    throw new Error('Todos los campos son obligatorios');
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    }
  });

  if (authError) {
    throw new Error(`Error creando usuario en Auth: ${authError.message}`);
  }

  // Assign the selected role
  const { error: roleError } = await adminClient
    .from('user_roles')
    .insert({ id: authUser.user.id, role });

  if (roleError) {
    throw new Error(`Usuario creado, pero hubo un error asignando el rol: ${roleError.message}`);
  }

  revalidatePath('/home/admin-users');
  return { success: true, userId: authUser.user.id };
}

export async function updateStudentUser(userId: string, formData: FormData) {
  await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const role = formData.get('role') as string;

  if (!userId || !firstName || !lastName || !role) {
    throw new Error('Todos los campos son obligatorios');
  }

  // Update auth.users metadata
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    }
  });

  if (authError) {
    throw new Error(`Error actualizando usuario en Auth: ${authError.message}`);
  }

  // Update user_roles
  const { error: roleError } = await adminClient
    .from('user_roles')
    .update({ role })
    .eq('id', userId);

  if (roleError) {
    throw new Error(`Usuario actualizado, pero hubo un error actualizando el rol: ${roleError.message}`);
  }

  revalidatePath('/home/admin-users');
  return { success: true };
}

export async function enrollStudentAction(userId: string, courseId: string) {
  await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  if (!userId || !courseId) {
    throw new Error('Faltan datos de inscripción');
  }

  // Insertar en course_enrollments
  const { error } = await adminClient
    .from('course_enrollments')
    .insert({ student_id: userId, course_id: courseId });

  if (error) {
    // Si ya está inscrito, suele dar error de unicidad, lo manejamos amigablemente
    if (error.code === '23505') {
      throw new Error('El estudiante ya está inscrito en esta materia.');
    }
    throw new Error(`Error inscribiendo estudiante: ${error.message}`);
  }

  revalidatePath(`/home/admin-users`);
  revalidatePath(`/home/admin-users/${userId}`);
  return { success: true };
}
