import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdglyyyrjjorrvbagvdd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('Buscando usuarios...');
  const {
    data: { users },
    error: userError,
  } = await supabase.auth.admin.listUsers();

  let instructorId;

  if (userError || !users || users.length === 0) {
    console.log('No hay usuarios, creando usuario admin por defecto...');
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: 'admin@seminario.com',
        password: 'Password123!',
        email_confirm: true,
      });
    if (createError) {
      console.error('Error creando usuario:', createError);
      return;
    }
    instructorId = newUser.user.id;
  } else {
    instructorId = users[0].id;
  }
  console.log('Usando el usuario con ID:', instructorId);

  // Verificar si ya existe el curso
  const { data: existingCourse } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', 'introduccion-al-antiguo-testamento')
    .single();

  if (existingCourse) {
    console.log('El curso ya existe, saltando el seed.');
    return;
  }

  // 1. Insert Course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      title: 'Introducción al Antiguo Testamento',
      slug: 'introduccion-al-antiguo-testamento',
      short_description:
        'Descubre el contexto histórico, cultural y teológico de los libros sagrados del Antiguo Testamento.',
      long_description:
        'Este seminario bíblico está diseñado para profundizar en las raíces de la fe cristiana, analizando la Torá, los libros históricos, proféticos y poéticos con rigor teológico.',
      level: 'beginner',
      status: 'published',
      instructor_id: instructorId,
      duration_minutes: 120,
      category: 'Teología Básica',
    })
    .select()
    .single();

  if (courseError) {
    console.error('Course Error:', courseError);
    return;
  }

  // 2. Insert Modules
  const { data: modules, error: modError } = await supabase
    .from('course_modules')
    .insert([
      {
        course_id: course.id,
        title: 'Módulo 1: El Pentateuco y los Orígenes',
        order_index: 1,
      },
      {
        course_id: course.id,
        title: 'Módulo 2: Libros Históricos',
        order_index: 2,
      },
    ])
    .select();

  if (modError) {
    console.error('Modules Error:', modError);
    return;
  }

  const mod1 = modules.find((m) => m.order_index === 1);
  const mod2 = modules.find((m) => m.order_index === 2);

  // 3. Insert Lessons
  const { data: lessons, error: lessonError } = await supabase
    .from('lessons')
    .insert([
      {
        module_id: mod1.id,
        title: 'Génesis: La Creación y los Patriarcas',
        type: 'video',
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        duration_seconds: 600,
        order_index: 1,
        is_published: true,
        content: 'En esta lección abordaremos la teología de la creación...',
      },
      {
        module_id: mod1.id,
        title: 'Éxodo: La Liberación y la Ley',
        type: 'video',
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        duration_seconds: 720,
        order_index: 2,
        is_published: true,
        content: 'Estudiaremos la importancia del pacto en el Sinaí.',
      },
      {
        module_id: mod2.id,
        title: 'Josué y la Conquista',
        type: 'video',
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        duration_seconds: 500,
        order_index: 1,
        is_published: true,
        content: 'Contexto histórico de Canaán.',
      },
    ])
    .select();

  if (lessonError) {
    console.error('Lessons Error:', lessonError);
    return;
  }

  // 4. Enroll the user automatically
  await supabase.from('course_enrollments').insert({
    course_id: course.id,
    student_id: instructorId,
  });

  console.log('Seed exitoso. Curso y lecciones creadas.');
}

seed();
