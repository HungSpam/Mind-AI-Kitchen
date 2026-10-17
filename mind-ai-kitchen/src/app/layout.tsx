import type { Metadata } from 'next';
import { Lora, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/app-shell';

const lora = Lora({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Plus_Jakarta_Sans({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-sans',
  display: 'swap',
});

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
    <html lang="vi" className={`${lora.variable} ${sans.variable}`}>
      <body className={sans.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
