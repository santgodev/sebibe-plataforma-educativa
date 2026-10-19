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

