import { cn } from "@/lib/utils"
import React from "react"
import { findNodeHandle, Platform, Pressable, PressableProps, ViewProps } from "react-native"
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
    /** When true, sets nextFocusLeft to the element's own native tag,
     * effectively blocking LEFT navigation away from this element. */
    blockLeft?: boolean
    /** When true, sets nextFocusDown to the element's own native tag,
     * effectively blocking DOWN navigation away from this element. */
    blockDown?: boolean
    /** When true, sets nextFocusUp to the element's own native tag,
     * effectively blocking UP navigation away from this element. */
    blockUp?: boolean
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
    blockLeft,
    blockDown,
    blockUp,
    ...rest
}: TvFocusablePressableProps, ref) {
    const isTV = Platform.isTV
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    const innerRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)
    const [leftBlockTag, setLeftBlockTag] = React.useState<number | null>(null)
    const [downBlockTag, setDownBlockTag] = React.useState<number | null>(null)
    const [upBlockTag, setUpBlockTag] = React.useState<number | null>(null)
    const tagResolved = React.useRef(false)

    const handleBlockLayout = React.useCallback(() => {
        if (!isTV || tagResolved.current) return
        const node = innerRef.current
        if (!node) return
        const tag = findNodeHandle(node)
        if (tag !== null) {
            if (blockLeft) setLeftBlockTag(tag)
            if (blockDown) setDownBlockTag(tag)
            if (blockUp) setUpBlockTag(tag)
            if (blockLeft || blockDown || blockUp) tagResolved.current = true
        }
    }, [blockLeft, blockDown, blockUp, isTV])

    const combinedRef = React.useCallback(
        (instance: React.ComponentRef<typeof Pressable> | null) => {
            (innerRef as React.MutableRefObject<typeof instance>).current = instance
            if (typeof ref === "function") ref(instance)
            else if (ref) (ref as React.MutableRefObject<typeof instance>).current = instance
        },
        [ref],
    )

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? scaleTo : 1, { duration: 150 }))
    }, [isFocused, scaleTo, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            ref={combinedRef}
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
            onLayout={handleBlockLayout}
            {...{
                nextFocusRight,
                nextFocusLeft: blockLeft && isTV && leftBlockTag ? leftBlockTag : nextFocusLeft,
                nextFocusDown: blockDown && isTV && downBlockTag ? downBlockTag : nextFocusDown,
                nextFocusUp: blockUp && isTV && upBlockTag ? upBlockTag : nextFocusUp,
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
