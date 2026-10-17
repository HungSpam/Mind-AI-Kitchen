'use client';

import { useActionState } from 'react';
import { Mail } from 'lucide-react';
import { sendSignInLink, signInWithGoogle, type AccountActionState } from '@/app/account/actions';

const initialState: AccountActionState = { status: 'idle', message: '' };

export function SignInForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(sendSignInLink, initialState);
  return (
    <section className="panel account-panel">
      <h2>Đăng nhập để đồng bộ</h2>
      <p>Dùng liên kết gửi qua email để mở công thức và nhật ký trên các thiết bị của bạn.</p>
      <form action={action} className="account-form">
        <label className="field" htmlFor="account-email">Email</label>
        <input id="account-email" name="email" type="email" autoComplete="email" maxLength={320} required disabled={!enabled || pending} placeholder="ban@example.com" />
        <button className="btn full" type="submit" disabled={!enabled || pending}>
          <Mail size={18} />
          {pending ? 'Đang gửi…' : 'Gửi liên kết đăng nhập'}
        </button>
      </form>
      <form action={signInWithGoogle}>
        <button className="btn btn-secondary full" type="submit" disabled={!enabled}>
          Tiếp tục với Google
        </button>
      </form>
      {state.message && (
        <p className={state.status === 'error' ? 'account-message is-error' : 'account-message'} role="status" aria-live="polite">
          {state.message}
        </p>
      )}
    </section>
  );
}
