import { BrowserContext, Page, expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Carga variables de entorno desde apps/web/.env.local y apps/web/.env.development
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

const env = loadWebEnv();

// Credenciales leídas exclusivamente desde apps/web/.env.local o variables de entorno
const ADMIN_EMAIL = env.E2E_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = env.E2E_ADMIN_PASSWORD || '';

const STUDENT_EMAIL = env.E2E_STUDENT_EMAIL || '';
const STUDENT_PASSWORD = env.E2E_STUDENT_PASSWORD || '';

async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
) {
  if (!email || !password) {
    throw new Error(
      'Faltan credenciales E2E (E2E_ADMIN_EMAIL/PASSWORD o E2E_STUDENT_EMAIL/PASSWORD) en apps/web/.env.local.',
    );
  }

  await page.goto('/auth/sign-in');
  await expect(page.locator('input[name="email"]')).toBeVisible();

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Esperar a que redirija fuera de /auth/sign-in hacia /home
  await page.waitForURL((url) => url.pathname.startsWith('/home'), {
    timeout: 25_000,
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('Smoke Tests: Módulos de Profesor / Administrador', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    await loginWithCredentials(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('1. Módulo Gestión de Materias (/home/admin-courses) carga correctamente', async () => {
    const response = await page.goto('/home/admin-courses');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page
        .getByRole('heading', {
          name: /^(Gestión de Materias|Tus Materias Asignadas)$/i,
        })
        .first(),
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: /Nueva Materia/i }).first(),
    ).toBeVisible();
  });

  test('2. Submódulo Crear Nueva Materia (/home/admin-courses/new) muestra el formulario', async () => {
    const response = await page.goto('/home/admin-courses/new');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole('heading', { name: /Crear Nueva Materia/i }).first(),
    ).toBeVisible();
  });

  test('3. Módulo Gestión de Cohortes (/home/admin-cohorts) carga los semestres', async () => {
    const response = await page.goto('/home/admin-cohorts');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole('heading', { name: /^Gestión de Cohortes$/i }).first(),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: /^Cohortes por Semestre$/i }).first(),
    ).toBeVisible();
  });

  test('4. Módulo Gestión de Usuarios (/home/admin-users) responde según rol sin errores', async () => {
    const response = await page.goto('/home/admin-users');
    expect(response?.status()).toBeLessThan(400);

    // Si es administrador carga Gestión de Usuarios; si es profesor redirige a sus materias
    await expect(
      page
        .getByRole('heading', {
          name: /^(Gestión de Usuarios|Gestión de Materias|Tus Materias Asignadas)$/i,
        })
        .first(),
    ).toBeVisible();

    await expect(page.getByText(/Error al cargar usuarios/i)).toHaveCount(0);
  });

  test('5. Módulo Notas - Vista Profesor/Admin (/home/grades) carga tabla de estudiantes', async () => {
    const response = await page.goto('/home/grades');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole('heading', { name: /Notas de Estudiantes/i }).first(),
    ).toBeVisible();
  });

  test('6. Módulo Configuración de Perfil (/home/settings) carga sin errores', async () => {
    const response = await page.goto('/home/settings');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole('heading', { name: /Tu Nombre|Tu foto de perfil/i }).first(),
    ).toBeVisible();
  });
});

test.describe('Smoke Tests: Módulos de Estudiante', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    await loginWithCredentials(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('1. Módulo Ruta Teológica / Mi Aprendizaje (/home/courses) carga para el alumno', async () => {
    const response = await page.goto('/home/courses');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole('heading', { name: /Mi Aprendizaje/i }).first(),
    ).toBeVisible();
  });

  test('2. Módulo Mis Calificaciones (/home/grades) carga resumen y KPIs del alumno', async () => {
    const response = await page.goto('/home/grades');
    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole('heading', { name: /Mis Calificaciones/i }).first(),
    ).toBeVisible();

    await expect(page.getByText('Promedio General').first()).toBeVisible();
  });
});
