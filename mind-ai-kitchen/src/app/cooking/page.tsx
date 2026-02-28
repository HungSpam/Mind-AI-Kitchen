"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Volume2, VolumeX, CheckCircle, ArrowRight, ArrowLeft, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

type SpeechRecognitionAny = any;

const NEXT_KEYWORDS = [
    "tiếp", "tới", "sau", "qua", "tiến", "kế",
    "next", "okay", "ok", "ước",
    "bước tiếp", "tiếp theo", "tiếp tục", "tiếp đi",
    "sau đó", "rồi sao", "rồi gì", "gì nữa", "gì tiếp",
    "xong rồi", "được rồi", "làm gì tiếp", "làm gì nữa",
    "chưa", "còn gì", "còn nữa",
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
    "repeat", "lại đi", "đọc đi",
    "chưa nghe", "không nghe", "nghe không rõ",
    "nói lại đi", "đọc lại đi", "nhanh quá",
    "gì vậy", "hả gì", "cái gì",
];
const DONE_KEYWORDS = [
    "hoàn thành", "kết thúc", "done", "finish",
    "xong hết", "xong bữa", "xong rồi",
    "hết rồi", "ngon rồi",
];

function matchCommand(transcript: string): "next" | "prev" | "repeat" | "done" | null {
    const normalized = transcript.toLowerCase().trim();

    if (REPEAT_KEYWORDS.some(kw => normalized.includes(kw))) return "repeat";
    if (DONE_KEYWORDS.some(kw => normalized.includes(kw))) return "done";
    if (PREV_KEYWORDS.some(kw => normalized.includes(kw))) return "prev";
    if (NEXT_KEYWORDS.some(kw => normalized.includes(kw))) return "next";

    return null;
}

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
    const [isListening, setIsListening] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
    const [lastTranscript, setLastTranscript] = useState("");
    const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionAny>(null);
    const isListeningRef = useRef(false);
    const isTTSSpeakingRef = useRef(false);
    const startListeningRef = useRef<(() => void) | undefined>(undefined);

    const recipeName = recipe?.name || "";
    const steps = recipe?.steps || [];

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(curr => curr + 1);
        }
    }, [currentStep, steps.length]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(curr => curr - 1);
        }
    }, [currentStep]);

    const handleRepeat = useCallback(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window && steps[currentStep]) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(steps[currentStep].text);
            utterance.lang = "vi-VN";
            utterance.rate = 1.0;
            const voices = window.speechSynthesis.getVoices();
            const viVoice = voices.find(voice =>
                voice.lang.toLowerCase().includes('vi') ||
                voice.name.toLowerCase().includes('vietnamese')
            );
            if (viVoice) utterance.voice = viVoice;

            const resumeAfterRepeat = () => {
                if (!isTTSSpeakingRef.current) return;
                isTTSSpeakingRef.current = false;
                if (isListeningRef.current) {
                    setTimeout(() => startListeningRef.current?.(), 800);
                }
            };
            utterance.onend = () => resumeAfterRepeat();
            utterance.onerror = () => resumeAfterRepeat();

            window.speechSynthesis.speak(utterance);
            setIsAudioPlaying(true);

            const textLen = steps[currentStep].text.length;
            const fallbackMs = Math.max(textLen * 80, 3000) + 3000;
            setTimeout(() => {
                if (isTTSSpeakingRef.current) resumeAfterRepeat();
            }, fallbackMs);
        }
    }, [currentStep, steps]);

    const showFeedback = useCallback((message: string) => {
        setVoiceFeedback(message);
        setTimeout(() => setVoiceFeedback(null), 2000);
    }, []);

    const killMic = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* safe */ }
            recognitionRef.current = null;
        }
    }, []);

    const restartMic = useCallback(() => {
        killMic();
        isTTSSpeakingRef.current = false;
        setTimeout(() => startListeningRef.current?.(), 200);
    }, [killMic]);

    /**
     * FLOW (user-specified):
     * 1. Mic hears ANYTHING -> always kill mic first
     * 2. Check keyword:
     *    - NO match  -> kill mic -> create new mic immediately
     *    - YES match -> kill mic -> execute action -> TTS reads -> TTS done -> create new mic
     * 3. For "repeat": kill mic -> TTS reads current step -> TTS done -> create new mic
     */
    const processVoiceCommand = useCallback((transcript: string) => {
        setLastTranscript(transcript);
        const command = matchCommand(transcript);

        killMic();

        if (!command) {
            restartMic();
            return;
        }
        isTTSSpeakingRef.current = true;
        setIsTTSSpeaking(true);

        if (command === "next") {
            if (currentStep < steps.length - 1) {
                showFeedback("Chuyển bước tiếp theo...");
                setTimeout(handleNext, 400);
            } else {
                showFeedback("Đây là bước cuối rồi!");
                setTimeout(() => restartMic(), 1500);
            }
        } else if (command === "prev") {
            if (currentStep > 0) {
                showFeedback("Quay lại bước trước...");
                setTimeout(handlePrev, 400);
            } else {
                showFeedback("Đang ở bước đầu tiên!");
                setTimeout(() => restartMic(), 1500);
            }
        } else if (command === "repeat") {
            showFeedback("Đọc lại cho bạn nghe nhé...");
            setTimeout(handleRepeat, 400);
        } else if (command === "done") {
            if (currentStep === steps.length - 1) {
                showFeedback("Hoàn thành! Chúc ngon miệng!");
                setTimeout(() => router.push("/"), 1500);
            } else {
                showFeedback("Vẫn còn bước nữa, tiếp nhé!");
                setTimeout(() => restartMic(), 1500);
            }
        }
    }, [currentStep, steps.length, handleNext, handlePrev, handleRepeat, showFeedback, router, killMic, restartMic]);

    const startListening = useCallback(() => {
        if (isTTSSpeakingRef.current) return;
        if (!isListeningRef.current) return;

        const SpeechRecognitionClass = (window as any).SpeechRecognition
            || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            showFeedback("Trình duyệt chưa hỗ trợ giọng nói");
            setIsListening(false);
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* safe */ }
            recognitionRef.current = null;
        }

        const recognition = new SpeechRecognitionClass();
        recognition.lang = "vi-VN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            const last = event.results[event.results.length - 1];
            if (last.isFinal) {
                const transcript = last[0].transcript;
                if (!isTTSSpeakingRef.current) {
                    processVoiceCommand(transcript);
                }
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === "no-speech" || event.error === "aborted") {
                setTimeout(() => startListeningRef.current?.(), 200);
                return;
            }
            console.error("Speech error:", event.error);
            setTimeout(() => startListeningRef.current?.(), 500);
        };

        recognition.onend = () => {
            setTimeout(() => startListeningRef.current?.(), 200);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
            setIsTTSSpeaking(false);
        } catch { /* safe */ }
    }, [processVoiceCommand, showFeedback]);
    useEffect(() => {
        startListeningRef.current = startListening;
    }, [startListening]);

    useEffect(() => {
        isListeningRef.current = isListening;

        if (isListening) {
            startListeningRef.current?.();
        } else {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* safe */ }
                recognitionRef.current = null;
            }
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* safe */ }
                recognitionRef.current = null;
            }
        };
    }, [isListening]);

    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();

        if (isAudioPlaying && steps[currentStep]) {
            isTTSSpeakingRef.current = true;
            setIsTTSSpeaking(true);
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* safe */ }
                recognitionRef.current = null;
            }

            const utterance = new SpeechSynthesisUtterance(steps[currentStep].text);
            utterance.lang = "vi-VN";
            utterance.rate = 1.0;

            const voices = window.speechSynthesis.getVoices();
            const viVoice = voices.find(voice =>
                voice.lang.toLowerCase().includes('vi') ||
                voice.name.toLowerCase().includes('vietnamese') ||
                voice.name.toLowerCase().includes('viet')
            );
            if (viVoice) utterance.voice = viVoice;

            const resumeMic = () => {
                if (!isTTSSpeakingRef.current) return;
                isTTSSpeakingRef.current = false;
                if (isListeningRef.current) {
                    setTimeout(() => startListeningRef.current?.(), 800);
                } else {
                    setIsTTSSpeaking(false);
                }
            };

            utterance.onend = () => resumeMic();
            utterance.onerror = () => resumeMic();

            window.speechSynthesis.speak(utterance);

            const textLen = steps[currentStep].text.length;
            const fallbackMs = Math.max(textLen * 80, 3000) + 3000;
            const fallbackTimer = setTimeout(() => resumeMic(), fallbackMs);

            return () => {
                clearTimeout(fallbackTimer);
                window.speechSynthesis.cancel();
                isTTSSpeakingRef.current = false;
                setIsTTSSpeaking(false);
            };
        }

        return () => {
            window.speechSynthesis.cancel();
            isTTSSpeakingRef.current = false;
            setIsTTSSpeaking(false);
        };
    }, [currentStep, isAudioPlaying, steps]);

    if (!recipe) return null;

    const toggleAudio = () => {
        setIsAudioPlaying(!isAudioPlaying);
    };

    const toggleVoice = () => {
        setIsListening(prev => !prev);
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
                    {/* Voice Command Toggle */}
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
                    {/* TTS Audio Toggle */}
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

            <div className="h-2 w-full liquid-glass-input rounded-full overflow-hidden my-4 shadow-inner border border-white/20">
                <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-spring"
                    style={{ width: `${progress}%`, transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
                />
            </div>

            {/* Swipeable Card Area */}
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

                    {/* Voice Feedback Bubble - "AI đang hiểu" */}
                    {voiceFeedback && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 liquid-glass-item px-5 py-2.5 rounded-full border border-blue-300/40 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{voiceFeedback}</span>
                            </div>
                        </div>
                    )}

                    {/* Unified Status Badge - ONE badge, clear state */}
                    {(isListening || isTTSSpeaking) && !voiceFeedback && (
                        <div className={`absolute top-6 right-6 flex items-center gap-1.5 liquid-glass-item px-3 py-2 rounded-full border transition-all duration-300 ${isTTSSpeaking
                            ? "border-emerald-200/50"
                            : "border-blue-200/50"
                            }`}>
                            <span className={`text-xs font-bold mr-0.5 uppercase ${isTTSSpeaking ? "text-emerald-600" : "text-blue-600"
                                }`}>
                                {isTTSSpeaking ? "Đang đọc" : "Đang nghe"}
                            </span>
                            <span className={`w-1 h-3 rounded-full animate-bounce [animation-delay:-0.3s] ${isTTSSpeaking ? "bg-emerald-500" : "bg-blue-500"
                                }`}></span>
                            <span className={`w-1 h-4 rounded-full animate-bounce [animation-delay:-0.15s] ${isTTSSpeaking ? "bg-emerald-500" : "bg-blue-500"
                                }`}></span>
                            <span className={`w-1 h-2 rounded-full animate-bounce ${isTTSSpeaking ? "bg-emerald-500" : "bg-blue-500"
                                }`}></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Last heard transcript - subtle debug for natural feel */}
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
