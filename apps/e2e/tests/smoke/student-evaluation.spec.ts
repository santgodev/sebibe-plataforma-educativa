import { BrowserContext, Page, expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Carga variables de entorno desde apps/web/.env.development y apps/web/.env.local
 */
function loadWebEnv(): Record<string, string> {
  const envVars: Record<string, string> = {};
  const envFiles = [
    path.resolve(__dirname, '../../../web/.env.development'),
    path.resolve(__dirname, '../../../web/.env.local'),
  ];

  for (const filePath of envFiles) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const rawVal = trimmed.slice(eqIdx + 1).trim();
        const val = rawVal.replace(/^['"]|['"]$/g, '');
        envVars[key] = val;
      }
    }
  }

  return { ...envVars, ...(process.env as Record<string, string>) };
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

const env = loadWebEnv();

const STUDENT_EMAIL = env.E2E_STUDENT_EMAIL || '';
const STUDENT_PASSWORD = env.E2E_STUDENT_PASSWORD || '';
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

interface ActivityAnswer {
  id: string;
  answer_text: string;
  is_correct: boolean;
  order_index: number | null;
}

interface ActivityQuestion {
  id: string;
  type: string;
  question_text: string;
  order_index: number | null;
  activity_answers: ActivityAnswer[];
}

interface ActivityRecord {
  id: string;
  title: string;
  type: string;
  course_id: string | null;
  lesson_id: string | null;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  lessons: {
    id: string;
    title: string;
    type: string | null;
    course_modules: {
      course_id: string;
    } | null;
  } | null;
  activity_questions: ActivityQuestion[];
}

interface LessonProgressSnapshot {
  id: string;
  is_completed: boolean;
  completed_at: string | null;
}

interface CourseProgressSnapshot {
  id: string;
  percentage_completed: number;
  status: string;
  completed_at: string | null;
}

async function supabaseRest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local para configurar la prueba de evaluación.',
    );
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Error Supabase REST (${response.status}) en ${endpoint}: ${body}`,
    );
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function loginAsStudent(page: Page) {
  await page.goto('/auth/sign-in');
  await expect(page.locator('input[name="email"]')).toBeVisible();

  await page.fill('input[name="email"]', STUDENT_EMAIL);
  await page.fill('input[name="password"]', STUDENT_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => url.pathname.startsWith('/home'), {
    timeout: 25_000,
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('E2E Evaluación de Estudiante', () => {
  let context: BrowserContext;
  let page: Page;

  let studentId = '';
  let targetCourseId = '';
  let targetLessonId = '';
  let targetActivity: ActivityRecord;
  let hasManualGrading = false;

  const preExistingAttemptIds = new Set<string>();
  let preExistingLessonProgress: LessonProgressSnapshot | null = null;
  let preExistingCourseProgress: CourseProgressSnapshot | null = null;

  let createdTempLessonId: string | null = null;
  let createdTempActivityId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
      throw new Error(
        'Faltan E2E_STUDENT_EMAIL o E2E_STUDENT_PASSWORD en apps/web/.env.local.',
      );
    }

    // 1. Obtener ID del estudiante
    const accounts = await supabaseRest<Array<{ id: string }>>(
      `accounts?email=eq.${encodeURIComponent(STUDENT_EMAIL)}&select=id&limit=1`,
    );

    if (!accounts || accounts.length === 0) {
      throw new Error(
        `No se encontró el estudiante ${STUDENT_EMAIL} en Supabase.`,
      );
    }
    studentId = accounts[0]!.id;

    // 2. Obtener cursos en los que está inscrito el estudiante
    const enrollments = await supabaseRest<Array<{ course_id: string }>>(
      `course_enrollments?student_id=eq.${studentId}&select=course_id`,
    );

    const enrolledCourseIds = new Set(
      (enrollments || []).map((e) => e.course_id),
    );

    if (enrolledCourseIds.size === 0) {
      throw new Error(
        `El estudiante ${STUDENT_EMAIL} no está inscrito en ninguna materia.`,
      );
    }

    // 3. Cargar actividades, bloques y attempts previos del estudiante
    const [activities, activityBlocks, allStudentAttempts] = await Promise.all([
      supabaseRest<ActivityRecord[]>(
        'activities?select=id,title,type,course_id,lesson_id,max_attempts,time_limit_minutes,passing_score,lessons(id,title,type,course_modules(course_id)),activity_questions(id,type,question_text,order_index,activity_answers(id,answer_text,is_correct,order_index))',
      ),
      supabaseRest<Array<{ lesson_id: string; content: { activity_id?: string } | null }>>(
        'lesson_blocks?type=eq.activity&select=lesson_id,content',
      ),
      supabaseRest<Array<{ id: string; activity_id: string; score: number | null; status: string | null }>>(
        `activity_attempts?student_id=eq.${studentId}&select=id,activity_id,score,status`,
      ),
    ]);

    const blocksByLesson = new Map<string, Set<string>>();
    const lessonsWithAnyBlocks = new Set<string>();

    // Revisar si las lecciones tienen bloques (si hay bloques, solo cuenta si existe bloque 'activity')
    const allBlockLessons = await supabaseRest<Array<{ lesson_id: string }>>(
      'lesson_blocks?select=lesson_id',
    );
    for (const row of allBlockLessons || []) {
      lessonsWithAnyBlocks.add(row.lesson_id);
    }
    for (const block of activityBlocks || []) {
      const actId = block.content?.activity_id;
      if (!actId) continue;
      if (!blocksByLesson.has(block.lesson_id)) {
        blocksByLesson.set(block.lesson_id, new Set());
      }
      blocksByLesson.get(block.lesson_id)!.add(actId);
    }

    const candidates = (activities || [])
      .map((act) => {
        const courseId =
          act.course_id || act.lessons?.course_modules?.course_id || '';
        const lessonId = act.lesson_id || '';
        const hasBlocks = lessonsWithAnyBlocks.has(lessonId);
        const hasActivityBlock =
          blocksByLesson.get(lessonId)?.has(act.id) || false;
        const rendersQuizViewer = hasBlocks
          ? hasActivityBlock
          : act.lessons?.type === 'quiz';

        const attempts = (allStudentAttempts || []).filter(
          (a) => a.activity_id === act.id,
        );
        const passingScore = act.passing_score || 0;
        const hasPassed = attempts.some((a) => (a.score || 0) >= passingScore);
        const hasPending = attempts.some((a) => a.status === 'needs_grading');
        const reachedMax =
          Boolean(act.max_attempts) && attempts.length >= (act.max_attempts || 0);

        const distinctTypes = new Set(
          (act.activity_questions || []).map((q) => q.type),
        );

        return {
          act,
          courseId,
          lessonId,
          rendersQuizViewer,
          attempts,
          canSubmit:
            Boolean(courseId) &&
            Boolean(lessonId) &&
            enrolledCourseIds.has(courseId) &&
            rendersQuizViewer &&
            (act.activity_questions?.length || 0) > 0 &&
            !hasPassed &&
            !hasPending &&
            !reachedMax,
          scoreWeight: distinctTypes.size * 10 + (act.activity_questions?.length || 0),
        };
      })
      .filter((item) => item.canSubmit)
      .sort((a, b) => b.scoreWeight - a.scoreWeight);

    if (candidates.length > 0) {
      const chosen = candidates[0]!;
      targetActivity = chosen.act;
      targetCourseId = chosen.courseId;
      targetLessonId = chosen.lessonId;
      for (const att of chosen.attempts) {
        preExistingAttemptIds.add(att.id);
      }
    } else {
      // Fallback: crear temporalmente una lección + evaluación en el primer módulo del primer curso inscrito
      targetCourseId = Array.from(enrolledCourseIds)[0]!;
      const modules = await supabaseRest<Array<{ id: string }>>(
        `course_modules?course_id=eq.${targetCourseId}&order=order_index.asc&limit=1&select=id`,
      );
      if (!modules || modules.length === 0) {
        throw new Error(
          `El curso ${targetCourseId} no tiene módulos para crear una evaluación temporal.`,
        );
      }

      const createdLessons = await supabaseRest<Array<{ id: string; title: string }>>(
        'lessons',
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            module_id: modules[0]!.id,
            title: '[E2E] Evaluación Temporal',
            type: 'quiz',
            order_index: 999,
            is_published: true,
          }),
        },
      );
      createdTempLessonId = createdLessons[0]!.id;
      targetLessonId = createdTempLessonId;

      const createdActivities = await supabaseRest<Array<{ id: string }>>(
        'activities',
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            course_id: targetCourseId,
            lesson_id: targetLessonId,
            title: '[E2E] Cuestionario Temporal',
            type: 'quick_quiz',
            passing_score: 70,
            max_attempts: null,
            time_limit_minutes: 5,
            automatic_feedback_enabled: true,
          }),
        },
      );
      createdTempActivityId = createdActivities[0]!.id;

      const q1 = await supabaseRest<Array<{ id: string }>>(
        'activity_questions',
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            activity_id: createdTempActivityId,
            type: 'single_choice',
            question_text: '[E2E] ¿Cuál es la respuesta correcta?',
            order_index: 0,
            points: 1,
          }),
        },
      );
      await supabaseRest('activity_answers', {
        method: 'POST',
        body: JSON.stringify([
          {
            question_id: q1[0]!.id,
            answer_text: 'Opción Correcta',
            is_correct: true,
            order_index: 0,
          },
          {
            question_id: q1[0]!.id,
            answer_text: 'Opción Incorrecta',
            is_correct: false,
            order_index: 1,
          },
        ]),
      });

      const q2 = await supabaseRest<Array<{ id: string }>>(
        'activity_questions',
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            activity_id: createdTempActivityId,
            type: 'true_false',
            question_text: '[E2E] Esta evaluación automatizada verifica el flujo real.',
            order_index: 1,
            points: 1,
          }),
        },
      );
      await supabaseRest('activity_answers', {
        method: 'POST',
        body: JSON.stringify([
          {
            question_id: q2[0]!.id,
            answer_text: 'Verdadero',
            is_correct: true,
            order_index: 0,
          },
          {
            question_id: q2[0]!.id,
            answer_text: 'Falso',
            is_correct: false,
            order_index: 1,
          },
        ]),
      });

      const fetched = await supabaseRest<ActivityRecord[]>(
        `activities?id=eq.${createdTempActivityId}&select=id,title,type,course_id,lesson_id,max_attempts,time_limit_minutes,passing_score,lessons(id,title,type,course_modules(course_id)),activity_questions(id,type,question_text,order_index,activity_answers(id,answer_text,is_correct,order_index))`,
      );
      targetActivity = fetched[0]!;
    }

    hasManualGrading = (targetActivity.activity_questions || []).some(
      (q) => q.type === 'open_text' || q.type === 'fill_blank',
    );

    // 4. Guardar snapshot previo de progreso para restaurarlo al finalizar
    const [lpRows, cpRows] = await Promise.all([
      supabaseRest<LessonProgressSnapshot[]>(
        `lesson_progress?student_id=eq.${studentId}&lesson_id=eq.${targetLessonId}&select=id,is_completed,completed_at&limit=1`,
      ),
      supabaseRest<CourseProgressSnapshot[]>(
        `course_progress?student_id=eq.${studentId}&course_id=eq.${targetCourseId}&select=id,percentage_completed,status,completed_at&limit=1`,
      ),
    ]);

    preExistingLessonProgress = lpRows?.[0] ?? null;
    preExistingCourseProgress = cpRows?.[0] ?? null;

    // 5. Iniciar navegador y sesión de estudiante
    context = await browser.newContext();
    page = await context.newPage();
    await loginAsStudent(page);
  });

  test.afterAll(async () => {
    await context?.close();

    if (!studentId || !targetActivity?.id) return;

    try {
      // Eliminar únicamente los intentos creados durante la prueba
      const attempts = await supabaseRest<Array<{ id: string }>>(
        `activity_attempts?student_id=eq.${studentId}&activity_id=eq.${targetActivity.id}&select=id`,
      );
      for (const att of attempts || []) {
        if (!preExistingAttemptIds.has(att.id)) {
          await supabaseRest(`activity_attempts?id=eq.${att.id}`, {
            method: 'DELETE',
          });
        }
      }

      // Restaurar lesson_progress
      if (preExistingLessonProgress) {
        await supabaseRest(
          `lesson_progress?id=eq.${preExistingLessonProgress.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              is_completed: preExistingLessonProgress.is_completed,
              completed_at: preExistingLessonProgress.completed_at,
            }),
          },
        );
      } else {
        await supabaseRest(
          `lesson_progress?student_id=eq.${studentId}&lesson_id=eq.${targetLessonId}`,
          { method: 'DELETE' },
        );
      }

      // Restaurar course_progress
      if (preExistingCourseProgress) {
        await supabaseRest(
          `course_progress?id=eq.${preExistingCourseProgress.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              percentage_completed: preExistingCourseProgress.percentage_completed,
              status: preExistingCourseProgress.status,
              completed_at: preExistingCourseProgress.completed_at,
            }),
          },
        );
      } else {
        await supabaseRest(
          `course_progress?student_id=eq.${studentId}&course_id=eq.${targetCourseId}`,
          { method: 'DELETE' },
        );
      }

      // Limpiar lección/actividad temporal si se usó el fallback
      if (createdTempActivityId) {
        await supabaseRest(`activities?id=eq.${createdTempActivityId}`, {
          method: 'DELETE',
        });
      }
      if (createdTempLessonId) {
        await supabaseRest(`lessons?id=eq.${createdTempLessonId}`, {
          method: 'DELETE',
        });
      }
    } catch (cleanupError) {
      console.error('Error limpiando datos de prueba E2E:', cleanupError);
    }
  });

  test('1. Estudiante abre la evaluación, inicia el intento y verifica modo seguro y temporizador', async () => {
    const response = await page.goto(
      `/home/learn/${targetCourseId}/lesson/${targetLessonId}`,
    );
    expect(response?.status()).toBeLessThan(400);

    const startButton = page.getByRole('button', {
      name: /Comenzar Cuestionario|Reintentar Cuestionario/i,
    });
    await expect(startButton).toBeVisible();
    await startButton.click();

    await expect(page.getByText('Modo Seguro Activo')).toBeVisible();
    await expect(page.locator('.select-none').first()).toBeVisible();

    if (
      targetActivity.time_limit_minutes &&
      targetActivity.time_limit_minutes > 0
    ) {
      const timerLocator = page
        .locator('div.font-mono')
        .filter({ hasText: /^\d+:\d{2}$/ })
        .first();
      await expect(timerLocator).toBeVisible();
      const initialTime = await timerLocator.innerText();
      await page.waitForTimeout(1500);
      const afterTime = await timerLocator.innerText();
      expect(afterTime).not.toBe(initialTime);
    }

    await expect(
      page.getByRole('button', { name: /Enviar Respuestas/i }),
    ).toBeVisible();
  });

  test('2. Estudiante responde todas las preguntas, envía y obtiene calificación aprobatoria', async () => {
    const questions = [...(targetActivity.activity_questions || [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );

    const questionCards = page.locator('div.space-y-10 > div.rounded-xl.border');

    for (const q of questions) {
      const headingText =
        q.type === 'fill_blank' && q.question_text?.includes('[___]')
          ? 'Completa los espacios en blanco de la siguiente frase:'
          : normalizeText(q.question_text);

      let card = questionCards.filter({
        has: page.locator('h3', { hasText: headingText }),
      });

      if (q.type === 'fill_blank' && q.question_text?.includes('[___]')) {
        const snippet = normalizeText(q.question_text.split('[___]')[0]);
        if (snippet) {
          card = card.filter({ hasText: snippet });
        }
      }

      card = card.first();
      await expect(card).toBeVisible();

      if (q.type === 'single_choice' || q.type === 'true_false') {
        const correct = q.activity_answers.find((a) => a.is_correct);
        if (!correct) {
          throw new Error(
            `La pregunta ${q.id} no tiene respuesta marcada como correcta.`,
          );
        }
        const expectedText = normalizeText(correct.answer_text);
        await card
          .locator('span.leading-snug')
          .getByText(expectedText, { exact: true })
          .first()
          .click();
      } else if (q.type === 'multiple_choice') {
        const corrects = q.activity_answers.filter((a) => a.is_correct);
        for (const ans of corrects) {
          const expectedText = normalizeText(ans.answer_text);
          await card
            .locator('span.leading-snug')
            .getByText(expectedText, { exact: true })
            .first()
            .click();
        }
      } else if (q.type === 'matching') {
        for (const ans of q.activity_answers) {
          const parts = (ans.answer_text || '')
            .split('|')
            .map((s) => normalizeText(s));
          const concept = parts[0] || '';
          const definition = parts.slice(1).join('|').trim() || concept;
          if (!concept) continue;

          const pairRow = card
            .locator('div')
            .filter({
              has: page.getByText(concept, { exact: true }),
            })
            .filter({
              has: page.getByRole('combobox'),
            })
            .last();

          await pairRow.getByRole('combobox').click();
          await page
            .getByRole('option', { name: definition, exact: true })
            .first()
            .click();
        }
      } else if (q.type === 'order_steps') {
        const expectedTexts = [...q.activity_answers]
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((a) => normalizeText(a.answer_text));

        const stepCards = card.locator(
          'div.rounded-xl.border:has(button:has-text("Subir"))',
        );
        const count = await stepCards.count();
        expect(count).toBe(expectedTexts.length);

        for (let targetIdx = 0; targetIdx < expectedTexts.length; targetIdx++) {
          const targetText = expectedTexts[targetIdx]!;
          let currentIdx = -1;

          for (let i = 0; i < count; i++) {
            const text = normalizeText(
              await stepCards.nth(i).locator('span.font-medium').innerText(),
            );
            if (text === targetText) {
              currentIdx = i;
              break;
            }
          }

          if (currentIdx === -1) {
            throw new Error(
              `No se encontró el paso "${targetText}" en order_steps.`,
            );
          }

          while (currentIdx > targetIdx) {
            await stepCards
              .nth(currentIdx)
              .getByRole('button', { name: /Subir/i })
              .click();
            currentIdx--;
          }
        }
      } else if (q.type === 'fill_blank') {
        const inputs = card.locator('input');
        const inputCount = await inputs.count();
        for (let i = 0; i < inputCount; i++) {
          await inputs.nth(i).fill('Respuesta de prueba');
        }
      } else if (q.type === 'open_text') {
        await card
          .locator('textarea')
          .first()
          .fill('Respuesta abierta de prueba automatizada.');
      }
    }

    await page.getByRole('button', { name: /Enviar Respuestas/i }).click();

    if (hasManualGrading) {
      await expect(
        page.getByRole('heading', {
          name: /Cuestionario enviado para revisión/i,
        }),
      ).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(
        page.getByRole('heading', { name: /Resultado:\s*100\.0%/i }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText(/¡Felicidades! Has aprobado el cuestionario\./i),
      ).toBeVisible();
    }

    // Verificar persistencia real en Supabase
    const attemptsAfter = await supabaseRest<
      Array<{ id: string; score: number; status: string }>
    >(
      `activity_attempts?student_id=eq.${studentId}&activity_id=eq.${targetActivity.id}&select=id,score,status`,
    );
    const createdAttempts = (attemptsAfter || []).filter(
      (a) => !preExistingAttemptIds.has(a.id),
    );
    expect(createdAttempts.length).toBeGreaterThan(0);

    const newAttempt = createdAttempts[0]!;
    if (hasManualGrading) {
      expect(newAttempt.status).toBe('needs_grading');
    } else {
      expect(newAttempt.score).toBe(100);
      expect(newAttempt.status).toBe('passed');
    }
  });

  test('3. La calificación aparece reflejada en Mis Calificaciones (/home/grades)', async () => {
    const response = await page.goto('/home/grades');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole('heading', { name: /Mis Calificaciones/i }).first(),
    ).toBeVisible();

    if (!hasManualGrading) {
      await expect(page.getByText(/5\.0/).first()).toBeVisible();
    }
  });
});
