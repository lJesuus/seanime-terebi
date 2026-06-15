import { AL_BaseAnime, AL_MediaListStatus, Anime_ScheduleItem } from "@/api/generated/types"
import { useGetAnimeCollectionSchedule } from "@/api/hooks/anime_collection.hooks"
import { useAnilistAnimeEntryListDataAtom } from "@/atoms/anilist-collection.atoms"
import { ScheduleSettings, scheduleSettingsAtom } from "@/atoms/schedule.atoms"
import { MediaEntryCard } from "@/components/features/media/media-entry-card"
import { TabFadeView } from "@/components/layout/tab-fade-view"
import { LabeledSwitch } from "@/components/shared/labeled-switch"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { RowDivider } from "@/components/shared/row-divider"
import { Surface } from "@/components/shared/surface"
import { SeaBottomSheet } from "@/components/ui/bottom-sheet"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsTV } from "@/hooks/use-device"
import { useIsServerConnected } from "@/lib/offline"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import { addDays, addWeeks, format, isSameDay, setMonth, setYear, startOfWeek, subWeeks } from "date-fns"
import { router } from "expo-router"
import { useAtom } from "jotai/react"
import sortBy from "lodash/sortBy"
import * as React from "react"
import { ActivityIndicator, Dimensions, FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

const SCREEN_WIDTH = Dimensions.get("screen").width
const isTV = Platform.isTV
const NUM_COLUMNS = isTV ? 5 : 3
const GRID_SPACING = isTV ? 16 : 10
const GRID_PADDING = isTV ? 28 : 14
const CARD_WIDTH = (SCREEN_WIDTH - (NUM_COLUMNS - 1) * GRID_SPACING - 2 * GRID_PADDING) / NUM_COLUMNS
const ROW_HEIGHT = CARD_WIDTH * 1.5 + GRID_SPACING

export default function ScheduleScreen() {
    const isConnected = useIsServerConnected()
    const {
        data: schedule,
        isLoading,
        isFetching,
        refetch,
    } = useGetAnimeCollectionSchedule({ enabled: isConnected })

    useIOSScrollRefreshRateWorkaround()

    const [settings, setSettings] = useAtom(scheduleSettingsAtom)
    const { animeEntryListData } = useAnilistAnimeEntryListDataAtom()

    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [monthPickerOpen, setMonthPickerOpen] = React.useState(false)

    // week navigation
    const [currentWeekStart, setCurrentWeekStart] = React.useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 }),
    )
    const [selectedDate, setSelectedDate] = React.useState(() => new Date())

    const weekDays = React.useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
    }, [currentWeekStart])

    // filter by list status and group by date
    const eventsByDate = React.useMemo(() => {
        if (!schedule) return new Map<string, ScheduleEvent[]>()
        const map = new Map<string, ScheduleEvent[]>()

        for (const item of schedule) {
            if (!item.dateTime) continue

            // status filter
            const entryData = animeEntryListData?.[String(item.mediaId)]
            if (entryData?.status && !settings.listStatuses.includes(entryData.status)) {
                continue
            }

            const localDate = format(new Date(item.dateTime), "yyyy-MM-dd")
            const existing = map.get(localDate) ?? []

            const isWatched = entryData?.progress
                ? entryData.progress >= item.episodeNumber
                : false

            existing.push({ ...item, isWatched })
            map.set(localDate, existing)
        }

        for (const [key, items] of map) {
            map.set(key, sortBy(items, [(i) => i.dateTime, (i) => i.episodeNumber]))
        }
        return map
    }, [schedule, settings.listStatuses, animeEntryListData])

    const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
    const selectedDayEvents = eventsByDate.get(selectedDateKey) ?? []

    const monthYearLabel = format(addDays(currentWeekStart, 3), "yyyy MMMM")

    function goToPreviousWeek() {
        setCurrentWeekStart((prev) => subWeeks(prev, 1))
    }

    function goToNextWeek() {
        setCurrentWeekStart((prev) => addWeeks(prev, 1))
    }

    function getEventCount(date: Date): number {
        const key = format(date, "yyyy-MM-dd")
        return eventsByDate.get(key)?.length ?? 0
    }

    function jumpToMonth(year: number, month: number) {
        const target = setYear(setMonth(new Date(), month), year)
        // select the first monday of that month's week
        const weekStart = startOfWeek(target, { weekStartsOn: 1 })
        setCurrentWeekStart(weekStart)
        setSelectedDate(target)
        setMonthPickerOpen(false)
    }

    function goToToday() {
        const today = new Date()
        setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
        setSelectedDate(today)
    }

    const refreshControl = isConnected ? (
        <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor="rgba(255,255,255,0.45)"
        />
    ) : undefined

    return (
        <View className="flex-1 bg-background">
            <OfflineBanner />
            <TabFadeView>

                <View className={cn("flex-row items-center justify-between", isTV ? "px-6 pt-4 pb-2" : "px-4 pt-2 pb-1")}>
                    <TvFocusablePressable onPress={goToToday} scaleAmount={1.1} hitSlop={12}>
                        <View className="p-2">
                            <Ionicons name="today-outline" size={isTV ? 28 : 22} color="rgba(255,255,255,0.8)" />
                        </View>
                    </TvFocusablePressable>

                    <View className={cn("flex-row items-center", isTV ? "gap-5" : "gap-3")}>
                        <TvFocusablePressable onPress={goToPreviousWeek} scaleAmount={1.1} hitSlop={12}>
                            <View className="p-1">
                                <Ionicons name="chevron-back" size={isTV ? 26 : 20} color="rgba(255,255,255,0.6)" />
                            </View>
                        </TvFocusablePressable>
                        <TvFocusablePressable onPress={() => setMonthPickerOpen(true)} scaleAmount={1.03} hitSlop={8}>
                            <View className="px-2 py-1 rounded-lg">
                                <Text className={cn("font-semibold text-white/90", isTV ? "text-2xl" : "text-base")}>
                                    {monthYearLabel}
                                </Text>
                            </View>
                        </TvFocusablePressable>
                        <TvFocusablePressable onPress={goToNextWeek} scaleAmount={1.1} hitSlop={12}>
                            <View className="p-1">
                                <Ionicons name="chevron-forward" size={isTV ? 26 : 20} color="rgba(255,255,255,0.6)" />
                            </View>
                        </TvFocusablePressable>
                    </View>

                    <TvFocusablePressable onPress={() => setSettingsOpen(true)} scaleAmount={1.1} hitSlop={12}>
                        <View className="p-2">
                            <Ionicons name="options-outline" size={isTV ? 28 : 22} color="rgba(255,255,255,0.8)" />
                        </View>
                    </TvFocusablePressable>
                </View>

                <WeekDaySelector
                    weekDays={weekDays}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    getEventCount={getEventCount}
                />

                {!isConnected ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Ionicons name="cloud-offline-outline" size={40} color="rgba(255,255,255,0.2)" />
                        <Text className="text-white/30 text-sm mt-3 text-center">
                            Connect to your server to see your schedule
                        </Text>
                    </View>
                ) : isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="rgba(255,255,255,0.4)" />
                    </View>
                ) : selectedDayEvents.length === 0 ? (
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}
                        refreshControl={refreshControl}
                    >
                        <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.15)" />
                        <Text className="text-white/30 text-sm mt-3 text-center">
                            Nothing scheduled for {format(selectedDate, "EEEE, MMM d")}
                        </Text>
                    </ScrollView>
                ) : (
                    <ScheduleGrid
                        events={selectedDayEvents}
                        settings={settings}
                        refreshControl={refreshControl}
                    />
                )}

                <ScheduleSettingsSheet
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    settings={settings}
                    onSettingsChange={setSettings}
                />

                <MonthYearPicker
                    open={monthPickerOpen}
                    onOpenChange={setMonthPickerOpen}
                    currentDate={selectedDate}
                    onSelect={jumpToMonth}
                />
            </TabFadeView>
        </View>
    )
}

