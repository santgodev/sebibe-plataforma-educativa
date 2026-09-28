'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { generateEmailCombinations, normalizeName } from '../student-utils';

/**
 * Genera el primer correo disponible
 */
export async function generateAvailableEmailAction(names: string, lastNames: string): Promise<{ email: string | null; error?: string }> {
  try {
    await requireUserInServerComponent();
    const adminClient = getSupabaseServerAdminClient();

    const candidates = generateEmailCombinations(names, lastNames);
    if (candidates.length === 0) {
      return { email: null };
    }

    // Buscamos los candidatos que ya están tomados en 'accounts' o 'students'
    const { data: takenAccounts } = await adminClient
      .from('accounts')
      .select('email')
      .in('email', candidates);

    let takenStudents: any[] = [];
    // Tratamos de buscar en students, si falla es porque la tabla no existe aún.
    const { data: sData, error: sErr } = await adminClient
      .from('students')
      .select('institutional_email')
      .in('institutional_email', candidates);
    
    if (!sErr && sData) {
      takenStudents = sData;
    }

    const takenEmails = new Set([
      ...(takenAccounts || []).map((a) => a.email),
      ...takenStudents.map((s) => s.institutional_email),
    ]);

    for (const email of candidates) {
      if (!takenEmails.has(email)) {
        return { email };
      }
    }

    return { email: null, error: 'No hay combinaciones de correo disponibles' };
  } catch (error: any) {
    return { email: null, error: error.message };
  }
}

/**
 * Valida si el documento ya existe
 */
export async function checkDocumentAvailabilityAction(documentId: string): Promise<boolean> {
  try {
    await requireUserInServerComponent();
    const adminClient = getSupabaseServerAdminClient();
    
    const { data, error } = await adminClient
      .from('students')
      .select('id')
      .eq('document_id', documentId)
      .limit(1);

    if (error) return true; // Si hay error asume que está libre o la tabla no existe
    return !data || data.length === 0;
  } catch (e) {
    return true;
  }
}

/**
 * Crea el estudiante y usuario de forma completa
 */
export async function createFullStudentAction(formData: FormData) {
  await requireUserInServerComponent();
  const adminClient = getSupabaseServerAdminClient();

  const firstName = normalizeName(formData.get('firstName') as string);
  const lastName = normalizeName(formData.get('lastName') as string);
  const documentId = formData.get('documentId') as string;
  const birthDate = formData.get('birthDate') as string;
  const phone = formData.get('phone') as string;
  const church = formData.get('church') as string;
  const city = formData.get('city') as string;
  const email = formData.get('email') as string;
  const password = formData.get('documentId') as string; // Contraseña por defecto es el documento (temporal)
  const entryDate = (formData.get('entryDate') as string) || new Date().toISOString().split('T')[0];
  const modality = (formData.get('modality') as string) || 'presencial';

  if (!firstName || !lastName || !documentId || !birthDate || !phone || !church || !city || !email) {
    throw new Error('Todos los campos son obligatorios');
  }

  // 1. Check document unique
  const docAvailable = await checkDocumentAvailabilityAction(documentId);
  if (!docAvailable) {
    throw new Error('Ya existe un estudiante registrado con este número de identificación.');
  }

  if (password.length < 6) {
    throw new Error('El número de identificación (usado como contraseña temporal) debe tener al menos 6 caracteres.');
  }

  // 2. Create Auth User
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
    },
  });

  if (authError) {
    throw new Error(`Error al crear el usuario (Auth): ${authError.message}`);
  }

  const userId = authUser.user.id;

  // 3. Assign role
  const { error: roleError } = await adminClient
    .from('user_roles')
    .insert({ id: userId, role: 'alumno' });

  if (roleError) {
    // Intentar limpiar todo si falla el rol
    await adminClient.from('accounts').delete().eq('id', userId);
    await adminClient.auth.admin.deleteUser(userId);
    throw new Error(`Error asignando el rol, se canceló la creación: ${roleError.message}`);
  }

  // 4. Create Student Record
  const { error: studentError } = await adminClient
    .from('students')
    .insert({
      user_id: userId,
      document_id: documentId,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      phone,
      church,
      city,
      institutional_email: email,
      entry_date: entryDate,
      modality,
      status: 'active'
    });

  if (studentError) {
    // Intentar limpiar todo si falla el perfil de estudiante
    await adminClient.from('user_roles').delete().eq('id', userId);
    await adminClient.from('accounts').delete().eq('id', userId);
    await adminClient.auth.admin.deleteUser(userId);
    throw new Error(`Error fatal (Asegúrate de haber corrido la migración SQL): ${studentError.message}`);
  }

  revalidatePath('/home/admin-users');
  return { success: true, studentName: `${firstName} ${lastName}`, documentId, email };
}
