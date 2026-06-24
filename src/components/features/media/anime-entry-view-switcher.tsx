import { useIsTV } from "@/hooks/use-device"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { Pressable, Text, View } from "react-native"

export type AnimeEntryView = "library" | "torrentstream" | "onlinestream" | "downloaded"

type AnimeEntryViewSwitcherProps = {
    currentView: AnimeEntryView
    onViewChange: (view: AnimeEntryView) => void
    isOffline?: boolean
    hiddenViews?: Set<AnimeEntryView>
    nextFocusUp?: number | null
    nextFocusDown?: number | null
}

const VIEW_ITEMS: Array<{ label: string, icon: React.ComponentProps<typeof Ionicons>["name"], view: AnimeEntryView }> = [
    { label: "Library", icon: "library-outline", view: "library" },
    { label: "Stream", icon: "play-circle-outline", view: "torrentstream" },
    { label: "Online", icon: "globe-outline", view: "onlinestream" },
    { label: "Downloads", icon: "download-outline", view: "downloaded" },
]

const OFFLINE_DISABLED_VIEWS: Set<AnimeEntryView> = new Set(["library", "torrentstream", "onlinestream"])

export function AnimeEntryViewSwitcher({ currentView, onViewChange, isOffline, hiddenViews, nextFocusUp, nextFocusDown }: AnimeEntryViewSwitcherProps) {
    const isTV = useIsTV()
    const visibleItems = React.useMemo(
        () => hiddenViews?.size ? VIEW_ITEMS.filter(item => !hiddenViews.has(item.view)) : VIEW_ITEMS,
        [hiddenViews],
    )

    if (isTV) {
        return (
            <View className="w-full bg-background px-4 py-2">
                <View className="flex-row gap-2 justify-center">
                    {visibleItems.map((item, idx) => {
                        const disabled = isOffline && OFFLINE_DISABLED_VIEWS.has(item.view)
                        return (
                            <TvFocusablePressable
                                key={item.view}
                                className={cn(
                                    "flex-row items-center justify-center h-11 px-4 rounded-md gap-2",
                                    currentView === item.view ? "bg-brand-500/20" : "",
                                )}
                                focusedClassName="bg-white/10 border border-brand-400/60"
                                onPress={disabled ? undefined : () => onViewChange(item.view)}
                                nextFocusUp={idx === 0 ? (nextFocusUp ?? undefined) : undefined}
                                nextFocusDown={idx === visibleItems.length - 1 ? (nextFocusDown ?? undefined) : undefined}
                            >
                                <Ionicons
                                    name={item.icon}
                                    size={20}
                                    color={currentView === item.view && !disabled ? "#a78bfa" : disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)"}
                                />
                                <Text
                                    className={cn(
                                        "font-semibold text-sm",
                                        currentView === item.view ? "text-brand-300" : "text-white/60",
                                        disabled ? "text-white/25" : "",
                                    )}
                                >
                                    {item.label}
                                </Text>
                            </TvFocusablePressable>
                        )
                    })}
                </View>
            </View>
        )
    }

    return (
        <View className="w-full bg-background">
            <View className="flex-row gap-1 px-3">
                {visibleItems.map((item) => {
                    const disabled = isOffline && OFFLINE_DISABLED_VIEWS.has(item.view)
                    return (
                        <Pressable
                            key={item.view}
                            onPress={disabled ? undefined : () => onViewChange(item.view)}
                            className="flex-1 py-3 items-center"
                        >
                            <Ionicons
                                name={item.icon}
                                size={20}
                                color={currentView === item.view && !disabled ? "#a78bfa" : disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)"}
                            />
                            <Text
                                className={cn(
                                    "text-xs mt-0.5",
                                    currentView === item.view && !disabled ? "text-brand-300 font-semibold" : "text-gray",
                                    disabled ? "text-white/25" : "",
                                )}
                            >
                                {item.label}
                            </Text>
                            {currentView === item.view && (
                                <View className="w-5 h-0.5 rounded-full bg-brand-500 mt-0.5" />
                            )}
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}
