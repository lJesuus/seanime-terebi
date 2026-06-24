import { logger } from "@/lib/utils/logger"
import * as React from "react"

const log = logger("screen-profiler")

function getNow() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now()
    }

    return Date.now()
}

export function useDevScreenProfiler(label: string, primaryContentReady: boolean = true) {
    const mountTimeRef = React.useRef(0)
    const didLogReadyRef = React.useRef(false)

    React.useEffect(() => {
        if (!__DEV__) return

        const start = getNow()
        mountTimeRef.current = start
        didLogReadyRef.current = false

        // Defer to the next frame instead of using the deprecated
        // `InteractionManager.runAfterInteractions`. The semantics are
        // close enough for a dev-only metric and the log now fires
        // after the next paint commit (typically the same window as
        // "interactions settled" on most devices).

        const rafId = requestAnimationFrame(() => {
            log.info(`${label} interactions settled in ${Math.round(getNow() - start)}ms`)
        })

        return () => {
            cancelAnimationFrame(rafId)
        }
    }, [label])

    React.useEffect(() => {
        if (!__DEV__ || !primaryContentReady || didLogReadyRef.current || mountTimeRef.current === 0) return

        didLogReadyRef.current = true
        log.info(`${label} primary content ready in ${Math.round(getNow() - mountTimeRef.current)}ms`)
    }, [label, primaryContentReady])
}