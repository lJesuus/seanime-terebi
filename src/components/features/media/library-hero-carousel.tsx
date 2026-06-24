import { Manga_Entry } from "@/api/generated/types"
import { __libraryShelvesFocusedAtom } from "@/atoms/library.atoms"
import { __sidebar_focusedAtom } from "@/atoms/sidebar.atoms"
import { SeaImage } from "@/components/shared/sea-image"
import { COLORS } from "@/constants/colors"
import { ContinueWatchingItem } from "@/hooks/use-anime-library-collection"
import { useShowSidebar } from "@/hooks/use-device"
import Ionicons from "@expo/vector-icons/Ionicons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useAtomValue } from "jotai"
import * as React from "react"
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native"
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    SharedValue,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated"

const AUTO_ROTATE_INTERVAL = 20000
const MAX_ITEMS = 12

/**
 * The slide at this zero-indexed position renders its action button without
 * the "active" highlight so it stays visually calm (interpreted as the 5th
 * hero card in user-facing count). The carousel still scrolls to and focuses
 * its button, only its styling is suppressed.
 */
const INACTIVE_SLIDE_INDEX = 4
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
    isFocused: boolean
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
    isFocused,
    scrollY,
    onWatchPress,
    heightRatio = 0.6,
}: LibraryHeroCarouselProps) {
    const { height: screenHeight, width: screenWidth } = useWindowDimensions()
    const showSidebar = useShowSidebar()
    const carouselWidth = showSidebar ? screenWidth - 80 : screenWidth

    // Synchronous "is sidebar focused" signal — true iff any sidebar button
    // currently has TV focus. Updated by `SidebarShell` directly so it does
    // not lag behind the 100ms grace window used by the visual expansion atom.
    const isSidebarFocused = useAtomValue(__sidebar_focusedAtom)
    // True iff any focusable element in the library shelves (Continue
    // Watching, Downloads, horizontal shelves) currently has TV focus.
    // Suppresses the carousel pseudo-active highlight when the user has
    // navigated onto a media card below the carousel.
    const isLibraryShelvesFocused = useAtomValue(__libraryShelvesFocusedAtom)
    const heroHeight = Math.round(screenHeight * heightRatio)
    const titleFontSize = 40

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
    // useAnimatedRef (not React.useRef) so reanimated 3.x doesn't
    // complain when this ref is captured by useAnimatedScrollHandler
    // and we later mutate `scrollRef.current` from a JS callback
    // (scrollToIndex, setInterval). Same ref also passed to the
    // Animated.ScrollView below, which is fine.
    const scrollRef = useAnimatedRef<ScrollView>()
    const scrollX = useSharedValue(0)
    const isInteracting = React.useRef(false)

    const itemsKey = React.useMemo(() => items.map(item => String(item.id)).join(":"), [items])

    const scrollToIndex = React.useCallback(
        (index: number, animated = true) => {
            if (items.length === 0) return
            const safeIndex = Math.max(0, Math.min(index, items.length - 1))
            scrollRef.current?.scrollTo({ x: safeIndex * carouselWidth, animated })
            if (!animated) {
                scrollX.set(safeIndex * carouselWidth)
            }
            setCurrentIndex(safeIndex)
        },
        [items.length, carouselWidth, scrollX],
    )

    React.useEffect(() => {
        if (items.length === 0) {
            scrollX.set(0)
            setCurrentIndex(0)
            return
        }
        scrollToIndex(0, false)
    }, [itemsKey, items.length, scrollToIndex, scrollX])

    React.useEffect(() => {
        // Pause auto-rotation whenever focus leaves the carousel's
        // visual area. Without this, a 20 s tick while the user is on
        // the sidebar still advances `currentIndex`, which migrates
        // `hasTVPreferredFocus` to a new slide and re-triggers RN TV's
        // preferred-focus re-evaluation — yanking focus from the sidebar
        // back into the carousel.
        if (!isFocused || isSidebarFocused || isLibraryShelvesFocused || items.length <= 1) return

        const interval = setInterval(() => {
            if (isInteracting.current) return
            scrollToIndex((currentIndex + 1) % items.length)
        }, AUTO_ROTATE_INTERVAL)

        return () => clearInterval(interval)
    }, [currentIndex, isFocused, isSidebarFocused, isLibraryShelvesFocused, items.length, scrollToIndex])

    React.useEffect(() => {
        if (!isFocused) {
            isInteracting.current = false
        }
    }, [isFocused])

    const handleDotPress = React.useCallback(
        (index: number) => {
            if (index === currentIndex) return
            scrollToIndex(index)
        },
        [currentIndex, scrollToIndex],
    )

    const handleScrollBeginDrag = React.useCallback(() => {
        isInteracting.current = true
    }, [])

    const handleScrollEnd = React.useCallback(
        (event: any) => {
            if (items.length === 0) return
            const offsetX = event.nativeEvent?.contentOffset?.x ?? event.contentOffset?.x ?? 0
            const nextIndex = Math.round(offsetX / carouselWidth)

            scrollX.set(offsetX)
            const clamped = Math.max(0, Math.min(nextIndex, items.length - 1))
            setCurrentIndex(clamped)
            isInteracting.current = false
        },
        [items.length, carouselWidth, scrollX],
    )

    const syncIndex = React.useCallback((nextIndex: number) => {
        setCurrentIndex(nextIndex)
    }, [])

    const handleHorizontalScroll = useAnimatedScrollHandler({
        onScroll: event => {
            scrollX.value = event.contentOffset.x

            const nextIndex = Math.round(event.contentOffset.x / Math.max(carouselWidth, 1))
            const clamped = Math.max(0, Math.min(nextIndex, items.length - 1))
            runOnJS(syncIndex)(clamped)
        },
        onBeginDrag: () => {
            runOnJS(handleScrollBeginDrag)()
        },
        onEndDrag: (event: any) => {
            runOnJS(handleScrollEnd)(event)
        },
        onMomentumEnd: (event: any) => {
            runOnJS(handleScrollEnd)(event)
        },
    })

    const handleActionPress = React.useCallback(
        (item: UnifiedHeroItem) => {
            if (type === "anime" && item.animeRawItem && onWatchPress) {
                onWatchPress(item.animeRawItem)
            } else if (type === "manga") {
                router.push(`/(app)/entry/manga/${item.id}`)
            }
        },
        [type, onWatchPress],
    )

    const handleSlideFocus = React.useCallback((index: number) => {
        if (index === currentIndex) return
        setTimeout(() => {
            scrollRef.current?.scrollTo({ x: index * carouselWidth, animated: false })
            setCurrentIndex(index)
        }, 0)
    }, [carouselWidth, currentIndex])

    if (items.length === 0) return null

    return (
        <View style={{ height: heroHeight }} className="relative bg-background">
            <LibraryHeroBackdrop
                items={items}
                currentIndex={currentIndex}
                screenWidth={carouselWidth}
                scrollX={scrollX}
                scrollY={scrollY}
                heroHeight={heroHeight}
            />

            <Animated.ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                directionalLockEnabled
                // Disable native scroll on TV. When `scrollEnabled` is true,
                // the OS-level focus engine on Apple TV / Android TV
                // intercepts DPAD LEFT / RIGHT to pan the viewport —
                // swallowing the events before React Native can evaluate
                // the focusable's `nextFocusLeft` chain, so DPAD LEFT from
                // the action button never reaches the sidebar. It also
                // re-evaluates preferred focus when the ScrollView scrolls
                // (auto-rotate, jump-to-index, momentum), yanking focus
                // away from the sidebar mid-flight. On TV we drive slide
                // changes via focus jumps + the existing `scrollTo` refs,
                // so a passive ScrollView is sufficient.
                scrollEnabled={items.length > 1}
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                focusable={false}
                onScroll={handleHorizontalScroll}
                onScrollBeginDrag={handleHorizontalScroll}
                onScrollEndDrag={handleHorizontalScroll}
                onMomentumScrollEnd={handleHorizontalScroll}
                style={ABSOLUTE_FILL_STYLE}
            >
                {items.map((item, idx) => (
                    <LibraryHeroSlide
                        key={`${item.id}-${idx}`}
                        item={item}
                        index={idx}
                        scrollX={scrollX}
                        screenWidth={carouselWidth}
                        type={type}
                        onActionPress={handleActionPress}
                        heroHeight={heroHeight}
                        titleFontSize={titleFontSize}
                        currentIndex={currentIndex}
                        onSlideFocus={handleSlideFocus}
                        isTabFocused={isFocused}
                        isSidebarFocused={isSidebarFocused}
                        isLibraryShelvesFocused={isLibraryShelvesFocused}
                    />
                ))}
            </Animated.ScrollView>

            {items.length > 1 && (
                <View
                    className="absolute flex-row items-center justify-center bottom-8 left-0 right-0 gap-2"
                    pointerEvents="none"
                >
                    {items.map((_, idx) => (
                        <HeroDot
                            key={idx}
                            index={idx}
                            isActive={idx === currentIndex}
                            onPress={() => handleDotPress(idx)}
                        />
                    ))}
                </View>
            )}
        </View>
    )
}

