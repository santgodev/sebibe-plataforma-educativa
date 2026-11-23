# PROJECT_CONTEXT.md — Plataforma Educativa SEBIBE

> Documento de contexto técnico y operativo para desarrolladores y agentes de IA.  
> **Última verificación sobre el repositorio:** 2026-11-23.

---

## 1. Identidad y propósito

- **Nombre:** Plataforma Educativa Virtual **SEBIBE** (`virtual.sebibe.org`)
- **Tipo de proyecto:** Software web + Supabase (monorepo basado en MakerKit `next-supabase-saas-kit-turbo-lite` v0.2.3).
- **Propósito:** LMS institucional para cursar materias teológicas, estudiar lecciones (video, texto, PDF, tareas/asignaciones), presentar evaluaciones y consultar calificaciones.
- **Usuarios principales:**
  - **Estudiantes (`alumno`):** cursan materias asignadas, realizan entregas/cuestionarios y revisan sus notas.
  - **Profesores (`profesor`):** crean y editan materias, módulos, lecciones, cuestionarios y califican entregas.
  - **Administradores (`administrador`):** gestionan cohortes, usuarios, matrículas y toda la oferta académica.
- **Documentación existente relacionada:**
  - `docs/LOGICA_NEGOCIO.md`
  - `docs/ROLES_Y_PERMISOS.md`
  - `PRUEBAS-SMOKE.md`

---

## 2. Stack tecnológico (verificado)

| Capa | Tecnología / Versión |
| :--- | :--- |
| Runtime y Gestor | Node `>=18.18.0`, `pnpm@10.18.2`, Turborepo `2.5.8` |
| Lenguaje | TypeScript `5.9.3` |
| Framework Web | Next.js `15.5.9` (App Router, Server Components, Server Actions, Turbopack en dev, `output: 'standalone'`) |
| UI & Estilos | React `19.2.1`, Tailwind CSS `4.1.14`, Shadcn/UI + Radix UI, `lucide-react` `0.545.0`, `sonner` `2.0.7` |
| Formularios & Validación | `react-hook-form` `7.65.0`, `@hookform/resolvers` `5.2.2`, `zod` `3.25.32` |
| Datos / Tablas / Gráficos | `@tanstack/react-query` `5.90.2`, `@tanstack/react-table` `8.21.3`, `recharts` `2.15.3` |
| i18n & Seguridad | `react-i18next` `16.0.0`, `@edge-csrf/nextjs`, `sanitize-html` `2.17.4`, `@marsidev/react-turnstile` |
| Base de datos y Auth | Supabase (`@supabase/supabase-js` `2.75.0`, Supabase CLI `2.48.3`) |
| Pruebas E2E / Carga | Playwright `1.56.0` (`apps/e2e`) |

---

## 3. Arquitectura y mapa de módulos

### Estructura del monorepo
- `apps/web`: aplicación principal Next.js.
- `apps/e2e`: suite Playwright (smoke, evaluación real, carga concurrente, auth y cuenta).
- `packages/`:
  - `@kit/ui` (`packages/ui`): primitivas Shadcn y componentes MakerKit reutilizables.
  - `@kit/supabase` (`packages/supabase`): clientes Supabase (browser, server, admin, middleware) y utilidades de auth/MFA.
  - `@kit/next` (`packages/next`): helpers de rutas y `enhanceAction`.
  - `@kit/shared`, `@kit/i18n`, `features/accounts` (`@kit/accounts`), `features/auth` (`@kit/auth`).
- `tooling/`: configuraciones compartidas de `eslint`, `prettier`, `typescript` y `scripts`.

