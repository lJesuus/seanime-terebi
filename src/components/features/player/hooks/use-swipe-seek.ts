import React from "react"
import { Platform } from "react-native"

export function useSwipeSeek() {
    // TV has no touch — swipe-to-seek is dead code, and the swipe-seek
    // overlay never renders on TV (the orchestrator's
    // `swipeSeek.swipeSeeking && <SwipeSeekOverlay>` guard handles that
    // naturally once this hook returns null). Returning shape-compatible
    // stub refs also keeps the orchestrator untouched.
    if (Platform.isTV) {
        const noop = (..._args: unknown[]): void => {}
        return {
            swipeSeeking: null,
            swipeStartTimeRef: { current: 0 },
            swipeActivatedRef: { current: false },
            swipeStartXRef: { current: 0 },
            swipeSeekingRef: { current: null },
            panGestureModeRef: { current: null as "seek" | "side-adjust" | null },
            scheduleSwipeSeekingUpdate: noop,
        }
    }

    const [swipeSeeking, setSwipeSeeking] = React.useState<{ startTime: number; currentTime: number } | null>(null)
    const swipeStartTimeRef = React.useRef(0)
    const swipeActivatedRef = React.useRef(false)
    const swipeStartXRef = React.useRef(0)
    const swipeSeekingRef = React.useRef<{ startTime: number; currentTime: number } | null>(null)
    const pendingSwipeSeekingRef = React.useRef<{ startTime: number; currentTime: number } | null>(null)
    const swipeSeekingFrameRef = React.useRef<number | null>(null)
    const panGestureModeRef = React.useRef<"seek" | "side-adjust" | null>(null)

    const scheduleSwipeSeekingUpdate = React.useCallback((value: { startTime: number; currentTime: number } | null) => {
        pendingSwipeSeekingRef.current = value
        if (value === null) {
            if (swipeSeekingFrameRef.current !== null) {
                cancelAnimationFrame(swipeSeekingFrameRef.current)
                swipeSeekingFrameRef.current = null
            }
            setSwipeSeeking(null)
            return
        }

        if (swipeSeekingFrameRef.current !== null) return

        swipeSeekingFrameRef.current = requestAnimationFrame(() => {
            swipeSeekingFrameRef.current = null
            const nextValue = pendingSwipeSeekingRef.current
            setSwipeSeeking(current => {
                if (current === null && nextValue === null) return current
                if (current && nextValue
                    && current.startTime === nextValue.startTime
                    && current.currentTime === nextValue.currentTime) {
                    return current
                }
                return nextValue
            })
        })
    }, [])

    // cleanup
    React.useEffect(() => {
        return () => {
            if (swipeSeekingFrameRef.current !== null) cancelAnimationFrame(swipeSeekingFrameRef.current)
        }
    }, [])

    return {
        swipeSeeking,
        swipeStartTimeRef,
        swipeActivatedRef,
        swipeStartXRef,
        swipeSeekingRef,
        panGestureModeRef,
        scheduleSwipeSeekingUpdate,
    }
}
