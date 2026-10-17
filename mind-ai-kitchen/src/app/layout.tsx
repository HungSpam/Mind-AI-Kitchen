import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || 'http://localhost:3000'),
  title: {
    default: "Mind AI's Kitchen · Chụp nguyên liệu, chọn món",
    template: "%s · Mind AI's Kitchen",
  },
  description: 'Chuẩn bị nguyên liệu, lưu công thức và nấu từng bước theo khẩu vị của bạn.',
  icons: { icon: '/icon.svg' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
