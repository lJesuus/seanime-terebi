import { cn } from "@/lib/utils"
import * as React from "react"
import { TextInput, Pressable, Platform } from "react-native"
import { useCSSVariable } from "uniwind"

const Input = React.forwardRef<
    React.ElementRef<typeof TextInput>,
    React.ComponentPropsWithoutRef<typeof TextInput> & {
        hasTVPreferredFocus?: boolean
        nextFocusDown?: number
        nextFocusUp?: number
        nextFocusLeft?: number
        nextFocusRight?: number
    }
>(({ className, placeholderTextColor, onFocus, onBlur, ...props }, ref) => {
    const resolvedPlaceholderColor = useCSSVariable("--color-muted-foreground")
    const [isFocused, setIsFocused] = React.useState(false)
    const localRef = React.useRef<TextInput>(null)

    React.useImperativeHandle(ref, () => localRef.current!)

    const isTV = Platform.isTV

    if (isTV) {
        const {
            hasTVPreferredFocus,
            nextFocusDown,
            nextFocusUp,
            nextFocusLeft,
            nextFocusRight,
            ...textInputProps
        } = props

        return (
            <Pressable
                focusable={true}
                hasTVPreferredFocus={hasTVPreferredFocus}
                {...({
                    nextFocusDown,
                    nextFocusUp,
                    nextFocusLeft,
                    nextFocusRight,
                } as any)}
                onFocus={(e) => {
                    setIsFocused(true)
                    onFocus?.(e as any)
                }}
                onBlur={(e) => {
                    setIsFocused(false)
                    onBlur?.(e as any)
                }}
                onPress={() => {
                    localRef.current?.focus()
                }}
                className={cn(
                    "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-foreground justify-center",
                    props.editable === false && "opacity-50",
                    isFocused && "border-brand-400 border-2 bg-white/[0.08] scale-102 shadow-lg",
                    className,
                )}
            >
                <TextInput
                    ref={localRef}
                    placeholderTextColor={placeholderTextColor ?? (typeof resolvedPlaceholderColor === "string" ? resolvedPlaceholderColor : undefined)}
                    textAlignVertical="center"
                    focusable={false}
                    className="text-foreground w-full h-full"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...textInputProps}
                />
            </Pressable>
        )
    }

    return (
        <TextInput
            ref={ref}
            className={cn(
                "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-foreground",
                props.editable === false && "opacity-50",
                isFocused && "border-brand-400 border-2",
                className,
            )}
            placeholderTextColor={placeholderTextColor ?? (typeof resolvedPlaceholderColor === "string" ? resolvedPlaceholderColor : undefined)}
            textAlignVertical="center"
            focusable={true}
            onFocus={(e) => {
                setIsFocused(true)
                onFocus?.(e)
            }}
            onBlur={(e) => {
                setIsFocused(false)
                onBlur?.(e)
            }}
            {...props}
        />
    )
})

Input.displayName = "Input"

export { Input }

