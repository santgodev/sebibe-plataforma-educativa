import Link from 'next/link';

import { BookOpen, PlusCircle } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';

import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export const metadata = {
  title: 'Materias (Admin)',
};

export default async function AdminCoursesPage() {
  const user = await requireUserInServerComponent();
  const client = getSupabaseServerClient();

  const { data: courses, error } = await client
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  return (
    <>
      <PageHeader
        title="Gestión de Materias"
        description="Administra las materias de la ruta teológica"
      />

      <PageBody>
        <div className="mb-8 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-purple-100 p-1">
            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">Guía para Profesores</h4>
            <p className="leading-relaxed">
              En esta sección puedes diseñar el contenido "base" de tus materias. Podrás agregar unidades, definir créditos (peso académico) 
              y la duración estándar (1 o 2 semanas). Recuerda que luego de diseñarla, la materia deberá ser programada en el <strong>Cronograma del Cohorte</strong> 
              para que un grupo de alumnos pueda acceder a ella durante esas semanas exclusivas.
            </p>
          </div>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tus Materias</h2>
          <Link href="/home/admin-courses/new">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Nueva Materia
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {error ? (
            <div className="text-muted-foreground bg-muted/20 col-span-full rounded-xl border p-8 text-center">
              Ocurrió un error al cargar las materias.
            </div>
          ) : !courses || courses.length === 0 ? (
            <div className="bg-muted/30 col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12">
              <BookOpen className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-xl font-medium">
                No has creado ninguna materia todavía
              </h3>
              <p className="mb-4">
                Comienza a crear tu primera materia de la ruta teológica.
              </p>
              <Link href="/home/admin-courses/new">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Materia
                </Button>
              </Link>
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="group bg-background relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md"
              >
                <div className="bg-muted/50 relative aspect-video w-full overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="bg-primary/5 text-primary/40 flex h-full w-full items-center justify-center">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${course.status === 'published' ? 'bg-green-500 text-white' : 'bg-yellow-400 text-yellow-950'}`}
                    >
                      {course.status === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="bg-primary/10 text-primary-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize">
                      {course.level?.replace('_', ' ') || 'General'}
                    </span>
                  </div>
                  <h3 className="group-hover:text-primary mb-2 text-lg leading-tight font-bold transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 line-clamp-2 flex-1 text-sm">
                    {course.short_description || 'Sin descripción'}
                  </p>

                  <Link
                    href={`/home/admin-courses/${course.id}`}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-bold shadow transition-colors"
                  >
                    Editar Materia
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </PageBody>
    </>
  );
}
