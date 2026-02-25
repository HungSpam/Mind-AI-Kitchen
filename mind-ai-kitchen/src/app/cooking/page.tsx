"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Volume2, VolumeX, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export default function CookingModePage() {
    const router = useRouter();
    const { currentRecipe: recipe } = useAppStore();

    useEffect(() => {
        if (!recipe) {
            router.push("/scan");
        }
    }, [recipe, router]);

    const [currentStep, setCurrentStep] = useState(0);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    const recipeName = recipe?.name || "";
    const steps = recipe?.steps || [];

    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();

        if (isAudioPlaying && steps[currentStep]) {
            const utterance = new SpeechSynthesisUtterance(steps[currentStep].text);
            utterance.lang = "vi-VN";
            utterance.rate = 1.0;

            // Force Vietnamese voice selection
            const voices = window.speechSynthesis.getVoices();
            const viVoice = voices.find(voice =>
                voice.lang.toLowerCase().includes('vi') ||
                voice.name.toLowerCase().includes('vietnamese') ||
                voice.name.toLowerCase().includes('viet')
            );

            if (viVoice) {
                utterance.voice = viVoice;
            }

            window.speechSynthesis.speak(utterance);
        }

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [currentStep, isAudioPlaying, steps]);

    if (!recipe) return null;

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(curr => curr + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(curr => curr - 1);
        }
    };

    const toggleAudio = () => {
        setIsAudioPlaying(!isAudioPlaying);
    };

    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
        <div className="flex flex-col h-[650px] md:min-h-[700px] lg:h-[80vh] w-full max-w-4xl mx-auto px-2 md:px-8 animate-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between py-2">
                <Button variant="ghost" size="icon" onClick={() => router.push("/result")} className="-ml-2 hover:bg-white/50 backdrop-blur-sm">
                    <ChevronLeft />
                </Button>
                <div className="flex flex-col items-center liquid-glass-item px-4 md:px-8 py-1.5 rounded-2xl border border-white/20 shadow-sm">
                    <span className="font-extrabold text-[15px] md:text-lg truncate max-w-[200px] md:max-w-md text-zinc-900 dark:text-white">
                        {recipeName}
                    </span>
                    <span className="text-xs md:text-sm text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                        Bước {currentStep + 1} / {steps.length}
                    </span>
                </div>
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleAudio}
                    className={`liquid-glass-item rounded-full shadow-sm border border-white/50 transition-all ${isAudioPlaying ? "text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.05]" : "text-zinc-500"}`}
                >
                    {isAudioPlaying ? <Volume2 size={22} className="animate-pulse" /> : <VolumeX size={22} />}
                </Button>
            </div>

            <div className="h-2 w-full liquid-glass-input rounded-full overflow-hidden my-4 shadow-inner border border-white/20">
                <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-spring"
                    style={{ width: `${progress}%`, transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
                />
            </div>

            {/* Swipeable Card Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden py-4">
                <div
                    key={currentStep} // Forces animation re-render
                    className="absolute inset-x-2 liquid-glass-item border-[1.5px] border-white/30 dark:border-white/10 rounded-[3rem] p-8 flex flex-col justify-center items-center h-[90%] transition-all duration-500 animate-in fade-in zoom-in-95"
                >
                    <div className="w-20 h-20 liquid-glass-item text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-extrabold text-3xl mb-8 border border-white/50">
                        {currentStep + 1}
                    </div>

                    <p className="text-[22px] text-center leading-relaxed font-bold text-zinc-800 dark:text-zinc-200">
                        {steps[currentStep].text}
                    </p>

                    {isAudioPlaying && (
                        <div className="absolute top-6 right-6 flex items-center gap-1 liquid-glass-item px-3 py-2 rounded-full border border-emerald-200/50">
                            <span className="text-xs font-bold text-emerald-600 mr-1 uppercase">Đang đọc</span>
                            <span className="w-1.5 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
                        </div>
                    )}
                </div>
            </div>

            <div className="py-4 flex gap-4 w-full justify-between items-center z-10">
                <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1 h-16 rounded-full font-bold shadow-sm"
                    disabled={currentStep === 0}
                    onClick={handlePrev}
                >
                    <ArrowLeft className="mr-2 opacity-70" /> Lùi Lại
                </Button>

                {currentStep === steps.length - 1 ? (
                    <Button
                        size="lg"
                        className="flex-[2] h-16 text-lg rounded-[2rem] shadow-[0_8px_24px_rgba(16,185,129,0.3)] font-bold group border-t-2 border-emerald-300/50"
                        onClick={() => router.push("/")}
                    >
                        <CheckCircle className="mr-2" /> Xong Bữa Nay
                    </Button>
                ) : (
                    <Button
                        size="lg"
                        className="flex-[2] h-16 text-lg rounded-[2rem] shadow-[0_8px_24px_rgba(16,185,129,0.3)] font-bold group border-t-2 border-emerald-300/50"
                        onClick={handleNext}
                    >
                        Bước Tiếp <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}
