import { AL_BaseAnime, AL_BaseManga } from "@/api/generated/types"
import { useServerStatus } from "@/atoms/server.atoms"
import { MediaEntryAudienceScore } from "@/components/features/media/media-entry-score"
import { SeaImage } from "@/components/shared/sea-image"
import { COLORS } from "@/constants/colors"
import { useIsTV, useShowSidebar } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import React from "react"
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native"
import Animated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated"
import type { AnimatedRef } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export const HERO_HEIGHT = 320
const HERO_TITLE_FONT_SIZE = 44
const HERO_GENRE_FONT_SIZE = 16
const AUTO_ROTATE_INTERVAL = 10000
const MAX_ITEMS = 12
const HERO_BACKGROUND = COLORS.background
const HERO_BACKDROP = COLORS.mediaHeaderBackdrop
const HERO_GRADIENT_TRANSPARENT = "rgba(17,17,17,0)"
const HERO_GRADIENT_SOFT = "rgba(17,17,17,0.4)"
const HERO_GRADIENT_MEDIUM = "rgba(17,17,17,0.55)"
const HERO_GRADIENT_HEAVY = "rgba(17,17,17,0.9)"
const ABSOLUTE_FILL_STYLE = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const
const HERO_BACKGROUND_STYLE = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    overflow: "hidden",
    backgroundColor: HERO_BACKGROUND,
} as const
const HERO_VISUAL_LAYER_STYLE = { ...ABSOLUTE_FILL_STYLE, backgroundColor: HERO_BACKDROP } as const
const HERO_TOP_GRADIENT_COLORS = ["rgba(0,0,0,0.72)", "rgba(0,0,0,0.22)", "transparent"] as const
const HERO_TOP_GRADIENT_LOCATIONS = [0, 0.4, 1] as const
const HERO_BOTTOM_GRADIENT_COLORS = [HERO_GRADIENT_TRANSPARENT, HERO_GRADIENT_SOFT, HERO_GRADIENT_HEAVY, HERO_BACKGROUND] as const
const HERO_BOTTOM_GRADIENT_LOCATIONS = [0, 0.32, 0.72, 1] as const
const HERO_FOOT_GRADIENT_COLORS = [HERO_GRADIENT_TRANSPARENT, HERO_GRADIENT_MEDIUM, HERO_BACKGROUND] as const
const HERO_FOOT_GRADIENT_LOCATIONS = [0, 0.45, 1] as const
const HERO_BACKDROP_OVERLAY_STYLE = { ...ABSOLUTE_FILL_STYLE, backgroundColor: "rgba(0,0,0,0.16)" } as const
const HERO_IMAGE_MOUNT_DELAY_MS = 160
const HERO_BACKDROP_IMAGE_WINDOW = 3

type DiscoverHeroItem = AL_BaseAnime | AL_BaseManga

export type DiscoverHeroCarouselController = {
    currentIndex: number
    screenWidth: number
    // Use AnimatedRef (not React.RefObject) so the carousel's ScrollView
    // ref survives being captured by `useAnimatedScrollHandler`
    // below. A plain JS useRef would trigger reanimated's strict
    // "Tried to modify key `current`" warning once JavaScript mutates
    // `scrollRef.current` (e.g. via scrollToIndex / setInterval dot
    // presses) after the worklet has already captured it.
    scrollRef: AnimatedRef<ScrollView>
    scrollX: SharedValue<number>
    scrollToIndex: (index: number, animated?: boolean) => void
    handleDotPress: (index: number) => void
    handleScrollBeginDrag: () => void
    handleScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
    notifyFocusEnter: () => void
    notifyFocusExit: () => void
}

type DiscoverHeroCarouselBackdropProps = {
    media: DiscoverHeroItem[]
    currentIndex: number
    screenWidth: number
    scrollX: SharedValue<number>
    scrollY?: SharedValue<number>
}

type DiscoverHeroCarouselInteractionLayerProps = {
    media: DiscoverHeroItem[]
    type: "anime" | "manga"
    controller: DiscoverHeroCarouselController
    /** FlatList scroll offset so the backdrop fades as the user
     * scrolls down into the section cards. */
    scrollY?: SharedValue<number>
    /** Fires when a carousel item receives focus (DPAD from pills). */
    onFocus?: () => void
    /** Fires when a carousel item loses focus (DPAD-DOWN to cards). */
    onBlur?: () => void
}

