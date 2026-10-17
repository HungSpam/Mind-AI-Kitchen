import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnvironment } from './env';
import type { Database } from './database';

export async function createClient() {
  const env = supabaseEnvironment();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; src/proxy.ts refreshes sessions.
        }
      },
    },
  });
}
