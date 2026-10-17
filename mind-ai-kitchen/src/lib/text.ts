export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function containsPhrase(text: string, phrase: string): boolean {
  const needle = normalizeText(phrase);
  return !!needle && ` ${normalizeText(text)} `.includes(` ${needle} `);
}

export function splitAllergies(value: string): string[] {
  return value
    .split(/[,;\n+]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
