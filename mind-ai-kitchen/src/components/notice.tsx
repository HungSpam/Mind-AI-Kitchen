import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
export function Notice({
  children,
  kind = 'info',
}: {
  children: React.ReactNode;
  kind?: 'info' | 'danger' | 'success' | 'warning';
}) {
  const Icon = kind === 'danger' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return (
    <div className={'notice notice-' + kind} role={kind === 'danger' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}
