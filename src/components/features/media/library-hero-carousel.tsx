import { Manga_Entry } from "@/api/generated/types"
import { __focusedContinueWatchingEpisodeAtom, __libraryShelvesFocusedAtom } from "@/atoms/library.atoms"
import { SeaImage } from "@/components/shared/sea-image"
import { COLORS } from "@/constants/colors"
import { ContinueWatchingItem } from "@/hooks/use-anime-library-collection"
import { useShowSidebar } from "@/hooks/use-device"
import { LinearGradient } from "expo-linear-gradient"
import { useAtomValue } from "jotai"
import * as React from "react"
import { Text, useWindowDimensions, View } from "react-native"
import Animated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated"

const AUTO_ROTATE_INTERVAL = 20000
const MAX_ITEMS = 12

const HERO_BACKGROUND = COLORS.background
const HERO_BACKDROP = COLORS.mediaHeaderBackdrop
const HERO_GRADIENT_TRANSPARENT = "rgba(17,17,17,0)"
const HERO_GRADIENT_SOFT = "rgba(17,17,17,0.4)"
const HERO_GRADIENT_HEAVY = "rgba(17,17,17,0.9)"
const ABSOLUTE_FILL_STYLE = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const

const HERO_VISUAL_LAYER_STYLE = { ...ABSOLUTE_FILL_STYLE, backgroundColor: HERO_BACKDROP } as const
const HERO_TOP_GRADIENT_COLORS = ["rgba(0,0,0,0.85)", "rgba(0,0,0,0.35)", "transparent"] as const
const HERO_TOP_GRADIENT_LOCATIONS = [0, 0.5, 1] as const
const HERO_BOTTOM_GRADIENT_COLORS = [HERO_GRADIENT_TRANSPARENT, HERO_GRADIENT_SOFT, HERO_GRADIENT_HEAVY, HERO_BACKGROUND] as const
const HERO_BOTTOM_GRADIENT_LOCATIONS = [0, 0.32, 0.72, 1] as const
const HERO_BACKDROP_OVERLAY_STYLE = { ...ABSOLUTE_FILL_STYLE, backgroundColor: "rgba(0,0,0,0.2)" } as const
const HERO_IMAGE_MOUNT_DELAY_MS = 160
const HERO_BACKDROP_IMAGE_WINDOW = 3
const HERO_FADE_DISTANCE = 300

type UnifiedHeroItem = {
    id: number
    title: string
    bannerImage: string
    coverImage: string
    genres: string[]
    // Anime fields
    episodeNumber?: number
    animeRawItem?: ContinueWatchingItem
    // Manga fields
    progress?: number
    mangaRawItem?: Manga_Entry
}

export type LibraryHeroCarouselProps = {
    type: "anime" | "manga"
    animeItems?: ContinueWatchingItem[]
    mangaItems?: Manga_Entry[]
    scrollY: SharedValue<number>
    onWatchPress?: (item: ContinueWatchingItem) => void
    /**
     * Vertical share of the screen consumed by the hero banner. Defaults
     * to 0.6 (60 % of the screen) for the manga tab — a tall billboard
     * with an action button at the bottom-left. Set lower (e.g. 0.35 in
     * the anime library page) when the hero must coexist with the
     * Continue Watching row + first shelf in the initial viewport.
     */
    heightRatio?: number
}

