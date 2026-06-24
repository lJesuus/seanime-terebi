import { cn } from "@/lib/utils"
import { TvFocusablePressable as Focusable } from "@/components/ui/tv-focusable"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { Text, View } from "react-native"

type LabeledSwitchProps = {
    label?: string
    description?: string
    /**
     * Optional second-tier helper text shown below the description in a
     * smaller size. Distinct from description for layouts that need a
     * primary/secondary text hierarchy.
     */
    helper?: string
    /** Optional controlled value; onValueChange is used otherwise. */
    value?: boolean
    /** Convenience alias for `value` for callers that follow the
     * `checked` onToggle() pattern (matches tv-switch naming). */
    checked?: boolean
    onValueChange?: (value: boolean) => void
    /** Convenience alias for `onValueChange` for `checked` onToggle callers. */
    onToggle?: () => void
    disabled?: boolean
    className?: string
    /**
     * Disables the focus scale animation in the underlying Focusable while
     * keeping the focus border highlight. Useful in dense menu rows where
     * the scale-up reads as visual noise on every focus change.
     */
    noScale?: boolean
    /**
     * TV focus-chain blocking hints. These are accepted so call-sites that
     * previously delegated to a TvFocusablePressable underneath still type-
     * check. Within LabeledSwitch they have no observable effect because the
     * underlying `<Pressable>` already enforces focus boundaries.
     */
    blockLeft?: boolean
    blockRight?: boolean
    blockUp?: boolean
    blockDown?: boolean
}

/**
 * Read the effective value, accounting for both `value` and `checked`
 * prop conventions used across the codebase.
 */
function readChecked(p: LabeledSwitchProps): boolean {
    return (p.value ?? p.checked ?? false) as boolean
}

export function LabeledSwitch(props: LabeledSwitchProps) {
    const { label, description, helper, className, noScale, blockLeft, blockRight, blockUp, blockDown } = props
    const value = readChecked(props)
    // Single-fire toggle: prefer onToggle() when the caller uses the
    // `checked` onToggle() convention; otherwise call onValueChange(!value).
    // Avoids the double-call hazard introduced earlier.
    const toggle = () => {
        if (props.onToggle) {
            props.onToggle()
            return
        }
        props.onValueChange?.(!value)
    }
    const onPress = props.disabled ? undefined : toggle

    // The block* props were previously accepted-for-type-compat only; they
    // are now wired through Focusable so the pressed row traps focus on
    // UP/DOWN/LEFT/RIGHT. Use cases include TV drawers / modals where the
    // toggle should be a self-contained focus unit (Drawer's DOWN past-last
    // guard is a separate safety net, but explicit blockDown keeps focus
    // pinned on the toggle itself).
    return (
        <Focusable
            onPress={onPress}
            scaleTo={noScale ? 1 : 1.02}
            noScale={noScale}
            focusedClassName="border-brand-400/80 bg-white/[0.08]"
            blockLeft={blockLeft}
            blockRight={blockRight}
            blockUp={blockUp}
            blockDown={blockDown}
            className={cn(
                "flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04]",
                props.disabled && "opacity-50",
                className,
            )}
        >
            <View className="flex-1 pr-3">
                {label && (
                    <Text className="text-sm font-semibold text-white">{label}</Text>
                )}
                {description && (
                    <Text
                        className={cn("text-xs text-white/55", label ? "mt-1" : undefined)}
                        numberOfLines={2}
                    >
                        {description}
                    </Text>
                )}
                {helper && (
                    <Text className="text-xs text-white/40 mt-1" numberOfLines={2}>
                        {helper}
                    </Text>
                )}
            </View>

            <View
                className={cn(
                    "h-7 w-12 rounded-full border items-center justify-end px-0.5 flex-row",
                    value ? "bg-brand-500/70 border-brand-400/60" : "bg-white/10 border-white/15",
                )}
                accessibilityState={{ checked: value }}
            >
                <View
                    className={cn(
                        "h-6 w-6 rounded-full bg-white",
                        value ? "ml-auto" : "mr-auto",
                    )}
                    style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.25,
                        shadowRadius: 2,
                        elevation: 2,
                    }}
                >
                    <Ionicons
                        name={value ? "checkmark" : "close"}
                        size={12}
                        color={value ? "rgb(97,82,223)" : "rgba(255,255,255,0.4)"}
                        style={{ alignSelf: "center", marginTop: 6 }}
                    />
                </View>
            </View>
        </Focusable>
    )
}
