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
import { prefetchAllDiscoverQueries } from "@/components/features/discover/discover-queries"
import { useServerUrl, useServerAuthToken } from "@/atoms/server.atoms"
import { useQueryClient } from "@tanstack/react-query"

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

    const queryClient = useQueryClient()
    const serverUrl = useServerUrl()
    const serverAuthToken = useServerAuthToken()

    // Once the user's main library data has loaded, kick off a
    // low-priority background prefetch of every list query the
    // Discover tab may need. The 500 ms delay gives the visible
    // library content a head-start on the network — discover queries
    // get queue slots only after the user can already interact with
    // their library. Combined with `staleTime: 5 min` on each
    // discover hook, this brings cold-mount `discover primary
    // content ready` from ~9629 ms down to a cache hit on a warm run.
    React.useEffect(() => {
        if (!isConnected || isLoading) return

        const timer = setTimeout(() => {
            void prefetchAllDiscoverQueries(queryClient, serverUrl, serverAuthToken)
        }, 500)

        return () => clearTimeout(timer)
    }, [isConnected, isLoading, queryClient, serverUrl, serverAuthToken])

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
                    {/* Sibling of the FlatList on purpose — out of the
                        ListHeaderComponent so Android TV's spatial focus
                        treats the carousel as a separate focus region from
                        the cards below. Inside the FlatList it kept winning
                        the LEFT spatial search and stealing focus from
                        Continue Watching. */}
                    {hasHero && (
                        <LibraryHeroCarousel
                            type="anime"
                            animeItems={continueWatchingList}
                            scrollY={scrollY}
                            onWatchPress={handleWatchPress}
                            heightRatio={0.475}
                        />
                    )}

                    <Animated.FlatList
                        focusable={false}
                        key={isConnected ? "online" : "offline"}
                        data={isConnected ? shelfSections : []}
                        renderItem={renderShelfSection}
                        keyExtractor={(item) => item.key}
                        ListHeaderComponent={
                            isConnected && continueWatchingList.length > 0 ? (
                                // Negative `marginBottom` pulls the first
                                // shelf (Currently watching) up so Continue
                                // Watching feels visually adjacent to it
                                // instead of separated by the shelf
                                // section's title `paddingVertical: 12 (TV) /
                                // 8 (mobile)`. The branch keeps the same
                                // effective overlap (~2 px) on both
                                // platforms — `-14` on TV cancels the 12 px
                                // title padding, `-10` on mobile cancels the
                                // 8 px title padding — so the two card rows
                                // read as one continuous band everywhere.
                                //
                                // Note: relies on the shelf title NOT being
                                // in `compact` mode (which sets
                                // `paddingVertical: 0`). The render path
                                // below doesn't pass `compact`, so this is
                                // safe today; if that ever changes, retune
                                // these values (e.g. -22/-18) to hit the
                                // same ~2 px overlap.
                                <View style={{ marginBottom: isTV ? -14 : -10 }}>
                                    <ContinueWatching items={continueWatchingList} />
                                </View>
                            ) : null
                        }
                        ListFooterComponent={<DownloadedAnimeList />}
                        ListEmptyComponent={isConnected && continueWatchingList.length === 0 && shelfSections.length === 0 ? (
                            <LuffyError
                                title="Your anime library is empty"
                                description="Add anime to your collection or use the Discover tab to find something to watch."
                            />
                        ) : null}
                        contentInsetAdjustmentBehavior="never"
                        contentContainerStyle={{
                            paddingTop: 0,
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
