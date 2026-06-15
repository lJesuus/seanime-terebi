import { AL_BaseAnime, AL_BaseManga } from "@/api/generated/types"
import { __media_listPageContentAtom } from "@/atoms/media-list"
import { MediaEntryCard } from "@/components/features/media/media-entry-card"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { Ionicons } from "@/lib/icons/Ionicons"
import { buildMediaEntryHref, getMediaEntryKind } from "@/lib/media-entry-route"
import { cn } from "@/lib/utils"
import { router } from "expo-router"
import { useAtom } from "jotai/react"
import React from "react"
import { Dimensions, FlatList, ListRenderItemInfo, Pressable, View, Platform } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

const { width } = Dimensions.get("screen")
const isTV = Platform.isTV
const CARD_WIDTH = isTV ? (width / 5.5) : ((2 / 5) * width)
const CARD_ROW_HEIGHT = CARD_WIDTH * 1.5 + (isTV ? 32 : 16)
const SPACING = isTV ? 20 : 10
const PADDING_HORIZONTAL = isTV ? 28 : 20
const HORIZONTAL_INITIAL_RENDER = isTV ? 5 : 4

type HorizontalMediaCardListProps<T extends "anime" | "manga"> = {
    title: string
    type: T,
    media: T extends "anime" ? AL_BaseAnime[] : AL_BaseManga[]
    onMediaPress?: (media: T extends "anime" ? AL_BaseAnime : AL_BaseManga) => void
    limit?: number
    sectionIndex?: number
    showAudienceScore?: boolean
    hideCount?: boolean
    hideLibraryBadge?: boolean
}

export function HorizontalMediaCardList<T extends "anime" | "manga">(props: HorizontalMediaCardListProps<T>) {

    const {
        title,
        media,
        type,
        onMediaPress,
        limit = 9,
        showAudienceScore = false,
        hideCount = false,
        hideLibraryBadge = false,
    } = props

    const [, setMediaListPageContent] = useAtom(__media_listPageContentAtom)
    const visibleMedia = React.useMemo(
        () => !limit ? media : media.slice(0, limit),
        [limit, media],
    )

    const keyExtractor = React.useCallback((item: AL_BaseAnime | AL_BaseManga, index: number) => `${item.id}-${index}`, [])

    const getItemLayout = React.useCallback((_: ArrayLike<AL_BaseAnime | AL_BaseManga> | null | undefined, index: number) => ({
        length: CARD_WIDTH + SPACING,
        offset: (CARD_WIDTH + SPACING) * index,
        index,
    }), [])

function ArrowForwardButton({ onPress }: { onPress: () => void }) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.1 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            focusable={isTV}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
        >
            <Animated.View
                className={cn(
                    "rounded-full p-2",
                    isFocused && isTV ? "bg-white/10 border-2 border-brand-400/80" : "",
                )}
                style={isTV ? animatedStyle : undefined}
            >
                <Ionicons name="arrow-forward" size={isTV ? 24 : 18} colorClassName="accent-foreground" />
            </Animated.View>
        </Pressable>
    )
}

function SeeAllButton({
    onPress,
    mediaLength,
}: {
    onPress: () => void
    mediaLength: number
}) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.05 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            focusable={isTV}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.5 }}
            className="rounded-md flex justify-center items-center"
        >
            <Animated.View
                className={cn(
                    "flex-1 w-full rounded-md justify-center items-center",
                    isFocused && isTV ? "bg-white/10 border-2 border-brand-400/80" : "",
                )}
                style={isTV ? animatedStyle : undefined}
            >
                <Button
                    variant="secondary"
                    className={cn("text-xl text-muted-foreground p-4", isTV ? "text-2xl" : "")}
                >
                    <Text className={cn("text-xl", isTV ? "text-2xl" : "")}>
                        See all ({mediaLength})
                    </Text>
                </Button>
            </Animated.View>
        </Pressable>
    )
}

    const renderItem = React.useCallback(({ item, index }: ListRenderItemInfo<AL_BaseAnime | AL_BaseManga>) => {
        if (index === limit - 1) {
            return (
                <SeeAllButton
                    onPress={() => {
                        setMediaListPageContent({
                            title,
                            type,
                            media,
                        })
                        router.push("/(app)/(media)/media-list")
                    }}
                    mediaLength={media.length}
                />
            )
        }

        const itemType = getMediaEntryKind(item, type)

        if (itemType === "manga") {
            return <MediaEntryCard
                key={index}
                type="manga"
                cardWidth={CARD_WIDTH}
                media={item as AL_BaseManga}
                showAudienceScore={showAudienceScore}
                onPress={() => {
                    if (onMediaPress) onMediaPress(item as T extends "anime" ? AL_BaseAnime : AL_BaseManga)
                    else router.push(buildMediaEntryHref(item, type))
                }}
                hideLibraryBadge={hideLibraryBadge}
            />
        }

        return <MediaEntryCard
            key={index}
            type="anime"
            cardWidth={CARD_WIDTH}
            media={item as AL_BaseAnime}
            showAudienceScore={showAudienceScore}
            onPress={() => {
                if (onMediaPress) onMediaPress(item as T extends "anime" ? AL_BaseAnime : AL_BaseManga)
                else router.push(buildMediaEntryHref(item, type))
            }}
            hideLibraryBadge={hideLibraryBadge}
        />
    }, [limit, media, onMediaPress, setMediaListPageContent, showAudienceScore, title, type, hideLibraryBadge])

    if (media.length === 0) return null

    return (
        <View
            className="flex-col gap-4"
        >

            <View
                    className="flex-row w-full justify-between items-center"
                    style={{ paddingRight: PADDING_HORIZONTAL }}
                >
                <Text
                    className={cn("font-bold text-foreground", isTV ? "text-2xl" : "text-xl")}
                    style={{ paddingLeft: PADDING_HORIZONTAL, paddingVertical: isTV ? 24 : 16 }}
                >
                    {title} {!hideCount && <Text className={cn("text-muted-foreground ml-4", isTV ? "text-2xl" : "text-xl")}>{media.length}</Text>}
                </Text>

                {(media.length > limit) && <ArrowForwardButton
                    onPress={() => {
                        setMediaListPageContent({
                            title,
                            type,
                            media,
                        })
                        router.push("/(app)/(media)/media-list")
                    }}
                />}
            </View>

            <View className="w-full" style={{ height: CARD_ROW_HEIGHT }}>
                <FlatList
                    data={visibleMedia as (AL_BaseAnime | AL_BaseManga)[]}
                    horizontal
                    style={{ height: CARD_ROW_HEIGHT, width: "100%" }}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    getItemLayout={getItemLayout}
                    initialNumToRender={Math.min(visibleMedia.length, HORIZONTAL_INITIAL_RENDER)}
                    maxToRenderPerBatch={HORIZONTAL_INITIAL_RENDER}
                    windowSize={5}
                    removeClippedSubviews={!isTV}
                    contentContainerStyle={{ gap: SPACING, paddingHorizontal: PADDING_HORIZONTAL }}
                    decelerationRate="normal"
                />
            </View>
        </View>
    )
}