type ScheduleEvent = Anime_ScheduleItem & {
    isWatched: boolean
}

///////////////////////////////////////////////////////////////////////////////
// Helpers
///////////////////////////////////////////////////////////////////////////////

function TvFocusablePressable({
    children,
    onPress,
    scaleAmount = 1.05,
    className = "",
    style,
    hitSlop,
    ...props
}: {
    children: React.ReactNode
    onPress?: () => void
    scaleAmount?: number
    className?: string
    style?: any
    hitSlop?: number
}) {
    const isTV = useIsTV()
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withSpring(isFocused ? scaleAmount : 1, { damping: 15, stiffness: 200 }))
    }, [isFocused, scale, scaleAmount])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            focusable={isTV}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            hitSlop={hitSlop}
            {...props}
        >
            <Animated.View
                className={cn(
                    className,
                    isFocused && isTV ? "border border-brand-400/60" : "",
                )}
                style={isTV ? [style, animatedStyle] : style}
            >
                {children}
            </Animated.View>
        </Pressable>
    )
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function WeekDaySelector({
    weekDays,
    selectedDate,
    onSelectDate,
    getEventCount,
}: {
    weekDays: Date[]
    selectedDate: Date
    onSelectDate: (date: Date) => void
    getEventCount: (date: Date) => number
}) {
    const isTV = useIsTV()
    const today = new Date()

    return (
        <View className={cn("flex-row justify-around", isTV ? "px-4 py-4" : "px-2 py-3")}>
            {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selectedDate)
                const count = getEventCount(day)
                const dayNumber = format(day, "d")

                return (
                    <WeekDayItem
                        key={i}
                        day={day}
                        dayIndex={i}
                        isToday={isToday}
                        isSelected={isSelected}
                        count={count}
                        dayNumber={dayNumber}
                        onSelect={onSelectDate}
                        isTV={isTV}
                    />
                )
            })}
        </View>
    )
}