export function useDiscoverHeroItems(media: DiscoverHeroItem[]) {
    return React.useMemo(
        () => media.filter(item => !!item.bannerImage).slice(0, MAX_ITEMS),
        [media],
    )
}

export function useDiscoverHeroCarouselController(media: DiscoverHeroItem[], isActive: boolean): DiscoverHeroCarouselController {
    const { width: screenWidth } = useWindowDimensions()
    const showSidebar = useShowSidebar()
    const carouselWidth = showSidebar ? screenWidth - 80 : screenWidth
    const [currentIndex, setCurrentIndex] = React.useState(0)
    // useAnimatedRef (not React.useRef) so the ref can be safely
    // captured by useAnimatedScrollHandler worklets without reanimated
    // 3.x complaining about a `.current` mutation across the worklet
    // boundary. The same ref is also passed to <Animated.ScrollView>.
    const scrollRef = useAnimatedRef<ScrollView>()
    const scrollX = useSharedValue(0)
    const isInteracting = React.useRef(false)
    const carouselFocusedRef = React.useRef(false)
    const targetIndexRef = React.useRef(0)
    const mediaKey = React.useMemo(() => media.map(item => String(item.id)).join(":"), [media])

    const scrollToIndex = React.useCallback(
        (index: number, animated = true) => {
            if (media.length === 0) return

            const safeIndex = Math.max(0, Math.min(index, media.length - 1))
            targetIndexRef.current = safeIndex
            scrollRef.current?.scrollTo({ x: safeIndex * carouselWidth, animated })
        },
        [media.length, carouselWidth],
    )

    React.useEffect(() => {
        if (media.length === 0) {
            scrollX.set(0)
            setCurrentIndex(0)
            return
        }

        scrollX.set(0)
        setCurrentIndex(0)
        targetIndexRef.current = 0
        scrollToIndex(0, false)
    }, [mediaKey, media.length, scrollToIndex, scrollX])

    const notifyFocusEnter = React.useCallback(() => {
        carouselFocusedRef.current = true
    }, [])

    const notifyFocusExit = React.useCallback(() => {
        carouselFocusedRef.current = false
    }, [])

    React.useEffect(() => {
        if (!isActive || media.length <= 1) return

        const interval = setInterval(() => {
            if (isInteracting.current || carouselFocusedRef.current) return

            scrollToIndex((targetIndexRef.current + 1) % media.length)
        }, AUTO_ROTATE_INTERVAL)

        return () => clearInterval(interval)
    }, [isActive, media.length, scrollToIndex])

    React.useEffect(() => {
        if (isActive) return

        isInteracting.current = false
    }, [isActive])

    const handleDotPress = React.useCallback((index: number) => {
        if (index === currentIndex) return

        scrollToIndex(index)
    }, [currentIndex, scrollToIndex])

    const handleScrollBeginDrag = React.useCallback(() => {
        isInteracting.current = true
    }, [])

    const handleScrollEnd = React.useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (media.length === 0) return

            const offsetX = event.nativeEvent.contentOffset.x
            const nextIndex = Math.round(offsetX / carouselWidth)

            scrollX.set(offsetX)
            setCurrentIndex(Math.max(0, Math.min(nextIndex, media.length - 1)))
            isInteracting.current = false
        },
        [media.length, carouselWidth, scrollX],
    )

    return {
        currentIndex,
        screenWidth: carouselWidth,
        scrollRef,
        scrollX,
        scrollToIndex,
        handleDotPress,
        handleScrollBeginDrag,
        handleScrollEnd,
        notifyFocusEnter,
        notifyFocusExit,
    }
}

