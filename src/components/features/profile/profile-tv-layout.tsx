import { useIsTV } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import { getPlatformExternalPlayers } from "@/lib/player/external-players"
import { getPlayerPreferences, setPlayerPreferences } from "@/lib/player/player-preferences"
import { Ionicons } from "@expo/vector-icons"
import * as React from "react"
import { findNodeHandle, Pressable, ScrollView, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

// ─── Data types ───────────────────────────────────────────────────

export type TVSectionItem = {
    id: string
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail?: string
    accessory?: React.ReactNode
    onPress?: () => void
    hideChevron?: boolean
    isToggle?: boolean
    toggleValue?: boolean
    onToggle?: (value: boolean) => void
    renderRightPanel?: (ctx: {}) => React.ReactNode
}

export type TVSection = {
    id: string
    title: string
    icon?: React.ComponentProps<typeof Ionicons>["name"]
    show?: boolean
    items: TVSectionItem[]
}

// ─── Focusable item row ───────────────────────────────────────────

function TVContentItem({
    icon,
    label,
    detail,
    accessory,
    isFocused,
    onFocus,
    onPress,
    hideChevron,
    hasTVPreferredFocus,
    nextFocusRight,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail?: string
    accessory?: React.ReactNode
    isFocused: boolean
    onFocus?: () => void
    onPress?: () => void
    hideChevron?: boolean
    hasTVPreferredFocus?: boolean
    nextFocusRight?: number | null
}) {
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.03 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            className={cn(
                "flex-row items-center px-4 py-3.5 mx-2 rounded-xl",
                isFocused
                    ? "border border-brand-400/60 bg-white/[0.04]"
                    : "border border-transparent",
            )}
            onFocus={onFocus}
            onPress={onPress}
            focusable={true}
            hasTVPreferredFocus={hasTVPreferredFocus}
            {...({ nextFocusRight } as any)}
        >
            <Animated.View className="flex-row items-center flex-1" style={animatedStyle}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={isFocused ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)"}
                />
                <View className="ml-3 flex-1">
                    <Text
                        className={cn(
                            "text-sm font-medium",
                            isFocused ? "text-foreground" : "text-white/70",
                        )}
                    >
                        {label}
                    </Text>
                    {detail ? (
                        <Text className="mt-0.5 text-xs text-white/40">{detail}</Text>
                    ) : null}
                </View>
                {accessory ? (
                    <View className="mr-2 flex-row items-center gap-2">{accessory}</View>
                ) : null}
                {!hideChevron && (
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                )}
            </Animated.View>
        </Pressable>
    )
}

// ─── Section header (not focusable) ───────────────────────────────

function TVSectionHeader({ title }: { title: string }) {
    return (
        <View className="px-6 pt-5 pb-1.5">
            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                {title}
            </Text>
        </View>
    )
}

// ─── Player picker for right panel ────────────────────────────────

export function TVPlayerOptions() {
    const presets = React.useMemo(() => getPlatformExternalPlayers(), [])
    const [selected, setSelected] = React.useState<string | null>(null)

    React.useEffect(() => {
        const prefs = getPlayerPreferences()
        const template = prefs.externalPlayerTemplate
        if (!template) {
            setSelected(null)
            return
        }
        const match = presets.find(p => p.urlTemplate === template)
        setSelected(match ? match.id : "__custom__")
    }, [presets])

    const handleSelect = (presetId: string | null) => {
        if (presetId === null) {
            setSelected(null)
            setPlayerPreferences({ externalPlayerTemplate: null })
        } else {
            const preset = presets.find(p => p.id === presetId)
            if (preset) {
                setSelected(preset.id)
                setPlayerPreferences({ externalPlayerTemplate: preset.urlTemplate })
            }
        }
    }

    const options: { id: string | null; label: string; detail?: string }[] = [
        { id: null, label: "In-App player (mpv)" },
        ...presets.map(p => ({ id: p.id, label: p.name, detail: p.urlTemplate })),
    ]

    return (
        <View className="mt-4">
            <Text className="text-xs text-white/30 uppercase tracking-widest mb-3 px-1">
                Available Players
            </Text>
            {options.map((opt) => (
                <TVPlayerOptionRow
                    key={opt.id ?? "__builtin"}
                    label={opt.label}
                    detail={opt.detail}
                    isSelected={selected === opt.id}
                    onPress={() => handleSelect(opt.id)}
                />
            ))}
        </View>
    )
}

