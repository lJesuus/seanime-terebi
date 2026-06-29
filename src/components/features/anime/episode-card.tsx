import { SeaImage } from "@/components/shared/sea-image"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import * as React from "react"
import { Dimensions, Text, View } from "react-native"

const { width } = Dimensions.get("screen")
const CARD_WIDTH = (3 / 4) * width

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
    onFocus?: (e: any) => void
    onBlur?: (e: any) => void
}

/**
 * Uses the project's canonical {@link TvFocusablePressable} instead of a
 * raw React Native `Pressable`. The canonical wrapper defaults
 * `focusable` to `true` when no prop is passed — explicit pass-through
 * of `focusable={Platform.isTV}` was avoided because some non-certified
 * Android TV hardware returns `Platform.isTV === false`, which would
 * leave cards completely unfocusable. TvFocusable also provides the
 * Reanimated scale animation that the raw wrapper was hand-rolling;
 * the inner poster border and title color still react to focus via the
 * local `isFocused` state so the visual highlight survives.
 */
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
        onFocus: externalOnFocus,
        onBlur: externalOnBlur,
    } = props

    const [isFocused, setIsFocused] = React.useState(false)

    return (
        <TvFocusablePressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled || !onPress}
            onFocus={(e: any) => {
                setIsFocused(true)
                externalOnFocus?.(e)
            }}
            onBlur={(e: any) => {
                setIsFocused(false)
                externalOnBlur?.(e)
            }}
            scaleTo={1.05}
            // TvFocusable's default `focusedClassName` adds a brand border
            // around the whole card; we already style the inner poster
            // border when focused, so suppress the wrapper one to avoid
            // visual duplication.
            focusedClassName=""
            style={{ width: cardWidth }}
        >
            <View
                style={{ borderRadius: 12, overflow: "hidden" }}
                className={[
                    "relative mb-2 border-2",
                    isFocused ? "border-white/60 shadow-2xl" : "border-transparent",
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
        </TvFocusablePressable>
    )
})
