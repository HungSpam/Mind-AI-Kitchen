"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Camera, ListPlus, Wand2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function Home() {
  const { profile } = useAppStore();

  const getBodyTypeLabel = (id: string) => {
    const types: { [key: string]: string } = { skinny: "Gầy", fit: "Cân đối", chubby: "Đậm" };
    return types[id] || id;
  };

  const getGoalLabel = (id: string) => {
    const goals: { [key: string]: string } = { "fat-loss": "Giảm mỡ bụng", "muscle-gain": "Tăng cơ bắp", "health": "Cải thiện sức khỏe" };
    return goals[id] || id;
  };

  return (
    <div className="flex flex-col gap-6 py-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="text-center space-y-4 mb-4 md:mb-12 mt-4 md:mt-8">
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(16,185,129,0.15)] w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
          <ChefHat size={56} className="md:w-16 md:h-16" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-sm text-zinc-900 dark:text-white flex items-center justify-center gap-3">
          Mind AI&apos;s Kitchen <Wand2 className="text-emerald-500 w-8 h-8 md:w-12 md:h-12" />
        </h1>
        <p className="text-zinc-600 dark:text-zinc-300 text-balance font-medium px-4 md:text-lg max-w-2xl mx-auto">
          Trợ lý cá nhân hóa công thức nấu ăn từ mọi nguyên liệu bạn có.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 md:px-8 max-w-5xl mx-auto w-full">
        <Link href="/onboarding" className="block group h-full">
          <Card className="liquid-glass-item border-white/20 dark:border-white/10 overflow-hidden relative cursor-pointer h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3 text-zinc-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <div className="p-2 rounded-full bg-emerald-100/50 dark:bg-emerald-900/40">
                  <ListPlus className="h-5 w-5" />
                </div>
                Thiết Lập Hồ Sơ
              </CardTitle>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 pl-11">
                {profile.bodyType ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Đã thiết lập hồ sơ kết nối</span>
                    <span className="text-xs">Tạng: {getBodyTypeLabel(profile.bodyType)} | Mục tiêu: {getGoalLabel(profile.goal)}</span>
                    {profile.allergies && <span className="text-xs text-red-500 font-medium">Dị ứng: {profile.allergies}</span>}
                    {profile.preferences && <span className="text-xs text-orange-500 font-medium">Sở thích/Ghét: {profile.preferences}</span>}
                  </div>
                ) : (
                  "Lên mục tiêu, chọn dị ứng và khẩu vị của riêng bạn."
                )}
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/scan" className="block group h-full">
          <Card className="liquid-glass-item border-white/20 dark:border-white/10 overflow-hidden relative cursor-pointer h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3 text-zinc-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <div className="p-2 rounded-full bg-emerald-100/50 dark:bg-emerald-900/40">
                  <Camera className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Quét Nguyên Liệu
              </CardTitle>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 pl-11">
                Chụp ảnh thực phẩm bạn có để AI sáng tạo công thức.
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
