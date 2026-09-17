'use server';

import { revalidatePath } from 'next/cache';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export async function createAcademicPeriodAction(formData: FormData) {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();

  // Check admin role
  const { data: roles } = await client
    .from('user_roles')
    .select('role')
    .eq('id', user.id);
  
  const isAdmin = roles?.some(r => r.role === 'administrador');
  if (!isAdmin) {
    throw new Error('No tienes permisos para crear semestres.');
  }

  const name = formData.get('name') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;

  if (!name || !start_date || !end_date) {
    throw new Error('Todos los campos son obligatorios.');
  }

  const { error } = await client
    .from('academic_periods')
    .insert({
      name,
      start_date,
      end_date,
      is_active: false
    });

  if (error) {
    console.error('Error creating academic period:', error);
    throw new Error('Error al crear el semestre: ' + error.message);
  }

  revalidatePath('/home/admin-cohorts');
  return { success: true };
}

export async function createCohortAction(formData: FormData) {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();

  // Check admin role
  const { data: roles } = await client
    .from('user_roles')
    .select('role')
    .eq('id', user.id);
  
  const isAdmin = roles?.some(r => r.role === 'administrador');
  if (!isAdmin) {
    throw new Error('No tienes permisos para crear grupos.');
  }

  const name = formData.get('name') as string;
  const period_id = formData.get('period_id') as string;

  if (!name || !period_id) {
    throw new Error('El nombre es obligatorio.');
  }

  const { error } = await client
    .from('cohorts')
    .insert({
      name,
      period_id
    });

  if (error) {
    console.error('Error creating cohort:', error);
    throw new Error('Error al crear el grupo: ' + error.message);
  }

  revalidatePath('/home/admin-cohorts');
  return { success: true };
}

export async function addStudentToCohortAction(formData: FormData) {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();
  
  const cohort_id = formData.get('cohort_id') as string;
  const student_id = formData.get('student_id') as string;

  if (!cohort_id || !student_id) throw new Error('Faltan datos.');

  const { error } = await client
    .from('cohort_enrollments')
    .insert({ cohort_id, student_id });

  if (error) throw new Error('Error al matricular alumno: ' + error.message);

  revalidatePath(`/home/admin-cohorts/${cohort_id}`);
  return { success: true };
}

export async function addScheduleToCohortAction(formData: FormData) {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();
  
  const cohort_id = formData.get('cohort_id') as string;
  const course_id = formData.get('course_id') as string;
  const instructor_id = formData.get('instructor_id') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;

  if (!cohort_id || !course_id || !instructor_id || !start_date || !end_date) {
    throw new Error('Todos los campos son obligatorios.');
  }

  const { error } = await client
    .from('cohort_schedules')
    .insert({
      cohort_id,
      course_id,
      instructor_id,
      start_date,
      end_date
    });

  if (error) throw new Error('Error al programar la materia: ' + error.message);

  revalidatePath(`/home/admin-cohorts/${cohort_id}`);
  return { success: true };
}
export async function enrollCohortGroupAction(formData: FormData) {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();
  
  const target_cohort_id = formData.get('target_cohort_id') as string;
  const source_cohort_id = formData.get('source_cohort_id') as string;

  if (!target_cohort_id || !source_cohort_id) throw new Error('Faltan datos de los grupos.');

  // Fetch all students from the source cohort
  const { data: students, error: fetchError } = await client
    .from('cohort_enrollments')
    .select('student_id')
    .eq('cohort_id', source_cohort_id);

  if (fetchError || !students) {
    throw new Error('Error al obtener los alumnos del grupo origen.');
  }

  if (students.length === 0) {
    throw new Error('El grupo origen no tiene alumnos matriculados.');
  }

  // Insert them into the target cohort
  const enrollmentsToInsert = students.map((s) => ({
    cohort_id: target_cohort_id,
    student_id: s.student_id
  }));

  // We use upsert to ignore existing enrollments
  const { error: insertError } = await client
    .from('cohort_enrollments')
    .upsert(enrollmentsToInsert, { onConflict: 'cohort_id,student_id', ignoreDuplicates: true });

  if (insertError) {
    throw new Error('Error al migrar los alumnos: ' + insertError.message);
  }

  revalidatePath('/home/admin-cohorts/' + target_cohort_id);
  return { success: true };
}
