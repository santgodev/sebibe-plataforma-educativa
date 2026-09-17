import Link from 'next/link';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { PageBody, PageHeader } from '@kit/ui/page';

export const metadata = {
  title: 'Catálogo de Materias',
};

export default async function CoursesCatalogPage() {
  const client = getSupabaseServerClient();

  const { data: courses, error } = await client
    .from('courses')
    .select(
      `
      id, title, slug, short_description, thumbnail_url, duration_minutes, level,
      course_modules (
        lessons ( id )
      )
    `,
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader
        title="Ruta Teológica"
        description="Explora todas las materias disponibles en tu ruta teológica"
      />

      <PageBody>
        {error ? (
          <div className="p-8 text-center text-red-500">
            Error al cargar los seminarios.
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-muted-foreground bg-muted/20 rounded-xl border p-12 text-center">
            <h3 className="mb-2 text-xl font-medium">
              No hay seminarios disponibles
            </h3>
            <p>Vuelve más tarde para descubrir nuevo contenido.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              // Extraer la primera lección para el botón "Empezar"
              let firstLessonId = null;
              if (course.course_modules && course.course_modules.length > 0) {
                const firstModule = course.course_modules[0];
                if (firstModule?.lessons && firstModule.lessons.length > 0) {
                  firstLessonId = firstModule.lessons[0]?.id;
                }
              }

              return (
                <div
                  key={course.id}
                  className="group bg-background relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md"
                >
                  <div className="bg-muted/50 aspect-video w-full overflow-hidden">
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
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize">
                        {course.level?.replace('_', ' ') || 'General'}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {course.duration_minutes || 0} min
                      </span>
                    </div>
                    <h3 className="group-hover:text-primary mb-2 text-lg leading-tight font-bold transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-muted-foreground mb-6 line-clamp-2 flex-1 text-sm">
                      {course.short_description}
                    </p>

                    {firstLessonId ? (
                      <Link
                        href={`/home/courses/${course.slug}`}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors"
                      >
                        Ver Detalles
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="bg-muted text-muted-foreground inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
                      >
                        Próximamente
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
