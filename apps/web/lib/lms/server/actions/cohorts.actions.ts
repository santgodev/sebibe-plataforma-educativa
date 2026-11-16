'use server';

import { revalidatePath } from 'next/cache';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import {
  calculateAcademicYear,
  calculateSemester,
  formatSemesterName,
} from '~/home/admin-users/_lib/student-utils';

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

/**
 * Crea una materia rápidamente desde el cronograma de cohortes
 */
export async function createQuickCourseAction(formData: FormData) {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();

  // Check roles (admin o profesor)
  const { data: roleData } = await client
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = roleData?.role;
  const isStaff = role === 'administrador' || role === 'admin' || role === 'profesor';
  if (!isStaff) {
    throw new Error('No tienes permisos para crear materias.');
  }

  const title = (formData.get('title') as string)?.trim();
  if (!title || title.length < 3) {
    throw new Error('El título de la materia debe tener al menos 3 caracteres.');
  }

  const duration_weeks = parseInt((formData.get('duration_weeks') as string) || '2', 10);
  const credits = parseInt((formData.get('credits') as string) || '3', 10);
  const instructor_id = (formData.get('instructor_id') as string) || user.id;
  const level = (formData.get('level') as string) || 'all_levels';
  const short_description = (formData.get('short_description') as string)?.trim() || null;
  const cohort_id = (formData.get('cohort_id') as string) || null;

  // Generar slug amigable
  let baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (!baseSlug) baseSlug = 'materia';

  const { data: existingCourse } = await client
    .from('courses')
    .select('id')
    .eq('slug', baseSlug)
    .maybeSingle();

  const slug = existingCourse ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

  const { data: newCourse, error } = await (client as any)
    .from('courses')
    .insert({
      title,
      slug,
      instructor_id,
      duration_weeks: isNaN(duration_weeks) ? 2 : duration_weeks,
      credits: isNaN(credits) ? 3 : credits,
      level,
      short_description,
      status: 'published',
    })
    .select('id, title')
    .single();

  if (error || !newCourse) {
    console.error('Error creating quick course:', error);
    throw new Error('Error al crear la materia: ' + (error?.message || 'Error desconocido'));
  }

  if (cohort_id) {
    revalidatePath(`/home/admin-cohorts/${cohort_id}`);
  }
  revalidatePath('/home/admin-cohorts');
  revalidatePath('/home/admin-courses');

  return {
    success: true,
    course: {
      id: newCourse.id,
      title: newCourse.title,
      duration_weeks: isNaN(duration_weeks) ? 2 : duration_weeks,
      credits: isNaN(credits) ? 3 : credits,
    },
  };
}

/**
 * Sincroniza y asegura que exista un periodo y un cohorte por cada semestre con estudiantes activos
 */
export async function syncCohortsFromActiveStudentsAction() {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerAdminClient();

  const { data: roleData } = await client
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = roleData?.role;
  const isAdmin = role === 'administrador' || role === 'admin';
  if (!isAdmin) {
    throw new Error('Solo los administradores pueden sincronizar cohortes.');
  }

  const { data: students, error: sErr } = await (client as any)
    .from('students')
    .select('user_id, entry_date, status, first_name, last_name')
    .eq('status', 'active');

  if (sErr || !students) {
    throw new Error('Error al consultar estudiantes: ' + (sErr?.message || ''));
  }

  function getPeriodDates(semName: string): { start_date: string; end_date: string } {
    const parts = semName.split('-');
    const year = parts[0]?.trim() || new Date().getFullYear().toString();
    const cycle = parts[1]?.trim() || 'I';
    if (cycle === 'II') {
      return {
        start_date: `${year}-07-15`,
        end_date: `${year}-12-15`,
      };
    }
    return {
      start_date: `${year}-01-15`,
      end_date: `${year}-06-30`,
    };
  }

  let totalEnrolled = 0;
  // Agrupar estudiantes por semestre de ingreso
  const studentsBySem: Record<string, any[]> = {};

  students.forEach((s: any) => {
    const sem = formatSemesterName(calculateSemester(s.entry_date));
    studentsBySem[sem] = studentsBySem[sem] || [];
    studentsBySem[sem].push(s);
  });

  // Para cada semestre, asegurar periodo y 1 cohorte por semestre
  for (const [semName, semStudents] of Object.entries(studentsBySem)) {
    let { data: period } = await (client as any)
      .from('academic_periods')
      .select('id, name')
      .eq('name', semName)
      .maybeSingle();

    if (!period) {
      const dates = getPeriodDates(semName);
      const { data: newPeriod, error: pErr } = await (client as any)
        .from('academic_periods')
        .insert({
          name: semName,
          start_date: dates.start_date,
          end_date: dates.end_date,
          is_active: semName === '2026 - II',
        })
        .select()
        .single();
      if (pErr) continue;
      period = newPeriod;
    }

    // Cohorte por semestre
    let { data: cohort } = await (client as any)
      .from('cohorts')
      .select('id, name')
      .eq('period_id', period.id)
      .maybeSingle();

    if (!cohort) {
      const { data: newCohort, error: cErr } = await (client as any)
        .from('cohorts')
        .insert({
          name: semName,
          period_id: period.id,
        })
        .select()
        .single();
      if (cErr) continue;
      cohort = newCohort;
    } else if (cohort.name !== semName) {
      await (client as any)
        .from('cohorts')
        .update({ name: semName })
        .eq('id', cohort.id);
    }

    // Inscribir a los estudiantes del semestre
    const enrollments = semStudents.map((s: any) => ({
      cohort_id: cohort.id,
      student_id: s.user_id,
    }));

    const { error: eErr } = await (client as any)
      .from('cohort_enrollments')
      .upsert(enrollments, { onConflict: 'cohort_id,student_id', ignoreDuplicates: true });

    if (!eErr) {
      totalEnrolled += enrollments.length;
    }
  }

  revalidatePath('/home/admin-cohorts');
  return { success: true, count: totalEnrolled };
}