export function LibraryHeroCarousel({
    type,
    animeItems = [],
    mangaItems = [],
    scrollY,
    onWatchPress,
    heightRatio = 0.6,
}: LibraryHeroCarouselProps) {
    const { height: screenHeight, width: screenWidth } = useWindowDimensions()
    const showSidebar = useShowSidebar()
    const carouselWidth = showSidebar ? screenWidth - 80 : screenWidth

    // True iff any focusable element in the library shelves (Continue
    // Watching, Downloads, horizontal shelves) currently has TV focus.
    // Suppresses the carousel pseudo-active highlight when the user has
    // navigated onto a media card below the carousel.
    const isLibraryShelvesFocused = useAtomValue(__libraryShelvesFocusedAtom)
    const focusedCWItem = useAtomValue(__focusedContinueWatchingEpisodeAtom)
    const heroHeight = Math.round(screenHeight * heightRatio)

    const items = React.useMemo<UnifiedHeroItem[]>(() => {
        if (type === "anime") {
            return animeItems
                .filter((item) => !!item.episode.baseAnime?.bannerImage)
                .slice(0, MAX_ITEMS)
                .map((item) => {
                    const media = item.episode.baseAnime
                    return {
                        id: media?.id ?? 0,
                        title: media?.title?.userPreferred || media?.title?.english || media?.title?.romaji || "Unknown Anime",
                        bannerImage: media?.bannerImage ?? "",
                        coverImage: media?.coverImage?.extraLarge ?? "",
                        genres: media?.genres?.slice(0, 3) ?? [],
                        episodeNumber: item.episode.episodeNumber,
                        animeRawItem: item,
                    }
                })
                .filter(item => item.id > 0)
        } else {
            return mangaItems
                .filter((entry) => !!entry.media?.bannerImage)
                .slice(0, MAX_ITEMS)
                .map((entry) => {
                    const media = entry.media
                    return {
                        id: entry.mediaId,
                        title: media?.title?.userPreferred || media?.title?.english || media?.title?.romaji || "Unknown Manga",
                        bannerImage: media?.bannerImage ?? "",
                        coverImage: media?.coverImage?.extraLarge ?? "",
                        genres: media?.genres?.slice(0, 3) ?? [],
                        progress: entry.listData?.progress,
                        mangaRawItem: entry,
                    }
                })
                .filter(item => item.id > 0)
        }
    }, [type, animeItems, mangaItems])

    const [currentIndex, setCurrentIndex] = React.useState(0)

    // When a Continue Watching card is focused on TV, show that anime's
    // info in the hero banner.
    React.useEffect(() => {
        if (!isLibraryShelvesFocused || !focusedCWItem) return

        const matchIndex = items.findIndex(item =>
            item.id === focusedCWItem.mediaId &&
            item.episodeNumber === focusedCWItem.episodeNumber,
        )

        if (matchIndex >= 0 && matchIndex !== currentIndex) {
            setCurrentIndex(matchIndex)
        }
    }, [isLibraryShelvesFocused, focusedCWItem, items, currentIndex])

    if (items.length === 0) return null

    const currentItem = items[currentIndex] ?? items[0]

    return (
        <View style={{ height: heroHeight }} className="relative bg-background">
            <LibraryHeroBackdrop
                items={items}
                currentIndex={currentIndex}
                screenWidth={carouselWidth}
                scrollY={scrollY}
            />

            {currentItem && (
                <LibraryHeroSlide
                    item={currentItem}
                    heroHeight={heroHeight}
                    scrollY={scrollY}
                />
            )}
        </View>
    )
}

function LibraryHeroSlide({
    item,
    heroHeight,
    scrollY,
}: {
    item: UnifiedHeroItem
    heroHeight: number
    scrollY: SharedValue<number>
}) {
    const genresStyle = useAnimatedStyle(() => ({
        opacity: scrollY.value > 1 ? 0 : 1,
    }))

    return (
        <View
            style={{ height: heroHeight }}
            className="relative flex justify-end"
        >
            <Animated.View
                pointerEvents="box-none"
                style={genresStyle}
                className="flex flex-col gap-2.5 justify-end px-8 pb-8"
            >
                <Text
                    numberOfLines={2}
                    style={{ fontSize: 40 }}
                    className="text-white font-extrabold tracking-tight leading-9"
                >
                    {item.title}
                </Text>

                <View className="flex-row items-center gap-1.5 flex-wrap">
                    {item.genres.map((genre, idx) => (
                        <React.Fragment key={genre}>
                            {idx > 0 && (
                                <Text className="font-bold text-sm text-white/20"> • </Text>
                            )}
                            <Text className="font-semibold tracking-wider uppercase text-sm text-white/55">
                                {genre}
                            </Text>
                        </React.Fragment>
                    ))}
                </View>
            </Animated.View>
        </View>
    )
}


