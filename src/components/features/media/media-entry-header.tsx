import { Anime_Entry, Anime_Episode, Manga_Entry } from "@/api/generated/types"
import { useServerStatus } from "@/atoms/server.atoms"
import { SeaImage } from "@/components/shared/sea-image"
import { Button } from "@/components/ui/button"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { COLORS } from "@/constants/colors"
import { useIsTV } from "@/hooks/use-device"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { capitalize } from "lodash"
import * as React from "react"
import { Pressable, Text, View } from "react-native"
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { cn } from "@/lib/utils"
import { EditAnilistEntry } from "./edit-anilist-entry"
import { MediaEntryAudienceScore, MediaEntryScore } from "./media-entry-score"

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

const COVER_WIDTH = 140
const COVER_HEIGHT = COVER_WIDTH * 1.5
const HEADER_BACKGROUND = COLORS.background
const HEADER_SURFACE = COLORS.surface
const HEADER_BACKDROP = COLORS.mediaHeaderBackdrop
export const BANNER_HEIGHT = 296
const START_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short" })
const HEADER_GRADIENT_TRANSPARENT = "rgba(17,17,17,0)"
const HEADER_GRADIENT_SOFT = "rgba(17,17,17,0.4)"
const HEADER_GRADIENT_MEDIUM = "rgba(17,17,17,0.55)"
const HEADER_GRADIENT_HEAVY = "rgba(17,17,17,0.9)"
const ABSOLUTE_FILL_STYLE = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const
const HEADER_BACKGROUND_STYLE = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    overflow: "hidden",
    backgroundColor: HEADER_SURFACE,
} as const
const HEADER_TOP_GRADIENT_COLORS = ["rgba(0,0,0,0.72)", "rgba(0,0,0,0.22)", "transparent"] as const
const HEADER_TOP_GRADIENT_LOCATIONS = [0, 0.4, 1] as const
const HEADER_BOTTOM_GRADIENT_COLORS = [HEADER_GRADIENT_TRANSPARENT, HEADER_GRADIENT_SOFT, HEADER_GRADIENT_HEAVY, HEADER_BACKGROUND] as const
const HEADER_BOTTOM_GRADIENT_LOCATIONS = [0, 0.32, 0.72, 1] as const
const HEADER_FOOT_GRADIENT_COLORS = [HEADER_GRADIENT_TRANSPARENT, HEADER_GRADIENT_MEDIUM, HEADER_BACKGROUND] as const
const HEADER_FOOT_GRADIENT_LOCATIONS = [0, 0.45, 1] as const
const BACKDROP_OVERLAY_STYLE = { ...ABSOLUTE_FILL_STYLE, backgroundColor: "rgba(0,0,0,0.18)" } as const
const HEADER_IMAGE_MOUNT_DELAY_MS = 160
const HEADER_OVERLAP_ROW_STYLE = {
    marginTop: -180,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-end",
} as const
const COVER_SHADOW_WRAPPER_STYLE = {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#101010",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
} as const
const COVER_CONTENT_STYLE = {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#333",
} as const
const SCORE_BADGE_STYLE = { position: "absolute", bottom: 0, right: 0, zIndex: 10 } as const

function getAlternativeTitle(entry: Anime_Entry | Manga_Entry) {
    const userPreferred = entry?.media?.title?.userPreferred
    const english = entry?.media?.title?.english
    const romaji = entry?.media?.title?.romaji

    if (userPreferred?.toLowerCase() === english?.toLowerCase()) {
        return romaji === userPreferred ? undefined : romaji
    }

    if (userPreferred?.toLowerCase() === romaji?.toLowerCase()) {
        return english === userPreferred ? undefined : english
    }

    return undefined
}

type MediaEntryHeaderBackgroundProps = {
    entry: Anime_Entry | Manga_Entry
    scrollY?: SharedValue<number>
}

