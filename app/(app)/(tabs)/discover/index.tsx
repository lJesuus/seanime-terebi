import { AL_BaseAnime, AL_BaseManga } from "@/api/generated/types"
import {
    DiscoverHeroCarouselBackdrop,
    DiscoverHeroCarouselInteractionLayer,
    HERO_HEIGHT,
    useDiscoverHeroCarouselController,
    useDiscoverHeroItems,
} from "@/components/features/discover/discover-hero-carousel"
import {
    getCurrentSeasonLabel,
    getPreviousSeasonLabel,
    useDiscoverCurrentSeasonAnime,
    useDiscoverMissedSequels,
    useDiscoverPastSeasonAnime,
    useDiscoverTrendingAnime,
    useDiscoverTrendingManga,
    useDiscoverTrendingMovies,
    useDiscoverUpcomingAnime,
} from "@/components/features/discover/discover-queries"
import { HorizontalMediaCardList } from "@/components/features/media/horizontal-media-card-list"
import { TabFadeView } from "@/components/layout/tab-fade-view"
import { MediaGenreSelector } from "@/components/shared/media-genre-selector"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { COLORS } from "@/constants/colors"
import { useDevScreenProfiler } from "@/hooks/use-dev-screen-profiler"
import { useIsTV } from "@/hooks/use-device"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsServerConnected } from "@/lib/offline"
import { SEARCH_MEDIA_GENRES } from "@/lib/search/search-constants"
import { cn } from "@/lib/utils"
import { TVFocusContext } from "@/contexts/tv-focus-context"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useIsFocused } from "@react-navigation/native"
import { router } from "expo-router"
import * as React from "react"
import { ActivityIndicator, Dimensions, Platform, Text, View, ViewToken } from "react-native"
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated"

type DiscoverMode = "anime" | "manga"

const { width: SCREEN_WIDTH } = Dimensions.get("screen")
const isTV = Platform.isTV
const DISCOVER_CARD_WIDTH = isTV ? SCREEN_WIDTH / 7 : (2 / 5) * SCREEN_WIDTH
const DISCOVER_CARD_ROW_HEIGHT = DISCOVER_CARD_WIDTH * 1.5 + (isTV ? 32 : 16)
const DISCOVER_SECTION_HEADER_HEIGHT = isTV ? 64 : 56
const DISCOVER_ANIME_SECTION_ITEMS = [
    { key: "trending" },
    { key: "current-season" },
    { key: "past-season" },
    { key: "upcoming" },
    { key: "movies" },
    { key: "missed" },
] as const
const DISCOVER_MANGA_SECTION_ITEMS = [
    { key: "jp" },
    { key: "kr" },
    { key: "cn" },
] as const

type DiscoverAnimeSectionItem = (typeof DISCOVER_ANIME_SECTION_ITEMS)[number]
type DiscoverMangaSectionItem = (typeof DISCOVER_MANGA_SECTION_ITEMS)[number]