export function DiscoverHeroCarouselBackdrop({ media, currentIndex, screenWidth, scrollX, scrollY: _scrollY }: DiscoverHeroCarouselBackdropProps) {
    const insets = useSafeAreaInsets()
    const localScrollY = useSharedValue(0)
    const scrollY = _scrollY ?? localScrollY
    const [shouldRenderHeroImages, setShouldRenderHeroImages] = React.useState(false)
    const mediaKey = React.useMemo(() => media.map(item => String(item.id)).join(":"), [media])

    React.useEffect(() => {
        if (media.length === 0) {
            setShouldRenderHeroImages(false)
            return
        }

        setShouldRenderHeroImages(false)

        const timeoutId = setTimeout(() => {
            setShouldRenderHeroImages(true)
        }, HERO_IMAGE_MOUNT_DELAY_MS)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [media.length, mediaKey])

    const heroBackgroundStyle = useAnimatedStyle(() => {
        const y = scrollY.value
        const scale = y < 0 ? 1 + Math.abs(y) / (HERO_HEIGHT * 2) : 1

        const offset = Math.min(Math.max(y, 0), 180)
        return {
            opacity: interpolate(offset, [0, 180], [1, 0], Extrapolation.CLAMP),
            transform: [{ scale }],
        }
    })

    if (media.length === 0) return null

    return (
        <View
            pointerEvents="none"
            style={HERO_BACKGROUND_STYLE}
        >
            <Animated.View
                style={[
                    HERO_VISUAL_LAYER_STYLE,
                    heroBackgroundStyle,
                ]}
            >
                {shouldRenderHeroImages ? (
                    <View style={ABSOLUTE_FILL_STYLE}>
                        {media.map((item, index) => {
                            if (Math.abs(index - currentIndex) > HERO_BACKDROP_IMAGE_WINDOW) {
                                return null
                            }

                            return (
                                <DiscoverHeroBackdropImage
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
                ) : null}

                <View
                    pointerEvents="none"
                    style={HERO_BACKDROP_OVERLAY_STYLE}
                />

                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: insets.top + 92,
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
                    height: HERO_HEIGHT * 0.62,
                }}
            />

            <LinearGradient
                pointerEvents="none"
                colors={HERO_FOOT_GRADIENT_COLORS}
                locations={HERO_FOOT_GRADIENT_LOCATIONS}
                style={{
                    position: "absolute",
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 72,
                }}
            />
        </View>
    )
}

function DiscoverHeroBackdropImage({
    index,
    item,
    scrollX,
    screenWidth,
    isActive,
}: {
    index: number
    item: DiscoverHeroItem
    scrollX: SharedValue<number>
    screenWidth: number
    isActive: boolean
}) {
    const uri = item.bannerImage || item.coverImage?.extraLarge || ""
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
                // Hero banner is the very first thing the user sees on
                // the Discover tab. Bumping priority from "low" to
                // "high" makes expo-image allocate network bandwidth to
                // the banner image up-front instead of waiting for it
                // to clear the queue behind the 5 other section's
                // thumbnails. The translateX parallax below still runs
                // on the UI thread so this doesn't block touch.
                priority="high"
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

function DiscoverHeroDot({
    index,
    isActive,
    isTV,
    onPress,
}: {
    index: number
    isActive: boolean
    isTV: boolean
    onPress: () => void
}) {
    return (
        <Pressable
            focusable={false}
            onPress={onPress}
            hitSlop={isTV ? 16 : 10}
        >
            <View
                style={{
                    width: isActive ? (isTV ? 32 : 22) : (isTV ? 12 : 8),
                    height: isTV ? 5 : 3,
                    borderRadius: isTV ? 3 : 2,
                    backgroundColor: isActive
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.28)",
                }}
            />
        </Pressable>
    )
}

function DiscoverHeroItem({
    item,
    type,
    width,
    height,
    onFocus,
    onBlur,
}: {
    item: DiscoverHeroItem
    type: "anime" | "manga"
    width: number
    height: number
    onFocus?: () => void
    onBlur?: () => void
}) {
    const isTV = useIsTV()
    const serverStatus = useServerStatus()

    const title = item.title?.userPreferred || item.title?.english || item.title?.romaji || ""
    const genres = item.genres?.slice(0, 3) ?? []
    const score = item.meanScore
    const hideAudienceScore = serverStatus?.settings?.anilist?.hideAudienceScore ?? false
    const description = React.useMemo(() => {
        const raw = item.description
        if (!raw) return ""
        const stripped = stripHtml(raw)
        const maxLen = isTV ? 120 : 90
        return stripped.length > maxLen ? stripped.slice(0, maxLen) + "…" : stripped
    }, [item.description, isTV])

    return (
        <View style={{ width, height }}>
            <Pressable
                style={{ flex: 1 }}
                // Carousel items are focusable on TV so the user
                // can navigate DOWN from an item into the section
                // cards. When the item loses focus (onBlur), the
                // parent hides the hero carousel to prevent LEFT
                // focus theft from the cards.
                focusable={isTV ? true : undefined}
                onFocus={onFocus}
                onBlur={onBlur}
                onPress={() => {
                    if (type === "anime") {
                        router.push(`/(app)/entry/anime/${item.id}`)
                    } else {
                        router.push(`/(app)/entry/manga/${item.id}`)
                    }
                }}
            >
                <Animated.View
                    className={"flex-1"}
                />
            </Pressable>

            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    bottom: isTV ? 80 : 56,
                    left: 0,
                    right: 0,
                    paddingHorizontal: isTV ? 32 : 20,
                }}
            >
                <Text
                    numberOfLines={2}
                    style={{
                        color: "white",
                        fontSize: HERO_TITLE_FONT_SIZE,
                        fontWeight: "800",
                        lineHeight: isTV ? 44 : 32,
                        marginBottom: isTV ? 10 : 8,
                        textShadowColor: "rgba(0,0,0,0.55)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 6,
                    }}
                >
                    {title}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: isTV ? 6 : 4, flexWrap: "wrap" }}>
                    {!!score && !hideAudienceScore && (
                        <View style={{ marginLeft: 1, marginRight: 2 }}>
                            <MediaEntryAudienceScore score={score} />
                        </View>
                    )}
                    {genres.map((genre, idx) => (
                        <React.Fragment key={genre}>
                            {idx > 0 && (
                                <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: HERO_GENRE_FONT_SIZE, fontWeight: "bold" }}> • </Text>
                            )}
                            <Text
                                style={{
                                    color: "rgba(255,255,255,0.55)",
                                    fontSize: HERO_GENRE_FONT_SIZE,
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: 0.5,
                                }}
                            >
                                {genre}
                            </Text>
                        </React.Fragment>
                    ))}
                </View>

                {description ? (
                    <Text
                        numberOfLines={isTV ? 2 : 2}
                        style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: isTV ? 14 : 12,
                            lineHeight: isTV ? 20 : 17,
                            marginTop: isTV ? 8 : 6,
                        }}
                    >
                        {description}
                    </Text>
                ) : null}
            </View>
        </View>
    )
}

