import { useIsTV } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import * as React from "react"
import { LayoutChangeEvent, Pressable, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

export type SegmentedControlOption<T extends string = string> = {
    value: T
    label: string
}

type SegmentedControlProps<T extends string = string> = {
    options: SegmentedControlOption<T>[]
    value: T
    onChange: (value: T) => void
    hasTVPreferredFocus?: boolean
}

function OptionPressable({ option, index, active, isTV, hasTVPreferredFocus, onPress }: {
    option: SegmentedControlOption
    index: number
    active: boolean
    isTV: boolean
    hasTVPreferredFocus: boolean | undefined
    onPress: () => void
}) {
    const [focused, setFocused] = React.useState(false)
    return (
        <Pressable
            onPress={onPress}
            focusable={isTV}
            hasTVPreferredFocus={isTV && hasTVPreferredFocus && index === 0}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
                "flex-1 items-center justify-center h-full rounded-full z-10",
                focused && "bg-white/20",
            )}
        >
            <Text
                className={cn(
                    "text-sm",
                    active ? "text-white font-semibold" : "text-white/40 font-medium",
                    focused && !active && "text-white/70",
                )}
            >
                {option.label}
            </Text>
        </Pressable>
    )
}

export function SegmentedControl<T extends string = string>({ options, value, onChange, hasTVPreferredFocus }: SegmentedControlProps<T>) {
    const isTV = useIsTV()
    const [width, setWidth] = React.useState(0)
    const activeIndex = options.findIndex(opt => opt.value === value)

    const translateX = useSharedValue(0)
    const padding = 4
    const pillWidth = width > 0 ? (width - padding * 2) / options.length : 0

    React.useEffect(() => {
        if (width > 0 && activeIndex !== -1) {
            translateX.value = withTiming(activeIndex * pillWidth, {
                duration: 180,
            })
        }
    }, [activeIndex, pillWidth, width])

    const handleLayout = (e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width)
    }

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            width: pillWidth,
        }
    })

    return (
        <View
            onLayout={handleLayout}
            className="flex-row items-center bg-black/40 p-1 rounded-full border border-white/5 relative h-11"
        >
            {width > 0 && (
                <Animated.View
                    style={[
                        animatedStyle,
                        {
                            position: "absolute",
                            left: padding,
                            top: padding,
                            bottom: padding,
                        },
                    ]}
                    className="bg-white/10 rounded-full"
                />
            )}
            {options.map((option, index) => {
                const active = index === activeIndex
                return (
                    <OptionPressable
                        key={option.value}
                        option={option}
                        index={index}
                        active={active}
                        isTV={isTV}
                        hasTVPreferredFocus={hasTVPreferredFocus}
                        onPress={() => onChange(option.value)}
                    />
                )
            })}
        </View>
    )
}