export default function DiscoverScreen() {
    const isConnected = useIsServerConnected()
    const isFocused = useIsFocused()
    const [mode, setMode] = React.useState<DiscoverMode>("anime")
    const [selectedTrendingGenre, setSelectedTrendingGenre] = React.useState<string | null>(null)
    const scrollY = useSharedValue(0)

    useIOSScrollRefreshRateWorkaround()

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => {
            "worklet"
            scrollY.value = e.contentOffset.y
        },
    })
    const { media: heroMedia, isLoading: heroLoading } = useDiscoverHeroMedia(mode)
    const heroController = useDiscoverHeroCarouselController(heroMedia, isFocused)

    useDevScreenProfiler(`discover:${mode}`, heroMedia.length > 0 || !heroLoading)

    if (!isConnected) {
        return (
            <View className="flex-1 bg-background">
                <OfflineBanner />
                <TabFadeView>
                    <View className="flex-1 items-center justify-center px-8">
                        <Ionicons name="cloud-offline-outline" size={40} color="rgba(255,255,255,0.2)" />
                        <Text className="text-white/30 text-sm mt-3 text-center">
                            Connect to your server to discover content
                        </Text>
                    </View>
                </TabFadeView>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-background">
            <TabFadeView>
                {heroMedia.length > 0 && (
                    <DiscoverHeroCarouselBackdrop
                        media={heroMedia}
                        currentIndex={heroController.currentIndex}
                        screenWidth={heroController.screenWidth}
                        scrollX={heroController.scrollX}
                        scrollY={scrollY}
                    />
                )}

                {mode === "anime" ? (
                    <DiscoverAnimeSections
                        heroMedia={heroMedia}
                        heroLoading={heroLoading}
                        heroController={heroController}
                        scrollHandler={scrollHandler}
                        selectedTrendingGenre={selectedTrendingGenre}
                        onChangeTrendingGenre={setSelectedTrendingGenre}
                        onChangeMode={setMode}
                    />
                ) : (
                    <DiscoverMangaSections
                        heroMedia={heroMedia}
                        heroLoading={heroLoading}
                        heroController={heroController}
                        scrollHandler={scrollHandler}
                        onChangeMode={setMode}
                    />
                )}
            </TabFadeView>
        </View>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Mode toggle (anime/manga)
///////////////////////////////////////////////////////////////////////////////

export function DiscoverModeToggle({
    mode,
    onChangeMode,
}: {
    mode: DiscoverMode
    onChangeMode: (mode: DiscoverMode) => void
}) {
    const isTV = useIsTV()
    const { sidebarTag } = React.useContext(TVFocusContext)
    return (
        <View className={cn("flex-row rounded-xl", isTV ? "gap-3 p-1" : "mb-2")}>
            <TogglePill
                label="Anime"
                isActive={mode === "anime"}
                onPress={() => onChangeMode("anime")}
                nextFocusLeft={sidebarTag ?? undefined}
                hasTVPreferredFocus={isTV && mode === "anime"}
            />
            <TogglePill
                label="Manga"
                isActive={mode === "manga"}
                onPress={() => onChangeMode("manga")}
                hasTVPreferredFocus={isTV && mode === "manga"}
            />
        </View>
    )
}

function TogglePill({
    label,
    isActive,
    onPress,
    nextFocusLeft,
    nextFocusRight,
    hasTVPreferredFocus,
}: {
    label: string
    isActive: boolean
    onPress: () => void
    nextFocusLeft?: number
    nextFocusRight?: number
    hasTVPreferredFocus?: boolean
}) {
    return (
        <TvFocusablePressable
            onPress={onPress}
            android_ripple={{ color: "rgba(255,255,255,0.1)" }}
            className={cn(
                "rounded-xl",
                isTV ? "px-8 py-3" : "px-6 py-2",
                isActive ? "bg-white/15" : "bg-transparent",
            )}
            focusedClassName="border border-brand-400/60"
            {...(nextFocusLeft !== undefined ? { nextFocusLeft } : {})}
            {...(nextFocusRight !== undefined ? { nextFocusRight } : {})}
            {...(hasTVPreferredFocus !== undefined ? { hasTVPreferredFocus } : {})}
        >
            <Text
                className={cn(
                    "font-medium text-white/45",
                    isActive && "font-bold text-white",
                )}
                style={{ fontSize: isTV ? 18 : 14 }}
            >
                {label}
            </Text>
        </TvFocusablePressable>
    )
}

///////////////////////////////////////////////////////////////////////////////
// Hero data
///////////////////////////////////////////////////////////////////////////////

function useDiscoverHeroMedia(mode: DiscoverMode) {
    const { data: trendingAnime, isLoading: animeLoading } = useDiscoverTrendingAnime(mode === "anime")
    const { data: trendingMangaJP, isLoading: mangaLoading } = useDiscoverTrendingManga("JP", mode === "manga")
    const animeMedia = useDiscoverHeroItems(trendingAnime?.Page?.media?.filter(Boolean) ?? [])
    const mangaMedia = useDiscoverHeroItems(trendingMangaJP?.Page?.media?.filter(Boolean) ?? [])

    if (mode === "anime") {
        return { media: animeMedia, isLoading: animeLoading }
    }

    return { media: mangaMedia, isLoading: mangaLoading }
}

function HeroSkeleton() {
    return (
        <View
            style={{
                height: HERO_HEIGHT,
                backgroundColor: COLORS.surface,
                justifyContent: "flex-end",
                paddingHorizontal: 20,
                paddingBottom: 20,
            }}
        >
            <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
        </View>
    )
}

function useDiscoverSectionActivation(sectionCount: number) {
    const [highestActivatedIndex, setHighestActivatedIndex] = React.useState(() => isTV ? Math.min(sectionCount - 1, 3) : Math.min(sectionCount - 1, 1))
    const sectionCountRef = React.useRef(sectionCount)
    const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 15 }).current

    React.useEffect(() => {
        sectionCountRef.current = sectionCount
        if (!isTV) {
            setHighestActivatedIndex(Math.min(sectionCount - 1, 1))
        }
    }, [sectionCount])

    const onViewableItemsChanged = React.useRef(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
        let highestVisibleIndex = -1

        for (const item of viewableItems) {
            if (typeof item.index === "number" && item.index > highestVisibleIndex) {
                highestVisibleIndex = item.index
            }
        }

        if (highestVisibleIndex < 0) return

        setHighestActivatedIndex(prev => {
            const next = Math.min(sectionCountRef.current - 1, highestVisibleIndex + 1)
            return next > prev ? next : prev
        })
    }).current

    const isSectionActivated = React.useCallback(
        (index: number) => index <= highestActivatedIndex,
        [highestActivatedIndex],
    )

    return { isSectionActivated, onViewableItemsChanged, viewabilityConfig }
}

