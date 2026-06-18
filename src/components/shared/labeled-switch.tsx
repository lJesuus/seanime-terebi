import { useIsTV } from "@/hooks/use-device"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import * as React from "react"
import { Pressable, Text, View } from "react-native"

type LabeledSwitchProps = {
    label: string
    checked: boolean
    onToggle: () => void
    disabled?: boolean
    helper?: string
}

export function LabeledSwitch({ label, checked, onToggle, disabled, helper }: LabeledSwitchProps) {
    const isTV = useIsTV()
    return (
        <Pressable
            onPress={onToggle}
            disabled={disabled}
            focusable={isTV}
            className="flex-row items-center justify-between gap-3"
        >
            <View className="flex-1 gap-0.5">
                <Text className={cn("text-sm font-medium", checked ? "text-white" : "text-white/70")}>
                    {label}
                </Text>
                {!!helper && (
                    <Text className="text-xs leading-4 text-white/35">
                        {helper}
                    </Text>
                )}
            </View>
            <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
        </Pressable>
    )
}
