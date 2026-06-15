import { Platform, useWindowDimensions } from "react-native"

export function useIsLandscape() {
    const { width, height } = useWindowDimensions()
    return width > height
}

export function useIsTV() {
    return Platform.isTV
}

export function useShowSidebar() {
    const isLandscape = useIsLandscape()
    const isTV = Platform.isTV
    return isTV || isLandscape
}