function MediaEntryHeaderBackgroundInner({ entry, scrollY }: MediaEntryHeaderBackgroundProps) {
    const insets = useSafeAreaInsets()
    const localScrollY = useSharedValue(0)
    const activeScrollY = scrollY ?? localScrollY
    const bannerImageUri = entry?.media?.bannerImage || entry?.media?.coverImage?.large || entry?.media?.coverImage?.extraLarge
    const [shouldRenderBannerImage, setShouldRenderBannerImage] = React.useState(false)

    React.useEffect(() => {
        if (!bannerImageUri) {
            setShouldRenderBannerImage(false)
            return
        }

        setShouldRenderBannerImage(false)

        const timeoutId = setTimeout(() => {
            setShouldRenderBannerImage(true)
        }, HEADER_IMAGE_MOUNT_DELAY_MS)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [bannerImageUri])

    const backgroundContainerStyle = useAnimatedStyle(() => {
        const rawScroll = activeScrollY.value
        const translateY = rawScroll > 0 ? -(rawScroll * 0.8) : 0

        return {
            transform: [{ translateY }],
        }
    })

    const bannerImageStyle = useAnimatedStyle(() => {
        const rawScroll = activeScrollY.value
        const scale = rawScroll < 0 ? 1 + Math.abs(rawScroll) / (BANNER_HEIGHT * 2) : 1

        return {
            transform: [{ scale }],
        }
    })

    return (
        <Animated.View style={[HEADER_BACKGROUND_STYLE, backgroundContainerStyle]}>
            <View pointerEvents="none" className="absolute inset-0 bg-gray-800" />
            {shouldRenderBannerImage && !!bannerImageUri ? (
                <Animated.View
                    style={[ABSOLUTE_FILL_STYLE, bannerImageStyle]}
                >
                    <SeaImage
                        source={{ uri: bannerImageUri }}
                        contentFit="cover"
                        cachePolicy="disk"
                        priority="low"
                        allowDownscaling
                        transition={0}
                        style={{ width: "100%", height: "100%" }}
                    />
                </Animated.View>
            ) : null}

            <View pointerEvents="none" style={BACKDROP_OVERLAY_STYLE} />

            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 92, zIndex: 5 }}>
                <LinearGradient
                    colors={HEADER_TOP_GRADIENT_COLORS}
                    locations={HEADER_TOP_GRADIENT_LOCATIONS}
                    style={{ flex: 1 }}
                />
            </View>

            <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 220, zIndex: 5 }}>
                <LinearGradient
                    colors={HEADER_BOTTOM_GRADIENT_COLORS}
                    locations={HEADER_BOTTOM_GRADIENT_LOCATIONS}
                    style={{ flex: 1 }}
                />
            </View>

            <View pointerEvents="none" style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 72, zIndex: 6 }}>
                <LinearGradient
                    colors={HEADER_FOOT_GRADIENT_COLORS}
                    locations={HEADER_FOOT_GRADIENT_LOCATIONS}
                    style={{ flex: 1 }}
                />
            </View>

        </Animated.View>
    )
}

export const MediaEntryHeaderBackground = React.memo(MediaEntryHeaderBackgroundInner)

function MediaEntryCloseButtonInner() {
    const isTV = useIsTV()
    const insets = useSafeAreaInsets()
    return (
        <View style={{ position: "absolute", top: insets.top + 6, left: 14, zIndex: 20 }}>
            {isTV ? (
                <TvFocusablePressable
                    hasTVPreferredFocus
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                    focusedClassName="border border-brand-400/60"
                >
                    <Ionicons name="chevron-back" size={18} color="white" />
                </TvFocusablePressable>
            ) : (
                <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full bg-black/50"
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={18} color="white" />
                </Button>
            )}
        </View>
    )
}

export const MediaEntryCloseButton = React.memo(MediaEntryCloseButtonInner)

