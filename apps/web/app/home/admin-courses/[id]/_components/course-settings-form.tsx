'use client';

import { useTransition } from 'react';
import { useState } from 'react';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import { UpdateCourseSchema } from '~/lib/lms/schemas/course.schema';
import { updateCourseAction } from '~/lib/lms/server/actions/course.actions';

type FormValues = z.infer<typeof UpdateCourseSchema>;

export function CourseSettingsForm({ course }: { course: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(UpdateCourseSchema),
    defaultValues: {
      id: course.id,
      title: course.title || '',
      slug: course.slug || '',
      short_description: course.short_description || '',
      long_description: course.long_description || '',
      thumbnail_url: course.thumbnail_url || '',
      level: course.level || 'all_levels',
      duration_minutes: course.duration_minutes || 0,
      category: course.category || '',
    },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        await updateCourseAction(data);
        toast.success('Materia actualizada correctamente');
        router.refresh();
      } catch (error: any) {
        toast.error(
          error.message || 'Ocurrió un error al guardar la configuración.',
        );
      }
    });
  };

  const handleThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const client = getSupabaseBrowserClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${course.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await client.storage
        .from('courses_media')
        .upload(`thumbnails/${fileName}`, file);

      if (error) throw error;

      const { data: publicUrlData } = client.storage
        .from('courses_media')
        .getPublicUrl(`thumbnails/${fileName}`);

      form.setValue('thumbnail_url', publicUrlData.publicUrl);
      toast.success('Imagen subida correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al subir la imagen. Verifica que el bucket exista.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-2xl space-y-6"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título de la Materia</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej. Introducción al Antiguo Testamento"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug (URL amistosa)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ej-introduccion-antiguo-testamento"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción Corta</FormLabel>
              <FormControl>
                <Input
                  placeholder="Breve descripción de la materia..."
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="long_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Descripción Larga (Lo que aprenderás, temario detallado...)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Escribe aquí todo el detalle de lo que aprenderá el estudiante..."
                  className="min-h-[150px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un nivel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="beginner">Principiante</SelectItem>
                    <SelectItem value="intermediate">Intermedio</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                    <SelectItem value="all_levels">
                      Todos los niveles
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (Minutos)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ej. 120"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej. Teología"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="thumbnail_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Imagen de Portada</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://..."
                    {...field}
                    value={field.value || ''}
                    className="flex-1"
                  />
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Subiendo...' : 'Subir Imagen'}
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      onChange={handleThumbnailUpload}
                      disabled={isUploading}
                    />
                  </div>
                </div>
              </FormControl>
              <FormMessage />
              {field.value && (
                <div className="bg-muted mt-4 flex aspect-video max-w-sm items-center justify-center overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={field.value}
                    alt="Portada preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
