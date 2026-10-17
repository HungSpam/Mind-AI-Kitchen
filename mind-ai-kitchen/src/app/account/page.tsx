import Link from 'next/link';
import { ArrowRight, Cloud, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { supabaseEnvironment } from '@/lib/supabase/env';
import { SignInForm } from '@/features/account/sign-in-form';
import { LocalDataImport } from '@/features/account/local-import';
import { signOut } from './actions';

const notices: Record<string, string> = {
  setup: 'Chưa cấu hình Supabase cho môi trường này.',
  unavailable: 'Đăng nhập Google chưa khả dụng. Kiểm tra cấu hình OAuth của dự án.',
  link: 'Liên kết đã hết hạn hoặc không hợp lệ. Hãy yêu cầu một liên kết mới.',
  welcome: 'Đăng nhập thành công. Dữ liệu cũ trên thiết bị vẫn chưa được chuyển lên cloud.',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const envReady = Boolean(supabaseEnvironment());
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  const claims = data?.claims;
  const email = typeof claims?.email === 'string' ? claims.email : '';
  const authenticated = Boolean(claims?.sub);
  const noticeKey = typeof params.notice === 'string' ? params.notice : '';
  const showSignOut = params.signedOut === '1';

  return (
    <div className="account-page">
      <header className="compact-head">
        <h1>Tài khoản</h1>
        <p>Lưu món và nhật ký để mở lại trên thiết bị của bạn.</p>
      </header>

      {showSignOut && <p className="account-message" role="status">Bạn đã đăng xuất. Dữ liệu trên thiết bị này vẫn được giữ.</p>}
      {noticeKey && notices[noticeKey] && <p className="account-message is-error" role="alert">{notices[noticeKey]}</p>}
      {params.welcome === '1' && <p className="account-message" role="status">{notices.welcome}</p>}

      {authenticated ? (
        <section className="panel account-panel">
          <div className="account-status-icon"><ShieldCheck size={22} /></div>
          <h2>Đã đăng nhập</h2>
          {email && <p>{email}</p>}
          <p>Đồng bộ cloud đang được nối tiếp. Công thức và nhật ký local chưa tự chuyển lên tài khoản.</p>
          {typeof claims?.sub === 'string' && <LocalDataImport userId={claims.sub} />}
          <form action={signOut}>
            <button className="btn btn-secondary full" type="submit">Đăng xuất</button>
          </form>
        </section>
      ) : (
        <SignInForm enabled={envReady} />
      )}

      {!envReady && (
        <p className="account-setup" role="status">
          <Cloud size={18} />
          Cần cấu hình URL và publishable key của Supabase cùng callback email/Google. Bạn vẫn dùng ứng dụng và dữ liệu local bình thường.
        </p>
      )}

      <section className="account-links" aria-label="Dữ liệu trên thiết bị">
        <h2>Dữ liệu trên thiết bị này</h2>
        <p>Hồ sơ, món đã lưu và nhật ký hiện được lưu trong trình duyệt. Xem hoặc sao lưu trước khi đổi thiết bị.</p>
        <Link href="/onboarding">Hồ sơ khẩu vị <ArrowRight size={17} /></Link>
        <Link href="/library">Món đã lưu <ArrowRight size={17} /></Link>
        <Link href="/journal">Nhật ký bữa ăn <ArrowRight size={17} /></Link>
      </section>
    </div>
  );
}
