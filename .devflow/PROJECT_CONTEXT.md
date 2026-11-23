# PROJECT_CONTEXT — DEV FLOW

> Contexto breve del proyecto. Mantén este archivo como índice; enlaza documentación específica en vez de copiarla.
> Estados permitidos: VERIFICADO (comprobado en el repositorio), ACORDADO (definido por el equipo), PENDIENTE.

## Identidad
- Nombre: SEBIBE — Plataforma Educativa Virtual (`virtual.sebibe.org`) [VERIFICADO]
- Tipo (Web / Software + Supabase / Mobile / Otro): Software + Supabase (monorepo Next.js + Supabase) [VERIFICADO]
- Propósito: LMS institucional para cursar materias teológicas, lecciones, tareas/cuestionarios y notas (estudiantes, profesores y administradores) [VERIFICADO]

## Tecnologías
- Stack principal: Next.js `15.5.9` (App Router, Server Actions), React `19.2.1`, TypeScript `5.9.3`, Tailwind CSS `4.1.14`, Supabase (`@supabase/supabase-js` `2.75.0`), Playwright `1.56.0` [VERIFICADO]
- Gestor de paquetes / monorepo: `pnpm@10.18.2` + Turborepo `2.5.8` [VERIFICADO]

## Mapa de módulos
- Módulos principales y ubicación:
  - `apps/web`: aplicación LMS (rutas estudiante `/home/courses`, `/home/learn`, `/home/grades`; rutas admin `/home/admin-courses`, `/home/admin-cohorts`, `/home/admin-users`; auth `/auth/*`) [VERIFICADO]
  - `apps/e2e`: pruebas Playwright (smoke, evaluación y carga) [VERIFICADO]
  - `packages/`: `@kit/ui`, `@kit/supabase`, `@kit/next`, `@kit/auth`, `@kit/accounts`, `@kit/i18n`, `@kit/shared` [VERIFICADO]
- Documentos de detalle por módulo: [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md), [LOGICA_NEGOCIO.md](../docs/LOGICA_NEGOCIO.md), [ROLES_Y_PERMISOS.md](../docs/ROLES_Y_PERMISOS.md), [PRUEBAS-SMOKE.md](../PRUEBAS-SMOKE.md) [VERIFICADO]

## Diseño
- Librería de componentes / sistema visual: `@kit/ui` (Shadcn/UI + Radix + MakerKit), Tailwind CSS v4, tema Light fijo, fuente `Inter`, tokens en `apps/web/styles/shadcn-ui.css` (`#facc15`, `#172554`) [VERIFICADO]
- Fuente de reglas de diseño: `.devflow/DESIGN_SYSTEM.md` [ACORDADO], `apps/web/styles/shadcn-ui.css`, `apps/web/styles/globals.css` [VERIFICADO]

## Git y despliegue
- Rama de producción: `main` (`origin`: `santgodev/sebibe-plataforma-educativa`) [VERIFICADO]
- Política de ramas, sincronización y push: PENDIENTE (actualmente se trabaja directo en `main` entre 2 colaboradores)
- Hosting / despliegue: Vercel (`virtual.sebibe.org`, despliega desde `main`) + Supabase remoto (`bdglyyyrjjorrvbagvdd`) [VERIFICADO]

## Pruebas
- Pruebas relevantes (comandos exactos):
  - `pnpm test:smoke` (módulos + evaluación real) [VERIFICADO]
  - `pnpm test:evaluation` (evaluación completa + `/home/grades`) [VERIFICADO]
  - `pnpm test:load` (carga 20 y 50 estudiantes) [VERIFICADO]
  - *Nota Windows local:* usar `PLAYWRIGHT_SERVER_COMMAND="pnpm --filter web dev"` [VERIFICADO]
  - *Nota tooling:* `pnpm --filter web typecheck` (`TS2688: minimatch`) y `eslint` (`@rushstack/eslint-patch`) fallan en entorno local [VERIFICADO]
- Validaciones requeridas antes de entregar: PENDIENTE

## Trello
- Tablero: https://trello.com/b/22B8eA80/sebibe-desarrollo [VERIFICADO]
- Listas: `Por hacer` → `En progreso` → `En revisión y pruebas` → `hecho` [VERIFICADO]
- Criterios de aprobación: PENDIENTE
- Operación: ACORDADO — las personas crean y asignan; DEV FLOW consulta asignadas al usuario (máx. 3) y mueve `Por hacer → En progreso` al elegir tarea (1/4) y `En progreso → En revisión y pruebas` al pasar pruebas (3/4). Mover a `hecho` es exclusivo de personas.

## Reglas críticas
- Restricciones / dependencias sensibles:
  - Preservar UUIDs existentes en `saveQuestionsAndAnswers` (`activity.repository.ts`) [VERIFICADO]
  - Mantener `prefetch={false}` en navegación LMS y `revalidateTag('lms-content')` al editar contenido [VERIFICADO]
  - Filtrar siempre `.is('deleted_at', null)` en cursos, módulos y lecciones [VERIFICADO]
  - Cuidar pool de conexiones (Supabase en plan gratuito) y no commitear `.env.local` ni secretos [VERIFICADO]
- Archivos o módulos que no deben tocarse sin revisión: `apps/web/lib/lms/server/repositories/activity.repository.ts`, `apps/web/app/home/learn/[courseId]/_lib/learn-data.server.ts`, `apps/web/middleware.ts`, `apps/web/supabase/migrations/*` [VERIFICADO]

## Pendientes
- Información por confirmar: política oficial de ramas/PRs, tablero Trello y criterios de aprobación, reparo de `typecheck`/`lint` y retiro de `ignoreBuildErrors`, entorno staging separado de Supabase, unificación de alias de roles (`admin`/`administrador`, `profesor`/`instructor`, `alumno`/`student`) [PENDIENTE]
