# Comandos de Pruebas Automatizadas (Smoke Tests y Carga)

Asegúrate de tener el servidor de desarrollo corriendo en una terminal:

```powershell
pnpm run dev
```

## 1. Correr todas las pruebas rápidas (módulos + evaluación de alumno)

```powershell
pnpm test:smoke
```

## 2. Correr solo la prueba de evaluación con alumno (autolimpiable)

```powershell
pnpm test:evaluation
```

## 3. Correr prueba de carga concurrente (20 y 50 estudiantes simultáneos)

```powershell
pnpm test:load
```

*(Opcional: puedes probar contra otro entorno o concurrencia con `LOAD_BASE_URL=https://virtual.sebibe.org` o `LOAD_CONCURRENCY=50`.)*

## 4. Correr en navegador visual paso a paso (Modo UI)

```powershell
pnpm test:smoke:ui
pnpm test:evaluation:ui
```

---

### Archivos relacionados
- **Pruebas de módulos (Admin/Profesor y Alumno):** `apps/e2e/tests/smoke/modules-smoke.spec.ts`
- **Prueba E2E de evaluación con alumno:** `apps/e2e/tests/smoke/student-evaluation.spec.ts`
- **Prueba de carga (20 y 50 usuarios simultáneos):** `apps/e2e/tests/load/load-test-50-students.spec.ts`
- **Credenciales configuradas en:** `apps/web/.env.local` (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD`)
