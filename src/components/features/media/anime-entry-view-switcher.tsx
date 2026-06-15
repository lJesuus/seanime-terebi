import { useIsTV } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { Pressable, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

export type AnimeEntryView = "library" | "torrentstream" | "onlinestream" | "info" | "downloaded"

type AnimeEntryViewSwitcherProps = {
    currentView: AnimeEntryView
    onViewChange: (view: AnimeEntryView) => void
    isOffline?: boolean
    hiddenViews?: Set<AnimeEntryView>
}

const VIEW_ITEMS: Array<{ label: string, icon: React.ComponentProps<typeof Ionicons>["name"], view: AnimeEntryView }> = [
    { label: "Library", icon: "library-outline", view: "library" },
    { label: "Stream", icon: "play-circle-outline", view: "torrentstream" },
    { label: "Online", icon: "globe-outline", view: "onlinestream" },
    { label: "Info", icon: "information-circle-outline", view: "info" },
    { label: "Downloads", icon: "download-outline", view: "downloaded" },
]

const OFFLINE_DISABLED_VIEWS: Set<AnimeEntryView> = new Set(["library", "torrentstream", "onlinestream"])

export function AnimeEntryViewSwitcher({ currentView, onViewChange, isOffline, hiddenViews }: AnimeEntryViewSwitcherProps) {
    const isTV = useIsTV()
    const visibleItems = React.useMemo(
        () => hiddenViews?.size ? VIEW_ITEMS.filter(item => !hiddenViews.has(item.view)) : VIEW_ITEMS,
        [hiddenViews],
    )

    return (
        <View className="w-full border-b border-white/10 bg-background">
            <View
                className={cn(
                    "flex-row",
                    isTV ? "px-4 py-1" : "px-3",
                )}
            >
                {visibleItems.map((item, idx) => {
                    const disabled = isOffline && OFFLINE_DISABLED_VIEWS.has(item.view)
                    return (
                        <AnimeEntryTab
                            key={item.view}
                            label={item.label}
                            icon={item.icon}
                            active={currentView === item.view}
                            onPress={() => onViewChange(item.view)}
                            disabled={disabled}
                            isTV={isTV}
                        />
                    )
                })}
            </View>
        </View>
    )
}

type AnimeEntryTabProps = {
    label: string
    icon: React.ComponentProps<typeof Ionicons>["name"]
    active: boolean
    onPress: () => void
    disabled?: boolean
    isTV: boolean
}

function AnimeEntryTab({ label, icon, active, onPress, disabled, isTV }: AnimeEntryTabProps) {
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
            onPress={disabled ? undefined : onPress}
            className={cn(
                "flex-row items-center justify-center",
                isTV ? "px-5 py-2.5 rounded-lg" : "flex-1 py-3",
            )}
        >
            <Animated.View
                className={cn(
                    "flex-row items-center justify-center gap-2 rounded-lg px-3 py-1.5",
                    active ? "bg-brand-500/20" : "",
                    isFocused && isTV ? "bg-white/10 border border-brand-400/60" : "",
                )}
                style={isTV ? animatedStyle : undefined}
            >
                <Ionicons
                    name={icon}
                    size={isTV ? 20 : 20}
                    color={active && !disabled ? "#a78bfa" : isFocused && isTV ? "#a78bfa" : disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)"}
                />
                {isTV && (
                    <Animated.Text
                        className={cn(
                            "font-semibold",
                            active ? "text-brand-300" : isFocused ? "text-brand-300" : "text-white/60",
                            disabled ? "text-white/25" : "",
                        )}
                        style={{ fontSize: 14 }}
                    >
                        {label}
                    </Animated.Text>
                )}
            </Animated.View>

            {!isTV && (
                <View className="items-center">
                    <Animated.Text
                        className={cn(
                            "text-xs mt-0.5",
                            active && !disabled ? "text-brand-300 font-semibold" : "text-gray",
                            disabled ? "text-white/25" : "",
                        )}
                    >
                        {label}
                    </Animated.Text>
                    {active && (
                        <View className="w-5 h-0.5 rounded-full bg-brand-500 mt-0.5" />
                    )}
                </View>
            )}
        </Pressable>
    )
}