function stripHtml(value?: string) {
    if (!value) return ""
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, "\"")
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .trim()
}

export function DiscoverHeroCarouselInteractionLayer({ media, type, controller, scrollY, onFocus, onBlur }: DiscoverHeroCarouselInteractionLayerProps) {
    const isTV = useIsTV()
    const handleHorizontalScroll = useAnimatedScrollHandler({
        onScroll: event => {
            controller.scrollX.value = event.contentOffset.x
        },
    })

    if (media.length === 0) return null

    return (
        <View style={{ height: HERO_HEIGHT }}>
            <DiscoverHeroCarouselBackdrop
                media={media}
                currentIndex={controller.currentIndex}
                screenWidth={controller.screenWidth}
                scrollX={controller.scrollX}
                scrollY={scrollY}
            />
            <Animated.ScrollView
                // The outer horizontal pager must NOT be focusable or
                // it becomes its own focus region on Android TV and
                // swallows DPAD-DOWN / DPAD-UP. Carousel items themselves
                // are also non-focusable on TV (see `DiscoverHeroItem`)
                // — the hero carousel is purely decorative, matching
                // the Library tab pattern.
                focusable={false}
                ref={controller.scrollRef}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                directionalLockEnabled
                scrollEnabled={media.length > 1}
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleHorizontalScroll}
                onScrollBeginDrag={controller.handleScrollBeginDrag}
                onMomentumScrollEnd={controller.handleScrollEnd}
            >
                {media.map((item) => (
                    <DiscoverHeroItem
                        key={item.id}
                        item={item}
                        type={type}
                        width={controller.screenWidth}
                        height={HERO_HEIGHT}
                        onFocus={() => {
                            controller.notifyFocusEnter()
                            onFocus?.()
                        }}
                        onBlur={() => {
                            controller.notifyFocusExit()
                            onBlur?.()
                        }}
                    />
                ))}
            </Animated.ScrollView>

            {media.length > 1 && (
                <View
                    style={{
                        position: "absolute",
                        bottom: isTV ? 36 : 24,
                        left: 0,
                        right: 0,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: isTV ? 8 : 5,
                    }}
                >
                    {media.map((_, idx) => (
                        <DiscoverHeroDot
                            key={idx}
                            index={idx}
                            isActive={idx === controller.currentIndex}
                            isTV={isTV}
                            onPress={() => controller.handleDotPress(idx)}
                        />
                    ))}
                </View>
            )}
        </View>
    )
}
