import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mind AI's Kitchen | Trợ lý Dinh Dưỡng",
  description: "Trợ lý dinh dưỡng và nấu ăn cá nhân hóa với AI",
  openGraph: {
    title: "Mind AI's Kitchen | Trợ lý Dinh Dưỡng",
    description: "Chụp ảnh tủ lạnh - Nấu ăn ngon ngay lập tức với Mind-GPT.",
    url: "https://mindaikitchen.vercel.app",
    siteName: "Mind AI Kitchen",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Mind AI Kitchen Banner",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-animated-mesh font-sans min-h-screen flex flex-col items-center justify-center p-0 md:p-8`}
      >
        {/* Global Application */}
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col liquid-glass md:rounded-[40px] overflow-hidden relative shadow-2xl">
          <Header />
          <main className="flex-1 w-full p-4 md:p-6 overflow-y-auto no-scrollbar pb-24">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
