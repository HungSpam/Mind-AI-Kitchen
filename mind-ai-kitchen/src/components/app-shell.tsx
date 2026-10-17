'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { LayoutGrid, BookOpen, SlidersHorizontal, Plus, CalendarDays, Info } from 'lucide-react';
import { hydrationIssue } from '@/store/useAppStore';
import { Notice } from './notice';
import { CameraProvider, useCamera } from '@/features/camera/camera-provider';

const subscribe = () => () => {};
const navigation = [
  { href: '/', label: 'Trang chủ', icon: LayoutGrid },
  { href: '/library', label: 'Món đã lưu', icon: BookOpen },
  { href: '/journal', label: 'Nhật ký', icon: CalendarDays },
  { href: '/onboarding', label: 'Hồ sơ', icon: SlidersHorizontal },
];
export function Brand() {
  return (
    <Link href="/" className="product-brand" aria-label="Mind AI's Kitchen — trang chủ">
      <Image src="/icon.svg" alt="" width={36} height={36} unoptimized />
      <span>Mind AI&apos;s Kitchen</span>
    </Link>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { openCamera } = useCamera();
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const focus = path.startsWith('/cooking');
  const item = (entry: (typeof navigation)[number]) => (
    <Link
      key={entry.href}
      href={entry.href}
      aria-current={path === entry.href ? 'page' : undefined}
    >
      <entry.icon size={21} />
      <span>{entry.label}</span>
    </Link>
  );
  return (
    <div className={focus ? 'product-shell cooking-shell' : 'product-shell'}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      {!focus && (
        <header className="product-header">
          <Brand />
          <Link className="icon-btn" href="/about" aria-label="Nguồn dữ liệu và quyền riêng tư">
            <Info size={21} />
          </Link>
        </header>
      )}
      <main id="main-content" className={focus ? 'focus-main' : 'product-main'}>
        {ready ? (
          <>
            {hydrationIssue && <Notice kind="danger">{hydrationIssue}</Notice>}
            {children}
          </>
        ) : (
          <div className="loading" role="status">
            Đang mở dữ liệu…
          </div>
        )}
      </main>
      {!focus && (
        <nav className="app-dock" aria-label="Điều hướng chính">
          {navigation.slice(0, 2).map(item)}
          <button className="dock-capture" aria-label="Chụp nguyên liệu" onClick={openCamera}>
            <span>
              <Plus size={30} />
            </span>
            <small>Chụp</small>
          </button>
          {navigation.slice(2).map(item)}
        </nav>
      )}
    </div>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CameraProvider>
      <Shell>{children}</Shell>
    </CameraProvider>
  );
}