function WeekDayItem({
    day,
    dayIndex,
    isToday,
    isSelected,
    count,
    dayNumber,
    onSelect,
    isTV,
}: {
    day: Date
    dayIndex: number
    isToday: boolean
    isSelected: boolean
    count: number
    dayNumber: string
    onSelect: (date: Date) => void
    isTV: boolean
}) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withSpring(isFocused ? 1.12 : 1, { damping: 15, stiffness: 200 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            focusable={isTV}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="items-center flex-1"
            onPress={() => onSelect(day)}
            hitSlop={4}
        >
            <Animated.View
                className={cn(
                    "items-center",
                    isFocused && isTV ? "rounded-xl bg-white/5 px-2 py-1" : "",
                )}
                style={isTV ? animatedStyle : undefined}
            >
                <Text
                    className={cn(
                        "font-medium mb-1.5",
                        isTV ? "text-sm" : "text-xs",
                        isSelected ? "text-white" : "text-white/40",
                    )}
                >
                    {DAY_LABELS[dayIndex]}
                </Text>

                <View
                    className={cn(
                        "items-center justify-center border border-transparent rounded-full",
                        isTV ? "size-12" : "size-9",
                        isSelected && isToday && "bg-white",
                        isSelected && !isToday && "bg-white/40",
                        !isSelected && isToday && "border-white/30",
                    )}
                >
                    <Text
                        className={cn(
                            "font-bold",
                            isTV ? "text-lg" : "text-sm",
                            !isSelected ? (isToday ? "text-white" : "text-white/60") : "text-black",
                        )}
                    >
                        {dayNumber}
                    </Text>
                </View>

                {count > 0 && (
                    <Text
                        className={cn(
                            "mt-1 font-semibold",
                            isTV ? "text-xs" : "text-[10px]",
                            isSelected ? "text-brand-300" : "text-white/30",
                        )}
                    >
                        {count}
                    </Text>
                )}
                {count === 0 && <View className={isTV ? "h-4" : "h-3.5"} />}
            </Animated.View>
        </Pressable>
    )
}


function ScheduleGrid({
    events,
    settings,
    refreshControl,
}: {
    events: ScheduleEvent[]
    settings: ScheduleSettings
    refreshControl: React.ReactElement<React.ComponentProps<typeof RefreshControl>> | undefined
}) {
    const isTV = useIsTV()
    const getItemLayout = React.useCallback((_: ArrayLike<ScheduleEvent> | null | undefined, index: number) => {
        const rowIndex = Math.floor(index / NUM_COLUMNS)

        return {
            length: ROW_HEIGHT,
            offset: (isTV ? 16 : 8) + (rowIndex * ROW_HEIGHT),
            index,
        }
    }, [])

    return (
        <Animated.View entering={FadeIn.duration(200)} className="flex-1">
            <FlatList
                data={events}
                numColumns={NUM_COLUMNS}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => `${item.mediaId}-${item.episodeNumber}-${item.dateTime}`}
                renderItem={({ item }) => (
                    <ScheduleCardWrapper item={item} settings={settings} />
                )}
                getItemLayout={getItemLayout}
                initialNumToRender={NUM_COLUMNS * 3}
                maxToRenderPerBatch={NUM_COLUMNS * 2}
                updateCellsBatchingPeriod={16}
                windowSize={7}
                removeClippedSubviews={!isTV}
                contentContainerStyle={{
                    gap: GRID_SPACING,
                    paddingHorizontal: GRID_PADDING,
                    paddingBottom: 80,
                    paddingTop: isTV ? 16 : 8,
                }}
                columnWrapperStyle={{ gap: GRID_SPACING }}
                refreshControl={refreshControl}
            />
        </Animated.View>
    )
}