### Capas LMS (`apps/web/lib/lms/`)
- `schemas/`: esquemas Zod (`activity.schema.ts`, `course.schema.ts`, `lesson.schema.ts`, `module.schema.ts`, `progress.schema.ts`).
- `server/actions/`: Server Actions con `enhanceAction` + `requireUser` (`course`, `module`, `lesson`, `activity`, `progress`, `cohorts`, `comments`, `notes`).
- `server/services/` y `server/repositories/`: reglas de negocio, calificación automática/manual (`ActivityService`) y consultas/mutaciones Supabase (`ActivityRepository`, `CourseRepository`, etc.).
- `utils/`: helpers `assignment.ts` y `youtube.ts`.

### Rutas principales (`apps/web/app/`)
- **Públicas / Legales:** `(marketing)/page.tsx`, `cookie-policy`, `privacy-policy`, `terms-of-service`.
- **Autenticación:** `auth/sign-in`, `auth/sign-up`, `auth/password-reset`, `auth/verify`, `auth/callback/error`, `update-password`.
- **Estudiante (`/home`):**
  - `/home/courses` y `/home/courses/[slug]` (catálogo y ficha de materia).
  - `/home/learn/[courseId]` y `/home/learn/[courseId]/lesson/[lessonId]` (visor de lecciones, tareas y cuestionarios).
  - `/home/learn/[courseId]/present` (modo presentación por curso).
  - `/home/grades` (mis calificaciones).
  - `/home/settings` (perfil y seguridad).
- **Profesor / Administrador (`/home`):**
  - `/home/admin-courses`, `/home/admin-courses/new`, `/home/admin-courses/[id]`, `/home/admin-courses/[id]/lesson/[lessonId]` (gestión de cursos, módulos, lecciones y `QuizBuilder`).
  - `/home/admin-cohorts`, `/home/admin-cohorts/[id]` (periodos, cohortes y programación).
  - `/home/admin-users`, `/home/admin-users/[id]` (gestión de usuarios, progreso y calificación de entregas).
- **API Routes:** `apps/web/app/api/` no tiene endpoints activos; la aplicación opera mediante Server Components y Server Actions.

### Capa de caché y concurrencia
- `apps/web/app/home/learn/[courseId]/_lib/learn-data.server.ts`: `unstable_cache` (TTL 300s, tag `lms-content`) + deduplicación *single-flight* en memoria + `React.cache` para catálogo de cursos, temarios, lecciones y catálogo de actividades.
- `apps/web/lib/server/get-cached-user-role.ts`: caché de roles (TTL 300s, tag `user-roles`) + *single-flight*.

---

## 4. Dependencias y zonas sensibles a cambios

1. **Preservación de UUIDs en cuestionarios (`apps/web/lib/lms/server/repositories/activity.repository.ts`):**
   - `saveQuestionsAndAnswers` **debe preservar los UUIDs existentes** de `activity_questions` y `activity_answers` mediante `update` / `insert` / `delete` selectivo.
   - Regenerar UUIDs al guardar invalida `activity_attempts.answers_json` históricos y exámenes abiertos en curso.
2. **Caché compartida e invalidación (`learn-data.server.ts` y Server Actions):**
   - Toda mutación sobre cursos, módulos, lecciones o actividades debe ejecutar `revalidateTag('lms-content')`.
   - Cualquier columna nueva de `activities`, `lessons` o `courses` usada en `/home/learn` o `/home/grades` debe incluirse explícitamente en el `select(...)` de `fetchActivitiesCatalogShared` / `fetchLessonBundleShared`.
3. **Control de tráfico hacia Supabase (`prefetch={false}`):**
   - En `lesson-sidebar-nav.tsx`, `learn-header.tsx`, `courses/page.tsx`, `courses/[slug]/page.tsx` y `learn/[courseId]/layout.tsx`, mantener `prefetch={false}` en los `<Link>` del LMS para no multiplicar peticiones concurrentes.
4. **Borrado lógico (`deleted_at IS NULL`):**
   - Filtrar siempre `.is('deleted_at', null)` al consultar `courses`, `course_modules` y `lessons`.