function TVPlayerOptionRow({
    label,
    detail,
    isSelected,
    onPress,
}: {
    label: string
    detail?: string
    isSelected: boolean
    onPress: () => void
}) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.02 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            className={cn(
                "flex-row items-center px-3 py-2.5 rounded-xl mb-1",
                isFocused && "border border-brand-400/60 bg-white/[0.04]",
            )}
            onPress={onPress}
            focusable={true}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
        >
            <Animated.View className="flex-row items-center flex-1" style={animatedStyle}>
                <View
                    className={cn(
                        "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                        isSelected ? "border-brand-400" : "border-white/30",
                    )}
                >
                    {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-brand-400" />}
                </View>
                <View className="flex-1">
                    <Text
                        className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-white" : "text-white/70",
                        )}
                    >
                        {label}
                    </Text>
                    {detail ? (
                        <Text className="text-xs text-white/40 mt-0.5">{detail}</Text>
                    ) : null}
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color="rgb(74, 222, 128)" />
                )}
            </Animated.View>
        </Pressable>
    )
}

// ─── Toggle for right column (Offline Mode, etc.) ──────────────────

function TVToggle({
    value,
    onToggle,
}: {
    value: boolean
    onToggle?: (val: boolean) => void
}) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.03 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <View className="mt-6">
            <Pressable
                className="flex-row items-center gap-3"
                onPress={() => onToggle?.(!value)}
                focusable={true}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            >
                <Animated.View
                    className={cn(
                        "w-14 h-8 rounded-full items-center justify-center",
                        isFocused
                            ? "bg-white border-2 border-brand-400/80"
                            : value
                                ? "bg-brand-500"
                                : "bg-white/20",
                    )}
                    style={animatedStyle}
                >
                    <View
                        className={cn(
                            "w-6 h-6 rounded-full absolute",
                            isFocused ? "bg-black" : "bg-white",
                            value ? "right-1" : "left-1",
                        )}
                    />
                </Animated.View>
                <Text className={cn("text-sm", isFocused ? "text-black font-semibold" : value ? "text-white" : "text-white/60")}>
                    {value ? "Enabled" : "Disabled"}
                </Text>
            </Pressable>
        </View>
    )
}

// ─── Action panel for right column (Clear Image Cache, Change URL, etc.) ──

export function TVActionPanel({
    description,
    actionLabel,
    onAction,
    isProcessing,
    statusLabel,
}: {
    description: string
    actionLabel: string
    onAction: () => void
    isProcessing?: boolean
    statusLabel?: string
}) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withTiming(isFocused ? 1.03 : 1, { duration: 150 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <View className="mt-2">
            <Text className="text-sm text-white/60 leading-5 mb-6">
                {description}
            </Text>

            <Pressable
                className={cn(
                    "flex-row items-center justify-center px-6 py-3.5 rounded-xl",
                    isFocused
                        ? "border border-brand-400/60 bg-brand-500/20"
                        : "border border-brand-400/30 bg-brand-500/10",
                    isProcessing && "opacity-50",
                )}
                onPress={isProcessing ? undefined : onAction}
                focusable={!isProcessing}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            >
                <Animated.View style={animatedStyle}>
                    <Text className="text-sm font-semibold text-white text-center">
                        {isProcessing ? (statusLabel || "Processing...") : actionLabel}
                    </Text>
                </Animated.View>
            </Pressable>
        </View>
    )
}

// ─── Main 2-column TV layout ──────────────────────────────────────

