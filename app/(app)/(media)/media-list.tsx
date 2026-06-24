import { FlashList } from "@shopify/flash-list"
import React from "react"
import { Dimensions, Text, View } from "react-native"

const { width } = Dimensions.get("screen")
// TV-only build: 7 columns aligns with the rest of the TV shelf layout.
const NUM_COLUMNS = 7
const SPACING = 20
const PADDING_HORIZONTAL = 28
const AVAILABLE_SPACE = width - (NUM_COLUMNS - 1) * SPACING - 2 * PADDING_HORIZONTAL

const CARD_WIDTH = AVAILABLE_SPACE / NUM_COLUMNS

type MediaListItem = {
    id: string
    title: string
    cover?: string
}

const SAMPLE_ITEMS: MediaListItem[] = [
    { id: "1", title: "Sample 1" },
    { id: "2", title: "Sample 2" },
    { id: "3", title: "Sample 3" },
    { id: "4", title: "Sample 4" },
    { id: "5", title: "Sample 5" },
    { id: "6", title: "Sample 6" },
    { id: "7", title: "Sample 7" },
]

export default function MediaListScreen() {
    return (
        <View className="flex-1 bg-background">
            <FlashList
                data={SAMPLE_ITEMS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View
                        style={{
                            width: CARD_WIDTH,
                            height: CARD_WIDTH * 1.5,
                            margin: SPACING / 2,
                        }}
                        className="bg-white/[0.04] rounded-xl"
                    >
                        <Text
                            className="text-white text-sm font-semibold p-3"
                            numberOfLines={2}
                        >
                            {item.title}
                        </Text>
                    </View>
                )}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={{
                    paddingHorizontal: PADDING_HORIZONTAL,
                    paddingBottom: 32,
                }}
                removeClippedSubviews={false}
                showsVerticalScrollIndicator={false}
            />
        </View>
    )
}
