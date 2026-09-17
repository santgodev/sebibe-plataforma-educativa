import { PageBody, PageHeader } from '@kit/ui/page';

import { CreateCourseForm } from '../_components/create-course-form';

export const metadata = {
  title: 'Crear Nueva Materia',
};

export default function NewCoursePage() {
  return (
    <>
      <PageHeader
        title="Crear Nueva Materia"
        description="Agrega una nueva materia a la ruta teológica."
      />

      <PageBody>
        <div className="bg-background mx-auto w-full max-w-2xl rounded-lg border p-6">
          <CreateCourseForm />
        </div>
      </PageBody>
    </>
  );
}
