import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
    {
        variants: {
            variant: {
                default: "bg-emerald-500/90 hover:bg-emerald-500 text-white shadow-[0_8px_16px_0_rgba(16,185,129,0.2)] backdrop-blur-md border border-emerald-400/50",
                destructive:
                    "bg-red-500/90 text-white hover:bg-red-500 shadow-md backdrop-blur-md border border-red-400/50",
                outline:
                    "liquid-glass-item border border-white/20 dark:border-white/10 text-emerald-600 dark:text-emerald-400 font-bold",
                secondary:
                    "liquid-glass-item text-slate-800 dark:text-slate-200 border border-white/30 dark:border-white/10 font-bold",
                ghost: "hover:bg-black/5 dark:hover:bg-white/10 rounded-full",
                link: "text-emerald-500 underline-offset-4 hover:underline",
            },
            size: {
                default: "h-12 px-6 py-2",
                sm: "h-10 rounded-full px-4",
                lg: "h-14 rounded-full px-8 text-base",
                icon: "h-12 w-12 rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
