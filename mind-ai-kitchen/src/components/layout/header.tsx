import Link from "next/link";
import { ChefHat } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-white/5 liquid-glass rounded-b-[2rem] shadow-sm">
            <div className="w-full h-16 flex items-center px-6">
                <Link href="/" className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 transition-opacity hover:opacity-80">
                    <div className="bg-emerald-500 text-white rounded-xl p-1.5 shadow-sm shadow-emerald-500/20">
                        <ChefHat className="h-5 w-5" />
                    </div>
                    <span className="font-bold tracking-tight text-lg drop-shadow-sm">Mind AI&apos;s Kitchen</span>
                </Link>
            </div>
        </header>
    );
}
