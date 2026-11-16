'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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

import { UserCheck } from 'lucide-react';

import { CreateCourseSchema } from '~/lib/lms/schemas/course.schema';
import { createCourseAction } from '~/lib/lms/server/actions/course.actions';

interface CreateCourseFormProps {
  instructors?: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  currentUserId?: string;
  isAdmin?: boolean;
}

export function CreateCourseForm(props: CreateCourseFormProps) {
  const router = useRouter();

  const defaultInstructor =
    props.currentUserId ||
    (props.instructors && props.instructors.length > 0
      ? props.instructors[0]!.id
      : '');

  const form = useForm<z.infer<typeof CreateCourseSchema>>({
    resolver: zodResolver(CreateCourseSchema) as any,
    defaultValues: {
      title: '',
      slug: '',
      short_description: '',
      level: 'all_levels',
      duration_minutes: 0,
      instructor_id: defaultInstructor,
    },
  });

  const watchTitle = form.watch('title');

  useEffect(() => {
    if (watchTitle) {
      const generatedSlug = watchTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      form.setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [watchTitle, form]);

  const onSubmit = async (data: z.infer<typeof CreateCourseSchema>) => {
    try {
      const result = await createCourseAction(data);
      toast.success('Materia creada exitosamente');
      router.push(`/home/admin-courses/${result.id}`);
    } catch (error) {
      toast.error('Ocurrió un error al crear la materia');
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción Corta</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Breve descripción de la materia..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 font-semibold">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Profesor / Maestro Asignado</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
                disabled={!props.isAdmin && (props.instructors || []).length > 0}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar profesor..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(!props.instructors || props.instructors.length === 0) ? (
                    <SelectItem value="none" disabled>
                      No hay profesores registrados
                    </SelectItem>
                  ) : (
                    props.instructors.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name} ({inst.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {props.isAdmin
                  ? 'Selecciona el maestro responsable de impartir esta materia y evaluar a los estudiantes.'
                  : 'Esta materia quedará asignada a tu perfil de profesor.'}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (minutos)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Creando...' : 'Crear Materia'}
        </Button>
      </form>
    </Form>
  );
}
