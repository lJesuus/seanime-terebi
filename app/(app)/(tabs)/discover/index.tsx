import { AL_BaseAnime, AL_BaseManga } from "@/api/generated/types"

import {
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
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { COLORS } from "@/constants/colors"
import { useDevScreenProfiler } from "@/hooks/use-dev-screen-profiler"
import { useIsTV } from "@/hooks/use-device"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsServerConnected } from "@/lib/offline"
import { cn } from "@/lib/utils"
import { TVFocusContext } from "@/contexts/tv-focus-context"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useIsFocused } from "@react-navigation/native"
import { router } from "expo-router"

import * as React from "react"
import { ActivityIndicator, Dimensions, Platform, Text, View, ViewToken } from "react-native"
import Animated from "react-native-reanimated"

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

    // When the user navigates DOWN from the mode toggle pills, the pill
    // loses focus (onBlur) and the hero is hidden BEFORE the FlatList
    // children receive focus, so Android TV spatial search can't route
    // LEFT from a card into the carousel. When focus returns to the
    // pills (onFocus / UP), the hero reappears.
    const [isHeroVisible, setIsHeroVisible] = React.useState(true)
    const headerFocusRetainedRef = React.useRef(true)
    const handleHeaderFocus = React.useCallback(() => {
        headerFocusRetainedRef.current = true
        setIsHeroVisible(true)
    }, [])
    const handleHeaderBlur = React.useCallback(() => {
        headerFocusRetainedRef.current = false
        // Defer hiding the hero by one frame. If another pill or
        // carousel item regains focus in the same frame, the flag
        // flips back and the hero stays visible. Only when focus
        // truly leaves the header (DOWN to FlatList) does it hide.
        requestAnimationFrame(() => {
            if (!headerFocusRetainedRef.current) {
                setIsHeroVisible(false)
            }
        })
    }, [])

    useIOSScrollRefreshRateWorkaround()

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
                <View className="flex-1">
                    <DiscoverListHeader
                        mode={mode}
                        heroMedia={heroMedia}
                        heroLoading={heroLoading}
                        heroController={heroController}
                        onChangeMode={setMode}
                        isHeroVisible={isHeroVisible}
                        onHeaderFocus={handleHeaderFocus}
                        onHeaderBlur={handleHeaderBlur}
                    />

                    {mode === "anime" ? (
                        <DiscoverAnimeSections />
                    ) : (
                        <DiscoverMangaSections />
                    )}
                </View>
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
    onPillFocus,
    onPillBlur,
}: {
    mode: DiscoverMode
    onChangeMode: (mode: DiscoverMode) => void
    /** Fires when either pill receives focus, so the parent can restore
     * the hero carousel. */
    onPillFocus?: () => void
    /** Fires when either pill loses focus, so the parent can hide the
     * hero carousel before focus reaches the FlatList. */
    onPillBlur?: () => void
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
                onFocus={onPillFocus}
                onBlur={onPillBlur}
            />
            <TogglePill
                label="Manga"
                isActive={mode === "manga"}
                onPress={() => onChangeMode("manga")}
                onFocus={onPillFocus}
                onBlur={onPillBlur}
            />
        </View>
    )
}

