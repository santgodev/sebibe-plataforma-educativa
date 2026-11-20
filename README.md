# Plataforma Educativa Seminario (SEBIBE)

Plataforma LMS para la gestión académica por semestres, cohortes, materias, lecciones y evaluaciones del Seminario Bíblico, construida con Next.js 15, Supabase y Turborepo.

## Comandos principales

```powershell
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm run dev

# Compilar aplicación para producción
pnpm build

# Verificar tipos TypeScript en la app web
pnpm --filter web typecheck

# Ejecutar pruebas smoke automatizadas (con el servidor dev activo)
pnpm test:smoke

# Ejecutar pruebas smoke en modo interactivo
pnpm test:smoke:ui
```

## Estructura del proyecto

- `apps/web/` — Aplicación principal Next.js (App Router, módulos de estudiantes, profesores y administración).
- `apps/e2e/` — Pruebas automatizadas con Playwright.
- `packages/` — Paquetes internos compartidos (`ui`, `supabase`, `auth`, `accounts`, `i18n`, `next`, `shared`).
- `docs/` — Documentación del proyecto ([Lógica de Negocio](docs/LOGICA_NEGOCIO.md), [Roles y Permisos](docs/ROLES_Y_PERMISOS.md)).
- [PRUEBAS-SMOKE.md](PRUEBAS-SMOKE.md) — Guía rápida de ejecución para las pruebas smoke.
