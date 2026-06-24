import { __libraryShelvesFocusCountAtom } from "@/atoms/library.atoms"
import { useSetAtom } from "jotai"
import * as React from "react"

/**
 * Returns a stable pair of focus / blur handlers that increment /
 * decrement the library shelves focus counter atom. Mount focusable list
 * items (Continue Watching cards, Downloaded cards, horizontal media card
 * shelves) should wire these handlers so the hero carousel can tell when
 * the user has navigated focus onto a media card.
 *
 * Includes an unmount safety net: if the component is unmounted while its
 * element held focus, the counter is decremented here so the value stays
 * in sync even if React Native's `onBlur` didn't fire before unmount.
 */
export function useLibraryShelvesFocus(): {
    onFocus: () => void
    onBlur: () => void
} {
    const setCount = useSetAtom(__libraryShelvesFocusCountAtom)
    const focusedRef = React.useRef<boolean>(false)

    const onFocus = React.useCallback(() => {
        if (focusedRef.current) return
        focusedRef.current = true
        setCount((c) => c + 1)
    }, [setCount])

    const onBlur = React.useCallback(() => {
        if (!focusedRef.current) return
        focusedRef.current = false
        setCount((c) => Math.max(0, c - 1))
    }, [setCount])

    React.useEffect(() => {
        return () => {
            if (focusedRef.current) {
                focusedRef.current = false
                setCount((c) => Math.max(0, c - 1))
            }
        }
    }, [setCount])

    return { onFocus, onBlur }
}
