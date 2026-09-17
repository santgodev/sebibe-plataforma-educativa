# Roles y Permisos de la Plataforma (Seminario Bíblico)

La plataforma utiliza tres roles principales para gestionar el acceso y los permisos de los usuarios. Estos roles se asignan a nivel de base de datos en la tabla `public.user_roles`.

## 1. Administrador (`administrador`)
Este es el rol con mayores privilegios.
- **Gestión de Usuarios:** Puede crear nuevos usuarios, listar a los usuarios existentes y asignarles roles.
- **Gestión Global:** Tiene acceso para ver todas las materias creadas por cualquier profesor.
- **Permisos de Tabla:** En las políticas RLS (Row Level Security), el administrador puede saltarse la validación de propiedad para poder editar, publicar o eliminar contenidos creados por otros.

## 2. Profesor (`profesor`)
Este rol está pensado para los docentes del seminario.
- **Gestión de Materias:** Puede crear, editar, publicar y archivar las materias de las cuales es el autor (`instructor_id`).
- **Contenido del Curso:** Puede crear módulos, lecciones, recursos y exámenes (quizzes) para sus propias materias.
- **Restricciones:** No puede ver ni editar las materias de otros profesores, ni tiene acceso al módulo de "Gestión de Usuarios".

## 3. Alumno (`alumno`)
Este rol representa a los estudiantes que consumen el contenido del seminario.
- **Visualización:** Puede ver el catálogo de materias públicas (con estado `published`).
- **Inscripción:** Puede inscribirse en las materias y ver el progreso de las mismas.
- **Consumo de Contenido:** Tiene permiso de solo lectura (`SELECT`) sobre los módulos, lecciones y exámenes de las materias a las que está inscrito.
- **Restricciones:** No tiene acceso al panel de administración de materias ni de usuarios. No puede alterar el contenido del sistema.
