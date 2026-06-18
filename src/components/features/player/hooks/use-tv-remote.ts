import { useEffect, useRef } from "react"
import { Platform } from "react-native"

type TVRemoteAction =
    | "playPause"
    | "seekForward"
    | "seekBackward"
    | "fastForward"
    | "rewind"
    | "volumeUp"
    | "volumeDown"
    | "back"
    | "select"
    | "menu"
    | "dpadUp"
    | "dpadDown"
    | "dpadLeft"
    | "dpadRight"
    | "skipNext"
    | "skipPrevious"

interface UseTVRemoteParams {
    onAction: (action: TVRemoteAction) => void
    enabled?: boolean
}

const KEY_MAP: Record<string, TVRemoteAction> = {
    PlayPause: "playPause",
    Play: "playPause",
    Pause: "playPause",
    FastForward: "fastForward",
    Rewind: "rewind",
    SeekForward: "seekForward",
    SeekBackward: "seekBackward",
    ArrowRight: "dpadRight",
    ArrowLeft: "dpadLeft",
    ArrowUp: "dpadUp",
    ArrowDown: "dpadDown",
    Enter: "select",
    " ": "select",
    Backspace: "back",
    Escape: "back",
    VolumeUp: "volumeUp",
    VolumeDown: "volumeDown",
    MediaPlayPause: "playPause",
    MediaPlay: "playPause",
    MediaPause: "playPause",
    MediaFastForward: "fastForward",
    MediaRewind: "rewind",
    MediaTrackNext: "skipNext",
    MediaTrackPrevious: "skipPrevious",
    TVMenu: "menu",
    TVBack: "back",
    TVSelect: "select",
    TVUp: "dpadUp",
    TVDown: "dpadDown",
    TVLeft: "dpadLeft",
    TVRight: "dpadRight",
}

/**
 * Hook that listens to TV remote / keyboard events and maps them to player actions.
 *
 * On Android TV, the native TVEventHandler fires key events like:
 * - PlayPause, FastForward, Rewind, SeekForward, SeekBackward
 * - Arrow keys, Enter, Back, Menu
 *
 * On web/dev, standard keyboard keys are mapped (Space, Arrow keys, etc.)
 */
export function useTVRemote({ onAction, enabled = true }: UseTVRemoteParams) {
    const onActionRef = useRef(onAction)
    onActionRef.current = onAction

    useEffect(() => {
        if (!enabled || !Platform.isTV) return

        let subscription: { remove: () => void } | null = null

        try {
            const { TVEventHandler } = require("react-native")

            const handler = (event: { eventType: string }) => {
                const action = KEY_MAP[event.eventType]
                if (action) {
                    onActionRef.current(action)
                }
            }

            const tvEventEmitter = new TVEventHandler()
            tvEventEmitter.enable(handler)
            subscription = {
                remove: () => tvEventEmitter.disable(),
            }
        } catch {
            // TVEventHandler not available (not on TV platform)
        }

        return () => {
            subscription?.remove()
        }
    }, [enabled])
}

export type { TVRemoteAction }
