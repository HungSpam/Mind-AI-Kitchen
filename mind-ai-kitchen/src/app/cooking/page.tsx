"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Volume2, VolumeX, CheckCircle, ArrowRight, ArrowLeft, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

// ── Keyword Matching ──────────────────────────────────────────────
const NEXT_KEYWORDS = [
    "tiếp", "tới", "sau", "qua", "tiến", "kế",
    "next", "okay", "ok",
    "bước tiếp", "tiếp theo", "tiếp tục", "tiếp đi",
    "sau đó", "rồi sao", "rồi gì", "gì nữa", "gì tiếp",
    "xong rồi", "được rồi", "làm gì tiếp", "làm gì nữa",
    "còn gì", "còn nữa",
];
const PREV_KEYWORDS = [
    "trước", "lùi", "quay", "lui", "back",
    "quay lại", "lùi lại", "bước trước",
    "làm lại", "lại bước", "lại đi",
    "về lại", "quay về", "lùi về",
    "quên", "nhầm", "sai rồi",
];
const REPEAT_KEYWORDS = [
    "đọc lại", "nghe lại", "nhắc lại", "lặp lại", "nói lại",
    "repeat", "đọc đi",
    "chưa nghe", "không nghe", "nghe không rõ",
    "nói lại đi", "đọc lại đi", "nhanh quá",
    "gì vậy", "hả gì", "cái gì",
];

function matchCommand(transcript: string): "next" | "prev" | "repeat" | null {
    const normalized = transcript.toLowerCase().trim();
    if (REPEAT_KEYWORDS.some(kw => normalized.includes(kw))) return "repeat";
    if (PREV_KEYWORDS.some(kw => normalized.includes(kw))) return "prev";
    if (NEXT_KEYWORDS.some(kw => normalized.includes(kw))) return "next";
    return null;
}

// ── TTS Helper ────────────────────────────────────────────────────
function speakVietnamese(text: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v =>
        v.lang.toLowerCase().includes("vi") ||
        v.name.toLowerCase().includes("vietnamese") ||
        v.name.toLowerCase().includes("viet")
    );
    if (viVoice) utterance.voice = viVoice;

    if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
}

