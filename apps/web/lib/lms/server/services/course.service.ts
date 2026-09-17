import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '~/lib/database.types';

import { CourseRepository } from '../repositories/course.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { ModuleRepository } from '../repositories/module.repository';

export class CourseService {
  private repository: CourseRepository;

  constructor(client: SupabaseClient<Database>) {
    this.repository = new CourseRepository(client);
  }

  async getPublishedCourses() {
    return this.repository.findAllPublished();
  }

  async getCourseBySlug(slug: string) {
    return this.repository.findBySlug(slug);
  }

  async getInstructorCourses(instructorId: string) {
    return this.repository.findByInstructor(instructorId);
  }

  async createCourse(data: {
    title: string;
    slug: string;
    short_description?: string;
    instructor_id: string;
    level?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  }) {
    // Business logic validation could go here
    return this.repository.create({
      ...data,
      status: 'draft', // all new courses start as draft
    });
  }

  async updateCourse(id: string, data: any, expected_version?: number) {
    return this.repository.update(id, data, expected_version);
  }

  async publishCourse(id: string) {
    // Reglas de Publicación Estrictas
    const course = await this.repository.findById(id);
    if (!course) throw new Error('Curso no encontrado.');

    if (!course.title || course.title.trim() === '') {
      return { error: 'El curso debe tener un título para ser publicado.' };
    }
    if (!course.short_description || course.short_description.trim() === '') {
      return {
        error: 'El curso debe tener una descripción corta para ser publicado.',
      };
    }
    if (!course.thumbnail_url || course.thumbnail_url.trim() === '') {
      return {
        error:
          'El curso debe tener una imagen de portada (thumbnail) para ser publicado.',
      };
    }

    // Verificar si tiene al menos un módulo y una lección publicada
    const moduleRepo = new ModuleRepository(this.repository['client']);
    const lessonRepo = new LessonRepository(this.repository['client']);

    const modules = await moduleRepo.findByCourseId(id);
    if (!modules || modules.length === 0) {
      return {
        error: 'El curso debe tener al menos un módulo para ser publicado.',
      };
    }

    let hasLesson = false;
    for (const mod of modules) {
      const lessons = await lessonRepo.findByModuleId(mod.id);
      if (lessons.length > 0) {
        hasLesson = true;
        break;
      }
    }

    if (!hasLesson) {
      return {
        error:
          'El curso debe tener al menos una lección creada dentro de sus módulos para poder publicarse.',
      };
    }

    return this.repository.update(id, { status: 'published' });
  }

  async deleteCourse(id: string) {
    return this.repository.delete(id);
  }
}
