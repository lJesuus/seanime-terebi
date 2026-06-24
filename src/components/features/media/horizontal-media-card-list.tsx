import { AL_BaseAnime, AL_BaseManga } from "@/api/generated/types"
import { __media_listPageContentAtom } from "@/atoms/media-list"
import { MediaEntryCard } from "@/components/features/media/media-entry-card"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { useLibraryShelvesFocus } from "@/hooks/use-library-shelves-focus"
import { Ionicons } from "@/lib/icons/Ionicons"
import { buildMediaEntryHref, getMediaEntryKind } from "@/lib/media-entry-route"
import { cn } from "@/lib/utils"
import { router } from "expo-router"
import { useAtom } from "jotai/react"
import React from "react"
import { Dimensions, FlatList, ListRenderItemInfo, View, Platform } from "react-native"

const { width } = Dimensions.get("screen")
const isTV = Platform.isTV
const CARD_WIDTH = isTV ? (width / 7) : ((2 / 5) * width)
const CARD_ROW_HEIGHT = CARD_WIDTH * 1.5 + (isTV ? 32 : 16)
const SPACING = isTV ? 20 : 10
const PADDING_HORIZONTAL = isTV ? 28 : 20
const HORIZONTAL_INITIAL_RENDER = isTV ? 7 : 4

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
    onCardFocus?: (sectionIndex: number) => void
    onEndReached?: () => void
    compact?: boolean
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
        sectionIndex,
        onCardFocus,
        onEndReached,
        compact = false,
    } = props

    const infiniteScroll = !!onEndReached
    const [, setMediaListPageContent] = useAtom(__media_listPageContentAtom)
    const visibleMedia = React.useMemo(
        () => infiniteScroll ? media : (!limit ? media : media.slice(0, limit)),
        [infiniteScroll, limit, media],
    )

    const keyExtractor = React.useCallback((item: AL_BaseAnime | AL_BaseManga, index: number) => `${item.id}-${index}`, [])

    const getItemLayout = React.useCallback((_: ArrayLike<AL_BaseAnime | AL_BaseManga> | null | undefined, index: number) => ({
        length: CARD_WIDTH + SPACING,
        offset: (CARD_WIDTH + SPACING) * index,
        index,
    }), [])

function SeeAllButton({
    onPress,
    mediaLength,
    onFocus,
    onBlur,
}: {
    onPress: () => void
    mediaLength: number
    onFocus?: (e: any) => void
    onBlur?: (e: any) => void
}) {
    return (
        <TvFocusablePressable
            onPress={onPress}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.5 }}
            className="rounded-md flex justify-center items-center"
            focusedClassName="bg-white/10 border-2 border-brand-400/80"
        >
            <Button
                variant="secondary"
                className={cn("text-xl text-muted-foreground p-4", isTV ? "text-2xl" : "")}
            >
                <Text className={cn("text-xl", isTV ? "text-2xl" : "")}>
                    See all ({mediaLength})
                </Text>
            </Button>
        </TvFocusablePressable>
    )
}

    const { onFocus: notifyShelfFocusIn, onBlur: notifyShelfFocusOut } = useLibraryShelvesFocus()

    const handleFocus = React.useCallback(() => {
        onCardFocus?.(sectionIndex ?? 0)
        notifyShelfFocusIn()
    }, [onCardFocus, sectionIndex, notifyShelfFocusIn])

    const handleBlur = React.useCallback(() => {
        notifyShelfFocusOut()
    }, [notifyShelfFocusOut])

    const renderItem = React.useCallback(({ item, index }: ListRenderItemInfo<AL_BaseAnime | AL_BaseManga>) => {
        if (!infiniteScroll && index === limit - 1 && media.length > limit) {
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
                    onFocus={handleFocus}
                    onBlur={handleBlur}
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
                onFocus={handleFocus}
                onBlur={handleBlur}
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
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    }, [infiniteScroll, limit, media, onMediaPress, setMediaListPageContent, showAudienceScore, title, type, hideLibraryBadge, handleFocus, handleBlur])

    if (media.length === 0) return null

    return (
        <View
            className={cn("flex-col", compact ? "gap-0" : "gap-2")}
        >

            <View
                    className="flex-row w-full"
                    style={{ paddingHorizontal: PADDING_HORIZONTAL }}
                >
                <Text
                    className={cn("font-bold text-foreground", isTV ? (compact ? "text-xl" : "text-2xl") : "text-xl")}
                    style={{ paddingVertical: compact ? 0 : (isTV ? 12 : 8) }}
                >
                    {title} {!hideCount && <Text className={cn("text-muted-foreground ml-4", isTV && !compact ? "text-2xl" : "text-xl")}>{media.length}</Text>}
                </Text>
            </View>

            <View className="w-full" style={{ height: compact ? CARD_WIDTH * 1.5 : CARD_ROW_HEIGHT }}>
                <FlatList
                    data={visibleMedia as (AL_BaseAnime | AL_BaseManga)[]}
                    horizontal
                    focusable={false}
                    style={{ height: compact ? CARD_WIDTH * 1.5 : CARD_ROW_HEIGHT, width: "100%" }}
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
                    onEndReached={infiniteScroll ? onEndReached : undefined}
                    onEndReachedThreshold={0.4}
                />
            </View>
        </View>
    )
}