// ── Page Component ────────────────────────────────────────────────
export default function CookingModePage() {
    const router = useRouter();
    const { currentRecipe: recipe } = useAppStore();

    useEffect(() => {
        if (!recipe) router.push("/scan");
    }, [recipe, router]);

    // ── Core State ──
    const [currentStep, setCurrentStep] = useState(0);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
    const [lastTranscript, setLastTranscript] = useState("");
    const [micError, setMicError] = useState<string | null>(null);

    // ── Refs ──
    const recognitionRef = useRef<any>(null);
    const isMutedRef = useRef(false);

    const recipeName = recipe?.name || "";
    const steps = recipe?.steps || [];

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    }, [currentStep, steps.length]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) setCurrentStep(s => s - 1);
    }, [currentStep]);

    const showFeedback = useCallback((msg: string) => {
        setVoiceFeedback(msg);
        setTimeout(() => setVoiceFeedback(null), 2000);
    }, []);

    const speak = useCallback((text: string) => {
        setIsMuted(true);
        setIsAudioPlaying(true);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* safe */ }
        }
        speakVietnamese(text, () => {
            setIsMuted(false);
            if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch { /* safe */ }
            }
        });
    }, []);

    const handleRepeat = useCallback(() => {
        if (steps[currentStep]) speak(steps[currentStep].text);
    }, [currentStep, steps, speak]);

    // ── Voice Command Processing ──
    const commandHandlerRef = useRef<(transcript: string) => void>(() => { });

    useEffect(() => {
        commandHandlerRef.current = (transcript: string) => {
            setLastTranscript(transcript);
            const command = matchCommand(transcript);
            if (!command) return;

            if (command === "next") {
                if (currentStep < steps.length - 1) {
                    showFeedback("Chuyển bước tiếp theo...");
                    handleNext();
                } else {
                    showFeedback("Đây là bước cuối rồi!");
                }
            } else if (command === "prev") {
                if (currentStep > 0) {
                    showFeedback("Quay lại bước trước...");
                    handlePrev();
                } else {
                    showFeedback("Đang ở bước đầu tiên!");
                }
            } else if (command === "repeat") {
                showFeedback("Đọc lại cho bạn nghe nhé...");
                handleRepeat();
            }
        };
    }, [currentStep, steps, handleNext, handlePrev, handleRepeat, showFeedback, router]);

    // ── TTS auto-play on step change ──
    useEffect(() => {
        if (isAudioPlaying && steps[currentStep]) {
            speak(steps[currentStep].text);
        }
        return () => { window.speechSynthesis?.cancel(); };
    }, [currentStep, isAudioPlaying, steps, speak]);

    // ── SpeechRecognition Lifecycle ──
    useEffect(() => {
        if (!isListening) {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* safe */ }
                recognitionRef.current = null;
            }
            setIsMuted(false);
            setMicError(null);
            return;
        }

        const SpeechRecognitionClass = (window as any).SpeechRecognition
            || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            setMicError("Trình duyệt không hỗ trợ giọng nói");
            setIsListening(false);
            return;
        }

        let cancelled = false;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                stream.getTracks().forEach(t => t.stop());

                if (cancelled) return;

                const recognition = new SpeechRecognitionClass();
                recognition.lang = "vi-VN";
                recognition.continuous = true;
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                recognition.onresult = (event: { results: { length: number;[key: number]: { isFinal: boolean;[key: number]: { transcript: string } } } }) => {
                    const last = event.results[event.results.length - 1];
                    if (last.isFinal) {
                        const transcript = last[0].transcript;
                        if (!isMutedRef.current) {
                            commandHandlerRef.current(transcript);
                        }
                    }
                };

                recognition.onerror = (event: { error: string }) => {
                    if (event.error === "no-speech" || event.error === "aborted") return;
                    console.warn("SpeechRecognition error:", event.error);
                };

                recognition.onend = () => {
                    if (cancelled) return;
                    if (isMutedRef.current) return;
                    try { recognition.start(); } catch { /* already running */ }
                };

                recognitionRef.current = recognition;
                try { recognition.start(); } catch { /* safe */ }
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Mic permission denied:", err);
                setMicError("Vui lòng cho phép sử dụng micro");
                setIsListening(false);
            });

        return () => {
            cancelled = true;
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* safe */ }
                recognitionRef.current = null;
            }
        };
    }, [isListening]);

    // ── Render ──
    if (!recipe) return null;

    const toggleAudio = () => setIsAudioPlaying(prev => !prev);
    const toggleVoice = () => {
        setIsListening(prev => !prev);
        setMicError(null);
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
                <div className="flex items-center gap-1.5">
                    {/* Mic Toggle */}
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={toggleVoice}
                        className={`liquid-glass-item rounded-full shadow-sm border transition-all duration-300 ${isListening
                            ? "text-blue-600 border-blue-300/50 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-[1.08]"
                            : "text-zinc-400 border-white/50 hover:text-blue-500"
                            }`}
                    >
                        {isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} />}
                    </Button>
                    {/* TTS Toggle */}
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={toggleAudio}
                        className={`liquid-glass-item rounded-full shadow-sm border border-white/50 transition-all ${isAudioPlaying ? "text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.05]" : "text-zinc-500"}`}
                    >
                        {isAudioPlaying ? <Volume2 size={22} className="animate-pulse" /> : <VolumeX size={22} />}
                    </Button>
                </div>
            </div>

            {/* Mic permission error */}
            {micError && (
                <div className="text-center py-1">
                    <span className="text-xs text-red-500 font-medium">{micError}</span>
                </div>
            )}

            <div className="h-2 w-full liquid-glass-input rounded-full overflow-hidden my-4 shadow-inner border border-white/20">
                <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-spring"
                    style={{ width: `${progress}%`, transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
                />
            </div>

            {/* Card Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden py-4">
                <div
                    key={currentStep}
                    className="absolute inset-x-2 liquid-glass-item border-[1.5px] border-white/30 dark:border-white/10 rounded-[3rem] p-8 flex flex-col justify-center items-center h-[90%] transition-all duration-500 animate-in fade-in zoom-in-95"
                >
                    <div className="w-20 h-20 liquid-glass-item text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-extrabold text-3xl mb-8 border border-white/50">
                        {currentStep + 1}
                    </div>

                    <p className="text-[22px] text-center leading-relaxed font-bold text-zinc-800 dark:text-zinc-200">
                        {steps[currentStep].text}
                    </p>

                    {/* Voice Feedback Bubble */}
                    {voiceFeedback && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 liquid-glass-item px-5 py-2.5 rounded-full border border-blue-300/40 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{voiceFeedback}</span>
                            </div>
                        </div>
                    )}

                    {/* Unified Status Badge */}
                    {(isListening || isMuted) && !voiceFeedback && (
                        <div className={`absolute top-6 right-6 flex items-center gap-1.5 liquid-glass-item px-3 py-2 rounded-full border transition-all duration-300 ${isMuted ? "border-emerald-200/50" : "border-blue-200/50"
                            }`}>
                            <span className={`text-xs font-bold mr-0.5 uppercase ${isMuted ? "text-emerald-600" : "text-blue-600"
                                }`}>
                                {isMuted ? "Đang đọc" : "Đang nghe"}
                            </span>
                            <span className={`w-1 h-3 rounded-full animate-bounce [animation-delay:-0.3s] ${isMuted ? "bg-emerald-500" : "bg-blue-500"}`} />
                            <span className={`w-1 h-4 rounded-full animate-bounce [animation-delay:-0.15s] ${isMuted ? "bg-emerald-500" : "bg-blue-500"}`} />
                            <span className={`w-1 h-2 rounded-full animate-bounce ${isMuted ? "bg-emerald-500" : "bg-blue-500"}`} />
                        </div>
                    )}
                </div>
            </div>

            {/* Last heard transcript */}
            {isListening && lastTranscript && (
                <div className="text-center mb-1">
                    <span className="text-xs text-zinc-400 italic">&quot;{lastTranscript}&quot;</span>
                </div>
            )}

            <div className="py-4 flex gap-4 w-full justify-between items-center z-10">
                <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1 h-16 rounded-full font-bold shadow-sm"
                    disabled={currentStep === 0}
                    onClick={handlePrev}
                >
                    <ArrowLeft className="mr-2 opacity-70" /> Lùi Lại
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
