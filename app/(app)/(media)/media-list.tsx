import { AL_BaseAnime, AL_BaseManga } from "@/api/generated/types"
import { __media_listPageContentAtom } from "@/atoms/media-list"
import { MediaEntryCard } from "@/components/features/media/media-entry-card"
import { Text } from "@/components/ui/text"
import { buildMediaEntryHref } from "@/lib/media-entry-route"
import { cn } from "@/lib/utils"
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list"
import { router } from "expo-router"
import { useAtomValue } from "jotai/react"
import React from "react"
import { Dimensions, Platform, View } from "react-native"

const { width } = Dimensions.get("screen")
const isTV = Platform.isTV
const NUM_COLUMNS = isTV ? 7 : 3
const SPACING = isTV ? 16 : 10
const PADDING_HORIZONTAL = isTV ? 28 : 20
const AVAILABLE_SPACE = width - (NUM_COLUMNS - 1) * SPACING - 2 * PADDING_HORIZONTAL
const CARD_WIDTH = AVAILABLE_SPACE / NUM_COLUMNS

export default function MediaListScreen() {
    const pageContent = useAtomValue(__media_listPageContentAtom)

    const title = pageContent?.title ?? ""
    const type = pageContent?.type ?? "anime"
    const media = pageContent?.media ?? []

    const keyExtractor = React.useCallback(
        (item: AL_BaseAnime | AL_BaseManga) => String(item.id),
        [],
    )

    const renderItem = React.useCallback(
        ({ item }: ListRenderItemInfo<AL_BaseAnime | AL_BaseManga>) => {
            return (
                <MediaEntryCard
                    type={type}
                    media={item as any}
                    cardWidth={CARD_WIDTH}
                    onPress={() => router.push(buildMediaEntryHref(item, type))}
                />
            )
        },
        [type],
    )

    return (
        <View className="flex-1 bg-background">
            <FlashList
                data={media}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                numColumns={NUM_COLUMNS}
                ListHeaderComponent={
                    <View
                        className={cn(
                            "flex-row items-center",
                            isTV ? "px-7 pt-6 pb-4" : "px-5 pt-4 pb-3",
                        )}
                    >
                        <Text
                            className={cn(
                                "font-bold text-foreground",
                                isTV ? "text-3xl" : "text-2xl",
                            )}
                        >
                            {title}
                        </Text>
                        <Text
                            className={cn(
                                "text-muted-foreground ml-4",
                                isTV ? "text-2xl" : "text-xl",
                            )}
                        >
                            {media.length}
                        </Text>
                    </View>
                }
                contentContainerStyle={{
                    paddingHorizontal: PADDING_HORIZONTAL,
                    paddingBottom: 32,
                }}
                removeClippedSubviews={!isTV}
                showsVerticalScrollIndicator={false}
            />
        </View>
    )
}
