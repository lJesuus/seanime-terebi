import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { cn } from "@/lib/utils"
import { getPlatformExternalPlayers } from "@/lib/player/external-players"
import { getPlayerPreferences, setPlayerPreferences } from "@/lib/player/player-preferences"
import { Ionicons } from "@expo/vector-icons"
import * as React from "react"
import { findNodeHandle, ScrollView, Text, View } from "react-native"

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
    renderRightPanel?: (ctx: { leftColumnNode?: number | null }) => React.ReactNode
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
    nextFocusRight,
    nextFocusLeft,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail?: string
    accessory?: React.ReactNode
    isFocused: boolean
    onFocus?: () => void
    onPress?: () => void
    hideChevron?: boolean
    nextFocusRight?: number | null
    nextFocusLeft?: number | null
}) {
    return (
        <TvFocusablePressable
            scaleTo={1.03}
            className={cn(
                "flex-row items-center px-4 py-3.5 mx-2 rounded-xl",
                isFocused
                    ? "border border-brand-400/60 bg-white/[0.04]"
                    : "border border-transparent",
            )}
            focusedClassName="border-brand-400/60 bg-white/[0.04]"
            onFocus={onFocus}
            onPress={onPress}
            nextFocusRight={nextFocusRight ?? undefined}
            nextFocusLeft={nextFocusLeft ?? undefined}
        >
            <View className="flex-row items-center flex-1">
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
            </View>
        </TvFocusablePressable>
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

export function TVPlayerOptions({
    nextFocusLeft,
}: {
    nextFocusLeft?: number | null
}) {
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
                    nextFocusLeft={nextFocusLeft}
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
    nextFocusLeft,
}: {
    label: string
    detail?: string
    isSelected: boolean
    onPress: () => void
    nextFocusLeft?: number | null
}) {
    return (
        <TvFocusablePressable
            scaleTo={1.02}
            className="flex-row items-center px-3 py-2.5 rounded-xl mb-1"
            focusedClassName="border border-brand-400/60 bg-white/[0.04]"
            onPress={onPress}
            nextFocusLeft={nextFocusLeft ?? undefined}
        >
            <View className="flex-row items-center flex-1">
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
            </View>
        </TvFocusablePressable>
    )
}

// ─── Toggle for right column (Offline Mode, etc.) ──────────────────

function TVToggle({
    value,
    onToggle,
    nextFocusLeft,
}: {
    value: boolean
    onToggle?: (val: boolean) => void
    nextFocusLeft?: number | null
}) {
    return (
        <View className="mt-6">
            <TvFocusablePressable
                className="flex-row items-center gap-3"
                focusedClassName=""
                onPress={() => onToggle?.(!value)}
                nextFocusLeft={nextFocusLeft ?? undefined}
            >
                <View
                    className={cn(
                        "w-14 h-8 rounded-full items-center justify-center",
                        value ? "bg-brand-500" : "bg-white/20",
                    )}
                >
                    <View
                        className={cn(
                            "w-6 h-6 rounded-full absolute bg-white",
                            value ? "right-1" : "left-1",
                        )}
                    />
                </View>
                <Text className={cn("text-sm", value ? "text-white" : "text-white/60")}>
                    {value ? "Enabled" : "Disabled"}
                </Text>
            </TvFocusablePressable>
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
    nextFocusLeft,
}: {
    description: string
    actionLabel: string
    onAction: () => void
    isProcessing?: boolean
    statusLabel?: string
    nextFocusLeft?: number | null
}) {
    return (
        <View className="mt-2">
            <Text className="text-sm text-white/60 leading-5 mb-6">
                {description}
            </Text>

            <TvFocusablePressable
                className={cn(
                    "flex-row items-center justify-center px-6 py-3.5 rounded-xl border border-brand-400/30 bg-brand-500/10",
                    isProcessing && "opacity-50",
                )}
                focusedClassName="border-brand-400/60 bg-brand-500/20"
                onPress={isProcessing ? undefined : onAction}
                focusable={!isProcessing}
                nextFocusLeft={nextFocusLeft ?? undefined}
            >
                <Text className="text-sm font-semibold text-white text-center">
                    {isProcessing ? (statusLabel || "Processing...") : actionLabel}
                </Text>
            </TvFocusablePressable>
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
    const leftColumnRef = React.useRef<View>(null)
    const [leftColumnNode, setLeftColumnNode] = React.useState<number | null>(null)

    React.useEffect(() => {
        if (rightPanelRef.current) {
            setRightPanelNode(findNodeHandle(rightPanelRef.current))
        }
    }, [activeItemId])

    React.useEffect(() => {
        if (leftColumnRef.current) {
            setLeftColumnNode(findNodeHandle(leftColumnRef.current))
        }
    }, [])

    const activeItemSection = visibleSections.find(s =>
        s.items.some(i => i.id === activeItemId),
    )
    const activeItem = activeItemSection?.items.find(i => i.id === activeItemId)

    // Scroll to focused item
    const scrollRef = React.useRef<ScrollView>(null)

    const handleItemFocus = React.useCallback((itemId: string, itemIndex: number) => {
        setActiveItemId(itemId)
        // Estimate Y position: user header ~72px + sum of preceding section headers and items
        if (scrollRef.current) {
            let y = 72
            for (const section of visibleSections) {
                y += 38 // section header
                for (const item of section.items) {
                    if (item.id === itemId) {
                        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: false })
                        return
                    }
                    y += 52 // item height
                }
            }
        }
    }, [visibleSections])

    return (
        <View className="flex-1 flex-row">
            {/* ── Left: MenuProfiles ── */}
            <View ref={leftColumnRef} className="w-1/3 pt-2">
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

                <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
                    {visibleSections.map((section) => (
                        <View key={section.id}>
                            <TVSectionHeader title={section.title} />
                            {section.items.map((item, itemIdx) => {
                                const globalIdx = visibleSections
                                    .slice(0, visibleSections.indexOf(section))
                                    .reduce((sum, s) => sum + s.items.length, 0) + itemIdx
                                return (
                                    <TVContentItem
                                        key={item.id}
                                        icon={item.icon}
                                        label={item.label}
                                        detail={item.detail}
                                        accessory={item.accessory}
                                        isFocused={item.id === activeItemId}
                                        onFocus={() => handleItemFocus(item.id, globalIdx)}
                                        onPress={item.onPress}
                                        hideChevron={item.hideChevron}
                                        nextFocusRight={rightPanelNode}
                                    />
                                )
                            })}
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* ── Right: Opciones ── */}
            <View ref={rightPanelRef} className="w-2/3 border-l border-border/50 pt-2">
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
                                {activeItem.renderRightPanel({ leftColumnNode })}
                            </View>
                        ) : (
                            <View className="px-5 pt-6">
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
                                {activeItem.detail ? (
                                    <Text className="text-sm text-white/80 leading-5">
                                        {activeItem.detail}
                                    </Text>
                                ) : null}

                                {activeItem.isToggle ? (
                                    <TVToggle
                                        value={activeItem.toggleValue ?? false}
                                        onToggle={activeItem.onToggle}
                                        nextFocusLeft={leftColumnNode}
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
