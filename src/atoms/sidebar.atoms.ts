import { atom } from "jotai"

/**
 * Visual expansion state of the sidebar (drives width/opacity animation).
 * True while any sidebar button has TV focus, plus a short grace window
 * (~100 ms) before closing. Consumers wanting a sync focus signal should
 * use `__sidebar_focusedAtom` instead.
 */
export const __sidebar_menuOpenAtom = atom(false)

/**
 * Synchronous TV focus signal for the sidebar — true iff at least one
 * sidebar button is currently focused. `SidebarShell` mirrors its local
 * `focusedIndex` state into this atom via a `useEffect`, so the value lags
 * only by one render and carries no grace window. Use this from elsewhere
 * (e.g. the hero carousel) when you need crisp focus truth without the 100ms
 * grace window that `__sidebar_menuOpenAtom` carries for the visual expansion.
 */
export const __sidebar_focusedAtom = atom(false)