export function ProfileTVLayout({
    sections,
    viewerName,
    connectionLabel,
    connectionColor,
}: {
    sections: TVSection[]
    viewerName?: string
    connectionLabel: string
    connectionColor: string
}) {
    const isTV = useIsTV()

    const visibleSections = React.useMemo(
        () => sections.filter(s => s.show !== false),
        [sections]
    )

    const visibleItemIds = React.useMemo(
        () => visibleSections.flatMap(s => s.items.map(i => i.id)),
        [visibleSections]
    )

    // Init activeItemId to first item of first visible section (synchronous, no effect needed)
    const firstVisibleId = visibleItemIds[0] ?? ""
    const [activeItemId, setActiveItemId] = React.useState<string>(firstVisibleId)

    // Guard: reset when visible items structurally change and current id is no longer valid
    React.useEffect(() => {
        const allValid = visibleItemIds.includes(activeItemId)
        if (!allValid && visibleItemIds.length > 0) {
            const fallback = visibleItemIds[0]
            if (fallback) setActiveItemId(fallback)
        }
    }, [visibleItemIds.join(",")])

    // Refs for cross-panel focus navigation
    const rightPanelRef = React.useRef<View | null>(null)
    const [rightPanelNode, setRightPanelNode] = React.useState<number | null>(null)

    React.useEffect(() => {
        if (rightPanelRef.current) {
            setRightPanelNode(findNodeHandle(rightPanelRef.current))
        }
    }, [activeItemId])

    const activeItemSection = visibleSections.find(s =>
        s.items.some(i => i.id === activeItemId),
    )
    const activeItem = activeItemSection?.items.find(i => i.id === activeItemId)

    // First item across all sections (for hasTVPreferredFocus)
    const globalFirstItemId = visibleSections[0]?.items[0]?.id

    if (!isTV) return null

    return (
        <View className="flex-1 flex-row">
            {/* ── Left: MenuProfiles ── */}
            <View className="flex-1 pt-2">
                {/* Compact user info */}
                <View className="flex-row items-center gap-3 px-5 pb-3 border-b border-border/30 mb-1">
                    <View className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
                        <Ionicons name="person" size={18} color="rgba(255,255,255,0.5)" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-white" numberOfLines={1}>
                            {viewerName || "User"}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                            <View className={cn("h-1.5 w-1.5 rounded-full", connectionColor)} />
                            <Text className="text-[10px] text-white/40">{connectionLabel}</Text>
                        </View>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {visibleSections.map((section) => (
                        <View key={section.id}>
                            <TVSectionHeader title={section.title} />
                            {section.items.map((item, itemIdx) => (
                                <TVContentItem
                                    key={item.id}
                                    icon={item.icon}
                                    label={item.label}
                                    detail={item.detail}
                                    accessory={item.accessory}
                                    isFocused={item.id === activeItemId}
                                    onFocus={() => setActiveItemId(item.id)}
                                    onPress={item.onPress}
                                    hideChevron={item.hideChevron}
                                    hasTVPreferredFocus={item.id === globalFirstItemId}
                                    nextFocusRight={rightPanelNode}
                                />
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* ── Right: Opciones ── */}
            <View ref={rightPanelRef} className="w-[300px] border-l border-border/50 pt-2">
                {activeItem ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {activeItem.renderRightPanel ? (
                            <View className="px-4 pt-6">
                                <View className="flex-row items-center gap-3 mb-5">
                                    <View className="w-10 h-10 rounded-xl bg-brand-500/10 items-center justify-center">
                                        <Ionicons
                                            name={activeItem.icon}
                                            size={22}
                                            color="rgba(255,255,255,0.8)"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-bold text-white">
                                            {activeItem.label}
                                        </Text>
                                        <Text className="text-xs text-white/30">
                                            {activeItemSection?.title}
                                        </Text>
                                    </View>
                                </View>
                                {activeItem.renderRightPanel({})}
                            </View>
                        ) : (
                            <View className="px-5 pt-6">
                                <View className="w-14 h-14 rounded-2xl bg-brand-500/10 items-center justify-center mb-4">
                                    <Ionicons
                                        name={activeItem.icon}
                                        size={28}
                                        color="rgba(255,255,255,0.8)"
                                    />
                                </View>
                                <Text className="text-xl font-bold text-white mb-1">
                                    {activeItem.label}
                                </Text>
                                <Text className="text-xs text-white/30 mb-4">
                                    {activeItemSection?.title}
                                </Text>
                                {activeItem.detail ? (
                                    <Text className="text-sm text-white/80 leading-5">
                                        {activeItem.detail}
                                    </Text>
                                ) : null}

                                {activeItem.isToggle ? (
                                    <TVToggle
                                        value={activeItem.toggleValue ?? false}
                                        onToggle={activeItem.onToggle}
                                    />
                                ) : null}

                                {!activeItem.hideChevron && !activeItem.isToggle && !activeItem.renderRightPanel ? (
                                    <View className="mt-6">
                                        <Text className="text-xs text-white/30">Press OK to open</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </ScrollView>
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-sm text-white/20">No item selected</Text>
                    </View>
                )}
            </View>
        </View>
    )
}