function ScheduleCardWrapper({
    item,
    settings,
}: {
    item: ScheduleEvent
    settings: ScheduleSettings
}) {
    const isTV = useIsTV()
    const media: AL_BaseAnime = React.useMemo(() => ({
        id: item.mediaId,
        coverImage: { large: item.image, extraLarge: item.image },
        title: { userPreferred: item.title },
        format: item.isMovie ? "MOVIE" : undefined,
    }), [item.mediaId, item.image, item.title, item.isMovie])

    const localTime = item.dateTime
        ? format(new Date(item.dateTime), "HH:mm")
        : item.time

    const isWatchedAndDimmed = item.isWatched && settings.indicateWatchedEpisodes

    return (
        <View style={{ width: CARD_WIDTH, opacity: isWatchedAndDimmed ? 0.45 : 1 }}>
            <MediaEntryCard
                type="anime"
                media={media}
                cardWidth={CARD_WIDTH}
                hideProgress
                preferFetchedSheetMedia
                hideLibraryBadge
                onPress={() => router.push(`/(app)/entry/anime/${item.mediaId}`)}
                overlay={<View className="absolute top-0 left-0 right-0 z-10" style={{ height: CARD_WIDTH * 1.275 }} pointerEvents="none">
                    <View className="absolute top-1.5 left-1.5 flex-row items-center gap-1">
                        <View className="bg-black/70 rounded px-1.5 py-0.5">
                            <Text className={cn("font-bold text-gray-200", isTV ? "text-sm" : "text-[11px]")}>
                                {localTime}
                            </Text>
                        </View>
                    </View>

                    <View className={cn("absolute top-1.5 right-1.5 bg-black/70 rounded px-1.5 py-0.5", isTV ? "px-2 py-1" : "")}>
                        <Text className={cn("font-bold text-white/80", isTV ? "text-sm" : "text-[11px]")}>
                            {item.isSeasonFinale && !item.isMovie && "FIN. "}{item.isMovie ? "Movie" : "Ep. " + item.episodeNumber}
                        </Text>
                    </View>

                    {isWatchedAndDimmed && (
                        <View className={cn("absolute bottom-1.5 right-1.5 bg-black/70 rounded-full", isTV ? "p-1.5" : "p-1")}>
                            <Ionicons name="checkmark" size={isTV ? 16 : 12} color="rgba(255,255,255,0.5)" />
                        </View>
                    )}
                </View>}
            />
        </View>
    )
}


