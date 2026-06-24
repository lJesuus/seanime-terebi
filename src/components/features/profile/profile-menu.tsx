import { RowDivider } from "@/components/shared/row-divider"
import { Surface } from "@/components/shared/surface"
import { FormSectionLabel } from "@/components/ui/form-field"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import * as React from "react"
import { Pressable, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

export function ProfileMenuSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View>
            <FormSectionLabel className="mb-2 px-1">{title}</FormSectionLabel>
            <Surface variant="muted" className="overflow-hidden">
                {children}
            </Surface>
        </View>
    )
}

export function ProfileMenuItem({
    icon,
    label,
    detail,
    accessory,
    onPress,
    hideChevron,
    isFocused,
    onFocus,
    onBlur,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail?: string
    accessory?: React.ReactNode
    onPress?: () => void
    hideChevron?: boolean
    isFocused?: boolean
    onFocus?: () => void
    onBlur?: () => void
}) {
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.03 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    const content = (
        <Animated.View style={animatedStyle}>
            <Ionicons name={icon} size={20} color="rgba(255,255,255,0.6)" />
            <View className="ml-3 flex-1">
                <Text className="text-foreground text-sm font-medium">{label}</Text>
                {detail ? (
                    <Text className="mt-0.5 text-xs text-white/40">{detail}</Text>
                ) : null}
            </View>
            {accessory ? (
                <View className="mr-2 flex-row items-center gap-2">
                    {accessory}
                </View>
            ) : null}
            {!hideChevron && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />}
        </Animated.View>
    )

    return (
        <Pressable
            className={cn(
                "flex-row items-center px-4 py-3.5",
                isFocused && "border border-brand-400/60 rounded-xl bg-white/[0.04]",
            )}
            onPress={onPress}
            focusable={true}
            onFocus={onFocus}
            onBlur={onBlur}
        >
            {content}
        </Pressable>
    )
}

export function ProfileMenuToggle({
    icon,
    label,
    detail,
    value,
    onToggle,
    isFocused,
    onFocus,
    onBlur,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail?: string
    value: boolean
    onToggle: (value: boolean) => void
    isFocused?: boolean
    onFocus?: () => void
    onBlur?: () => void
}) {
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.03 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    const content = (
        <Animated.View className="flex-row items-center flex-1" style={animatedStyle}>
            <Ionicons name={icon} size={20} color="rgba(255,255,255,0.6)" />
            <View className="ml-3 flex-1">
                <Text className="text-foreground text-sm font-medium">{label}</Text>
                {detail ? (
                    <Text className="mt-0.5 text-xs text-white/40">{detail}</Text>
                ) : null}
            </View>
            <Switch checked={value} onCheckedChange={onToggle} />
        </Animated.View>
    )

    return (
        <Pressable
            className={cn(
                "flex-row items-center px-4 py-3.5",
                isFocused && "border border-brand-400/60 rounded-xl bg-white/[0.04]",
            )}
            onPress={() => onToggle(!value)}
            focusable={true}
            onFocus={onFocus}
            onBlur={onBlur}
        >
            {content}
        </Pressable>
    )
}

export function ProfileSubpageHeader({
    title,
    detail,
}: {
    title: string
    detail?: string
}) {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
        <View className="flex-row items-center gap-3 px-4 py-3">
            <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                focusable={true}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={cn(
                    "p-1 rounded-lg",
                    isFocused && "border border-brand-400/60 bg-white/[0.04]",
                )}
            >
                <Ionicons name="chevron-back" size={24} color="white" />
            </Pressable>
            <View className="flex-1">
                <Text className="text-xl font-bold text-foreground">{title}</Text>
                {detail ? (
                    <Text className="mt-0.5 text-xs text-white/40">{detail}</Text>
                ) : null}
            </View>
        </View>
    )
}

export { RowDivider }
