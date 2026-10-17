'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseEnvironment } from './env';
import type { Database } from './database';

export function createClient() {
  const env = supabaseEnvironment();
  return env ? createBrowserClient<Database>(env.url, env.publishableKey) : null;
}