function DiscoverListHeader({
    mode,
    heroMedia,
    heroLoading,
    heroController,
    onChangeMode,
    onCarouselFocus,
}: {
    mode: DiscoverMode
    heroMedia: Array<AL_BaseAnime | AL_BaseManga>
    heroLoading: boolean
    heroController: ReturnType<typeof useDiscoverHeroCarouselController>
    onChangeMode: (mode: DiscoverMode) => void
    onCarouselFocus?: () => void
}) {
    const isTV = useIsTV()
    return (
        <>
            <View className={cn("flex-row items-center", isTV ? "px-6 pt-5 pb-2 gap-4" : "px-3.5 gap-2")}>
                <DiscoverModeToggle mode={mode} onChangeMode={onChangeMode} />
            </View>

            {heroMedia.length > 0 ? (
                <DiscoverHeroCarouselInteractionLayer media={heroMedia} type={mode} controller={heroController} onCarouselFocus={onCarouselFocus} />
            ) : heroLoading ? (
                <HeroSkeleton />
            ) : null}
        </>
    )
}

function DiscoverSectionSkeleton({ title }: { title: string }) {
    return (
        <View className="flex flex-col gap-4">
            <View
                className="flex-row items-center justify-between"
                style={{ height: DISCOVER_SECTION_HEADER_HEIGHT, paddingHorizontal: isTV ? 28 : 16 }}
            >
                <Skeleton className={cn("rounded-lg bg-white/10", isTV ? "h-8 w-56" : "h-6 w-40")} />
                <Skeleton className={cn("rounded-full bg-white/10", isTV ? "h-10 w-10" : "h-8 w-8")} />
            </View>

            <View style={{ height: DISCOVER_CARD_ROW_HEIGHT }}>
                <View className="flex-row" style={{ gap: isTV ? 16 : 10, paddingHorizontal: isTV ? 28 : 20 }}>
                    {Array.from({ length: isTV ? 5 : 3 }, (_, index) => (
                        <View key={`${title}-${index}`} style={{ width: DISCOVER_CARD_WIDTH }} className="gap-3">
                            <View style={{ width: DISCOVER_CARD_WIDTH, height: DISCOVER_CARD_WIDTH * 1.5 }}>
                                <Skeleton className="h-full w-full rounded-xl bg-white/10" />
                            </View>
                            <View style={{ width: DISCOVER_CARD_WIDTH * 0.82, height: isTV ? 16 : 12 }}>
                                <Skeleton className="h-full w-full rounded-full bg-white/10" />
                            </View>
                            <View style={{ width: DISCOVER_CARD_WIDTH * 0.56, height: isTV ? 14 : 12 }}>
                                <Skeleton className="h-full w-full rounded-full bg-white/10" />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    )
}

function DiscoverHorizontalSection({
    enabled,
    isLoading,
    title,
    type,
    media,
    onMediaPress,
    sectionIndex,
    showAudienceScore,
    hideCount,
    onCardFocus,
}: {
    enabled: boolean
    isLoading: boolean
    title: string
    type: DiscoverMode
    media: (AL_BaseAnime | AL_BaseManga)[]
    onMediaPress: (media: AL_BaseAnime | AL_BaseManga) => void
    sectionIndex: number
    showAudienceScore?: boolean
    hideCount?: boolean
    onCardFocus?: (sectionIndex: number) => void
}) {
    if (!enabled || isLoading) {
        return <DiscoverSectionSkeleton title={title} />
    }

    if (media.length === 0) {
        return null
    }

    return (
        <HorizontalMediaCardList
            title={title}
            type={type}
            sectionIndex={sectionIndex}
            media={media as never}
            onMediaPress={onMediaPress as never}
            showAudienceScore={showAudienceScore}
            hideCount={hideCount}
            onCardFocus={onCardFocus}
        />
    )
}

///////////////////////////////////////////////////////////////////////////////
// Snap offset hook
///////////////////////////////////////////////////////////////////////////////

const ESTIMATED_SECTION_HEIGHT = DISCOVER_SECTION_HEADER_HEIGHT + DISCOVER_CARD_ROW_HEIGHT
const ESTIMATED_HEADER_HEIGHT = HERO_HEIGHT + 60

function useDiscoverSnapOffsets(sectionCount: number) {
    const headerHeightRef = React.useRef(ESTIMATED_HEADER_HEIGHT)
    const sectionHeightsRef = React.useRef<number[]>(new Array(sectionCount).fill(ESTIMATED_SECTION_HEIGHT))
    const viewportHeightRef = React.useRef(0)
    const [snapOffsets, setSnapOffsets] = React.useState<number[]>([0])

    const getHeight = React.useCallback((index: number) => {
        const measured = sectionHeightsRef.current[index]
        return measured > 0 ? measured : ESTIMATED_SECTION_HEIGHT
    }, [])

    const recompute = React.useCallback(() => {
        const hh = headerHeightRef.current
        const vh = viewportHeightRef.current

        if (vh === 0 || hh === 0) return

        const offsets: number[] = [0]
        let accHeight = hh

        offsets.push(accHeight)

        for (let i = 1; i < sectionCount; i++) {
            accHeight += getHeight(i - 1)
            const centerOffset = accHeight - Math.max(0, (vh - getHeight(i)) / 2)
            offsets.push(Math.max(0, centerOffset))
        }

        let totalContentHeight = hh
        for (let i = 0; i < sectionCount; i++) {
            totalContentHeight += getHeight(i)
        }
        const maxOffset = Math.max(0, totalContentHeight - vh)
        if (offsets.length > 1) {
            offsets[offsets.length - 1] = Math.min(offsets[offsets.length - 1], maxOffset)
        }

        setSnapOffsets(offsets)
    }, [sectionCount, getHeight])

    const onHeaderLayout = React.useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
        const h = e.nativeEvent.layout.height
        if (h > 0 && h !== headerHeightRef.current) {
            headerHeightRef.current = h
            recompute()
        }
    }, [recompute])

    const onSectionLayout = React.useCallback((index: number) => (e: { nativeEvent: { layout: { height: number } } }) => {
        const h = e.nativeEvent.layout.height
        if (h > 0 && h !== sectionHeightsRef.current[index]) {
            const newHeights = [...sectionHeightsRef.current]
            newHeights[index] = h
            sectionHeightsRef.current = newHeights
            recompute()
        }
    }, [recompute])

    const onViewportLayout = React.useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
        const h = e.nativeEvent.layout.height
        if (h > 0 && h !== viewportHeightRef.current) {
            viewportHeightRef.current = h
            recompute()
        }
    }, [recompute])

    const snapOffsetsRef = React.useRef(snapOffsets)
    snapOffsetsRef.current = snapOffsets

    return { snapOffsets, onHeaderLayout, onSectionLayout, onViewportLayout, snapOffsetsRef }
}

