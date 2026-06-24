import { Platform, useWindowDimensions } from "react-native"

export function useIsLandscape() {
    const { width, height } = useWindowDimensions()
    return width > height
}

export function useIsTV() {
    return Platform.isTV
}

/**
 * App ships only for tvOS + Android TV now, so the sidebar is always shown.
 * Hook is preserved for callers that previously branched on show-vs-hide.
 */
export function useShowSidebar() {
    return true
}
