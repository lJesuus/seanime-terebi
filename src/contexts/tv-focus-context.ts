import React from "react"

type TVFocusContextValue = {
    sidebarTag: number | null
    setSidebarTag: (t: number | null) => void
    contentWrapperTag: number | null
    setContentWrapperTag: (t: number | null) => void
}

export const TVFocusContext = React.createContext<TVFocusContextValue>({
    sidebarTag: null,
    setSidebarTag: () => {},
    contentWrapperTag: null,
    setContentWrapperTag: () => {},
})
