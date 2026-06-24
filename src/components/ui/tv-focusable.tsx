import { cn } from "@/lib/utils"
import React from "react"
import { findNodeHandle, Pressable, PressableProps, ViewProps } from "react-native"
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
    /**
     * Disables the Reanimated focus scale-up animation, keeping the on-focus
     * border highlight but skipping the transform. Useful in dense layouts
     * (e.g. settings drawers, menus) where a scale glitch on every focus
     * change reads as visual noise rather than polish.
     */
    noScale?: boolean
    /** When true, sets nextFocusLeft to the element's own native tag,
     * effectively blocking LEFT navigation away from this element. */
    blockLeft?: boolean
    /** When true, sets nextFocusRight to the element's own native tag,
     * effectively blocking RIGHT navigation away from this element. */
    blockRight?: boolean
    /** When true, sets nextFocusDown to the element's own native tag,
     * effectively blocking DOWN navigation away from this element. */
    blockDown?: boolean
    /** When true, sets nextFocusUp to the element's own native tag,
     * effectively blocking UP navigation away from this element. */
    blockUp?: boolean
}

// TV-only app. The original `isTV` guards collapsed to runtime-true since
// every shipped target (Apple TV / Android TV) reports `Platform.isTV`.
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
    noScale,
    blockLeft,
    blockRight,
    blockDown,
    blockUp,
    ...rest
}: TvFocusablePressableProps, ref) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    const innerRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)
    const [leftBlockTag, setLeftBlockTag] = React.useState<number | null>(null)
    const [rightBlockTag, setRightBlockTag] = React.useState<number | null>(null)
    const [downBlockTag, setDownBlockTag] = React.useState<number | null>(null)
    const [upBlockTag, setUpBlockTag] = React.useState<number | null>(null)
    const tagResolved = React.useRef(false)

    const handleBlockLayout = React.useCallback(() => {
        if (tagResolved.current) return
        const node = innerRef.current
        if (!node) return
        const tag = findNodeHandle(node)
        if (tag !== null) {
            if (blockLeft) setLeftBlockTag(tag)
            if (blockRight) setRightBlockTag(tag)
            if (blockDown) setDownBlockTag(tag)
            if (blockUp) setUpBlockTag(tag)
            if (blockLeft || blockRight || blockDown || blockUp) tagResolved.current = true
        }
    }, [blockLeft, blockRight, blockDown, blockUp])

    const combinedRef = React.useCallback(
        (instance: React.ComponentRef<typeof Pressable> | null) => {
            (innerRef as React.MutableRefObject<typeof instance>).current = instance
            if (typeof ref === "function") ref(instance)
            else if (ref) (ref as React.MutableRefObject<typeof instance>).current = instance
        },
        [ref],
    )

    React.useEffect(() => {
        if (noScale) {
            // Skip the scale animation entirely when noScale is set. The
            // border highlight still fires via focusedClassName, but the
            // transform is held steady so dense rows don't jitter.
            scale.value = 1
            return
        }
        scale.set(withTiming(isFocused ? scaleTo : 1, { duration: 150 }))
    }, [isFocused, scaleTo, scale, noScale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            ref={combinedRef}
            focusable={focusable ?? true}
            onPress={onPress}
            onFocus={(e) => {
                setIsFocused(true)
                onFocus?.(e)
            }}
            onBlur={(e) => {
                setIsFocused(false)
                onBlur?.(e)
            }}
            onLayout={handleBlockLayout}
            {...{
                nextFocusRight: blockRight && rightBlockTag ? rightBlockTag : nextFocusRight,
                nextFocusLeft: blockLeft && leftBlockTag ? leftBlockTag : nextFocusLeft,
                nextFocusDown: blockDown && downBlockTag ? downBlockTag : nextFocusDown,
                nextFocusUp: blockUp && upBlockTag ? upBlockTag : nextFocusUp,
                hasTVPreferredFocus,
            } as any}
            {...rest}
        >
            <Animated.View
                className={cn(
                    className,
                    isFocused && focusedClassName,
                )}
                style={[style, animatedStyle]}
            >
                {children}
            </Animated.View>
        </Pressable>
    )
})
