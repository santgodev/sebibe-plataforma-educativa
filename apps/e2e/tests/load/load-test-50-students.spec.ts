import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

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

const env = loadWebEnv();
const BASE_URL = (env.LOAD_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CONCURRENCY = Math.max(1, parseInt(env.LOAD_CONCURRENCY || '50', 10) || 50);
const STUDENT_EMAIL = env.E2E_STUDENT_EMAIL || '';
const STUDENT_PASSWORD = env.E2E_STUDENT_PASSWORD || '';
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';

async function supabaseRest<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase REST ${res.status} on ${endpoint}: ${await res.text()}`);
  }

  return (await res.json()) as T;
}

async function resolveStudentLessonPath(): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Faltan credenciales de Supabase en apps/web/.env.local');
  }

  const accounts = await supabaseRest<Array<{ id: string }>>(
    `accounts?email=eq.${encodeURIComponent(STUDENT_EMAIL)}&select=id&limit=1`,
  );
  const studentId = accounts[0]?.id;
  if (!studentId) {
    throw new Error(`No se encontró la cuenta ${STUDENT_EMAIL}`);
  }

  const enrollments = await supabaseRest<Array<{ course_id: string }>>(
    `course_enrollments?student_id=eq.${studentId}&select=course_id`,
  );
  const enrolledCourseIds = new Set((enrollments || []).map((e) => e.course_id));
  if (enrolledCourseIds.size === 0) {
    throw new Error(`El estudiante ${STUDENT_EMAIL} no tiene materias inscritas.`);
  }

  const activities = await supabaseRest<
    Array<{
      id: string;
      course_id: string | null;
      lesson_id: string | null;
      lessons: { id: string; type: string | null; course_modules: { course_id: string } | null } | null;
      activity_questions: Array<{ id: string }>;
    }>
  >(
    'activities?select=id,course_id,lesson_id,lessons(id,type,course_modules(course_id)),activity_questions(id)',
  );

  for (const act of activities || []) {
    const cId = act.course_id || act.lessons?.course_modules?.course_id || '';
    const lId = act.lesson_id || '';
    if (cId && lId && enrolledCourseIds.has(cId) && (act.activity_questions?.length || 0) > 0) {
      return `/home/learn/${cId}/lesson/${lId}`;
    }
  }

  const firstCourseId = Array.from(enrolledCourseIds)[0]!;
  return `/home/learn/${firstCourseId}`;
}

interface BurstResult {
  total: number;
  ok: number;
  failed: number;
  wallTimeMs: number;
  minMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  failures: Array<{ index: number; status: number; durationMs: number; reason: string }>;
}

const ERROR_MARKERS = [
  'PGRST003',
  '57014',
  'upstream request timeout',
  'Timed out acquiring connection',
  'canceling statement due to statement timeout',
  'NEXT_HTTP_ERROR_FALLBACK',
  'Application error: a server-side exception',
];

async function runBurst(
  label: string,
  urls: string[],
  cookieHeader: string,
): Promise<BurstResult> {
  const wallStart = Date.now();

  const settled = await Promise.all(
    urls.map(async (url, index) => {
      const t0 = Date.now();
      try {
        const res = await fetch(url, {
          headers: {
            Cookie: cookieHeader,
            Accept: 'text/html,application/xhtml+xml',
          },
          redirect: 'manual',
        });

        const text = await res.text();
        const durationMs = Date.now() - t0;

        const matchedMarker = ERROR_MARKERS.find((marker) =>
          text.includes(marker),
        );

        if (res.status !== 200 || matchedMarker) {
          const reason = matchedMarker
            ? `Marker "${matchedMarker}"`
            : `HTTP ${res.status}${res.headers.get('location') ? ` -> ${res.headers.get('location')}` : ''}`;
          return { index, status: res.status, durationMs, ok: false, reason };
        }

        return { index, status: res.status, durationMs, ok: true, reason: '' };
      } catch (err: any) {
        return {
          index,
          status: 0,
          durationMs: Date.now() - t0,
          ok: false,
          reason: err?.message || 'Fetch error',
        };
      }
    }),
  );

  const wallTimeMs = Date.now() - wallStart;
  const durations = settled.map((r) => r.durationMs).sort((a, b) => a - b);
  const sum = durations.reduce((acc, d) => acc + d, 0);
  const pct = (p: number) =>
    durations[Math.min(durations.length - 1, Math.floor((durations.length - 1) * p))] ?? 0;

  const failures = settled
    .filter((r) => !r.ok)
    .map(({ index, status, durationMs, reason }) => ({
      index,
      status,
      durationMs,
      reason,
    }));

  const report: BurstResult = {
    total: settled.length,
    ok: settled.length - failures.length,
    failed: failures.length,
    wallTimeMs,
    minMs: durations[0] ?? 0,
    avgMs: Math.round(sum / Math.max(1, settled.length)),
    p50Ms: pct(0.5),
    p95Ms: pct(0.95),
    maxMs: durations[durations.length - 1] ?? 0,
    failures,
  };

  console.log(
    `\n[LOAD REPORT] ${label}\n` +
      JSON.stringify(
        {
          ...report,
          failures: report.failures.slice(0, 10),
        },
        null,
        2,
      ),
  );

  return report;
}

test.describe.configure({ mode: 'serial' });

test.describe('Load Tests: Concurrencia de 20 y 50 Estudiantes', () => {
  let cookieHeader = '';
  let lessonUrl = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);

    if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
      throw new Error(
        'Faltan E2E_STUDENT_EMAIL o E2E_STUDENT_PASSWORD en apps/web/.env.local.',
      );
    }

    const lessonPath = await resolveStudentLessonPath();
    lessonUrl = `${BASE_URL}${lessonPath}`;

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/auth/sign-in`);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await page.fill('input[name="email"]', STUDENT_EMAIL);
    await page.fill('input[name="password"]', STUDENT_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.startsWith('/home'), {
      timeout: 30_000,
    });

    const cookies = await context.cookies(BASE_URL);
    cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    await context.close();

    if (!cookieHeader) {
      throw new Error('No se pudieron capturar cookies de sesión del estudiante.');
    }

    // Warm-up para asegurar compilación previa de rutas en modo dev
    for (const warmPath of [lessonPath, '/home/courses', '/home/grades']) {
      const res = await fetch(`${BASE_URL}${warmPath}`, {
        headers: { Cookie: cookieHeader },
        redirect: 'manual',
      });
      await res.text();
    }
  });

  test('1. Ráfaga de 20 estudiantes simultáneos abriendo la evaluación', async () => {
    test.setTimeout(120_000);
    const urls = Array.from({ length: 20 }, () => lessonUrl);
    const report = await runBurst('20 estudiantes -> Evaluación', urls, cookieHeader);

    expect(report.failed).toBe(0);
    expect(report.ok).toBe(20);
  });

  test(`2. Ráfaga de ${CONCURRENCY} estudiantes simultáneos abriendo la evaluación`, async () => {
    test.setTimeout(120_000);
    const urls = Array.from({ length: CONCURRENCY }, () => lessonUrl);
    const report = await runBurst(
      `${CONCURRENCY} estudiantes -> Evaluación`,
      urls,
      cookieHeader,
    );

    expect(report.failed).toBe(0);
    expect(report.ok).toBe(CONCURRENCY);
  });

  test(`3. Ráfaga mixta de ${CONCURRENCY} estudiantes simultáneos (/home/courses + /home/grades + evaluación)`, async () => {
    test.setTimeout(120_000);
    const evalCount = Math.ceil(CONCURRENCY * 0.4);
    const coursesCount = Math.floor((CONCURRENCY - evalCount) / 2);
    const gradesCount = CONCURRENCY - evalCount - coursesCount;

    const urls = [
      ...Array.from({ length: evalCount }, () => lessonUrl),
      ...Array.from({ length: coursesCount }, () => `${BASE_URL}/home/courses`),
      ...Array.from({ length: gradesCount }, () => `${BASE_URL}/home/grades`),
    ];

    const report = await runBurst(
      `${CONCURRENCY} estudiantes -> Tráfico mixto (${evalCount} eval, ${coursesCount} cursos, ${gradesCount} notas)`,
      urls,
      cookieHeader,
    );

    expect(report.failed).toBe(0);
    expect(report.ok).toBe(CONCURRENCY);
  });
});
