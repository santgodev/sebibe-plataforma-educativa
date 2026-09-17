# Lógica de Negocio y Arquitectura del Seminario

Este documento detalla la lógica de negocio del Seminario en base al funcionamiento por semestres, grupos (cohortes) y la dedicación exclusiva por bloques temporales, junto con el análisis de los módulos actuales y las brechas existentes.

## 1. Lógica de Negocio Descrita

El seminario funciona bajo el siguiente modelo académico:

1. **Ciclos Semestrales**: La operación se divide en semestres (ej. Primer semestre 2025, Segundo semestre 2025).
2. **Grupos/Cohortes**: Al iniciar un semestre, se registra un "Grupo" cerrado de estudiantes que avanzarán juntos a lo largo del tiempo.
3. **Malla Curricular Secuencial y Continuidad**: A lo largo del semestre, el grupo cursa varias materias secuencialmente. Es vital considerar que la **ruta completa dura 3 años (2 años de teoría y 1 año de práctica)**. Por lo tanto, un "Grupo" (ej. Cohorte Alpha) no muere al terminar el semestre; se retoma y reinscribe en el semestre siguiente hasta que culminan sus 3 años.
4. **Dedicación Exclusiva (Sistema Modular)**: Cada materia tiene una duración específica, que puede ser de **1 semana o 2 semanas**, dependiendo de la materia. Durante ese periodo asignado, el grupo y el profesor se dedican **única y exclusivamente** a esa materia. Al concluir el tiempo, la materia se cierra y el grupo cambia totalmente a la siguiente.
5. **Créditos**: Cada materia tiene un peso académico medido en "créditos".

---

## 2. Análisis de Módulos Actuales y Brechas (Gaps)

Revisando el esquema actual de la base de datos, encontramos las siguientes faltantes en los 3 módulos principales:

### Módulo de Usuarios
- **Actual**: Existen usuarios (`accounts`), roles (`user_roles`) y matrículas directas e individuales a materias (`course_enrollments`).
- **Brecha**: 
  - Falla el concepto de **Cohorte/Grupo**. No se debería matricular al estudiante materia por materia de forma manual, sino inscribirlo a un "Grupo del Semestre" (ej. Grupo 1 - 2025-I), y que este herede automáticamente el calendario de materias de ese grupo.
  - Se requiere un sistema de Cohortes para agrupar estudiantes.

### Módulo de Gestión de Cursos (Materias)
- **Actual**: La tabla `courses` actúa como "catálogo general" y no tiene control estricto de fechas de inicio y fin para grupos específicos. No maneja créditos.
- **Brecha**:
  - **Créditos**: Falta asignar y guardar los créditos por materia.
  - **Duración Base**: Se debe poder definir si una materia dura 1 o 2 semanas por defecto.
  - **Cronograma (Schedules)**: Es imperativo separar la "Materia Base" (ej. Administración Eclesiástica) de su "Apertura". Se necesita una tabla de Cronograma que asigne: Grupo + Materia + Profesor + **Fechas exactas de inicio y fin** (garantizando el bloqueo de 1 o 2 semanas).

### Módulo de Visualización de Cursos (Para el Estudiante)
- **Actual**: El estudiante ve una cuadrícula estilo Netflix con todas las materias disponibles al mismo tiempo.
- **Brecha**:
  - La interfaz debe transformarse en una **Ruta de Aprendizaje Cronológica** (Timeline) basada en el calendario del semestre.
  - El estudiante debe ver claramente: "Materia Actual (Semana en curso)", "Materias Completadas" y "Materias Próximas".
  - **Bloqueos de Acceso**: El sistema debe impedir estrictamente que el alumno envíe actividades o participe en materias que aún no abren, o que ya superaron su lapso de 1 o 2 semanas.

---

## 3. Propuesta de Arquitectura de Base de Datos

Para soportar esta lógica sin romper la estructura actual, se deben crear las siguientes tablas y relaciones:

1. **`academic_periods`**: Semestres (ej. "2025-1").
2. **`cohorts`**: Grupos de alumnos. Relaciona a un `period_id` y a un `program_id`.
3. **`cohort_enrollments`**: Une al alumno con su respectivo Grupo.
4. **`cohort_schedules`**: Representa el "Calendario de Clases". Une el Grupo, la Materia (`course_id`), el Profesor asignado y estipula exactamente la `start_date` y `end_date`.
5. Modificación a **`courses`**: Añadir columnas `credits INT` y `duration_weeks INT` (1 o 2).
