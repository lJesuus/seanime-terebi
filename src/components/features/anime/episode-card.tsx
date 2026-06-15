import { SeaImage } from "@/components/shared/sea-image"
import * as React from "react"
import { Dimensions, Platform, Pressable, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

const { width } = Dimensions.get("screen")
const CARD_WIDTH = (3 / 4) * width
const isTV = Platform.isTV

type EpisodeCardProps = {
    cardWidth?: number
    image: string
    imageBlurred?: boolean
    title: string
    episodeNumber: number
    totalEpisodes: number | undefined
    length: number | undefined
    onPress?: () => void
    progressPercent?: number
    disabled?: boolean
    thumbnailOverlay?: React.ReactNode
    animeTitle?: string
}

export const EpisodeCard = React.memo(function EpisodeCard(props: EpisodeCardProps) {
    const {
        cardWidth = CARD_WIDTH,
        image,
        imageBlurred,
        title,
        episodeNumber,
        totalEpisodes,
        length,
        onPress,
        progressPercent,
        disabled,
        thumbnailOverlay,
        animeTitle,
    } = props

    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    function handleFocus() {
        setIsFocused(true)
        scale.set(withTiming(1.05, { duration: 150 }))
    }

    function handleBlur() {
        setIsFocused(false)
        scale.set(withTiming(1, { duration: 150 }))
    }

    function handlePressIn() {
        if (!isFocused) {
            scale.set(withTiming(0.96, { duration: 100 }))
        }
    }

    function handlePressOut() {
        scale.set(withTiming(isFocused ? 1.05 : 1, { duration: 150 }))
    }

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled || !onPress}
            focusable={isTV}
            onFocus={isTV ? handleFocus : undefined}
            onBlur={isTV ? handleBlur : undefined}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[{ width: cardWidth }, animatedStyle]}>
                <View
                    style={{ borderRadius: 12, overflow: "hidden" }}
                    className={[
                        "relative mb-2 border-2",
                        isFocused ? "border-brand-400 shadow-2xl" : "border-transparent",
                    ].join(" ")}
                >
                    <SeaImage
                        source={{ uri: image }}
                        style={{ width: "100%", aspectRatio: 16 / 9 }}
                        contentFit="cover"
                        transition={120}
                        blurRadius={imageBlurred ? 18 : 0}
                    />
                    {!!progressPercent && progressPercent > 0 && (
                        <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 rounded-b-xl overflow-hidden">
                            <View
                                className="h-full bg-brand-400 rounded-bl-xl"
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                        </View>
                    )}
                    {thumbnailOverlay}
                </View>

                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    className={[
                        "text-lg tracking-tight font-semibold mb-1",
                        isFocused ? "text-brand-300" : "text-foreground",
                    ].join(" ")}
                >
                    {title}
                </Text>

                <View className="flex flex-row justify-between items-center">
                    <View className="flex flex-row flex-1 mr-2">
                        <Text
                            className={isFocused ? "text-brand-300/80" : "text-foreground"}
                            numberOfLines={1}
                        >
                            Episode {episodeNumber}
                            {totalEpisodes && (
                                <Text className="text-muted-foreground">
                                    /{totalEpisodes}
                                </Text>
                            )}
                            {animeTitle && (
                                <Text className="text-muted-foreground">
                                    {` - ${animeTitle}`}
                                </Text>
                            )}
                        </Text>
                    </View>

                    {length && <Text className="text-muted-foreground shrink-0">{length}m</Text>}
                </View>
            </Animated.View>
        </Pressable>
    )
})
