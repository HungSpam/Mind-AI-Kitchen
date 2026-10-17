'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { appOrigin } from '@/lib/supabase/env';

export type AccountActionState = { status: 'idle' | 'success' | 'error'; message: string };
const configurationMessage = 'Đồng bộ tài khoản chưa được cấu hình. Dữ liệu trên thiết bị của bạn vẫn giữ nguyên.';

export async function sendSignInLink(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Nhập địa chỉ email hợp lệ.' };
  }
  const origin = appOrigin();
  const supabase = await createClient();
  if (!origin || !supabase) return { status: 'error', message: configurationMessage };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { status: 'error', message: 'Chưa gửi được liên kết. Kiểm tra cấu hình email Supabase rồi thử lại.' };
  return { status: 'success', message: 'Nếu email được chấp nhận, liên kết đăng nhập sẽ đến trong giây lát. Hãy kiểm tra cả thư rác.' };
}

export async function signInWithGoogle(): Promise<void> {
  const origin = appOrigin();
  const supabase = await createClient();
  if (!origin || !supabase) redirect('/account?notice=setup');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url) redirect('/account?notice=unavailable');
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/account?signedOut=1');
}
