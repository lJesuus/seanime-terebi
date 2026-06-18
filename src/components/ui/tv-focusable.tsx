import { cn } from "@/lib/utils"
import React from "react"
import { Platform, Pressable, PressableProps, ViewProps } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

type TvFocusablePressableProps = PressableProps & {
    scaleTo?: number
    focusedClassName?: string
    children: React.ReactNode
    className?: string
    style?: ViewProps["style"]
    nextFocusRight?: number | null
    nextFocusLeft?: number | null
    nextFocusDown?: number | null
    nextFocusUp?: number | null
    hasTVPreferredFocus?: boolean
}

export const TvFocusablePressable = React.forwardRef<React.ComponentRef<typeof Pressable>, TvFocusablePressableProps>(function TvFocusablePressable({
    scaleTo = 1.05,
    focusedClassName = "border-brand-400/80",
    children,
    className,
    style,
    onPress,
    onFocus,
    onBlur,
    nextFocusRight,
    nextFocusLeft,
    nextFocusDown,
    nextFocusUp,
    hasTVPreferredFocus,
    focusable,
    ...rest
}: TvFocusablePressableProps, ref) {
    const isTV = Platform.isTV
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? scaleTo : 1, { duration: 150 }))
    }, [isFocused, scaleTo, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            ref={ref}
            focusable={focusable ?? isTV}
            onPress={onPress}
            onFocus={(e) => {
                setIsFocused(true)
                onFocus?.(e)
            }}
            onBlur={(e) => {
                setIsFocused(false)
                onBlur?.(e)
            }}
            {...{
                nextFocusRight,
                nextFocusLeft,
                nextFocusDown,
                nextFocusUp,
                hasTVPreferredFocus,
            } as any}
            {...rest}
        >
            <Animated.View
                className={cn(
                    className,
                    isTV && isFocused && focusedClassName,
                )}
                style={isTV ? [style, animatedStyle] : style}
            >
                {children}
            </Animated.View>
        </Pressable>
    )
})
