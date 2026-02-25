"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle2, Ban, Rocket } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const { profile, setProfile } = useAppStore();

    const bodyTypes = [
        { id: "skinny", label: "Gầy", desc: "Cần tăng cân chuẩn" },
        { id: "fit", label: "Cân đối", desc: "Duy trì vóc dáng" },
        { id: "chubby", label: "Đậm", desc: "Cần giảm mỡ" },
    ];

    const goals = [
        { id: "fat-loss", label: "Giảm mỡ bụng" },
        { id: "muscle-gain", label: "Tăng cơ bắp" },
        { id: "health", label: "Cải thiện sức khỏe" },
    ];

    const handleComplete = () => {
        router.push("/");
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pt-6 pb-24 px-2 md:px-8 animate-in fade-in duration-500">
            <div className="space-y-2 text-center mb-4">
                <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm text-zinc-900 dark:text-white">Hồ Sơ Của Bạn</h1>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Mind AI&apos;s Kitchen cần biết cơ thể bạn cần gì.</p>

                {/* Tiến trình */}
                <div className="flex items-center justify-center gap-2 mt-6 max-w-[200px] mx-auto">
                    <div className={`h-2 flex-1 rounded-full transition-colors duration-500 shadow-inner ${step >= 1 ? "bg-emerald-500 shadow-emerald-500/20" : "liquid-glass-active"}`} />
                    <div className={`h-2 flex-1 rounded-full transition-colors duration-500 shadow-inner ${step >= 2 ? "bg-emerald-500 shadow-emerald-500/20" : "liquid-glass-active"}`} />
                    <div className={`h-2 flex-1 rounded-full transition-colors duration-500 shadow-inner ${step >= 3 ? "bg-emerald-500 shadow-emerald-500/20" : "liquid-glass-active"}`} />
                </div>
            </div>

            <div className="relative w-full overflow-visible">
                {step === 1 && (
                    <Card className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-xl">Tạng người hiện tại?</CardTitle>
                            <CardDescription>Chọn mô tả gần nhất với body bạn.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {bodyTypes.map((type) => (
                                <div
                                    key={type.id}
                                    onClick={() => setProfile({ ...profile, bodyType: type.id })}
                                    className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border transition-all duration-300 ${profile.bodyType === type.id
                                        ? "border-emerald-500/50 liquid-glass-active shadow-[0_8px_24px_0_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/20"
                                        : "border-white/40 dark:border-white/10 liquid-glass-item hover:border-emerald-200/50"
                                        }`}
                                >
                                    <div>
                                        <p className="font-bold text-zinc-900 dark:text-white">{type.label}</p>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{type.desc}</p>
                                    </div>
                                    {profile.bodyType === type.id && <CheckCircle2 className="text-emerald-500 animate-in zoom-in" />}
                                </div>
                            ))}
                            <div className="pt-6">
                                <Button
                                    className="w-full text-base"
                                    size="lg"
                                    disabled={!profile.bodyType}
                                    onClick={() => setStep(2)}
                                >
                                    Tiếp theo <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && (
                    <Card className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-xl">Mục tiêu của bạn?</CardTitle>
                            <CardDescription>AI sẽ cân đối lượng Kcal và chỉ số Macros.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {goals.map((goal) => (
                                <div
                                    key={goal.id}
                                    onClick={() => setProfile({ ...profile, goal: goal.id })}
                                    className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border transition-all duration-300 ${profile.goal === goal.id
                                        ? "border-emerald-500/50 liquid-glass-active shadow-[0_8px_24px_0_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/20"
                                        : "border-white/40 dark:border-white/10 liquid-glass-item hover:border-emerald-200/50"
                                        }`}
                                >
                                    <p className="font-bold text-zinc-900 dark:text-white">{goal.label}</p>
                                    {profile.goal === goal.id && <CheckCircle2 className="text-emerald-500 animate-in zoom-in" />}
                                </div>
                            ))}
                            <div className="flex gap-3 pt-6">
                                <Button variant="secondary" size="lg" className="w-[120px]" onClick={() => setStep(1)}>
                                    Quay lại
                                </Button>
                                <Button
                                    className="flex-1 text-base"
                                    size="lg"
                                    disabled={!profile.goal}
                                    onClick={() => setStep(3)}
                                >
                                    Tiếp theo <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <Card className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-xl flex items-center justify-center gap-2">Lưu ý ăn uống <Ban className="text-red-500" size={20} /></CardTitle>
                            <CardDescription>Tránh những món bạn dị ứng hoặc ghét.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <div className="space-y-3">
                                <Label htmlFor="allergies" className="text-zinc-700 dark:text-zinc-300 ml-1">Tôi dị ứng với...</Label>
                                <Input
                                    id="allergies"
                                    placeholder="Ví dụ: Hải sản, nấm, sữa..."
                                    value={profile.allergies}
                                    onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="preferences" className="text-zinc-700 dark:text-zinc-300 ml-1">Tôi đặc biệt thích/ghét...</Label>
                                <Input
                                    id="preferences"
                                    placeholder="Ví dụ: Thích ăn dặm mặn, không ăn hành mã..."
                                    value={profile.preferences}
                                    onChange={(e) => setProfile({ ...profile, preferences: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-6">
                                <Button variant="secondary" size="lg" className="w-[120px]" onClick={() => setStep(2)}>
                                    Quay lại
                                </Button>
                                <Button size="lg" className="flex-1 text-base shadow-emerald-500/30" onClick={handleComplete}>
                                    Hoàn Tất <Rocket className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