function TogglePill({
    label,
    isActive,
    onPress,
    onFocus,
    onBlur,
    nextFocusLeft,
    nextFocusRight,
}: {
    label: string
    isActive: boolean
    onPress: () => void
    onFocus?: () => void
    /** Fires via TvFocusablePressable.onBlur when the pill loses focus
     * (e.g. DPAD-DOWN into the FlatList section cards). */
    onBlur?: () => void
    nextFocusLeft?: number
    nextFocusRight?: number
}) {
    return (
        <TvFocusablePressable
            hasTVPreferredFocus={isActive}
            onPress={onPress}
            onFocus={onFocus}
            onBlur={onBlur}
            android_ripple={{ color: "rgba(255,255,255,0.1)" }}
            className={cn(
                "rounded-xl",
                isTV ? "px-8 py-3" : "px-6 py-2",
                isActive ? "bg-white/15" : "bg-transparent",
            )}
            focusedClassName="border border-white/60"
            {...(nextFocusLeft !== undefined ? { nextFocusLeft } : {})}
            {...(nextFocusRight !== undefined ? { nextFocusRight } : {})}
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
    isHeroVisible,
    onHeaderFocus,
    onHeaderBlur,
}: {
    mode: DiscoverMode
    heroMedia: Array<AL_BaseAnime | AL_BaseManga>
    heroLoading: boolean
    heroController: ReturnType<typeof useDiscoverHeroCarouselController>
    onChangeMode: (mode: DiscoverMode) => void
    /** When false the hero carousel is hidden so Android TV spatial
     * search can't route LEFT from section cards into the carousel.
     * The mode toggle pills remain visible for UP navigation. */
    isHeroVisible?: boolean
    /** Fires when a pill or carousel item receives focus. */
    onHeaderFocus?: () => void
    /** Fires when focus leaves the header (DOWN to FlatList). */
    onHeaderBlur?: () => void
}) {
    const isTV = useIsTV()
    const [isCarouselFocused, setIsCarouselFocused] = React.useState(false)

    // Separate callbacks for the carousel so we can track its
    // focus state independently and light up the wrapper border.
    const handleCarouselFocus = React.useCallback(() => {
        setIsCarouselFocused(true)
        onHeaderFocus?.()
    }, [onHeaderFocus])
    const handleCarouselBlur = React.useCallback(() => {
        setIsCarouselFocused(false)
        onHeaderBlur?.()
    }, [onHeaderBlur])
    return (
        <>
            <View className={cn(
                "flex-row justify-center items-center",
                isTV ? "px-6 pt-5 gap-4" : "px-3.5 pt-2 gap-2",
                // Pad the pills away from the section content below.
                // When the hero is hidden (focus on cards) the section
                // header slides up — a small bottom padding keeps the
                // pills from overlapping the "Trending Right Now" title.
                isHeroVisible === false ? (isTV ? "pb-12" : "pb-6") : "pb-3",
            )}>
                <DiscoverModeToggle
                    mode={mode}
                    onChangeMode={onChangeMode}
                    onPillFocus={onHeaderFocus}
                    onPillBlur={onHeaderBlur}
                />
            </View>

            {isHeroVisible !== false && heroMedia.length > 0 ? (
                    <View className={cn("mx-4", isTV && "mx-8")}>
                        <View
                            className={cn(
                                "rounded-3xl border overflow-hidden",
                                isCarouselFocused ? "border-white/60" : "border-white/10",
                            )}
                            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                            <DiscoverHeroCarouselInteractionLayer
                                media={heroMedia}
                                type={mode}
                                controller={heroController}
                                onFocus={handleCarouselFocus}
                                onBlur={handleCarouselBlur}
                            />
                        </View>
                    </View>
                ) : isHeroVisible !== false && heroLoading ? (
                    <View className={cn("mx-4", isTV && "mx-8")}>
                        <View className="rounded-3xl border border-white/10 overflow-hidden">
                            <HeroSkeleton />
                        </View>
                    </View>
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
    showAudienceScore,
    hideCount,
    sectionIndex,
    onCardFocus,
}: {
    enabled: boolean
    isLoading: boolean
    title: string
    type: DiscoverMode
    media: (AL_BaseAnime | AL_BaseManga)[]
    onMediaPress: (media: AL_BaseAnime | AL_BaseManga) => void
    showAudienceScore?: boolean
    hideCount?: boolean
    sectionIndex?: number
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
            media={media as never}
            onMediaPress={onMediaPress as never}
            showAudienceScore={showAudienceScore}
            hideCount={hideCount}
            sectionIndex={sectionIndex}
            onCardFocus={onCardFocus}
        />
    )
}

///////////////////////////////////////////////////////////////////////////////
// Anime sections
///////////////////////////////////////////////////////////////////////////////

function DiscoverAnimeSections() {
    const { isSectionActivated, onViewableItemsChanged, viewabilityConfig } = useDiscoverSectionActivation(DISCOVER_ANIME_SECTION_ITEMS.length)
    const trendingEnabled = isSectionActivated(0)
    const currentSeasonEnabled = isSectionActivated(1)
    const pastSeasonEnabled = isSectionActivated(2)
    const missedEnabled = isSectionActivated(5)
    const upcomingEnabled = isSectionActivated(3)
    const moviesEnabled = isSectionActivated(4)

    const { data: trending, isLoading: trendingLoading } = useDiscoverTrendingAnime(trendingEnabled)
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

    const scrollRef = React.useRef<React.ElementRef<typeof Animated.FlatList<DiscoverAnimeSectionItem>>>(null)
    const lastFocusedSection = React.useRef<number | null>(null)
    const viewportHeightRef = React.useRef(0)
    const ESTIMATED_SECTION = DISCOVER_SECTION_HEADER_HEIGHT + DISCOVER_CARD_ROW_HEIGHT

    const handleCardFocus = React.useCallback((sectionIndex: number) => {
        if (lastFocusedSection.current === sectionIndex) return
        lastFocusedSection.current = sectionIndex
        const vh = viewportHeightRef.current || 0
        if (vh === 0) return

        if (sectionIndex === 0) {
            // Section 0 starts at the top of the FlatList so
            // centering math yields 0. Explicitly scroll to the
            // top (non-animated) to counteract any native
            // auto-scroll from Android TV spatial navigation.
            scrollRef.current?.scrollToOffset({ offset: 0, animated: false })
            return
        }

        const estimatedTop = sectionIndex * ESTIMATED_SECTION
        const centeredOffset = Math.max(0, estimatedTop - vh / 2 + ESTIMATED_SECTION / 2)
        scrollRef.current?.scrollToOffset({ offset: centeredOffset, animated: true })
    }, [])

    const keyExtractor = React.useCallback((item: DiscoverAnimeSectionItem) => item.key, [])
    const renderSectionItem = React.useCallback(({ item }: { item: DiscoverAnimeSectionItem }) => {
            const content = (() => {
                switch (item.key) {
                    case "trending":
                        return (
                            <DiscoverHorizontalSection
                                title="Trending Right Now"
                                type="anime"
                                enabled={trendingEnabled}
                                isLoading={trendingLoading}
                                sectionIndex={0}
                                media={trendingMedia}
                                onMediaPress={(m) => router.push(`/(app)/entry/anime/${m.id}`)}
                                onCardFocus={handleCardFocus}
                                showAudienceScore
                                hideCount
                            />
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
                                onCardFocus={handleCardFocus}
                                showAudienceScore
                                hideCount
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
                                onCardFocus={handleCardFocus}
                                showAudienceScore
                                hideCount
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
                                onCardFocus={handleCardFocus}
                                showAudienceScore
                                hideCount
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
                                onCardFocus={handleCardFocus}
                                showAudienceScore
                                hideCount
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
                                onCardFocus={handleCardFocus}
                                showAudienceScore
                                hideCount
                            />
                        )
                }
            })()
            return content
        }, [currentSeasonEnabled, currentSeasonLoading, currentSeasonMedia, missedEnabled, missedLoading, missedMedia,
            moviesEnabled, moviesLoading, moviesMedia, pastSeasonEnabled, pastSeasonLoading, pastSeasonMedia,
            trendingEnabled, trendingLoading, trendingMedia, upcomingEnabled, upcomingLoading, upcomingMedia,
            handleCardFocus])

    return (
        <Animated.FlatList
            style={{ flex: 1 }}
            focusable={false}
            ref={scrollRef}
            data={DISCOVER_ANIME_SECTION_ITEMS}
            keyExtractor={keyExtractor}
            renderItem={renderSectionItem}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={16}
            windowSize={5}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: isTV ? 0 : 100 }}
            onLayout={(e) => { viewportHeightRef.current = e.nativeEvent.layout.height }}
        />
    )
}

