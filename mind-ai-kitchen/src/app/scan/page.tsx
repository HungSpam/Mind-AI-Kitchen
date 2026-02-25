"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Image as ImageIcon, ChefHat, Users, X, Info, CheckCircle2, ScanFace, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";

export default function ScanPage() {
    const router = useRouter();
    const [servings, setServings] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
    const [hasImage, setHasImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [newIngredient, setNewIngredient] = useState("");

    // Đề xuất động
    const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const { profile, scannedIngredients: ingredients, setScannedIngredients, removeIngredient, addIngredient, setCurrentRecipe } = useAppStore();

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScannedIngredients([]);
        setImagePreview(null);
        setIsLoading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new window.Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800;
                let width = img.width;
                let height = img.height;

                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setImagePreview(compressedBase64);
                setHasImage(true);

                try {
                    const res = await fetch('/api/vision', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: compressedBase64 })
                    });
                    const data = await res.json();
                    if (data.ingredients) {
                        setScannedIngredients(data.ingredients);
                    }
                } catch (error) {
                    console.error("Vision API Error:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleAddIngredient = () => {
        if (!newIngredient.trim()) return;
        addIngredient({ id: Date.now().toString(), name: newIngredient });
        setNewIngredient("");
    };

    const handleSubmit = async () => {
        setIsLoadingRecipe(true);
        try {
            const res = await fetch('/api/recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile, ingredients, servings })
            });
            const recipeData = await res.json();
            if (recipeData && !recipeData.error) {
                setCurrentRecipe(recipeData);
                router.push("/result");
            } else {
                alert("Lỗi tạo công thức: " + recipeData.error);
            }
        } catch (error) {
            console.error("Recipe API Error:", error);
            alert("Đã có lỗi xảy ra khi tạo công thức!");
        } finally {
            setIsLoadingRecipe(false);
        }
    };

    const handleGetSuggestions = async () => {
        if (ingredients.length === 0) return;
        setIsLoadingSuggestions(true);
        try {
            const res = await fetch('/api/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients })
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setDynamicSuggestions(data);
            }
        } catch (error) {
            console.error("Suggestion API Error:", error);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleDemoVision = () => {
        setScannedIngredients([]);
        setImagePreview("https://images.unsplash.com/photo-1588168333986-5b9eef1e670d?w=800&q=80");
        setHasImage(true);
        setIsLoading(true);
        setTimeout(() => {
            const demoIngredients = [
                { id: "1", name: "Thịt bò" },
                { id: "2", name: "Cà chua" },
                { id: "3", name: "Hành tây" },
                { id: "4", name: "Trứng" }
            ];
            setScannedIngredients(demoIngredients);
            setIsLoading(false);
        }, 2500);
    };

    const handleDemoRecipe = () => {
        setIsLoadingRecipe(true);
        setTimeout(() => {
            const demoRecipe = {
                name: "Bò Xào Cà Chua Trứng",
                calories: 450 * servings,
                time: "20 phút",
                difficulty: "Vừa",
                ai_verdict: "Món ăn giàu protein từ thịt bò nạc, chống oxy hóa từ cà chua, cực kỳ phù hợp với chế độ ăn giữ dáng và khỏe mạnh của bạn.",
                servings: servings,
                macros: { protein: 35 * servings, carbs: 12 * servings, fat: 22 * servings },
                ingredients: [
                    "200g Thịt bò xắt mỏng",
                    "2 quả Cà chua thái múi cau",
                    "1/2 củ Hành tây",
                    "1 quả Trứng gà",
                    "Tỏi băm, dầu hào, tiêu, gia vị cơ bản"
                ],
                suggestedAdditions: ["Salad xanh ăn kèm", "Một chút hành bưởi trang trí"],
                steps: [
                    { id: 1, text: "Ướp thịt bò với 1 muỗng dầu hào, chút tỏi băm và tiêu trong 10 phút." },
                    { id: 2, text: "Phi thơm tỏi, xào thịt bò xém cạnh ở lửa lớn nhanh tay rồi trút ra đĩa." },
                    { id: 3, text: "Phi thêm chút tỏi, cho cà chua và hành tây vào xào cho chín mềm." },
                    { id: 4, text: "Đổ bò lại vào đảo đều 1 phút. Nhấc xuống đĩa." },
                    { id: 5, text: "Dùng chảo cũ ốp la thêm quả trứng sao cho lòng đỏ còn chảy, đặt lên trên nhâm nhi nóng." }
                ]
            };
            setCurrentRecipe(demoRecipe);
            router.push("/result");
        }, 1200);
    };

    return (
        <div className="flex flex-col gap-6 w-full pt-4 pb-24 px-2 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 drop-shadow-sm">
                    <Camera className="text-emerald-500" /> Quét Thực Phẩm
                </h1>
                <div className="flex items-center gap-2 liquid-glass-item px-4 py-2 rounded-full border border-white/20 dark:border-white/10">
                    <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setServings(Math.max(1, servings - 1))}
                            className="w-6 h-6 flex items-center justify-center bg-white dark:bg-black/40 text-emerald-600 dark:text-emerald-400 rounded-full font-bold shadow-sm hover:scale-105 transition-transform"
                        >-</button>
                        <span className="w-3 text-center font-bold text-sm">{servings}</span>
                        <button
                            onClick={() => setServings(servings + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-white dark:bg-black/40 text-emerald-600 dark:text-emerald-400 rounded-full font-bold shadow-sm hover:scale-105 transition-transform"
                        >+</button>
                    </div>
                </div>
            </div>

            {!hasImage ? (
                <Card className="border-dashed border-2 liquid-glass-item border-emerald-300/50 hover:bg-white/20 dark:hover:bg-white/5 transition-all cursor-pointer shadow-none">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-5">
                        <div className="w-20 h-20 bg-emerald-100/80 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-[0_8px_32px_0_rgba(16,185,129,0.2)]">
                            <Camera size={36} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-xl mb-1">Upload Ảnh Tủ Lạnh</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-[250px] mx-auto font-medium">
                                AI Vision sẽ tự động nhận diện và ước lượng các thực phẩm.
                            </p>
                        </div>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center pt-4 pb-2 w-full animate-in fade-in zoom-in mt-4">
                                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-3" />
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                                    Mind-GPT đang phân tích ảnh...
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col sm:flex-row w-full gap-3 pt-6">
                                    <Button
                                        variant="secondary"
                                        className="flex-1 font-semibold border border-white/40 bg-white/60 dark:bg-black/40 relative overflow-hidden"
                                    >
                                        <ImageIcon className="mr-2" size={18} /> Thư viện
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </Button>
                                    <Button
                                        className="flex-1 font-semibold shadow-emerald-500/25 relative overflow-hidden"
                                    >
                                        <Camera className="mr-2" size={18} /> Chụp ngay
                                        <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </Button>
                                </div>
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={handleDemoVision}
                                        className="text-[11px] font-bold text-zinc-400/50 hover:text-zinc-500 transition-colors uppercase tracking-wide cursor-pointer"
                                    >
                                        [ DEMO: Bỏ Qua Quét Ảnh ]
                                    </button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col md:flex-row gap-8 animate-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto w-full">

                    {/* Image Scanner Component */}
                    <div className="w-full md:w-1/2 flex-shrink-0 flex flex-col">
                        <div className="aspect-[4/3] md:aspect-square w-full rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 relative shadow-[0_12px_40px_0_rgba(31,38,135,0.15)] border border-white/30 dark:border-white/10 flex items-center justify-center group">
                            {imagePreview ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imagePreview} alt="Tủ lạnh của bạn" className={`w-full h-full object-cover transition-all duration-700 ${isLoading ? 'scale-105 blur-[2px] brightness-75' : 'scale-100 blur-0 brightness-100'}`} />
                                    {isLoading && (
                                        <>
                                            <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay animate-pulse" />

                                            {/* Active Scanning Overlay */}
                                            <div
                                                className="absolute inset-0 scan-grid-bg opacity-70 mix-blend-overlay"
                                                style={{ animation: 'scan-grid-wave 2s ease-in-out infinite alternate' }}
                                            />

                                            {/* Laser Line */}
                                            <div
                                                className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_20px_5px_rgba(52,211,153,0.5)]"
                                                style={{ animation: 'scan-line 2s ease-in-out infinite alternate' }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                                <div className="liquid-glass-item px-5 py-2.5 rounded-full flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm shadow-xl backdrop-blur-xl border-emerald-300/30">
                                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> Mind-GPT đang phân tích...
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p className="text-zinc-600 dark:text-zinc-400 text-lg font-semibold drop-shadow-sm flex items-center justify-center gap-2">
                                    {isLoading ? <Loader2 className="animate-spin" /> : <ScanFace size={24} />}
                                    {isLoading ? "Đang xử lý ảnh..." : "Mâm đồ ăn tuyệt hảo"}
                                </p>
                            )}

                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute top-3 right-3 h-10 w-10 liquid-glass-item border border-white/50 z-20"
                                onClick={() => { setHasImage(false); setIsLoading(false); setImagePreview(null); }}
                            >
                                <X size={18} />
                            </Button>

                            {!isLoading && (
                                <div className="absolute bottom-4 left-4 liquid-glass-item text-emerald-600 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border border-white/30 animate-in fade-in slide-in-from-bottom-2">
                                    <CheckCircle2 size={14} /> AI VISION HOÀN TẤT
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Analysis Results and Actions */}
                    <div className="w-full md:w-1/2 flex flex-col gap-6">
                        <Card className="shadow-none border-white/20 bg-transparent liquid-glass-item flex-1">
                            <CardContent className="p-5 space-y-4">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-emerald-600 dark:text-emerald-400 transition-all opacity-70">
                                        <ScanFace className="w-12 h-12 mb-3 animate-pulse opacity-50" />
                                        <p className="font-bold animate-pulse text-lg tracking-tight">Đang bóc tách nguyên liệu...</p>
                                        <p className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-widest">Vui lòng chờ giây lát</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                Kết quả <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm">{ingredients.length}</span>
                                            </h3>
                                        </div>

                                        {(() => {
                                            if (!profile.allergies) return null;
                                            const allergyWords = profile.allergies.toLowerCase().split(/[,\s]+/).filter(w => w.length > 2);
                                            const allergyWarnings = ingredients.filter(ing => {
                                                const ingName = ing.name.toLowerCase();
                                                return allergyWords.some(allergy => ingName.includes(allergy));
                                            });

                                            if (allergyWarnings.length === 0) return null;

                                            return (
                                                <div className="p-3 bg-red-100/80 dark:bg-red-900/40 border border-red-300 dark:border-red-800 rounded-2xl flex items-start gap-3 shadow-sm animate-in zoom-in fade-in">
                                                    <div className="bg-red-500 text-white p-1 rounded-full shrink-0 mt-0.5">
                                                        <AlertTriangle size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-red-800 dark:text-red-200">Cảnh báo Dị ứng!</p>
                                                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                                            Phát hiện nghi ngờ: {allergyWarnings.map(w => w.name).join(", ")}. Hãy bấm <X size={12} className="inline" /> xóa ngay ở dưới nếu bạn không ăn được.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="p-3 liquid-glass-item rounded-2xl text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-3 border border-white/20 shadow-sm font-medium">
                                            <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-full text-blue-600 dark:text-blue-400 shrink-0">
                                                <Info size={16} />
                                            </div>
                                            <p className="mt-0.5 leading-relaxed">Xóa những đồ AI đoán nhầm, hoặc gõ thêm món ẩn dưới đáy tủ nhé!</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {ingredients.map(ing => (
                                                <div
                                                    key={ing.id}
                                                    className="group flex items-center gap-1.5 liquid-glass-item border border-white/30 dark:border-white/10 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-all hover:bg-white/50 dark:hover:bg-zinc-700 hover:scale-[1.02]"
                                                >
                                                    <span className="text-zinc-800 dark:text-zinc-200">{ing.name}</span>
                                                    <button
                                                        onClick={() => removeIngredient(ing.id)}
                                                        className="ml-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors rounded-full p-0.5"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-2">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Thêm nhanh đồ cơ bản:</p>
                                                <button
                                                    onClick={handleGetSuggestions}
                                                    disabled={isLoadingSuggestions || ingredients.length === 0}
                                                    className="text-[11px] flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/50 px-2 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isLoadingSuggestions ? <Loader2 size={12} className="animate-spin" /> : "✨ Gợi ý (AI)"}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {dynamicSuggestions.length > 0 ? dynamicSuggestions.map(item => (
                                                    <button
                                                        key={item}
                                                        onClick={() => {
                                                            if (!ingredients.find(i => i.name.toLowerCase() === item.toLowerCase())) {
                                                                addIngredient({ id: Date.now().toString() + item, name: item });
                                                                setDynamicSuggestions(prev => prev.filter(s => s !== item));
                                                            }
                                                        }}
                                                        className="text-xs px-3 py-1.5 rounded-full border border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 shadow-sm transition-colors cursor-pointer"
                                                    >
                                                        + {item}
                                                    </button>
                                                )) : (
                                                    <p className="text-xs text-zinc-400 italic">Bấm gợi ý AI để xem các nguyên liệu hoặc gia vị phù hợp.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-3">
                                            <Input
                                                placeholder="Nhập thêm ở đây..."
                                                className="font-medium border-white/20"
                                                value={newIngredient}
                                                onChange={(e) => setNewIngredient(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                                            />
                                            <Button variant="secondary" className="px-5 shrink-0 shadow-sm" onClick={handleAddIngredient}>Thêm</Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <div className="pt-2 space-y-3 pb-8 md:pb-0">
                            <Button size="lg" className="w-full text-base h-16 rounded-[2rem] shadow-emerald-500/30" onClick={handleSubmit} disabled={isLoadingRecipe}>
                                <ChefHat className="mr-2" size={24} /> {isLoadingRecipe ? "Mind-GPT đang nấu..." : "Lập Công Thức Ngay"}
                            </Button>
                            <div className="flex justify-center mt-2">
                                <button
                                    onClick={handleDemoRecipe}
                                    disabled={isLoadingRecipe}
                                    className="text-[11px] font-bold text-zinc-400/50 hover:text-zinc-500 transition-colors uppercase tracking-wide cursor-pointer disabled:opacity-50"
                                >
                                    [ DEMO: Bỏ Qua Gọi AI ]
                                </button>
                            </div>

                            <p className="text-center text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-2 tracking-wide uppercase pt-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                Powered By Mind-GPT
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
