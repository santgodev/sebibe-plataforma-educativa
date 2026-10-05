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

  const { data: authUser, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
      },
    });

  if (authError) {
    throw new Error(`Error creando usuario en Auth: ${authError.message}`);
  }

  // Assign the selected role
  const { error: roleError } = await adminClient
    .from('user_roles')
    .insert({ id: authUser.user.id, role });

  if (roleError) {
    throw new Error(
      `Usuario creado, pero hubo un error asignando el rol: ${roleError.message}`,
    );
  }

  revalidatePath('/home/admin-users');
  return { success: true, userId: authUser.user.id };
}

export async function updateStudentUser(userId: string, formData: FormData) {
  await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  const firstName = (formData.get('firstName') as string)?.trim() || '';
  const lastName = (formData.get('lastName') as string)?.trim() || '';
  const email = (formData.get('email') as string)?.trim().toLowerCase() || '';
  const role = (formData.get('role') as string)?.trim() || 'alumno';
  const newPassword = (formData.get('password') as string)?.trim() || '';

  // Student specific fields
  const documentId = (formData.get('documentId') as string)?.trim();
  const institutionalEmail = (formData.get('institutionalEmail') as string)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string)?.trim();
  const birthDate = formData.get('birthDate') as string;
  const church = (formData.get('church') as string)?.trim();
  const city = (formData.get('city') as string)?.trim();
  const entryDate = formData.get('entryDate') as string;
  const modality = (formData.get('modality') as string) || 'presencial';
  const status = (formData.get('status') as string) || 'active';

  if (!userId || !firstName || !lastName || !role) {
    throw new Error('El nombre, apellido y rol son obligatorios');
  }

  const fullName = `${firstName} ${lastName}`.trim();

  // 1. Update Auth user (metadata, email if changed, password if provided)
  const authUpdatePayload: any = {
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      name: fullName,
    },
  };

  if (email) {
    authUpdatePayload.email = email;
    authUpdatePayload.email_confirm = true;
  }

  if (newPassword && newPassword.length > 0) {
    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }
    authUpdatePayload.password = newPassword;
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(
    userId,
    authUpdatePayload,
  );

  if (authError) {
    throw new Error(`Error actualizando usuario en Auth: ${authError.message}`);
  }

  // 2. Update accounts table
  const accountUpdatePayload: any = {
    name: fullName,
    updated_at: new Date().toISOString(),
  };
  if (email) {
    accountUpdatePayload.email = email;
  }

  const { error: accountError } = await adminClient
    .from('accounts')
    .update(accountUpdatePayload)
    .eq('id', userId);

  if (accountError) {
    console.error('Error actualizando accounts:', accountError);
  }

  // 3. Update user_roles
  const { error: roleError } = await adminClient
    .from('user_roles')
    .upsert({ id: userId, role });

  if (roleError) {
    throw new Error(
      `Usuario actualizado, pero hubo un error actualizando el rol: ${roleError.message}`,
    );
  }

  // 4. Update or create student profile in students table
  const { data: existingStudent } = await adminClient
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingStudent || documentId || role === 'alumno') {
    const studentPayload: any = {
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    };

    if (documentId) studentPayload.document_id = documentId;
    if (phone !== undefined) studentPayload.phone = phone || '';
    if (birthDate) studentPayload.birth_date = birthDate;
    if (church !== undefined) studentPayload.church = church || '';
    if (city !== undefined) studentPayload.city = city || '';
    if (institutionalEmail) {
      studentPayload.institutional_email = institutionalEmail;
    } else if (email && !existingStudent) {
      studentPayload.institutional_email = email;
    }
    if (entryDate) studentPayload.entry_date = entryDate;
    if (modality) studentPayload.modality = modality;
    if (status) studentPayload.status = status;

    if (existingStudent) {
      const { error: studentUpdateError } = await adminClient
        .from('students')
        .update(studentPayload)
        .eq('user_id', userId);

      if (studentUpdateError) {
        if (studentUpdateError.code === '23505') {
          throw new Error('El documento o correo institucional ya pertenece a otro estudiante.');
        }
        throw new Error(`Error actualizando datos de estudiante: ${studentUpdateError.message}`);
      }
    } else if (documentId && birthDate) {
      studentPayload.user_id = userId;
      studentPayload.status = status || 'active';
      studentPayload.modality = modality || 'presencial';
      studentPayload.entry_date = entryDate || new Date().toISOString().split('T')[0];
      studentPayload.institutional_email = institutionalEmail || email;

      const { error: studentInsertError } = await adminClient
        .from('students')
        .insert(studentPayload);

      if (studentInsertError) {
        if (studentInsertError.code === '23505') {
          throw new Error('El documento o correo institucional ya pertenece a otro estudiante.');
        }
        throw new Error(`Error creando perfil de estudiante: ${studentInsertError.message}`);
      }
    }
  }

  revalidatePath('/home/admin-users');
  revalidatePath(`/home/admin-users/${userId}`);
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

export async function deleteStudentUser(userId: string) {
  await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  if (!userId) {
    throw new Error('Falta el ID del usuario a eliminar');
  }

  // Eliminamos en orden inverso de dependencias. 
  // 1. Opcional: Eliminar enrollments si los hay (Supabase por defecto tiene cascade si se configuró así, pero por si acaso)
  await adminClient.from('course_enrollments').delete().eq('student_id', userId);
  await adminClient.from('course_progress').delete().eq('student_id', userId);
  await adminClient.from('lesson_progress').delete().eq('student_id', userId);
  await adminClient.from('activity_attempts').delete().eq('student_id', userId);
  
  // 2. Tablas principales de usuario
  await adminClient.from('students').delete().eq('user_id', userId);
  await adminClient.from('user_roles').delete().eq('id', userId);
  await adminClient.from('accounts').delete().eq('id', userId);

  // 3. Auth
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Error eliminando el usuario de Auth: ${error.message}`);
  }

  revalidatePath('/home/admin-users');
  return { success: true };
}