///////////////////////////////////////////////////////////////////////////////
// Manga sections
///////////////////////////////////////////////////////////////////////////////

function DiscoverMangaSections() {
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

    const scrollRef = React.useRef<React.ElementRef<typeof Animated.FlatList<DiscoverMangaSectionItem>>>(null)
    const lastFocusedSection = React.useRef<number | null>(null)
    const viewportHeightRef = React.useRef(0)
    const ESTIMATED_SECTION = DISCOVER_SECTION_HEADER_HEIGHT + DISCOVER_CARD_ROW_HEIGHT

    const handleCardFocus = React.useCallback((sectionIndex: number) => {
        if (lastFocusedSection.current === sectionIndex) return
        lastFocusedSection.current = sectionIndex
        const vh = viewportHeightRef.current || 0
        if (vh === 0) return

        if (sectionIndex === 0) {
            scrollRef.current?.scrollToOffset({ offset: 0, animated: false })
            return
        }

        const estimatedTop = sectionIndex * ESTIMATED_SECTION
        const centeredOffset = Math.max(0, estimatedTop - vh / 2 + ESTIMATED_SECTION / 2)
        scrollRef.current?.scrollToOffset({ offset: centeredOffset, animated: true })
    }, [])
    const keyExtractor = React.useCallback((item: DiscoverMangaSectionItem) => item.key, [])
    const renderSectionItem = React.useCallback(({ item }: { item: DiscoverMangaSectionItem }) => {
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
    }, [cnEnabled, cnMedia, jpEnabled, jpMedia, krEnabled, krMedia, manhuaCNLoading, manhwaKRLoading, handleCardFocus])

    return (
        <Animated.FlatList
            style={{ flex: 1 }}
            focusable={false}
            ref={scrollRef}
            data={DISCOVER_MANGA_SECTION_ITEMS}
            keyExtractor={keyExtractor}
            renderItem={renderSectionItem}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={16}
            windowSize={5}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: isTV ? 0 : 100 }}
            onLayout={(e) => { viewportHeightRef.current = e.nativeEvent.layout.height }}
        />
    )
}
