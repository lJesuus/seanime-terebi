import { AL_BaseManga } from "@/api/generated/types"
import { __libraryShelvesFocusCountAtom } from "@/atoms/library.atoms"
import { DownloadedMangaList } from "@/components/features/manga/downloaded-manga-list"
import { HorizontalMediaCardList } from "@/components/features/media/horizontal-media-card-list"
import { LibraryHeroCarousel } from "@/components/features/media/library-hero-carousel"
import { TabFadeView } from "@/components/layout/tab-fade-view"
import { CenteredSpinner } from "@/components/shared/centered-spinner"
import { LuffyError } from "@/components/shared/luffy-error"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsTV } from "@/hooks/use-device"
import { useMangaLibraryCollection } from "@/hooks/use-manga-library-collection"
import { useIsServerConnected } from "@/lib/offline"

import { useIsFocused } from "@react-navigation/native"
import { router, useFocusEffect } from "expo-router"
import * as React from "react"
import { RefreshControl, View } from "react-native"
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type MangaShelfSection = {
    key: string
    title: string
    media: AL_BaseManga[]
    sectionIndex: number
}

export default function MangaLibraryScreen() {
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
        isLoading,
        refetch,
    } = useMangaLibraryCollection()
    const refetchRef = React.useRef(refetch)

    React.useEffect(() => {
        refetchRef.current = refetch
    }, [refetch])

    const currentlyReadingEntries = React.useMemo(() => {
        return libraryCollectionList.find(item => item.type === "CURRENT")?.entries ?? []
    }, [libraryCollectionList])

    const shelfSections = React.useMemo<MangaShelfSection[]>(() => {
        const buildMedia = (type: string) => (
            libraryCollectionList.find(item => item.type === type)?.entries?.map(entry => entry.media!).filter(Boolean) ?? []
        )

        return [
            { key: "current", title: "Currently reading", media: buildMedia("CURRENT"), sectionIndex: 0 },
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

    // Mirror of the reset in `(library)/index.tsx`:
    // `HorizontalMediaCardList` is also mounted outside the manga tab
    // (discover, profile, entry views), so the focus tracker can leave a
    // non-zero count behind when the user navigates away and returns.
    // Reset the counter every time this tab re-gains focus so the hero
    // carousel's `isLibraryShelvesFocused` signal starts from a clean
    // baseline.
    const setLibraryShelvesFocusCount = useSetAtom(__libraryShelvesFocusCountAtom)
    useFocusEffect(
        React.useCallback(() => {
            setLibraryShelvesFocusCount(0)
        }, [setLibraryShelvesFocusCount]),
    )

    const hasHero = isConnected && currentlyReadingEntries.length > 0

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

    const renderShelfSection = React.useCallback(({ item }: { item: MangaShelfSection }) => (
        <HorizontalMediaCardList
            title={item.title}
            type="manga"
            sectionIndex={item.sectionIndex}
            media={item.media}
            onMediaPress={(media) => router.push(`/(app)/entry/manga/${media.id}`)}
        />
    ), [])

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
            style={{ paddingTop: hasHero ? 0 : insets.top }}
        >
            <OfflineBanner />

            <TabFadeView>
                <View className="flex-1">
                    <Animated.FlatList
                        key={isConnected ? "online" : "offline"}
                        data={isConnected ? shelfSections : []}
                        renderItem={renderShelfSection}
                        keyExtractor={(item) => item.key}
                        ListHeaderComponent={
                            hasHero ? (
                                <LibraryHeroCarousel
                                    type="manga"
                                    mangaItems={currentlyReadingEntries}
                                    isFocused={isFocused}
                                    scrollY={scrollY}
                                />
                            ) : null
                        }
                        ListFooterComponent={<DownloadedMangaList />}
                        ListEmptyComponent={isConnected && currentlyReadingEntries.length === 0 ? (
                            <LuffyError
                                title="Your manga library is empty"
                                description="Add manga to your collection or use the Discover tab to find something to read."
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


