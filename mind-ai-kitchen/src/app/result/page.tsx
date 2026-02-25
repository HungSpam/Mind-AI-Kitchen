"use strict";
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Flame, Utensils, Timer, Play, ChevronRight, CheckCircle2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent } from "@/components/ui/card";

export default function ResultPage() {
    const router = useRouter();
    const { currentRecipe: recipe } = useAppStore();

    useEffect(() => {
        if (!recipe) {
            router.push("/scan");
        }
    }, [recipe, router]);

    if (!recipe) return null;

    const calculateMacroPercentage = (value: number, total: number) => {
        return Math.round((value / total) * 100);
    };

    const totalMacros = recipe.macros.protein + recipe.macros.carbs + recipe.macros.fat;
    const pPct = calculateMacroPercentage(recipe.macros.protein, totalMacros);
    const cPct = calculateMacroPercentage(recipe.macros.carbs, totalMacros);
    const fPct = calculateMacroPercentage(recipe.macros.fat, totalMacros);

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pt-4 pb-28 px-2 md:px-8 animate-in fade-in zoom-in-95 duration-700 relative">
            <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.push('/scan')} className="-ml-3 hover:bg-white/50 backdrop-blur-sm">
                    <ChevronLeft />
                </Button>
                <div className="flex items-center gap-1.5 liquid-glass-item px-4 py-1.5 rounded-full border border-white/20 dark:border-white/10 shadow-sm">
                    <span className="font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Match 98%</span>
                    <Sparkles className="text-yellow-400" size={16} />
                </div>
                <div className="w-10"></div>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white drop-shadow-sm leading-tight text-balance">
                        {recipe.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5 liquid-glass-item px-3 py-1.5 rounded-full shadow-sm border border-white/20 dark:border-white/10">
                            <Flame size={18} className="text-orange-500 drop-shadow-sm" /> {recipe.calories} kcal
                        </span>
                        <span className="flex items-center gap-1.5 liquid-glass-item px-3 py-1.5 rounded-full shadow-sm border border-white/20 dark:border-white/10 text-zinc-700 dark:text-zinc-200">
                            <Timer size={16} className="text-blue-500" /> {recipe.time}
                        </span>
                        <span className="flex items-center gap-1.5 liquid-glass-item px-3 py-1.5 rounded-full shadow-sm border border-white/20 dark:border-white/10 text-zinc-700 dark:text-zinc-200">
                            <Utensils size={16} className="text-purple-500" /> {recipe.difficulty}
                        </span>
                        <span className="flex items-center gap-1.5 liquid-glass-item px-3 py-1.5 rounded-full shadow-sm border border-white/20 dark:border-white/10 text-emerald-700 dark:text-emerald-200 font-bold">
                            <Users size={16} className="text-emerald-500" /> {recipe.servings} người ăn
                        </span>
                    </div>
                </div>

                <Card className="liquid-glass-item border-emerald-200/50 dark:border-emerald-900/50 shadow-inner">
                    <CardContent className="p-5 flex gap-3 text-emerald-900 dark:text-emerald-100">
                        <div className="mt-0.5 shrink-0 liquid-glass-item p-1.5 rounded-full shadow-sm h-fit">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                        </div>
                        <p className="text-[15px] font-medium leading-relaxed">
                            <span className="font-extrabold block mb-1 text-emerald-700 dark:text-emerald-400">Mind-GPT Lời Khuyên:</span>
                            {recipe.ai_verdict}
                        </p>
                    </CardContent>
                </Card>

                {/* Nutrition Macros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="md:col-span-1 h-full">
                        <CardContent className="p-5 flex flex-col h-full">
                            <h3 className="font-extrabold text-lg flex items-center gap-2 mb-4">
                                Dinh dưỡng
                                <span className="text-xs bg-zinc-100/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full text-zinc-500 font-semibold uppercase tracking-wider">Macros</span>
                            </h3>

                            {/* Progress Bars */}
                            <div className="h-3 w-full rounded-full flex shadow-inner liquid-glass-input overflow-hidden mb-6 border border-white/20">
                                <div style={{ width: `${pPct}%` }} className="bg-gradient-to-r from-blue-400 to-blue-500 h-full"></div>
                                <div style={{ width: `${cPct}%` }} className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full"></div>
                                <div style={{ width: `${fPct}%` }} className="bg-gradient-to-r from-amber-400 to-amber-500 h-full"></div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="liquid-glass-item rounded-2xl p-3 border border-white/20 dark:border-white/5">
                                    <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase mb-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> Đạm
                                    </div>
                                    <p className="font-extrabold text-xl font-mono">{recipe.macros.protein}g</p>
                                </div>

                                <div className="liquid-glass-item rounded-2xl p-3 border border-white/20 dark:border-white/5">
                                    <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div> Tinh bột
                                    </div>
                                    <p className="font-extrabold text-xl font-mono">{recipe.macros.carbs}g</p>
                                </div>

                                <div className="liquid-glass-item rounded-2xl p-3 border border-white/20 dark:border-white/5">
                                    <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase mb-1">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div> Béo
                                    </div>
                                    <p className="font-extrabold text-xl font-mono">{recipe.macros.fat}g</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-1 h-full">
                        <CardContent className="p-5 flex flex-col h-full">
                            <h3 className="font-extrabold text-lg mb-4">Nguyên liệu cần dùng</h3>
                            <ul className="space-y-3 mb-6">
                                {recipe.ingredients.map((ing, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm font-medium liquid-glass-item p-3 rounded-2xl border border-white/20 dark:border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-white/60 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 font-bold shrink-0 shadow-sm border border-emerald-100">
                                            {idx + 1}
                                        </div>
                                        {ing}
                                    </li>
                                ))}
                            </ul>

                            {recipe.suggestedAdditions && recipe.suggestedAdditions.length > 0 && (
                                <div className="p-4 liquid-glass-item rounded-2xl border border-orange-200/50 dark:border-orange-900/50">
                                    <h4 className="font-bold text-sm text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                                        <Sparkles size={16} /> Gợi ý (tùy chọn)
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        {recipe.suggestedAdditions.map((suggestion, idx) => (
                                            <div key={idx} className="text-sm font-medium text-orange-800 dark:text-orange-300">
                                                • {suggestion}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="absolute bottom-6 left-0 right-0 px-4 pointer-events-none flex justify-center">
                <Button
                    className="w-full max-w-[320px] h-16 text-lg rounded-[2rem] shadow-[0_8px_32px_0_rgba(16,185,129,0.3)] group pointer-events-auto border-t-2 border-emerald-300/50"
                    onClick={() => router.push("/cooking")}
                >
                    <Play className="mr-2 fill-current w-5 h-5 drop-shadow-sm" />
                    <span className="font-bold tracking-wide">Bắt Đầu Nấu</span>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center ml-auto group-hover:bg-white/30 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </Button>
            </div>
        </div>
    );
}
