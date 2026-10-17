export type SupabaseEnvironment = { url: string; publishableKey: string };

export function supabaseEnvironment(): SupabaseEnvironment | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return null;
    return { url: parsed.origin, publishableKey };
  } catch {
    return null;
  }
}

export function appOrigin() {
  const value = process.env.APP_ORIGIN?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}