5. **Middleware y sesión:**
   - `apps/web/middleware.ts`: valida sesión JWT (`getClaims()`), protección CSRF (`@edge-csrf/nextjs`) y MFA (`checkRequiresMultiFactorAuthentication`).
   - `apps/web/components/session-inactivity-timeout.tsx`: cierre por inactividad configurado en **24 horas**.

---

## 5. Sistema de diseño existente (verificado)

- **Motor de estilos:** Tailwind CSS v4 configurado en `apps/web/styles/globals.css`, `theme.css`, `shadcn-ui.css` y `makerkit.css`.
- **Modo visual:** Tema fijado a **Light** (`color-scheme: light !important` en `globals.css` y `<RootProviders theme="light">` en `app/layout.tsx`; el dark mode automático por media query está deshabilitado).
- **Tipografía:** `Inter` vía `next/font/google` (`apps/web/lib/fonts.ts`, variables `--font-sans` y `--font-heading`).
- **Paleta institucional (`apps/web/styles/shadcn-ui.css`):**
  - Primario: `--primary: #facc15` (dorado SEBIBE) / `--primary-foreground: #0a0a0a`
  - Superficies: `--background: #ffffff`, `--card: #ffffff`, `--foreground: #0a0a0a`
  - Secundarios / Muted: `#f1f5f9`, texto secundario `#64748b`
  - Bordes e inputs: `#e2e8f0`, destructivo: `#ef4444`, radio base: `0.5rem`
  - Sidebar institucional: fondo `#172554` (azul marino), texto `#ffffff`, primario `#eab308`, acento `#1e3a8a` / `#facc15`
- **Componentes compartidos (`@kit/ui`):**
  - 37 componentes Shadcn (`packages/ui/src/shadcn/`) + componentes MakerKit (`page`, `sidebar`, `data-table`, `empty-state`, `image-uploader`, `stepper`, `spinner`, etc.) e iconografía `lucide-react`.

---

## 6. Datos, integraciones y permisos

- **Base de datos:** Supabase remoto (`bdglyyyrjjorrvbagvdd`, actualmente en plan gratuito/Nano).
- **Migraciones:** 19 archivos SQL en `apps/web/supabase/migrations/`.
- **Tablas principales:**
  - Usuarios/Institucional: `accounts`, `user_roles`, `students`, `programs`, `academic_periods`, `cohorts`, `cohort_enrollments`, `cohort_schedules`.
  - Contenido/Progreso LMS: `courses`, `course_modules`, `lessons`, `lesson_blocks`, `lesson_resources`, `lesson_notes`, `lesson_comments`, `course_enrollments`, `lesson_progress`, `course_progress`, `certificates`.
  - Evaluaciones: `activities`, `activity_questions`, `activity_answers`, `activity_attempts` *(y tablas legacy `quizzes`, `quiz_questions`, `quiz_answers`)*.
- **Funciones RPC activas:** `get_student_lesson_state`, `get_student_courses_state`, `get_student_grades_state`, `reorder_modules`, `reorder_lessons`, `enroll_by_email`.
- **Permisos y RLS:**
  - Políticas RLS activas optimizadas con `(select auth.uid())` e índices B-tree en llaves foráneas LMS (`20261123140000_optimize_lms_indexes_and_rls.sql`).
  - Vistas/acciones administrativas y de caché compartida usan `getSupabaseServerAdminClient()` (Service Role, **solo en servidor**).
  - Roles reales en BD: `administrador`, `profesor`, `alumno` *(en el código coexisten alias legacy `admin`, `instructor`, `student`)*.
- **Variables de entorno:** almacenadas en `apps/web/.env.local` (ignorado en Git; prohibido commitear secretos).

---

## 7. Git, pruebas y despliegue

