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
 * Calcula el semestre académico basado en la fecha de ingreso.
 * Cada 6 meses de calendario (Ene-Jun, Jul-Dic) cuenta como un nuevo semestre.
 */
export function calculateSemester(entryDateString: string | null | undefined): number {
  if (!entryDateString) return 1;
  const entryDate = new Date(entryDateString);
  const now = new Date();

  // Si la fecha es inválida o en el futuro, asume semestre 1
  if (isNaN(entryDate.getTime()) || entryDate > now) return 1;

  const entryYear = entryDate.getFullYear();
  const entryHalf = entryDate.getMonth() < 6 ? 0 : 1; // 0 para Ene-Jun, 1 para Jul-Dic

  const currentYear = now.getFullYear();
  const currentHalf = now.getMonth() < 6 ? 0 : 1;

  const semestersPassed = (currentYear - entryYear) * 2 + (currentHalf - entryHalf);
  
  return semestersPassed + 1;
}
