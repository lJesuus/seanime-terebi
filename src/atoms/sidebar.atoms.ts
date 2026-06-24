import { atom } from "jotai"

/**
 * Synchronous TV focus signal for the sidebar — true iff at least one
 * sidebar button is currently focused.  SidebarShell mirrors its local
 * `focusedIndex` state into this atom via a `useEffect`, so the value
 * lags only by one render and carries no grace window.
 *
 * Use this from elsewhere (e.g. the hero carousel) when you need crisp
 * focus truth.  Also consumed by the BackHandler to decide whether to
 * show the exit toast.
 */
export const __sidebar_focusedAtom = atom(false)
