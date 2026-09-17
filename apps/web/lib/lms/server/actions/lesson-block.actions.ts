'use server';

import sanitizeHtml from 'sanitize-html';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  CreateLessonBlockSchema,
  ReorderLessonBlocksSchema,
  UpdateLessonBlockSchema,
} from '../../schemas/lesson.schema';
import { LessonBlockService } from '../services/lesson-block.service';

export const createLessonBlockAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    await requireUser(client);

    const service = new LessonBlockService(client);

    // Si el bloque es de tipo texto, sanitizamos el contenido HTML
    if (
      data.type === 'text' &&
      data.content &&
      typeof data.content.html === 'string'
    ) {
      data.content.html = sanitizeHtml(data.content.html);
    }

    const blockData = { ...data, content: data.content ?? {} };
    const block = await service.createBlock(blockData);
    return block;
  },
  {
    schema: CreateLessonBlockSchema,
  },
);

export const updateLessonBlockAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    await requireUser(client);

    const service = new LessonBlockService(client);

    const { id, ...updateData } = data as any;

    // Sanitizar si es texto
    if (
      updateData.type === 'text' &&
      updateData.content &&
      typeof updateData.content.html === 'string'
    ) {
      updateData.content.html = sanitizeHtml(updateData.content.html);
    }

    try {
      const block = await service.updateBlock(id as string, updateData);
      return block;
    } catch (error) {
      console.error('[updateLessonBlockAction ERROR]:', error);
      throw error;
    }
  },
  {
    schema: UpdateLessonBlockSchema,
  },
);

export const reorderLessonBlocksAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const service = new LessonBlockService(client);

    await service.reorderBlocks(data.blocks);

    return { success: true };
  },
  {
    schema: ReorderLessonBlocksSchema,
  },
);

export const deleteLessonBlockAction = enhanceAction(
  async ({ id }) => {
    const client = getSupabaseServerClient();
    await requireUser(client);
    const service = new LessonBlockService(client);

    await service.deleteBlock(id);
    return { success: true };
  },
  {
    schema: UpdateLessonBlockSchema.pick({ id: true }),
  },
);