const STATUS_OPTIONS: { label: string; value: AL_MediaListStatus }[] = [
    { label: "Watching", value: "CURRENT" },
    { label: "Planning", value: "PLANNING" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Paused", value: "PAUSED" },
    { label: "Repeating", value: "REPEATING" },
]

function ScheduleSettingsSheet({
    open,
    onOpenChange,
    settings,
    onSettingsChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    settings: ScheduleSettings
    onSettingsChange: (update: ScheduleSettings | ((prev: ScheduleSettings) => ScheduleSettings)) => void
}) {
    const isTV = useIsTV()
    function toggleStatus(status: AL_MediaListStatus) {
        onSettingsChange((prev) => {
            const current = prev.listStatuses
            const next = current.includes(status)
                ? current.filter((s) => s !== status)
                : [...current, status]
            return { ...prev, listStatuses: next }
        })
    }

    function toggleIndicateWatched() {
        onSettingsChange((prev) => ({
            ...prev,
            indicateWatchedEpisodes: !prev.indicateWatchedEpisodes,
        }))
    }

    return (
        <SeaBottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Schedule settings"
            snapPoints={["45%"]}
        >
            <View className="gap-5">
                <View className="gap-2">
                    <Text className={cn("font-medium text-white/50", isTV ? "text-base" : "text-sm")}>Filter by status</Text>
                    <Surface variant="muted" className="overflow-hidden">
                        {STATUS_OPTIONS.map((opt, i) => {
                            const active = settings.listStatuses.includes(opt.value)
                            return (
                                <React.Fragment key={opt.value}>
                                    {i > 0 && <RowDivider />}
                                    <SettingsStatusItem
                                        label={opt.label}
                                        active={active}
                                        onPress={() => toggleStatus(opt.value)}
                                        isTV={isTV}
                                    />
                                </React.Fragment>
                            )
                        })}
                    </Surface>
                </View>

                <View className="gap-3 px-1">
                    <LabeledSwitch
                        label="Indicate watched episodes"
                        helper="Dim episodes you've already watched"
                        checked={settings.indicateWatchedEpisodes}
                        onToggle={toggleIndicateWatched}
                    />
                </View>
            </View>
        </SeaBottomSheet>
    )
}

function SettingsStatusItem({
    label,
    active,
    onPress,
    isTV,
}: {
    label: string
    active: boolean
    onPress: () => void
    isTV: boolean
}) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withSpring(isFocused ? 1.02 : 1, { damping: 15, stiffness: 200 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            focusable={isTV}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            className="flex-row items-center justify-between px-4 py-3"
        >
            <Animated.View
                className={cn("flex-1 flex-row items-center justify-between", isFocused && isTV ? "rounded-lg bg-white/5 px-2" : "")}
                style={isTV ? animatedStyle : undefined}
            >
                <Text className={cn("", isTV ? "text-base" : "text-sm", active ? "text-white" : "text-white/50")}>
                    {label}
                </Text>
                {active && (
                    <Ionicons name="checkmark" size={isTV ? 22 : 18} color="rgb(97,82,223)" />
                )}
            </Animated.View>
        </Pressable>
    )
}

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function MonthYearPicker({
    open,
    onOpenChange,
    currentDate,
    onSelect,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentDate: Date
    onSelect: (year: number, month: number) => void
}) {
    const isTV = useIsTV()
    const [displayYear, setDisplayYear] = React.useState(() => currentDate.getFullYear())

    // reset to the current date's year when the sheet opens
    React.useEffect(() => {
        if (open) setDisplayYear(currentDate.getFullYear())
    }, [open, currentDate])

    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const today = new Date()
    const todayMonth = today.getMonth()
    const todayYear = today.getFullYear()

    return (
        <SeaBottomSheet
            open={open}
            onOpenChange={onOpenChange}
            snapPoints={["40%"]}
        >
            <View className="gap-4">
                <View className="flex-row items-center justify-center gap-5">
                    <TvFocusablePressable onPress={() => setDisplayYear((y) => y - 1)} scaleAmount={1.1} hitSlop={12}>
                        <View className="p-2">
                            <Ionicons name="chevron-back" size={isTV ? 28 : 22} color="rgba(255,255,255,0.6)" />
                        </View>
                    </TvFocusablePressable>
                    <Text className={cn("font-bold text-white min-w-[60px] text-center", isTV ? "text-2xl" : "text-xl")}>
                        {displayYear}
                    </Text>
                    <TvFocusablePressable onPress={() => setDisplayYear((y) => y + 1)} scaleAmount={1.1} hitSlop={12}>
                        <View className="p-2">
                            <Ionicons name="chevron-forward" size={isTV ? 28 : 22} color="rgba(255,255,255,0.6)" />
                        </View>
                    </TvFocusablePressable>
                </View>

                <View className={cn("flex-row flex-wrap justify-center gap-2", isTV ? "px-4" : "px-2")}>
                    {MONTHS.map((label, monthIndex) => {
                        const isCurrentSelection = displayYear === currentYear && monthIndex === currentMonth
                        const isToday = displayYear === todayYear && monthIndex === todayMonth

                        return (
                            <MonthItem
                                key={monthIndex}
                                label={label}
                                monthIndex={monthIndex}
                                isCurrentSelection={isCurrentSelection}
                                isToday={isToday}
                                isTV={isTV}
                                onPress={() => onSelect(displayYear, monthIndex)}
                            />
                        )
                    })}
                </View>
            </View>
        </SeaBottomSheet>
    )
}

function MonthItem({
    label,
    monthIndex,
    isCurrentSelection,
    isToday,
    isTV,
    onPress,
}: {
    label: string
    monthIndex: number
    isCurrentSelection: boolean
    isToday: boolean
    isTV: boolean
    onPress: () => void
}) {
    const [isFocused, setIsFocused] = React.useState(false)
    const scale = useSharedValue(1)

    React.useEffect(() => {
        scale.set(withSpring(isFocused ? 1.08 : 1, { damping: 15, stiffness: 200 }))
    }, [isFocused, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <Pressable
            focusable={isTV}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            className={cn(
                "items-center justify-center rounded-lg",
                isTV ? "w-[23%] py-4" : "w-[23%] py-3",
                isCurrentSelection && "bg-brand-500",
                !isCurrentSelection && isToday && "border border-white/20",
                !isCurrentSelection && !isToday && "bg-white/[0.04]",
            )}
        >
            <Animated.View style={isTV ? animatedStyle : undefined}>
                <Text
                    className={cn(
                        "font-semibold",
                        isTV ? "text-base" : "text-sm",
                        isCurrentSelection ? "text-black" : isToday ? "text-black" : "text-white/60",
                        isFocused && isTV && !isCurrentSelection ? "text-white" : "",
                    )}
                >
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    )
}
