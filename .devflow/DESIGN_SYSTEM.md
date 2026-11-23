# DESIGN_SYSTEM — SEBIBE Plataforma Educativa Virtual

> Fuente compartida de normas visuales. Mantener breve, no duplicar código. VERIFICADO / ACORDADO / PENDIENTE.

## Principios universales — ACORDADO
1. Minimalismo: una pantalla, un objetivo principal; eliminar ruido y repeticiones.
2. Preferir **máximo 3 acciones principales visibles por sección**. Es una guía, no un límite absoluto; agrupar secundarias cuando resulte más claro.
3. Menos clics, sin eliminar confirmaciones necesarias para operaciones delicadas.
4. Reutilizar componentes antes de crear nuevos; un solo sistema visual.
5. Consistencia en colores, tipografía, espaciado, botones, formularios, tablas y diálogos.
6. Responsive y accesible: contraste, teclado, etiquetas, legibilidad y tamaños táctiles.
7. Estados visibles: carga, vacío, éxito y error.
8. No rediseñar pantallas o módulos fuera del alcance de la tarea.
9. Priorizar experiencia real del usuario sobre efectos decorativos.
10. Excepciones permitidas si mejoran usabilidad y se registran aquí.

## Identidad visual existente — VERIFICADO / PENDIENTE
- Colores y tokens (rutas): `apps/web/styles/shadcn-ui.css` (`--primary: #facc15`, `--sidebar-background: #172554`, `--background: #ffffff`, `--destructive: #ef4444`), `apps/web/styles/theme.css`, `apps/web/styles/globals.css` (tema Light fijo) [VERIFICADO]
- Tipografías (rutas): `apps/web/lib/fonts.ts` (`Inter` vía `next/font/google`, `--font-sans` y `--font-heading`) [VERIFICADO]
- Componentes reutilizables (rutas): `packages/ui/src/shadcn/` (37 primitivas Shadcn/Radix), `packages/ui/src/makerkit/` (`page`, `sidebar`, `data-table`, `empty-state`, `image-uploader`, `stepper`, `spinner`) [VERIFICADO]
- Espaciado, bordes, iconos (rutas): Tailwind CSS v4 (`--radius: 0.5rem`), `lucide-react` [VERIFICADO]
- Referencias de pantallas/patrones: PENDIENTE

## Patrones de interacción — ACORDADO / PENDIENTE
- Acción principal y secundarias: ACORDADO — priorizar una acción principal por sección.
- Formularios, navegación, tablas, diálogos y estados: `react-hook-form` + `zod`, `sonner` toasts, `@tanstack/react-table` [VERIFICADO]; guía formal detallada PENDIENTE.
- Revisión visual de cambios UI: PENDIENTE

## Excepciones particulares — PENDIENTE
- Ninguna registrada aún.
