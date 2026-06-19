import { useIsTV } from "@/hooks/use-device"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import * as React from "react"
import { findNodeHandle, Pressable, Text, View } from "react-native"

type LabeledSwitchProps = {
    label: string
    checked: boolean
    onToggle: () => void
    disabled?: boolean
    helper?: string
    blockLeft?: boolean
}

export function LabeledSwitch({ label, checked, onToggle, disabled, helper, blockLeft }: LabeledSwitchProps) {
    const isTV = useIsTV()
    const pressableRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)
    const [leftBlockTag, setLeftBlockTag] = React.useState<number | null>(null)
    const [focused, setFocused] = React.useState(false)
    const tagResolved = React.useRef(false)

    const handleLayout = React.useCallback(() => {
        if (!blockLeft || !isTV || tagResolved.current) return
        const node = pressableRef.current
        if (node) {
            const tag = findNodeHandle(node)
            if (tag !== null) {
                setLeftBlockTag(tag)
                tagResolved.current = true
            }
        }
    }, [blockLeft, isTV])

    const handlePress = React.useCallback(() => {
        onToggle()
        // On TV, a state-driven toggle often re-shapes surrounding DOM
        // (e.g. Smart search flips the search-mode and reveals/hides the
        // search query field and episode selector). RN TV's focus engine
        // sometimes drops focus instead of preserving it on the persistent
        // toggle. Rebind focus on the next frame so D-pad nudges stay on
        // the toggle that the user just pressed.
        if (isTV) {
            setTimeout(() => {
                pressableRef.current?.focus()
            }, 16)
        }
    }, [isTV, onToggle])

    return (
        <Pressable
            ref={pressableRef}
            onPress={handlePress}
            disabled={disabled}
            focusable={isTV}
            onLayout={handleLayout}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            nextFocusLeft={blockLeft && isTV && leftBlockTag ? leftBlockTag : undefined}
            className={cn(
                "flex-row items-center justify-between gap-3 rounded-xl px-3 py-2 -mx-3",
                focused && "bg-white/[0.07]",
            )}
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
