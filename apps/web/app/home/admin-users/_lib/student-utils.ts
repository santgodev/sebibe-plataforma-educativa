/**
 * Normaliza nombres y apellidos
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Limpia un string para correos: quita tildes, espacios y caracteres especiales
 */
export function cleanForEmail(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Genera combinaciones de correo electrónico
 */
export function generateEmailCombinations(names: string, lastNames: string): string[] {
  const nameParts = names.trim().split(/\s+/).map(cleanForEmail);
  const lastParts = lastNames.trim().split(/\s+/).map(cleanForEmail);

  if (nameParts.length === 0 || lastParts.length === 0) return [];

  const n1 = nameParts[0];
  const n2 = nameParts.length > 1 ? nameParts[1] : '';
  const a1 = lastParts[0];
  const a2 = lastParts.length > 1 ? lastParts[1] : '';

  const combinations = new Set<string>();

  // 1. cristiancadena
  if (n1 && a1) combinations.add(`${n1}${a1}`);
  
  // 2. cristianacadena
  if (n1 && n2 && a1) combinations.add(`${n1}${n2.charAt(0)}${a1}`);
  
  // 3. cristiancadenar
  if (n1 && a1 && a2) combinations.add(`${n1}${a1}${a2.charAt(0)}`);
  
  // 4. cristianrcadena
  if (n1 && a1 && a2) combinations.add(`${n1}${a2.charAt(0)}${a1}`);
  
  // 5. cristianandrescadena
  if (n1 && n2 && a1) combinations.add(`${n1}${n2}${a1}`);
  
  // 6. cristiancadenarodriguez
  if (n1 && a1 && a2) combinations.add(`${n1}${a1}${a2}`);
  
  // 7. cristianandrescadenarodriguez
  if (n1 && n2 && a1 && a2) combinations.add(`${n1}${n2}${a1}${a2}`);

  // 8. ccadena
  if (n1 && a1) combinations.add(`${n1.charAt(0)}${a1}`);

  return Array.from(combinations).map((c) => `${c}@sebibe.org`);
}

/**
 * Calcula el periodo o semestre basado en la fecha de inscripción (ej: '2026 - I', '2026 - II').
 * De Enero a Junio corresponde al ciclo I.
 * De Julio a Diciembre corresponde al ciclo II.
 */
export function calculateSemester(entryDateString: string | null | undefined): string {
  if (!entryDateString) {
    const now = new Date();
    const period = now.getMonth() < 6 ? 'I' : 'II';
    return `${now.getFullYear()} - ${period}`;
  }

  // Si la fecha viene en formato YYYY-MM-DD
  if (typeof entryDateString === 'string' && entryDateString.includes('-')) {
    const parts = entryDateString.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(year) && !isNaN(month)) {
        const period = month <= 6 ? 'I' : 'II';
        return `${year} - ${period}`;
      }
    }
  }

  const date = new Date(entryDateString);
  if (isNaN(date.getTime())) {
    const now = new Date();
    const period = now.getMonth() < 6 ? 'I' : 'II';
    return `${now.getFullYear()} - ${period}`;
  }

  const year = date.getFullYear();
  const period = date.getMonth() < 6 ? 'I' : 'II';
  return `${year} - ${period}`;
}

/**
 * Normaliza y formatea nombres de semestres a formato estándar (ej: '2026 - I', '2026 - II')
 */