type MediaEntryHeaderContentProps = {
    entry: Anime_Entry | Manga_Entry
    type: "anime" | "manga"
    onTitlePress?: () => void
    nextFocusDown?: number | null
    /**
     * Optional anime-specific play affordance. When both `nextEpisode` and
     * `onPlayPress` are provided, a rectangular "Play" button is rendered
     * on the right side of the header alongside status / episode number /
     * add-to-list. For non-anime types or when the next episode is not
     * yet known, the button is omitted.
     */
    nextEpisode?: Anime_Episode
    onPlayPress?: () => void
}

const ANIME_LIST_STATUS_LABELS: Record<string, string> = {
    "CURRENT": "Watching",
    "PLANNING": "Planning",
    "COMPLETED": "Completed",
    "DROPPED": "Dropped",
    "PAUSED": "Paused",
    "REPEATING": "Repeating",
}

const MANGA_LIST_STATUS_LABELS: Record<string, string> = {
    ...ANIME_LIST_STATUS_LABELS,
    "CURRENT": "Reading",
}

function MediaEntryHeaderContentInner({
    entry,
    type,
    onTitlePress,
    nextFocusDown,
    nextEpisode,
    onPlayPress,
}: MediaEntryHeaderContentProps) {
    const isTV = useIsTV()
    const serverStatus = useServerStatus()
    const coverImageUri = entry?.media?.coverImage?.large || entry?.media?.coverImage?.extraLarge
    const showPlayButton = Boolean(type === "anime" && nextEpisode && onPlayPress)
    // Track TV focus / pressed state so the Watch button can mirror
    // the Library hero carousel's two-tone treatment: an inactive rest
    // state and a brand-bordered active state when focus lands on it.
    const [playButtonActive, setPlayButtonActive] = React.useState(false)
    const playButtonRestClass = "bg-white/10"
    const playButtonActiveClass = "bg-white border-2 border-brand-400/80 shadow-2xl"
    const playButtonClass = playButtonActive ? playButtonActiveClass : playButtonRestClass
    const playButtonIconColor = playButtonActive ? "black" : "rgba(255,255,255,0.5)"
    const playButtonTextClass = playButtonActive ? "text-black" : "text-white/50"

    const startDate = entry?.media?.startDate
    const season = entry?.media?.season
    const status = entry?.media?.status
    const genres = entry?.media?.genres?.filter(Boolean).slice(0, 3) ?? []
    const progress = entry?.listData?.progress ?? 0
    const totalAnimeEpisodes = type === "anime" && entry?.media && "episodes" in entry.media ? entry.media.episodes : undefined
    const totalMangaChapters = type === "manga" && entry?.media && "chapters" in entry.media ? entry.media.chapters : undefined
    const progressLabel = type === "anime"
        ? totalAnimeEpisodes ? `${progress}/${totalAnimeEpisodes}` : `${progress}/-`
        : totalMangaChapters ? `${progress}/${totalMangaChapters}` : `${progress}/-`
    const alternativeTitle = getAlternativeTitle(entry)
    const formattedStartDate = startDate?.year
        ? START_DATE_FORMATTER.format(new Date(startDate.year, startDate.month ? startDate.month - 1 : 0))
        : undefined
    const listStatus = entry?.listData?.status
    const listStatusLabel = type === "anime" ? ANIME_LIST_STATUS_LABELS[listStatus ?? ""] : MANGA_LIST_STATUS_LABELS[listStatus ?? ""]

    return (
        <View className="pb-3">
            <View style={{ height: BANNER_HEIGHT }} />


            <View
                style={HEADER_OVERLAP_ROW_STYLE}
            >
                <View
                    style={COVER_SHADOW_WRAPPER_STYLE}
                >
                    <View style={COVER_CONTENT_STYLE}>
                        <SeaImage
                            source={{ uri: coverImageUri }}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                            transition={0}
                            style={{ width: "100%", height: "100%" }}
                        />
                        <View style={SCORE_BADGE_STYLE}>
                            <MediaEntryScore score={entry?.listData?.score} />
                        </View>
                    </View>
                </View>

                {/*
                    The right column is a horizontal two-column layout that
                    mirrors the requested mockup: an info column on the left
                    of the right region (title / date / score / description /
                    status + episode count) and an action column on the right
                    that stacks the Watch and Add-to-List buttons vertically.
                    Both buttons share `h-9 px-3 rounded-md` so they read as
                    a coordinated pair regardless of order.
                */}
                <View className="flex-1 flex-row gap-5 pb-1">
                    <View className="flex-1 gap-1.5">
                        <Text
                            className="text-2xl font-bold leading-6 text-white"
                            numberOfLines={3}
                        >
                            {entry?.media?.title?.userPreferred}
                        </Text>
                        {!!alternativeTitle && (
                            <Text className="text-sm leading-tight text-white/40" numberOfLines={2}>
                                {alternativeTitle}
                            </Text>
                        )}

                        {!!formattedStartDate && (
                            <View className="flex-row flex-wrap items-center gap-1.5">
                                <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.42)" />
                                <Text className="text-sm font-medium text-white/40">
                                    {formattedStartDate}
                                    {!!season ? ` · ${capitalize(season)}` : ""}
                                    {!!status ? ` · ${capitalize(status.replaceAll("_", " "))}` : ""}
                                </Text>
                            </View>
                        )}

                        {(!serverStatus?.settings?.anilist?.hideAudienceScore || genres.length > 0) && (
                            <View className="flex-row flex-wrap items-center gap-2">
                                {!serverStatus?.settings?.anilist?.hideAudienceScore && (
                                    <MediaEntryAudienceScore score={entry?.media?.meanScore} />
                                )}
                                {genres.length > 0 && genres.map(genre => (
                                    <View key={genre} className="rounded-full px-0 py-1">
                                        <Text className="text-xs text-white/70">
                                            {genre}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {!!entry?.media?.description && (
                            <View>
                                <Text
                                    className="text-sm leading-5 text-white/60"
                                    numberOfLines={3}
                                >
                                    {stripHtml(entry.media.description)}
                                </Text>
                            </View>
                        )}

                        <View className="flex-row items-center gap-2 pt-1">
                            {!!listStatusLabel && (
                                <Text className="text-xs font-bold text-foreground/65 tracking-wider uppercase">
                                    {listStatusLabel}
                                </Text>
                            )}
                            {!!progressLabel && (
                                <Text className="text-xs font-bold text-foreground/65 tracking-wider uppercase">
                                    {progressLabel}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/*
                        Action column: Watch button (when present, for
                        anime entries with a known next episode) stacked
                        above Add-to-List. The Add-to-List button always
                        renders because every entry should be open to
                        list interaction, including manga entries that
                        won't have a Watch button.
                    */}
                    <View className="gap-2 justify-center pt-4">
                        {showPlayButton && (
                            <Pressable
                                focusable={isTV}
                                onFocus={() => setPlayButtonActive(true)}
                                onBlur={() => setPlayButtonActive(false)}
                                onPressIn={() => setPlayButtonActive(true)}
                                onPressOut={() => setPlayButtonActive(false)}
                                onPress={onPlayPress}
                                className={cn("h-9 px-3 rounded-md", playButtonClass)}
                            >
                                <View className="w-full flex-row items-center justify-center gap-1.5">
                                    <Ionicons name="play" size={15} color={playButtonIconColor} />
                                    <Text
                                        className={cn("text-sm font-semibold", playButtonTextClass)}
                                        numberOfLines={1}
                                    >
                                        Watch Episode
                                    </Text>
                                </View>
                            </Pressable>
                        )}
                            <EditAnilistEntry
                                entry={entry}
                                type={type}
                                roundedShape="rect"
                                addLabel={entry?.listData ? "Edit List" : "Add to list"}
                                buttonClassName="h-9 px-3"
                            />
                    </View>
                </View>
            </View>
        </View>
    )
}

export const MediaEntryHeaderContent = React.memo(MediaEntryHeaderContentInner)
