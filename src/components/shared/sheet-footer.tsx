import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { cn } from "@/lib/utils"
import * as React from "react"
import { View } from "react-native"

////////////////////////// Container

type SheetFooterProps = {
    children: React.ReactNode
    className?: string
}

export function SheetFooter({ children, className }: SheetFooterProps) {
    return <View className={cn("flex-row justify-center gap-x-6", className)}>{children}</View>
}

////////////////////////// Footer button

type SheetFooterButtonVariant = "cancel" | "primary" | "destructive"

type SheetFooterButtonProps = {
    variant?: SheetFooterButtonVariant
    children: React.ReactNode
    onPress: () => void
    disabled?: boolean
    className?: string
    blockLeft?: boolean
    blockDown?: boolean
}

const VARIANT_CLASSES: Record<SheetFooterButtonVariant, string> = {
    cancel: "h-14 flex-1 min-w-[180px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 active:bg-white/10",
    primary: "h-14 flex-1 min-w-[180px] items-center justify-center rounded-2xl bg-primary active:opacity-80",
    destructive: "h-14 flex-1 min-w-[180px] items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 active:opacity-80",
}

// Focused state mirrors the drawer close button's TV-focus ring so all
// destructive/primary actions in a sheet adopt the same focus indicator.
// Primary adopts the close button's exact focused styling so pressing the
// "Auto Select now" / "Start selected" CTA on TV produces the same visual
// feedback as the X close button.
const VARIANT_FOCUSED_CLASSES: Record<SheetFooterButtonVariant, string> = {
    cancel: "border border-brand-400/80 bg-white/10",
    primary: "border border-brand-400/80 bg-white/10 text-primary-foreground",
    destructive: "border border-red-400/80 bg-red-500/20",
}

export function SheetFooterButton({
    variant = "primary",
    children,
    onPress,
    disabled,
    className,
    blockLeft,
    blockDown,
}: SheetFooterButtonProps) {
    return (
        <TvFocusablePressable
            onPress={onPress}
            disabled={disabled}
            focusable={!disabled}
            blockLeft={blockLeft}
            blockDown={blockDown}
            className={cn(
                VARIANT_CLASSES[variant],
                disabled && "opacity-50",
                className,
            )}
            focusedClassName={VARIANT_FOCUSED_CLASSES[variant]}
        >
            {children}
        </TvFocusablePressable>
    )
}
