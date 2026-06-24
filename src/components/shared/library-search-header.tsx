import { COLORS } from "@/constants/colors"
import * as React from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SharedValue } from "react-native-reanimated"
import { LibrarySearchBar, type LibrarySearchBarProps } from "./library-search-bar"

export const LIBRARY_SEARCH_HEADER_FADE_HEIGHT = 20
export const LIBRARY_SEARCH_HEADER_BASE_HEIGHT = 60

export interface LibrarySearchHeaderProps extends LibrarySearchBarProps {
    scrollY?: SharedValue<number>
    hasHero?: boolean
}

export function LibrarySearchHeader(props: LibrarySearchHeaderProps) {
    const { hasHero = false, ...searchProps } = props
    const insets = useSafeAreaInsets()

    const headerHeight = hasHero ? (insets.top + LIBRARY_SEARCH_HEADER_BASE_HEIGHT) : LIBRARY_SEARCH_HEADER_BASE_HEIGHT
    const paddingTop = hasHero ? (insets.top + 8) : 8

    return (
        <View
            style={{ height: headerHeight, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" }}
        >
            <View
                style={{ paddingTop, paddingBottom: 8 }}
                className="px-4 flex-row items-center justify-between"
            >
                <LibrarySearchBar {...searchProps} />
            </View>
        </View>
    )
}
