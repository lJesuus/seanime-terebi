import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { format } from "date-fns"
import * as React from "react"
import { Platform, Pressable, Text, View, findNodeHandle } from "react-native"
import { SeaBottomSheet } from "./bottom-sheet"

type DatePickerProps = {
    className?: string
    value?: Date | null
    onChange?: (date: Date | null) => void
    placeholder?: string
    format?: string
    focusable?: boolean
    /** When true, sets nextFocusLeft to the picker's own native tag,
     * blocking LEFT navigation away from it. */
    blockLeft?: boolean
    /** When true, sets nextFocusRight to the picker's own native tag,
     * blocking RIGHT navigation away from it. */
    blockRight?: boolean
}

const DatePicker = ({
    className,
    value,
    onChange,
    placeholder = "Select date",
    format: dateFormat = "MM/dd/yyyy",
    focusable,
    blockLeft,
    blockRight,
    ...props
}: DatePickerProps) => {
    const [show, setShow] = React.useState(false)
    const [tempDate, setTempDate] = React.useState<Date | null>(null)
    const [focused, setFocused] = React.useState(false)
    const isIOS = Platform.OS === "ios"

    // Resolve the picker's native tag on layout so blockLeft/blockRight
    // can route nextFocusLeft/Right to the picker itself — same pattern
    // as TvFocusablePressable.
    const pickerRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)
    const [leftBlockTag, setLeftBlockTag] = React.useState<number | null>(null)
    const [rightBlockTag, setRightBlockTag] = React.useState<number | null>(null)
    const tagResolved = React.useRef(false)

    const handleLayout = React.useCallback(() => {
        if (tagResolved.current) return
        const node = pickerRef.current
        if (!node) return
        const tag = findNodeHandle(node)
        if (tag !== null) {
            if (blockLeft) setLeftBlockTag(tag)
            if (blockRight) setRightBlockTag(tag)
            if (blockLeft || blockRight) tagResolved.current = true
        }
    }, [blockLeft, blockRight])

    const handlePress = () => {
        setTempDate(value || new Date())
        setShow(true)
    }

    const handleChange = (_: any, selectedDate?: Date) => {
        if (isIOS) {
            // On iOS, we don't hide the picker until confirm is pressed
            if (selectedDate) {
                setTempDate(selectedDate)
            }
        } else {
            // On Android, the picker is automatically dismissed when a date is selected
            setShow(false)
            if (selectedDate && onChange) {
                onChange(selectedDate)
            }
        }
    }

    const handleClear = (e: any) => {
        e.stopPropagation()
        if (onChange) {
            onChange(null)
        }
    }

    const handleCancel = () => {
        setShow(false)
    }

    const handleConfirm = () => {
        setShow(false)
        if (tempDate && onChange) {
            onChange(tempDate)
        }
    }

    return (
        <View>

            <Pressable
                ref={pickerRef}
                onPress={handlePress}
                onLayout={handleLayout}
                focusable={focusable}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={cn(
                    "flex-row items-center justify-between h-12 w-full rounded-2xl border bg-white/[0.04] px-4 active:bg-white/10",
                    focused ? "border-brand-400 border-2 bg-white/[0.08]" : "border-white/10",
                    className,
                )}
                // @ts-ignore - nextFocusLeft/Right are TV fork props
                nextFocusLeft={blockLeft && leftBlockTag ? leftBlockTag : undefined}
                // @ts-ignore
                nextFocusRight={blockRight && rightBlockTag ? rightBlockTag : undefined}
                {...props}
            >
                <Text className={cn("text-foreground", !value && "text-muted-foreground")}>
                    {value ? format(value, dateFormat) : placeholder}
                </Text>
                <View className="flex flex-row items-center">
                    {value && (
                        <Pressable onPress={handleClear} className="mr-2 p-1">
                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                        </Pressable>
                    )}
                    <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                </View>
            </Pressable>
            {isIOS && <SeaBottomSheet
                open={show}
                onOpenChange={setShow}
            >
                <View className="w-full">
                    <View className="flex flex-row justify-between items-center px-4 py-2 border-b border-border">
                        <Pressable onPress={handleCancel} className="p-2">
                            <Text className="text-primary text-base">Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleConfirm} className="p-2">
                            <Text className="text-primary text-base font-medium">Confirm</Text>
                        </Pressable>
                    </View>
                    <DateTimePicker
                        value={tempDate || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={handleChange}
                        style={{ backgroundColor: "transparent", width: "100%", marginHorizontal: "auto" }}
                    />
                </View>

            </SeaBottomSheet>}
            {show && !isIOS && (
                <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="calendar"
                    onChange={handleChange}
                />
            )}
        </View>
    )
}

DatePicker.displayName = "DatePicker"

export { DatePicker }
