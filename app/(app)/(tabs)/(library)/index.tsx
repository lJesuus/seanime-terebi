import { AL_BaseAnime } from "@/api/generated/types"
import { animeEntryPlaybackIntentAtom, createAnimeEntryPlaybackIntent } from "@/atoms/anime-entry.atoms"
import { ContinueWatching } from "@/components/features/anime/continue-watching"
import { DownloadedAnimeList } from "@/components/features/anime/downloaded-anime-list"
import { HorizontalMediaCardList } from "@/components/features/media/horizontal-media-card-list"
import { LibraryHeroCarousel } from "@/components/features/media/library-hero-carousel"
import { TabFadeView } from "@/components/layout/tab-fade-view"
import { CenteredSpinner } from "@/components/shared/centered-spinner"
import { LuffyError } from "@/components/shared/luffy-error"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { ContinueWatchingItem, useAnimeLibraryCollection } from "@/hooks/use-anime-library-collection"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsTV } from "@/hooks/use-device"
import { useIsServerConnected } from "@/lib/offline"

import { useIsFocused } from "@react-navigation/native"
import { router, useFocusEffect } from "expo-router"
import { useSetAtom } from "jotai"
import * as React from "react"
import { RefreshControl, View } from "react-native"
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type LibraryShelfSection = {
    key: string
    title: string
    media: AL_BaseAnime[]
    sectionIndex: number
}

export default function LibraryScreen() {
    const isConnected = useIsServerConnected()
    const isTV = useIsTV()
    const isFocused = useIsFocused()
    const insets = useSafeAreaInsets()
    const [isPullRefreshing, setIsPullRefreshing] = React.useState(false)

    const scrollY = useSharedValue(0)
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => {
            "worklet"
            scrollY.value = e.contentOffset.y
        },
    })

    useIOSScrollRefreshRateWorkaround()

    const {
        libraryCollectionList,
        continueWatchingList,
        isLoading,
        refetch,
        hasNonLocalEpisodes,
    } = useAnimeLibraryCollection()
    const refetchRef = React.useRef(refetch)

    React.useEffect(() => {
        refetchRef.current = refetch
    }, [refetch])

    const shelfSections = React.useMemo<LibraryShelfSection[]>(() => {
        const buildMedia = (type: string) => (
            libraryCollectionList.find(item => item.type === type)?.entries?.map(entry => entry.media!).filter(Boolean) ?? []
        )

        return [
            { key: "current", title: "Currently watching", media: buildMedia("CURRENT"), sectionIndex: 0 },
            { key: "paused", title: "Paused", media: buildMedia("PAUSED"), sectionIndex: 1 },
            { key: "planning", title: "Planning", media: buildMedia("PLANNING"), sectionIndex: 2 },
            { key: "completed", title: "Completed", media: buildMedia("COMPLETED"), sectionIndex: 3 },
            { key: "dropped", title: "Dropped", media: buildMedia("DROPPED"), sectionIndex: 4 },
        ].filter(section => section.media.length > 0)
    }, [libraryCollectionList])

    useFocusEffect(
        React.useCallback(() => {
            if (!isConnected) return
            void refetchRef.current()
        }, [isConnected]),
    )

    const hasHero = isConnected && continueWatchingList.length > 0

    const handleRefresh = React.useCallback(() => {
        setIsPullRefreshing(true)
        void refetch().finally(() => {
            setIsPullRefreshing(false)
        })
    }, [refetch])

    const refreshControl = isConnected ? (
        <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handleRefresh}
            tintColor="rgba(255,255,255,0.45)"
            progressViewOffset={hasHero ? (insets.top + 60) : 60}
        />
    ) : undefined

    const setPlaybackIntent = useSetAtom(animeEntryPlaybackIntentAtom)

    const handleWatchPress = React.useCallback((item: ContinueWatchingItem) => {
        const episode = item.episode
        const mediaId = episode.baseAnime?.id
        if (!mediaId) return

        if (item.sourceView === "library" && episode.localFile?.path) {
            setPlaybackIntent(createAnimeEntryPlaybackIntent({
                kind: "play-local-episode",
                mediaId,
                episodeNumber: episode.episodeNumber,
            }))
        }

        router.push({
            pathname: "/(app)/entry/anime/[id]",
            params: {
                id: String(mediaId),
                initialView: item.sourceView,
            },
        })
    }, [setPlaybackIntent])

    const renderShelfSection = React.useCallback(({ item }: { item: LibraryShelfSection }) => (
        <HorizontalMediaCardList
            title={item.title}
            type="anime"
            sectionIndex={item.sectionIndex}
            media={item.media}
            hideLibraryBadge={item.key !== "current" || !hasNonLocalEpisodes}
        />
    ), [hasNonLocalEpisodes])

    if (isLoading && isConnected) {
        return (
            <View
                className="flex-1 bg-background justify-center items-center"
                style={{ paddingTop: insets.top }}
            >
                <CenteredSpinner />
            </View>
        )
    }

    return (
        <View
            className="flex-1 bg-background"
            style={{ paddingTop: isTV ? 0 : (hasHero ? 0 : insets.top) }}
        >
            <OfflineBanner />

            <TabFadeView>
                <View className="flex-1">
                    <Animated.FlatList
                        focusable={false}
                        key={isConnected ? "online" : "offline"}
                        data={isConnected ? shelfSections : []}
                        renderItem={renderShelfSection}
                        keyExtractor={(item) => item.key}
                        ListHeaderComponent={
                            <View className="flex flex-col gap-4">
                                {hasHero && (
                                    <LibraryHeroCarousel
                                        type="anime"
                                        animeItems={continueWatchingList}
                                        isFocused={isFocused}
                                        scrollY={scrollY}
                                        onWatchPress={handleWatchPress}
                                    />
                                )}
                                {isConnected && continueWatchingList.length > 0 && (
                                    <ContinueWatching items={continueWatchingList} />
                                )}
                            </View>
                        }
                        ListFooterComponent={<DownloadedAnimeList />}
                        ListEmptyComponent={isConnected && continueWatchingList.length === 0 ? (
                            <LuffyError
                                title="Your anime library is empty"
                                description="Add anime to your collection or use the Discover tab to find something to watch."
                            />
                        ) : null}
                        contentInsetAdjustmentBehavior="never"
                        contentContainerStyle={{
                            paddingTop: isTV ? 0 : (hasHero ? 0 : insets.top),
                            paddingBottom: 80,
                        }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={refreshControl}
                        initialNumToRender={2}
                        maxToRenderPerBatch={2}
                        updateCellsBatchingPeriod={16}
                        windowSize={5}
                        removeClippedSubviews={!isTV}
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                    />
                </View>
            </TabFadeView>
        </View>
    )
}
