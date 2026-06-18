import { useIsTV } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import * as React from "react"
import { Pressable, Text, View } from "react-native"

type OptionRowProps = {
    label: string
    detail?: string
    active: boolean
    onPress: () => void
    className?: string
    monoDetail?: boolean
}

const BRAND_ACCENT = "rgb(97 82 223)"

export function OptionRow({
    label,
    detail,
    active,
    onPress,
    className,
    monoDetail = true,
}: OptionRowProps) {
    const isTV = useIsTV()
    return (
        <Pressable
            className={cn("flex-row items-center px-4 py-3.5", className)}
            onPress={onPress}
            focusable={isTV}
        >
            <View className="flex-1 mr-3">
                <Text className="text-foreground text-sm font-medium">{label}</Text>
                {/* {detail ? (
                 <Text
                 className={cn(
                 "text-white/35 text-xs mt-0.5",
                 monoDetail && "font-mono",
                 )}
                 numberOfLines={1}
                 >
                 {detail}
                 </Text>
                 ) : null} */}
            </View>
            {active ? (
                <Ionicons name="checkmark-circle" size={20} color={BRAND_ACCENT} />
            ) : (
                <View className="w-5 h-5 rounded-full border border-white/20" />
            )}
        </Pressable>
    )
}