function HeroDot({ isActive, onPress: _onPress }: { index: number, isActive: boolean, onPress: () => void }) {
    return (
        <View
            className={`rounded-full transition-all duration-300 ${
                isActive
                    ? "w-8 bg-white"
                    : "w-3 bg-white/35"
            }`}
            style={{ height: 5 }}
        />
    )
}

function LibraryHeroSlide({
    item,
    index,
    scrollX,
    screenWidth,
    type,
    onActionPress,
    heroHeight,
    titleFontSize,
    currentIndex,
    onSlideFocus,
    isTabFocused,
    isSidebarFocused,
    isLibraryShelvesFocused,
}: {
    item: UnifiedHeroItem
    index: number
    scrollX: SharedValue<number>
    screenWidth: number
    type: "anime" | "manga"
    onActionPress: (item: UnifiedHeroItem) => void
    heroHeight: number
    titleFontSize: number
    currentIndex: number
    onSlideFocus?: (index: number) => void
    /**
     * True when the library tab currently holds TV focus. Mirrored from
     * the parent carousel's `isFocused` prop so each slide can keep the
     * "active" highlight while the user is on the tab even when native
     * focus has not yet landed on the current slide's button (e.g.
     * between DPAD presses, during auto-rotation, after a swipe).
     */
    isTabFocused: boolean
    isSidebarFocused: boolean
    isLibraryShelvesFocused: boolean
}) {
    const [btnFocused, setBtnFocused] = React.useState(false)
    // Active style = "highlighted" (white bg + brand border) treatment.
    // The pill stays pressable in all cases — only the visual styling
    // changes.
    //
    // Highlights when:
    //   * the slide's own button has direct focus (`btnFocused`), OR
    //   * the library tab is focused and this slide is the currently
    //     displayed one (`index === currentIndex && isTabFocused`). This
    //     covers auto-rotation, swipe paging, dot presses, and inter-slide
    //     navigation even when native TV focus has not yet shifted onto
    //     the new slide's button.
    //
    // Suppressed when:
    //   * the sidebar holds TV focus,
    //   * any library shelves card holds TV focus (Continue Watching,
    //     Downloads, horizontal shelves),
    //   * the slide sits at the by-design inactive index.
    const showActiveStyle = (btnFocused || (index === currentIndex && isTabFocused))
        && index !== INACTIVE_SLIDE_INDEX
        && !isSidebarFocused
        && !isLibraryShelvesFocused
    const btnScale = useSharedValue(1)
    React.useEffect(() => {
        btnScale.set(withTiming(btnFocused ? 1.08 : 1, { duration: 150 }))
    }, [btnFocused, btnScale])
    const btnAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }))

    const buttonLabel = type === "anime"
        ? `Watch Episode ${item.episodeNumber}`
        : item.progress && item.progress > 0
            ? `Read Ch. ${item.progress + 1}`
            : "Start Reading"

    const iconName = type === "anime" ? "play" : "book"

    const animatedContentStyle = useAnimatedStyle(() => {
        const pageOffset = scrollX.value / Math.max(screenWidth, 1) - index
        const distance = Math.abs(pageOffset)

        return {
            opacity: interpolate(distance, [0, 0.5], [1, 0], Extrapolation.CLAMP),
            transform: [
                {
                    scale: interpolate(
                        distance,
                        [0, 0.5],
                        [1, 0.94],
                        Extrapolation.CLAMP,
                    ),
                },
            ],
        }
    })

    return (
        <View
            style={{ width: screenWidth, height: heroHeight }}
            className="relative flex justify-end"
        >
            <Animated.View
                pointerEvents="box-none"
                style={animatedContentStyle}
                className="flex flex-col gap-2.5 justify-end px-8 pb-20"
            >
                <Text
                    numberOfLines={2}
                    style={{ fontSize: titleFontSize }}
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

                <View
                    className="flex-row mt-1"
                    pointerEvents="box-none"
                    // Force-mount-control off-screen slide action-button
                    // wrappers when a library shelf has TV focus. tvOS
                    // caches the layout of every slide inside the
                    // horizontally offset ScrollView, so on real hardware a
                    // slide whose `currentIndex > 0` places the off-screen
                    // Slide 0's button at `x = -screenWidth` — directly in
                    // the spatial LEFT channel between a media card and
                    // the sidebar. `focusable={false}` on the inner Pressable
                    // is not enough; Apple TV's spatial engine still snags
                    // on the wrapper rect and absorbs DPAD LEFT before the
                    // parent FocusableView's `nextFocusLeft` chain can fire.
                    // `display:'none'` unmounts the wrapper from
                    // the native focus tree entirely. Only the active slide
                    // stays mounted, so inter-slide navigation is unaffected.
                    style={isLibraryShelvesFocused && index !== currentIndex
                        ? { display: "none" }
                        : undefined}
                >
                    <Pressable
                        focusable={!isLibraryShelvesFocused}
                        onFocus={() => {
                            setBtnFocused(true)
                            if (index !== currentIndex) {
                                onSlideFocus?.(index)
                            }
                        }}
                        onBlur={() => {
                            setBtnFocused(false)
                        }}
                        onPress={() => onActionPress(item)}
                        android_ripple={{ color: "rgba(255,255,255,0.1)" }}
                    >
                        <Animated.View
                            className={`flex-row items-center rounded-xl gap-2 shadow-md transition-all duration-300 px-6 py-3.5 ${
                                showActiveStyle
                                    ? "bg-white border-2 border-brand-400/80 shadow-2xl"
                                    : "bg-white/10"
                            }`}
                            style={btnAnimatedStyle}
                        >
                            <Ionicons name={iconName} size={18} color={showActiveStyle ? "black" : "rgba(255,255,255,0.5)"} />
                            <Text className={`font-bold tracking-tight text-base ${showActiveStyle ? "text-black" : "text-white/50"}`}>
                                {buttonLabel}
                            </Text>
                        </Animated.View>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    )
}

