import { Text } from "@/components/ui/text"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { useIsTV } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import * as React from "react"
import { ScrollView, View } from "react-native"

type MediaGenreSelectorOption = {
    value: string | null
    label: string
}

type MediaGenreSelectorProps = {
    options: MediaGenreSelectorOption[]
    value: string | null
    onChange: (value: string | null) => void
    className?: string
}

export function MediaGenreSelector({ options, value, onChange, className }: MediaGenreSelectorProps) {
    const isTV = useIsTV()
    return (
        <View className={cn("mb-2", className)}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    gap: isTV ? 12 : 8,
                    paddingHorizontal: isTV ? 28 : 16,
                    paddingVertical: isTV ? 10 : 6,
                }}
            >
                {options.map(option => {
                    const selected = option.value === value
                    return (
                        <TvFocusablePressable
                            key={option.label}
                            onPress={() => onChange(option.value)}
                            className={cn(
                                "rounded-xl border items-center justify-center",
                                isTV ? "px-8 py-3" : "min-h-9 px-4",
                                selected
                                    ? "border-brand-500/70 bg-brand-500/18"
                                    : "border-white/10 bg-white/[0.04]",
                            )}
                            focusedClassName="border-brand-400 bg-brand-500/30"
                        >
                            <Text
                                className={cn(
                                    "font-medium",
                                    isTV ? "text-lg" : "text-sm",
                                    selected ? "text-brand-400" : "text-white/65",
                                )}
                            >
                                {option.label}
                            </Text>
                        </TvFocusablePressable>
                    )
                })}
            </ScrollView>
        </View>
    )
}