import React from "react"
import { Platform } from "react-native"
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated"
import { DOUBLE_TAP_INDICATOR_VISIBLE_MS } from "../constants"

/**
 * Manages the double-tap seek flash indicator state and animation.
 */
export function useDoubleTapSeek() {
    // TV has no touch input, so double-tap-to-seek is dead code. The
    // wrapper here still returns the same shape the orchestrator
    // expects, but no SharedValue / animated style / setTimeout is
    // ever created on TV — a small boot-time + memory win and one less
    // source of [Worklets] warnings under playback.
    if (Platform.isTV) {
        const noop = (..._args: unknown[]): void => {}
        return {
            doubleTapSide: "right" as const,
            doubleTapAmount: 0,
            // `any` matches both the underlying `AnimatedStyle<ViewStyle>`
            // and the union TS infers from the non-TV branch's
            // `useAnimatedStyle(...)` return. The renderer guard added
            // in the orchestrator (`doubleTap.doubleTapAmount > 0`)
            // means this field is never actually read on TV.
            doubleTapIndicatorStyle: undefined as any,
            showDoubleTapIndicator: noop,
        }
    }

    const [doubleTapSide, setDoubleTapSide] = React.useState<"left" | "right">("right")
    const [doubleTapAmount, setDoubleTapAmount] = React.useState(0)
    const doubleTapAmountRef = React.useRef(0)
    const doubleTapVisibleSideRef = React.useRef<"left" | "right" | null>(null)
    const doubleTapHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const doubleTapOpacity = useSharedValue(0)
    const doubleTapIndicatorStyle = useAnimatedStyle(() => ({ opacity: doubleTapOpacity.value }))

    const showDoubleTapIndicator = React.useCallback((side: "left" | "right", amount: number) => {
        const nextAmount = doubleTapVisibleSideRef.current === side
            ? doubleTapAmountRef.current + amount
            : amount

        doubleTapVisibleSideRef.current = side
        doubleTapAmountRef.current = nextAmount
        setDoubleTapSide(side)
        setDoubleTapAmount(nextAmount)

        if (doubleTapHideTimerRef.current) {
            clearTimeout(doubleTapHideTimerRef.current)
        }

        doubleTapOpacity.set(withSequence(
            withTiming(1, { duration: 80 }),
            withTiming(0, { duration: 600 }),
        ))
        doubleTapHideTimerRef.current = setTimeout(() => {
            doubleTapVisibleSideRef.current = null
            doubleTapAmountRef.current = 0
            setDoubleTapAmount(0)
            doubleTapHideTimerRef.current = null
        }, DOUBLE_TAP_INDICATOR_VISIBLE_MS)
    }, [doubleTapOpacity])

    React.useEffect(() => {
        return () => {
            if (doubleTapHideTimerRef.current) clearTimeout(doubleTapHideTimerRef.current)
        }
    }, [])

    return {
        doubleTapSide,
        doubleTapAmount,
        doubleTapIndicatorStyle,
        showDoubleTapIndicator,
    }
}