function LibraryHeroBackdrop({
    items,
    currentIndex,
    screenWidth,
    scrollX,
    scrollY,
    heroHeight,
}: {
    items: UnifiedHeroItem[]
    currentIndex: number
    screenWidth: number
    scrollX: SharedValue<number>
    scrollY: SharedValue<number>
    heroHeight: number
}) {
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

    // Distance (px) over which the backdrop fades as the FlatList scrolls
    // past it. Tuned to match the first snap target offset on the shelf
    // rows so the backdrop fade completes roughly when the user reaches
    // the second section rather than disappearing in the middle of the
    // first scroll commit.
    const HERO_BACKDROP_FADE_DISTANCE = 300

    const backgroundStyle = useAnimatedStyle(() => {
        const y = scrollY.value
        const scale = y < 0 ? 1 + Math.abs(y) / (heroHeight * 2) : 1
        const offset = Math.min(Math.max(y, 0), HERO_BACKDROP_FADE_DISTANCE)

        return {
            opacity: interpolate(offset, [0, HERO_BACKDROP_FADE_DISTANCE], [1, 0], Extrapolation.CLAMP),
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
                                    index={index}
                                    item={item}
                                    scrollX={scrollX}
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
    index,
    item,
    scrollX,
    screenWidth,
    isActive,
}: {
    index: number
    item: UnifiedHeroItem
    scrollX: SharedValue<number>
    screenWidth: number
    isActive: boolean
}) {
    const uri = item.bannerImage || item.coverImage || ""
    const translationX = useSharedValue(0)

    React.useEffect(() => {
        const PAN_LIMIT = screenWidth * 0.12
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

    const animatedStyle = useAnimatedStyle(() => {
        const pageOffset = scrollX.value / Math.max(screenWidth, 1) - index
        const distance = Math.abs(pageOffset)

        const swipeTranslateX = interpolate(pageOffset, [-1, 0, 1], [-18, 0, 18], Extrapolation.CLAMP)
        const totalTranslateX = swipeTranslateX + translationX.value

        return {
            opacity: interpolate(distance, [0, 1], [1, 0], Extrapolation.CLAMP),
            transform: [
                { translateX: totalTranslateX },
                { scale: interpolate(distance, [0, 1], [1.0, 1.05], Extrapolation.CLAMP) },
            ],
        }
    })

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
                    width: screenWidth * 1.35,
                    left: -(screenWidth * 0.35) / 2,
                }}
            />
        </Animated.View>
    )
}
