import { notFound } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { CourseBuilder } from './_components/course-builder';
import { CoursePublishToggle } from './_components/course-publish-toggle';
import { CourseSettingsForm } from './_components/course-settings-form';
import { CourseEnrollmentsForm } from './_components/course-enrollments-form';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const metadata = {
  title: 'Editar Materia',
};

interface EditCoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params;
  const client = getSupabaseServerClient();

  const { data: course, error: courseError } = await client
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  if (courseError || !course) {
    return notFound();
  }

  // Fetch modules and nested lessons
  const { data: modules, error: modulesError } = await client
    .from('course_modules')
    .select(
      `
      *,
      lessons:lessons(
        *,
        lesson_blocks(type, order_index)
      )
    `,
    )
    .eq('course_id', id)
    .order('order_index', { ascending: true });

  // Sort lessons within modules since Supabase doesn't guarantee nested order
  const sortedModules = (modules || []).map((m) => ({
    ...m,
    lessons: (m.lessons || []).sort((a, b) => a.order_index - b.order_index),
  }));

  const adminClient = getSupabaseServerAdminClient();

  // Fetch all accounts
  const { data: accounts } = await adminClient.from('accounts').select('id, name, email').order('name', { ascending: true });
  
  // Fetch roles to filter out admins and teachers
  const { data: roles } = await adminClient.from('user_roles').select('id, role');
  const roleMap = new Map((roles || []).map(r => [r.id, r.role]));

  // Filter accounts to only include students (role is either 'alumno' or undefined)
  const students = (accounts || []).filter(account => {
    const role = roleMap.get(account.id);
    return !role || role === 'alumno';
  });

  // Fetch current enrollments for this course
  const { data: enrollments } = await adminClient.from('course_enrollments').select('student_id').eq('course_id', id);
  const initialEnrolledIds = (enrollments || []).map(e => e.student_id);

  return (
    <>
      <PageHeader
        title={`Editando: ${course.title}`}
        description="Gestiona las unidades, lecciones y configuración de la materia."
      >
        <CoursePublishToggle
          courseId={course.id}
          initialStatus={course.status || 'draft'}
        />
      </PageHeader>

      <PageBody>
        <div className="flex flex-col gap-8 pb-20">
          <Tabs defaultValue="curriculum" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="curriculum">Temario</TabsTrigger>
              <TabsTrigger value="settings">Configuración General</TabsTrigger>
              <TabsTrigger value="enrollments">Alumnos Inscritos</TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum" className="mt-0">
              <section className="bg-background text-foreground rounded-lg border p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Constructor del Temario</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${course.status === 'published' ? 'border border-green-200 bg-green-100 text-green-800' : 'border border-yellow-200 bg-yellow-100 text-yellow-800'}`}
                  >
                    Estado:{' '}
                    {course.status === 'published'
                      ? 'Publicado (Visible)'
                      : 'Borrador (Oculto)'}
                  </span>
                </div>
                <CourseBuilder
                  courseId={course.id}
                  initialModules={sortedModules}
                />
              </section>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <section className="bg-background text-foreground rounded-lg border p-6">
                <h2 className="mb-6 text-xl font-bold">
                  Configuración de la Materia
                </h2>
                <CourseSettingsForm course={course} />
              </section>
            </TabsContent>

            <TabsContent value="enrollments" className="mt-0">
              <section className="bg-background text-foreground rounded-lg border p-6">
                <h2 className="mb-6 text-xl font-bold">
                  Gestión de Inscripciones
                </h2>
                <CourseEnrollmentsForm 
                  courseId={course.id} 
                  students={students} 
                  initialEnrolledIds={initialEnrolledIds} 
                />
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </PageBody>
    </>
  );
}
