import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { Pressable, TextInput, View } from "react-native"
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

export type LibrarySearchBarProps = {
    value: string
    onChangeText: (text: string) => void
    placeholder?: string
    className?: string
    autoFocus?: boolean
}

export function LibrarySearchBar({
    value,
    onChangeText,
    placeholder = "Search...",
    className,
    autoFocus,
}: LibrarySearchBarProps) {
    const inputRef = React.useRef<TextInput>(null)
    const [tvFocused, setTvFocused] = React.useState(false)
    const tvScale = useSharedValue(1)

    const tvAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: tvScale.value }],
    }))

    function handleTVFocus() {
        setTvFocused(true)
        tvScale.set(withTiming(1.02, { duration: 150 }))
    }

    function handleTVBlur() {
        setTvFocused(false)
        tvScale.set(withTiming(1, { duration: 150 }))
    }

    function handleClear() {
        onChangeText("")
        inputRef.current?.focus()
    }

    return (
        <Pressable
            onPress={() => inputRef.current?.focus()}
            focusable
            onFocus={handleTVFocus}
            onBlur={handleTVBlur}
            style={{ flex: 1 }}
        >
            <Animated.View
                style={tvAnimatedStyle}
                className={cn(
                    "flex-row items-center h-11 rounded-2xl bg-white/[0.04] px-3 gap-2",
                    tvFocused ? "border-2 border-brand-400/80 shadow-2xl" : "border border-white/10",
                    className,
                )}
            >
                <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" />
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255,255,255,0.30)"
                    className="flex-1 text-white h-full"
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="never"
                    autoFocus={autoFocus}
                />
                {value.length > 0 && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
                        <Pressable onPress={handleClear} hitSlop={8}>
                            <View className="h-5 w-5 items-center justify-center rounded-full bg-white/15">
                                <Ionicons name="close" size={12} color="rgba(255,255,255,0.65)" />
                            </View>
                        </Pressable>
                    </Animated.View>
                )}
            </Animated.View>
        </Pressable>
    )
}
