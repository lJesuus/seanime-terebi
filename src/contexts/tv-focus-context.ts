import React from "react"

type TVFocusContextValue = {
    sidebarTag: number | null
    setSidebarTag: (t: number | null) => void
    contentWrapperTag: number | null
    setContentWrapperTag: (t: number | null) => void
    /** Native tag of the current tab button in the sidebar.
     *  TabFadeView sets nextFocusLeft to this tag so LEFT from
     *  any content view jumps straight to the sidebar. */
    currentTabButtonTag: number | null
    setCurrentTabButtonTag: (t: number | null) => void
}

export const TVFocusContext = React.createContext<TVFocusContextValue>({
    sidebarTag: null,
    setSidebarTag: () => {},
    contentWrapperTag: null,
    setContentWrapperTag: () => {},
    currentTabButtonTag: null,
    setCurrentTabButtonTag: () => {},
})