export function formatSemesterName(name: string | null | undefined): string {
  if (!name) return 'Sin Semestre';
  const trimmed = name.trim();

  // Si viene como '2026 S-2', '2026-S2', '2026 S2', '2026-2', '2026 2', '2026 II'
  const match2 = trimmed.match(/^(\d{4})[\s_-]*(?:S-?|semestre\s*)?2$/i) || 
                 trimmed.match(/^(\d{4})[\s_-]*(?:S-?|semestre\s*)?II$/i);
  if (match2) {
    return `${match2[1]} - II`;
  }

  // Si viene como '2026 S-1', '2026-S1', '2026 S1', '2026-1', '2026 1', '2026 I'
  const match1 = trimmed.match(/^(\d{4})[\s_-]*(?:S-?|semestre\s*)?1$/i) ||
                 trimmed.match(/^(\d{4})[\s_-]*(?:S-?|semestre\s*)?I$/i);
  if (match1) {
    return `${match1[1]} - I`;
  }

  // Formato genérico con año y número/romano
  const matchGeneric = trimmed.match(/(?:semestre\s*)?(\d{4})[\s_-]*([I|V|X]+|[1-2])/i);
  if (matchGeneric) {
    const cycle = matchGeneric[2].toUpperCase();
    const formattedCycle = (cycle === '1' || cycle === 'I') ? 'I' : 'II';
    return `${matchGeneric[1]} - ${formattedCycle}`;
  }

  return trimmed;
}

/**
 * Calcula el año académico (PRIMER AÑO, SEGUNDO AÑO, TERCER AÑO)
 * basado en el tiempo que lleva estudiando desde su fecha de ingreso (entry_date).
 * - Semestres 1 y 2 (hasta 1 año): 'PRIMER AÑO'
 * - Semestres 3 y 4 (segundo año): 'SEGUNDO AÑO'
 * - Semestres 5 y 6 (tercer año): 'TERCER AÑO'
 */
export function calculateAcademicYear(
  entryDateString: string | null | undefined,
  referenceDate: Date = new Date()
): { yearName: string; semesterCount: number } {
  if (!entryDateString) {
    return { yearName: 'PRIMER AÑO', semesterCount: 1 };
  }

  let entryYear: number;
  let entryMonth: number;

  if (typeof entryDateString === 'string' && entryDateString.includes('-')) {
    const parts = entryDateString.split('-');
    entryYear = parseInt(parts[0], 10);
    entryMonth = parseInt(parts[1], 10);
  } else {
    const d = new Date(entryDateString);
    entryYear = d.getFullYear();
    entryMonth = d.getMonth() + 1;
  }

  if (isNaN(entryYear) || isNaN(entryMonth)) {
    return { yearName: 'PRIMER AÑO', semesterCount: 1 };
  }

  const currentYear = referenceDate.getFullYear();
  // 1 = Ene-Jun, 2 = Jul-Dic
  const currentCycle = referenceDate.getMonth() < 6 ? 1 : 2;
  const entryCycle = entryMonth <= 6 ? 1 : 2;

  // Total de semestres transcurridos
  const semestersElapsed = Math.max(
    1,
    (currentYear - entryYear) * 2 + (currentCycle - entryCycle) + 1
  );

  if (semestersElapsed <= 2) {
    return { yearName: 'PRIMER AÑO', semesterCount: semestersElapsed };
  } else if (semestersElapsed <= 4) {
    return { yearName: 'SEGUNDO AÑO', semesterCount: semestersElapsed };
  } else {
    return { yearName: 'TERCER AÑO', semesterCount: semestersElapsed };
  }
}

/**
 * Calcula el promedio de calificaciones tomando únicamente la nota más alta
 * obtenida por cada actividad o cuestionario distinto, ignorando intentos sin calificar.
 */
export function calculateBestScoresAverage(attempts: any[]): number | null {
  if (!attempts || attempts.length === 0) return null;

  const bestScoreByActivity = new Map<string, number>();

  for (const attempt of attempts) {
    if (
      attempt.score === null ||
      attempt.score === undefined ||
      attempt.status === 'needs_grading'
    ) {
      continue;
    }

    const actId =
      (attempt.activities as any)?.id ||
      attempt.activity_id ||
      attempt.id;

    const score = Number(attempt.score) || 0;
    const currentBest = bestScoreByActivity.get(actId);

    if (currentBest === undefined || score > currentBest) {
      bestScoreByActivity.set(actId, score);
    }
  }

  const bestScores = Array.from(bestScoreByActivity.values());
  if (bestScores.length === 0) return null;

  return bestScores.reduce((acc, s) => acc + s, 0) / bestScores.length;
}
