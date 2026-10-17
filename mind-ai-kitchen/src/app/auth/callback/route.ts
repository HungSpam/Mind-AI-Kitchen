import { NextResponse, type NextRequest } from 'next/server';
import { appOrigin } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const origin = appOrigin();
  const supabase = await createClient();
  if (!origin || !supabase) return NextResponse.redirect(new URL('/account?notice=setup', request.url));

  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/account?welcome=1', origin));
  }
  return NextResponse.redirect(new URL('/account?notice=link', origin));
}