- **Repositorio Git:** `https://github.com/santgodev/sebibe-plataforma-educativa.git` (`origin`), colaboradores activos observados: `crisgodev` y `Santgodev`.
- **Ramas actuales:** únicamente `main` (sin ramas `develop`/`staging` activas en el repo).
- **Despliegue (Vercel):** `virtual.sebibe.org` (proyecto `sebibe-plataforma-educativa-web`) conectado a `main` (sin `vercel.json` en el repositorio).
- **CI (`.github/workflows/workflow.yml`):**
  - En `push` y `pull_request` a `main`: ejecuta `pnpm run typecheck` y `pnpm run lint`.
  - Job `test` (Playwright + Supabase local): desactivado por condición (`vars.ENABLE_E2E_JOB == 'true'`).
- **Pruebas verificadas (`apps/e2e`):**
  - `pnpm test:smoke` (módulos admin/estudiante + evaluación real autolimpiable).
  - `pnpm test:evaluation` (flujo completo de examen y reflejo en `/home/grades`).
  - `pnpm test:load` (ráfagas de 20 y 50 estudiantes simultáneos).
  - *Nota Windows local:* `next build` puede fallar al final por permisos de symlinks (`output: 'standalone'`); las pruebas locales se ejecutan con `PLAYWRIGHT_SERVER_COMMAND="pnpm --filter web dev"`.
- **Comandos Supabase útiles (desde `apps/web`):** `npx supabase db push`, `pnpm --filter web supabase:typegen`.

---

## 8. Convenciones verificadas, riesgos y pendientes

### Reglas existentes (verificadas en el proyecto)
- Validar Server Actions con `enhanceAction` + esquemas Zod y autenticar al usuario antes de mutar datos.
- Mantener la consola de pruebas E2E autolimpiable y leyendo credenciales exclusivamente desde `.env.local`.
- Reutilizar componentes de `@kit/ui`, tokens de `shadcn-ui.css` y mantener el tema Light.
- Preservar UUIDs en edición de quizzes, filtrar `deleted_at IS NULL`, mantener `prefetch={false}` en navegación LMS e invalidar caché con `revalidateTag('lms-content')`.

### Riesgos y prácticas sensibles detectadas (7)
1. **Despliegue directo desde `main`:** actualmente ambos colaboradores hacen push a `main`, lo que publica directamente en producción (`virtual.sebibe.org`) sin revisión previa ni Preview URL.
2. **Errores ignorados en build (`apps/web/next.config.mjs`):** `typescript.ignoreBuildErrors: true` y `eslint.ignoreDuringBuilds: true` permiten desplegar código con errores de tipos o lint.
3. **Tooling local roto:** `pnpm --filter web typecheck` falla con `TS2688: Cannot find type definition file for 'minimatch'` y `eslint` falla con `@rushstack/eslint-patch` bajo ESLint `9.37.0`.
4. **Sin entorno de staging verificado para pruebas:** el job E2E de GitHub Actions está apagado (`ENABLE_E2E_JOB`) y las pruebas locales se ejecutan contra el proyecto Supabase remoto actual.
5. **Límite de conexiones en Supabase gratuito/Nano:** agregar consultas sin índice/caché o reactivar `prefetch` puede saturar el pool (`PGRST003`) con 20–50 alumnos simultáneos.
6. **Inconsistencia de alias de roles:** mezcla de `administrador`/`admin`, `profesor`/`instructor` y `alumno`/`student` en distintas capas.
7. **Dependencia crítica en cachés y RPCs:** olvidar `revalidateTag('lms-content')` o cambiar columnas usadas por RPCs/vistas puede mostrar datos desactualizados o rotos.

### Recomendaciones pendientes (NO aprobadas aún)
- Definir flujo con ramas cortas + Pull Requests hacia `main` usando Vercel Preview antes de publicar.
- Reparar `typecheck` y `eslint` en el monorepo y retirar `ignoreBuildErrors` / `ignoreDuringBuilds` de `next.config.mjs`.
- Crear un proyecto/entorno Supabase separado para staging/pruebas automáticas y habilitar pruebas automáticas previas al merge.
- Estandarizar los nombres de roles en un helper central único.
- Acordar reglas explícitas de protección de módulos, diseño y asignación de tareas para humanos e IAs.