///////////////////////////////////////////////////////////////////////////////
// Anime sections
///////////////////////////////////////////////////////////////////////////////

function DiscoverAnimeSections({
    heroMedia,
    heroLoading,
    heroController,
    scrollHandler,
    selectedTrendingGenre,
    onChangeTrendingGenre,
    onChangeMode,
}: {
    heroMedia: Array<AL_BaseAnime | AL_BaseManga>
    heroLoading: boolean
    heroController: ReturnType<typeof useDiscoverHeroCarouselController>
    scrollHandler: ReturnType<typeof useAnimatedScrollHandler>
    selectedTrendingGenre: string | null
    onChangeTrendingGenre: (genre: string | null) => void
    onChangeMode: (mode: DiscoverMode) => void
}) {
    const { isSectionActivated, onViewableItemsChanged, viewabilityConfig } = useDiscoverSectionActivation(DISCOVER_ANIME_SECTION_ITEMS.length)
    const trendingEnabled = isSectionActivated(0)
    const currentSeasonEnabled = isSectionActivated(1)
    const pastSeasonEnabled = isSectionActivated(2)
    const missedEnabled = isSectionActivated(3)
    const upcomingEnabled = isSectionActivated(4)
    const moviesEnabled = isSectionActivated(5)

    const { data: trending, isLoading: trendingLoading } = useDiscoverTrendingAnime(
        trendingEnabled,
        selectedTrendingGenre ? [selectedTrendingGenre] : undefined,
    )
    const { data: currentSeason, isLoading: currentSeasonLoading } = useDiscoverCurrentSeasonAnime(currentSeasonEnabled)
    const { data: pastSeason, isLoading: pastSeasonLoading } = useDiscoverPastSeasonAnime(pastSeasonEnabled)
    const { data: missedSequels, isLoading: missedLoading } = useDiscoverMissedSequels(missedEnabled)
    const { data: upcoming, isLoading: upcomingLoading } = useDiscoverUpcomingAnime(upcomingEnabled)
    const { data: movies, isLoading: moviesLoading } = useDiscoverTrendingMovies(moviesEnabled)

    const trendingMedia = trending?.Page?.media?.filter(Boolean) ?? []
    const currentSeasonMedia = currentSeason?.Page?.media?.filter(Boolean) ?? []
    const pastSeasonMedia = pastSeason?.Page?.media?.filter(Boolean) ?? []
    const missedMedia = missedSequels ?? []
    const upcomingMedia = upcoming?.Page?.media?.filter(Boolean) ?? []
    const moviesMedia = movies?.Page?.media?.filter(Boolean) ?? []
    const trendingGenreOptions = React.useMemo(
        () => [
            { label: "All", value: null },
            ...SEARCH_MEDIA_GENRES.map(genre => ({ label: genre, value: genre })),
        ],
        [],
    )
    const { snapOffsets, onHeaderLayout, onSectionLayout, onViewportLayout, snapOffsetsRef } = useDiscoverSnapOffsets(DISCOVER_ANIME_SECTION_ITEMS.length)
    const scrollRef = React.useRef<React.ElementRef<typeof Animated.FlatList<DiscoverAnimeSectionItem>>>(null)
    const lastFocusedSection = React.useRef<number | null>(null)
    const handleCarouselFocus = React.useCallback(() => {
        scrollRef.current?.scrollToOffset({ offset: 0, animated: true })
    }, [])
    const handleCardFocus = React.useCallback((sectionIndex: number) => {
        if (sectionIndex === DISCOVER_ANIME_SECTION_ITEMS.length - 1) return
        if (lastFocusedSection.current === sectionIndex) return
        lastFocusedSection.current = sectionIndex
        const offsets = snapOffsetsRef.current
        const target = offsets[sectionIndex + 1]
        if (target !== undefined) {
            scrollRef.current?.scrollToOffset({ offset: target, animated: true })
        }
    }, [])
    const listHeader = React.useMemo(() => (
        <View onLayout={onHeaderLayout}>
            <DiscoverListHeader
                mode="anime"
                heroMedia={heroMedia}
                heroLoading={heroLoading}
                heroController={heroController}
                onChangeMode={onChangeMode}
                onCarouselFocus={handleCarouselFocus}
            />
        </View>
    ), [heroController, heroLoading, heroMedia, onChangeMode, handleCarouselFocus, onHeaderLayout])
    const keyExtractor = React.useCallback((item: DiscoverAnimeSectionItem) => item.key, [])
    const renderSectionItem = React.useCallback(({ item, index }: { item: DiscoverAnimeSectionItem, index: number }) => {
            const content = (() => {
                switch (item.key) {
                    case "trending":
                        return (
                            <View>
                                <MediaGenreSelector
                                    options={trendingGenreOptions}
                                    value={selectedTrendingGenre}
                                    onChange={onChangeTrendingGenre}
                                />
                                <DiscoverHorizontalSection
                                    title="Trending Right Now"
                                    type="anime"
                                    enabled={trendingEnabled}
                                    isLoading={trendingLoading}
                                    sectionIndex={0}
                                    media={trendingMedia}
                                    onMediaPress={(m) => router.push(`/(app)/entry/anime/${m.id}`)}
                                    showAudienceScore
                                    hideCount
                                    onCardFocus={handleCardFocus}
                                />
                            </View>
                        )
                    case "current-season":
                        return (
                            <DiscoverHorizontalSection
                                title={`Top of ${getCurrentSeasonLabel()}`}
                                type="anime"
                                enabled={currentSeasonEnabled}
                                isLoading={currentSeasonLoading}
                                sectionIndex={1}
                                media={currentSeasonMedia}
                                onMediaPress={(m) => router.push(`/(app)/entry/anime/${m.id}`)}
                                showAudienceScore
                                hideCount
                                onCardFocus={handleCardFocus}
                            />
                        )
                    case "past-season":
                        return (
                            <DiscoverHorizontalSection
                                title={`Best of ${getPreviousSeasonLabel()}`}
                                type="anime"
                                enabled={pastSeasonEnabled}
                                isLoading={pastSeasonLoading}
                                sectionIndex={2}
                                media={pastSeasonMedia}
                                onMediaPress={(m) => router.push(`/(app)/entry/anime/${m.id}`)}
                                showAudienceScore
                                hideCount
                                onCardFocus={handleCardFocus}
                            />
                        )
                    case "upcoming":
                        return (
                            <DiscoverHorizontalSection
                                title="Coming Soon"
                                type="anime"
                                enabled={upcomingEnabled}
                                isLoading={upcomingLoading}
                                sectionIndex={3}
                                media={upcomingMedia}
                                onMediaPress={(m) => router.push(`/(app)/entry/anime/${m.id}`)}
                                showAudienceScore
                                hideCount
                                onCardFocus={handleCardFocus}
                            />
                        )
                    case "movies":
                        return (
                            <DiscoverHorizontalSection
                                title="Trending Movies"
                                type="anime"
                                enabled={moviesEnabled}
                                isLoading={moviesLoading}
                                sectionIndex={4}
                                media={moviesMedia}
                                onMediaPress={(m) => router.push(`/(app)/entry/anime/${m.id}`)}
                                showAudienceScore
                                hideCount
                                onCardFocus={handleCardFocus}
                            />
                        )
                    case "missed":
                        return (
                            <DiscoverHorizontalSection
                                title="You Might Have Missed"
                                type="anime"
                                enabled={missedEnabled}
                                isLoading={missedLoading}
                                sectionIndex={5}
                                media={missedMedia}
                                onMediaPress={(m) => router.push(`/(app)/entry/anime/${m.id}`)}
                                showAudienceScore
                                hideCount
                                onCardFocus={handleCardFocus}
                            />
                        )
                }
            })()
            return <View onLayout={onSectionLayout(index)}>{content}</View>
        },
        [currentSeasonEnabled, currentSeasonLoading, currentSeasonMedia, missedEnabled, missedLoading, missedMedia, moviesEnabled, moviesLoading,
            moviesMedia, onChangeTrendingGenre, pastSeasonEnabled, pastSeasonLoading, pastSeasonMedia, selectedTrendingGenre, trendingEnabled,
            trendingGenreOptions, trendingLoading, trendingMedia, upcomingEnabled, upcomingLoading, upcomingMedia, handleCardFocus, onSectionLayout])

    return (
        <Animated.FlatList
            ref={scrollRef}
            data={DISCOVER_ANIME_SECTION_ITEMS}
            keyExtractor={keyExtractor}
            renderItem={renderSectionItem}
            ListHeaderComponent={listHeader}
            onScroll={scrollHandler}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={16}
            windowSize={5}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: isTV ? 0 : 100 }}
            onLayout={onViewportLayout}
            snapToOffsets={snapOffsets.length > 1 ? snapOffsets : undefined}
            snapToAlignment="start"
            decelerationRate="fast"
        />
    )
}

