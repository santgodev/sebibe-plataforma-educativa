import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdglyyyrjjorrvbagvdd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // From .env.local

const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_KEY);

async function seed() {
  const instructorId = 'ea25db45-9169-4f38-b618-a25c855ce931';
  console.log(`Instructor ID: ${instructorId}`);

  console.log('Creating course...');
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      title: 'Administración eclesiástica',
      slug: 'administracion-eclesiastica',
      short_description:
        'Estudiar los conceptos y principios generales de la administración aplicados a la vida del ministro y su que hacer en la obra de Dios.',
      long_description: `**Seminario Bíblico Internacional Berea (Modalidad residencial)**\n\n**Silabo:** Administración eclesiástica.\n**Área:** Ministerial – Profesional.\n**Código:** \n**Número de horas:** 50 \n**Número de créditos:** 3\n**Semestre:** 01 – 03.\n**Fecha de inicio:** 08 de Junio de 2026.\n**Fecha de finalización:** 12 de Junio de 2026. (Primera parte)\n**Horario:** lunes a viernes _ 8:00 a.m. a 1:00 p.m. más trabajo extra clase.\n\n**DATOS DEL PROFESOR**\n**Nombre:** Fabián Ricardo Preciado Hernández\n**Correo electrónico:** pfabiantareas@gmail.com\n\n**Títulos académicos:**\n- En proceso Dr Min.(c) Doctor of Ministry, Pentecostal Theological Seminary.\n- Magister en recursos digitales aplicados a la educación, Universidad de Cartagena, Udec.\n- Magister, Escolari In Sagrada Escritura, Seminario Sudamericano, SEMISUD.\n- Especialista en didáctica y tic, Universidad de Cartagena, Udec.\n- Teólogo _ Universidad Bautista de Cali.\n- Tecnólogo en gestión comercial y financiera, Universidad Pedagógica y tecnológica de Colombia, UPTC.\n- Técnico profesional en procesos comerciales y financieros, Universidad Pedagógica y tecnológica de Colombia, UPTC.\n- Técnico en teología ministerial, Seminario Bíblico Internacional Berea, SEBIBE.\n- Obispo ordenado de la Iglesia de Dios, con oficinas internacionales en Cleveland, Tennessee, EE. UU.\n- Conferencista y capacitador en liderazgo, certificado por Maxwell Leadership, John Maxwell.\n- Autor de 4 libros.\n\n**METODOLOGÍA**\nEl curso se desarrollará en dos semanas de lunes a viernes. Utilizaremos diversas metodologías con el fin de alcanzar los objetivos propuestos: Exposición magistral, lecturas, resúmenes, ensayo crítico, análisis de videos, exposición, trabajo en grupo.\n\n**CRITERIOS Y FORMAS DE EVALUACIÓN**\nLa evaluación es continua a lo largo del curso, algunos de los elementos principales a tener en cuenta son:\n- Asistencia al espacio académico.\n- Participación y aportes significativos en el desarrollo del curso.\n- Lecturas, resúmenes y ensayos comprensivo de los textos de consulta e investigación.\n- Responsabilidad y compromiso frente al trabajo individual y grupal.\n- Desarrollo y presentación de las exposiciones, tareas y evaluaciones.\n\n**REFERENCIAS BIBLIOGRÁFICAS**\n- Demaray E Donald, Introducción a la Biblia, Editorial Unilit, 2001.\n- Benware, P. Panorama de la Biblia. Portavoz. Michigan. 1994\n- Wesley Adams, J., Cotton, R., McGhee, Q. Panorama del Antiguo Testamento. Faith & Action. Springfield, Missouri. 2011.\n- Edersheim Alfred, Usos y costumbres de los judíos en los tiempos de Cristo, Editorial Clie, 2000.`,
      instructor_id: instructorId,
      level: 'all_levels',
      duration_minutes: 3000, // 50 hours
      status: 'draft',
      category: 'Ministerial - Profesional',
    })
    .select()
    .single();

  if (courseError || !course) {
    console.error('Error creating course', courseError);
    return;
  }

  console.log(`Course created with ID: ${course.id}`);

  const modules = [
    {
      title: 'UNIDAD 1. Fundamentos de la administración.',
      lessons: [
        'Conceptos generales sobre la administración.',
        'Los fundamentos de la administración en la Biblia.',
        'Oficiales y gobierno eclesiástico en el Nuevo testamento.',
        'Tipos de gobierno eclesiástico.',
      ],
    },
    {
      title: 'UNIDAD 2. El ministro como administrador.',
      lessons: [
        'Proyecto de vida.',
        'Mayordomía cristiana.',
        'Relaciones humanas.',
        'La toma de decisiones.',
      ],
    },
    {
      title: 'UNIDAD 3. El proceso administrativo.',
      lessons: ['Planificación.', 'Organización.', 'Ejecución.', 'Evaluación.'],
    },
    {
      title: 'UNIDAD 4. Finanzas e iglesia.',
      lessons: [
        'El manejo del dinero.',
        'Principios contables.',
        'Normas legales.',
      ],
    },
    {
      title: 'UNIDAD 5. Organización general de la Iglesia.',
      lessons: [
        'Organización de la Iglesia de Dios.',
        'Establecimiento y trabajo en equipo.',
        'Normas parlamentarias.',
      ],
    },
  ];

  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];
    if (!mod) continue;
    console.log(`Creating module: ${mod.title}`);
    const { data: moduleData, error: moduleError } = await supabase
      .from('course_modules')
      .insert({
        course_id: course.id,
        title: mod.title,
        order_index: i,
      })
      .select()
      .single();

    if (moduleError || !moduleData) {
      console.error(`Error creating module ${mod.title}`, moduleError);
      continue;
    }

    for (let j = 0; j < mod.lessons.length; j++) {
      const lessonTitle = mod.lessons[j];
      if (!lessonTitle) continue;
      console.log(`Creating lesson: ${lessonTitle}`);
      
      const { data: lessonData, error: lessonError } = await supabase.from('lessons').insert({
        module_id: moduleData.id,
        title: lessonTitle,
        order_index: j,
      }).select().single();
      
      if (lessonData && !lessonError) {
        await supabase.from('lesson_blocks').insert({
          lesson_id: lessonData.id,
          type: 'text',
          order_index: 0,
          content: { html: `Contenido pendiente para: ${lessonTitle}` },
        });
      }
    }
  }

  console.log('Seed completed successfully!');
}

seed().catch(console.error);