function LibraryHeroBackdrop({
    items,
    currentIndex,
    screenWidth,
    scrollY,
}: {
    items: UnifiedHeroItem[]
    currentIndex: number
    screenWidth: number
    scrollY: SharedValue<number>
}) {
    const { height: screenHeight } = useWindowDimensions()
    const heroHeight = Math.round(screenHeight * 0.85)
    const [shouldRenderImages, setShouldRenderImages] = React.useState(false)
    const itemsKey = React.useMemo(() => items.map(item => String(item.id)).join(":"), [items])

    React.useEffect(() => {
        if (items.length === 0) {
            setShouldRenderImages(false)
            return
        }

        setShouldRenderImages(false)
        const timeoutId = setTimeout(() => {
            setShouldRenderImages(true)
        }, HERO_IMAGE_MOUNT_DELAY_MS)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [items.length, itemsKey])

    const backgroundStyle = useAnimatedStyle(() => {
        const y = scrollY.value
        const scale = y < 0 ? 1 + Math.abs(y) / (heroHeight * 2) : 1
        const offset = Math.min(Math.max(y, 0), HERO_FADE_DISTANCE)

        return {
            opacity: interpolate(offset, [0, HERO_FADE_DISTANCE], [1, 0.25], Extrapolation.CLAMP),
            transform: [{ scale }],
        }
    })

    return (
        <View
            pointerEvents="none"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: heroHeight,
                overflow: "hidden",
                backgroundColor: HERO_BACKGROUND,
            }}
        >
            <Animated.View style={[HERO_VISUAL_LAYER_STYLE, backgroundStyle]}>
                {shouldRenderImages && (
                    <View style={ABSOLUTE_FILL_STYLE}>
                        {items.map((item, index) => {
                            if (Math.abs(index - currentIndex) > HERO_BACKDROP_IMAGE_WINDOW) {
                                return null
                            }

                            return (
                                <LibraryHeroBackdropImage
                                    key={item.id}
                                    item={item}
                                    screenWidth={screenWidth}
                                    isActive={index === currentIndex}
                                />
                            )
                        })}
                    </View>
                )}

                <View pointerEvents="none" style={HERO_BACKDROP_OVERLAY_STYLE} />

                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 120,
                    }}
                >
                    <LinearGradient
                        colors={HERO_TOP_GRADIENT_COLORS}
                        locations={HERO_TOP_GRADIENT_LOCATIONS}
                        style={{ flex: 1 }}
                    />
                </View>
            </Animated.View>

            <LinearGradient
                pointerEvents="none"
                colors={HERO_BOTTOM_GRADIENT_COLORS}
                locations={HERO_BOTTOM_GRADIENT_LOCATIONS}
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: heroHeight * 0.75,
                }}
            />
        </View>
    )
}

function LibraryHeroBackdropImage({
    item,
    screenWidth,
    isActive,
}: {
    item: UnifiedHeroItem
    screenWidth: number
    isActive: boolean
}) {
    const uri = item.bannerImage || item.coverImage || ""
    const translationX = useSharedValue(0)

    React.useEffect(() => {
        const PAN_LIMIT = screenWidth * 0.08
        if (isActive) {
            translationX.value = withRepeat(
                withSequence(
                    withTiming(-PAN_LIMIT, { duration: AUTO_ROTATE_INTERVAL }),
                    withTiming(PAN_LIMIT, { duration: AUTO_ROTATE_INTERVAL }),
                ),
                -1,
                true,
            )
        } else {
            translationX.value = withTiming(PAN_LIMIT, { duration: 400 })
        }
    }, [isActive, translationX, screenWidth])

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: isActive ? 1 : 0,
        transform: [{ translateX: translationX.value }],
    }))

    return (
        <Animated.View style={[ABSOLUTE_FILL_STYLE, animatedStyle]}>
            <SeaImage
                source={{ uri }}
                contentFit="cover"
                cachePolicy="disk"
                priority="low"
                allowDownscaling
                transition={0}
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: screenWidth * 1.25,
                    left: -(screenWidth * 0.25) / 2,
                }}
            />
        </Animated.View>
    )
}