///////////////////////////////////////////////////////////////////////////////
// Manga sections
///////////////////////////////////////////////////////////////////////////////

function DiscoverMangaSections({
    heroMedia,
    heroLoading,
    heroController,
    scrollHandler,
    onChangeMode,
}: {
    heroMedia: Array<AL_BaseAnime | AL_BaseManga>
    heroLoading: boolean
    heroController: ReturnType<typeof useDiscoverHeroCarouselController>
    scrollHandler: ReturnType<typeof useAnimatedScrollHandler>
    onChangeMode: (mode: DiscoverMode) => void
}) {
    const { isSectionActivated, onViewableItemsChanged, viewabilityConfig } = useDiscoverSectionActivation(DISCOVER_MANGA_SECTION_ITEMS.length)
    const jpEnabled = isSectionActivated(0)
    const krEnabled = isSectionActivated(1)
    const cnEnabled = isSectionActivated(2)

    const { data: mangaJP, isLoading: mangaJPLoading } = useDiscoverTrendingManga("JP", jpEnabled)
    const { data: manhwaKR, isLoading: manhwaKRLoading } = useDiscoverTrendingManga("KR", krEnabled)
    const { data: manhuaCN, isLoading: manhuaCNLoading } = useDiscoverTrendingManga("CN", cnEnabled)

    const jpMedia = mangaJP?.Page?.media?.filter(Boolean) ?? []
    const krMedia = manhwaKR?.Page?.media?.filter(Boolean) ?? []
    const cnMedia = manhuaCN?.Page?.media?.filter(Boolean) ?? []
    const { snapOffsets, onHeaderLayout, onSectionLayout, onViewportLayout, snapOffsetsRef } = useDiscoverSnapOffsets(DISCOVER_MANGA_SECTION_ITEMS.length)
    const scrollRef = React.useRef<React.ElementRef<typeof Animated.FlatList<DiscoverMangaSectionItem>>>(null)
    const lastFocusedSection = React.useRef<number | null>(null)
    const handleCarouselFocus = React.useCallback(() => {
        scrollRef.current?.scrollToOffset({ offset: 0, animated: true })
    }, [])
    const handleCardFocus = React.useCallback((sectionIndex: number) => {
        if (sectionIndex === DISCOVER_MANGA_SECTION_ITEMS.length - 1) return
        if (lastFocusedSection.current === sectionIndex) return
        lastFocusedSection.current = sectionIndex
        const offsets = snapOffsetsRef.current
        const target = offsets[sectionIndex + 1]
        if (target !== undefined) {
            scrollRef.current?.scrollToOffset({ offset: target, animated: true })
        }
    }, [])
    const listHeader = React.useMemo(() => (
        <View onLayout={onHeaderLayout}>
            <DiscoverListHeader
                mode="manga"
                heroMedia={heroMedia}
                heroLoading={heroLoading}
                heroController={heroController}
                onChangeMode={onChangeMode}
                onCarouselFocus={handleCarouselFocus}
            />
        </View>
    ), [heroController, heroLoading, heroMedia, onChangeMode, handleCarouselFocus, onHeaderLayout])
    const keyExtractor = React.useCallback((item: DiscoverMangaSectionItem) => item.key, [])
    const renderSectionItem = React.useCallback(({ item, index }: { item: DiscoverMangaSectionItem, index: number }) => {
        const content = (() => {
            switch (item.key) {
                case "jp":
                    return (
                        <DiscoverHorizontalSection
                            title="Trending Manga"
                            type="manga"
                            enabled={jpEnabled}
                            isLoading={mangaJPLoading}
                            sectionIndex={0}
                            media={jpMedia}
                            onMediaPress={(m) => router.push(`/(app)/entry/manga/${m.id}`)}
                            onCardFocus={handleCardFocus}
                        />
                    )
                case "kr":
                    return (
                        <DiscoverHorizontalSection
                            title="Trending Manhwa"
                            type="manga"
                            enabled={krEnabled}
                            isLoading={manhwaKRLoading}
                            sectionIndex={1}
                            media={krMedia}
                            onMediaPress={(m) => router.push(`/(app)/entry/manga/${m.id}`)}
                            onCardFocus={handleCardFocus}
                        />
                    )
                case "cn":
                    return (
                        <DiscoverHorizontalSection
                            title="Trending Manhua"
                            type="manga"
                            enabled={cnEnabled}
                            isLoading={manhuaCNLoading}
                            sectionIndex={2}
                            media={cnMedia}
                            onMediaPress={(m) => router.push(`/(app)/entry/manga/${m.id}`)}
                            onCardFocus={handleCardFocus}
                        />
                    )
            }
        })()
        return <View onLayout={onSectionLayout(index)}>{content}</View>
    }, [cnEnabled, cnMedia, jpEnabled, jpMedia, krEnabled, krMedia, manhuaCNLoading, manhwaKRLoading, handleCardFocus, onSectionLayout])

    return (
        <Animated.FlatList
            ref={scrollRef}
            data={DISCOVER_MANGA_SECTION_ITEMS}
            keyExtractor={keyExtractor}
            renderItem={renderSectionItem}
            ListHeaderComponent={listHeader}
            onScroll={scrollHandler}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={16}
            windowSize={5}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: isTV ? 0 : 100 }}
            onLayout={onViewportLayout}
            snapToOffsets={snapOffsets.length > 1 ? snapOffsets : undefined}
            snapToAlignment="start"
            decelerationRate="fast"
        />
    )
}
