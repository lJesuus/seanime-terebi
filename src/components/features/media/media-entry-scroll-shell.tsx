import { Anime_Entry, Manga_Entry } from "@/api/generated/types"
import { AnimeEntryInfoView } from "@/components/features/media/anime-entry-info-view"
import { AnimeEntryView, AnimeEntryViewSwitcher } from "@/components/features/media/anime-entry-view-switcher"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import * as React from "react"
import { RefreshControlProps, ScrollView, StyleProp, View, ViewStyle } from "react-native"
import Animated, { SharedValue, useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated"
import { MediaEntryHeaderBackground, MediaEntryHeaderContent } from "./media-entry-header"

type MediaEntryScrollShellProps = {
    entry: Anime_Entry | Manga_Entry
    type: "anime" | "manga"
    children: React.ReactNode
    refreshControl?: React.ReactElement<RefreshControlProps>
    contentContainerStyle?: StyleProp<ViewStyle>
    scrollY?: SharedValue<number>
    showHeaderBackground?: boolean
    onTitlePress?: () => void
    currentView?: AnimeEntryView
    onViewChange?: (view: AnimeEntryView) => void
    isOffline?: boolean
    hiddenViews?: Set<AnimeEntryView>
    nextFocusDown?: number | null
    mediaId?: number
    fallbackDescription?: string
}

export function MediaEntryScrollShell({
    entry,
    type,
    children,
    refreshControl,
    contentContainerStyle,
    scrollY: sharedScrollY,
    showHeaderBackground = true,
    onTitlePress,
    currentView,
    onViewChange,
    isOffline,
    hiddenViews,
    nextFocusDown,
    mediaId,
    fallbackDescription,
}: MediaEntryScrollShellProps) {
    const localScrollY = useSharedValue(0)
    const scrollY = sharedScrollY ?? localScrollY
    const scrollViewRef = React.useRef<ScrollView>(null)

    useIOSScrollRefreshRateWorkaround()

    const onScroll = useAnimatedScrollHandler({
        onScroll: event => {
            scrollY.value = event.contentOffset.y
        },
    })

    const handleTitlePress = React.useCallback(() => {
        if (onTitlePress) {
            onTitlePress()
        } else {
            scrollViewRef.current?.scrollToEnd({ animated: true })
        }
    }, [onTitlePress])

    return (
        <View className={showHeaderBackground ? "flex-1 bg-background" : "flex-1 bg-transparent"}>

            {showHeaderBackground ? <MediaEntryHeaderBackground entry={entry} scrollY={scrollY} /> : null}

            <Animated.ScrollView
                ref={scrollViewRef as any}
                contentInsetAdjustmentBehavior="never"
                refreshControl={refreshControl}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={onScroll}
                contentContainerStyle={[{ paddingBottom: 110 }, contentContainerStyle]}
            >
                <MediaEntryHeaderContent entry={entry} type={type} onTitlePress={handleTitlePress} nextFocusDown={nextFocusDown} />

                {currentView && onViewChange && (
                    <AnimeEntryViewSwitcher
                        currentView={currentView}
                        onViewChange={onViewChange}
                        isOffline={isOffline}
                        hiddenViews={hiddenViews}
                    />
                )}

                <View style={{ width: "100%", alignSelf: "stretch" }}>
                    {children}
                </View>

                {!!mediaId && (
                    <View className="pt-6 pb-8">
                        <AnimeEntryInfoView mediaId={mediaId} fallbackDescription={fallbackDescription} />
                    </View>
                )}
            </Animated.ScrollView>
        </View>
    )
}
