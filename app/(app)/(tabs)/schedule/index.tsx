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
import { SeaSideDrawer } from "@/components/ui/sea-side-drawer"
import { TvFocusablePressable as Focusable } from "@/components/ui/tv-focusable"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsServerConnected } from "@/lib/offline"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import { addDays, addWeeks, format, isSameDay, setMonth, setYear, startOfWeek, subWeeks } from "date-fns"
import { router } from "expo-router"
import { useAtom } from "jotai/react"
import sortBy from "lodash/sortBy"
import * as React from "react"
import { AccessibilityInfo, ActivityIndicator, Dimensions, FlatList, Pressable, RefreshControl, ScrollView, Text, View, findNodeHandle } from "react-native"
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

// TV-only build: these sizing constants pick the larger of the two paths.
const SCREEN_WIDTH = Dimensions.get("screen").width
const NUM_COLUMNS = 5
const GRID_SPACING = 16
const GRID_PADDING = 28
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

    // Ref that points at the gear-icon button in the header row. Captured so
    // we can programmatically restore focus on it after the settings drawer
    // closes (BACK button or tap-out). TV focus restoration on Android TV is
    // unreliable across modal-style panels; doing it ourselves guarantees the
    // user returns to the same button they came from.
    const settingsButtonRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)

    // Ref attached to the first status row inside the schedule settings
    // drawer. SeaSideDrawer steers its initial focus here so the user lands
    // on the first row ("Watching") instead of the title, and the row itself
    // blocks UP so DPAD-UP from the first item does not walk focus out of
    // the drawer toward the page header.
    const firstStatusRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)

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

    // When the schedule settings drawer closes (e.g. TV physical BACK
    // button), restart the native TV focus engine on the gear-icon button.
    // Both `.focus()` on a Pressable ref and `UIManager.dispatchViewManagerCommand`
    // proved unreliable on actual hardware (non-certified Android TV loses the
    // focus and tvOS sometimes ignores the dispatch when the modal Portal is
    // unmounting). `AccessibilityInfo.setAccessibilityFocus(tag)` posts a
    // native focus request through the OS accessibility/focus engine — the
    // same channel assistive-technology uses — and is the only RN API known to
    // reliably route to Android's `requestFocus()` and tvOS's
    // `becomeFirstResponder()` even mid-Unmount. The 360 ms delay skips past
    // the drawer's close animation (200 ms) plus a small buffer so the
    // underlying View is interactive before the focus command lands.
    React.useEffect(() => {
        if (settingsOpen) return
        const node = settingsButtonRef.current
        if (!node) return
        const tag = findNodeHandle(node)
        if (tag == null) return
        const timer = setTimeout(() => {
            AccessibilityInfo.setAccessibilityFocus(tag)
        }, 360)
        return () => clearTimeout(timer)
    }, [settingsOpen])

    return (
        <View className="flex-1 bg-background">
            <OfflineBanner />
            <TabFadeView>

                <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                    <Focusable
                        onPress={goToToday}
                        hitSlop={12}
                        focusedClassName="bg-white/10"
                        className="flex-row items-center gap-2 px-2 py-2 rounded-md"
                    >
                        <Ionicons name="calendar" size={22} color="rgba(255,255,255,0.85)" />
                        <Text className="font-medium text-white/85 text-base" numberOfLines={1}>
                            Hoy: {format(new Date(), "d MMM")}
                        </Text>
                    </Focusable>

                    <View className="flex-row items-center gap-5">
                        <TvFocusablePressable onPress={goToPreviousWeek}  hitSlop={12}>
                            <View className="p-1">
                                <Ionicons name="chevron-back" size={26} color="rgba(255,255,255,0.6)" />
                            </View>
                        </TvFocusablePressable>
                        <TvFocusablePressable onPress={() => setMonthPickerOpen(true)}  hitSlop={8}>
                            <View className="px-2 py-1 rounded-lg">
                                <Text className="font-semibold text-white/90 text-2xl">
                                    {monthYearLabel}
                                </Text>
                            </View>
                        </TvFocusablePressable>
                        <TvFocusablePressable onPress={goToNextWeek}  hitSlop={12}>
                            <View className="p-1">
                                <Ionicons name="chevron-forward" size={26} color="rgba(255,255,255,0.6)" />
                            </View>
                        </TvFocusablePressable>
                    </View>

                    <Focusable
                        ref={settingsButtonRef}
                        onPress={() => setSettingsOpen(true)}
                        hitSlop={12}
                        focusedClassName="bg-white/10"
                        className="rounded-md p-2"
                    >
                        <Ionicons name="options-outline" size={28} color="rgba(255,255,255,0.85)" />
                    </Focusable>
                </View>

                <WeekDaySelector
                    weekDays={weekDays}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    getEventCount={getEventCount}
                    onNavigatePrevWeek={goToPreviousWeek}
                    onNavigateNextWeek={goToNextWeek}
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
                    firstFocusRef={firstStatusRef}
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
    className = "",
    style,
    hitSlop,
    ...props
}: {
    children: React.ReactNode
    onPress?: () => void
    className?: string
    style?: any
    hitSlop?: number
}) {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
        <Pressable
            focusable={true}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            hitSlop={hitSlop}
            {...props}
        >
            <View
                className={cn(
                    className,
                    isFocused ? "border border-brand-400/60" : "border border-transparent",
                )}
                style={style}
            >
                {children}
            </View>
        </Pressable>
    )
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function WeekDaySelector({
    weekDays,
    selectedDate,
    onSelectDate,
    getEventCount,
    onNavigatePrevWeek,
    onNavigateNextWeek,
}: {
    weekDays: Date[]
    selectedDate: Date
    onSelectDate: (date: Date) => void
    getEventCount: (date: Date) => number
    onNavigatePrevWeek?: () => void
    onNavigateNextWeek?: () => void
}) {
    const today = new Date()
    const [navDirection, setNavDirection] = React.useState<"prev" | "next" | null>(null)

    const handlePrevWeek = React.useCallback(() => {
        setNavDirection("prev")
        onNavigatePrevWeek?.()
    }, [onNavigatePrevWeek])

    const handleNextWeek = React.useCallback(() => {
        setNavDirection("next")
        onNavigateNextWeek?.()
    }, [onNavigateNextWeek])

    React.useEffect(() => {
        if (navDirection) {
            const timer = setTimeout(() => setNavDirection(null), 100)
            return () => clearTimeout(timer)
        }
    }, [navDirection])

    return (
        <View className="flex-row items-center px-4 py-4">
            <Pressable
                focusable
                onFocus={handlePrevWeek}
                style={{ width: 1, height: 40, opacity: 0 }}
            />
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
                        // First TV focus on this screen must land on today's day
                        // cell. The prev/next-week rules below steer focus when
                        // the user has just navigated to a different week and
                        // need to enter it at the appropriate end (Sunday for
                        // `prev`, Monday for `next`).
                        hasTVPreferredFocus={
                            isToday ||
                            (i === 0 && navDirection === "next") ||
                            (i === 6 && navDirection === "prev")
                        }
                    />
                )
            })}
            <Pressable
                focusable
                onFocus={handleNextWeek}
                style={{ width: 1, height: 40, opacity: 0 }}
            />
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
    hasTVPreferredFocus,
}: {
    day: Date
    dayIndex: number
    isToday: boolean
    isSelected: boolean
    count: number
    dayNumber: string
    onSelect: (date: Date) => void
    hasTVPreferredFocus?: boolean
}) {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
        <Pressable
            focusable={true}
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => {
                setIsFocused(true)
                onSelect(day)
            }}
            onBlur={() => setIsFocused(false)}
            className="items-center flex-1"
            onPress={() => onSelect(day)}
            hitSlop={4}
        >
            <View
                className={cn(
                    "items-center",
                    isFocused ? "rounded-xl bg-white/5 px-2 py-1" : "",
                )}
            >
                <Text
                    className={cn(
                        "font-medium mb-1.5 text-sm",
                        isSelected ? "text-white" : "text-white/40",
                    )}
                >
                    {DAY_LABELS[dayIndex]}
                </Text>

                <View
                    className={cn(
                        "items-center justify-center border border-transparent rounded-full size-12",
                        isSelected && isToday && "bg-white",
                        isSelected && !isToday && "bg-white/40",
                        !isSelected && isToday && "border-white/30",
                    )}
                >
                    <Text
                        className={cn(
                            "font-bold text-lg",
                            !isSelected ? (isToday ? "text-white" : "text-white/60") : "text-black",
                        )}
                    >
                        {dayNumber}
                    </Text>
                </View>

                <View className="mt-1 h-4 items-center justify-center">
                    {count > 0 && (
                        <Text
                            className={cn(
                                "font-semibold text-xs",
                                isSelected ? "text-brand-300" : "text-white/30",
                            )}
                        >
                            {count}
                        </Text>
                    )}
                </View>
            </View>
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
    const getItemLayout = React.useCallback((_: ArrayLike<ScheduleEvent> | null | undefined, index: number) => {
        const rowIndex = Math.floor(index / NUM_COLUMNS)

        return {
            length: ROW_HEIGHT,
            offset: 16 + (rowIndex * ROW_HEIGHT),
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
                contentContainerStyle={{
                    gap: GRID_SPACING,
                    paddingHorizontal: GRID_PADDING,
                    paddingBottom: 80,
                    paddingTop: 16,
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
                            <Text className="font-bold text-gray-200 text-sm">
                                {localTime}
                            </Text>
                        </View>
                    </View>

                    <View className="absolute top-1.5 right-1.5 bg-black/70 rounded px-2 py-1">
                        <Text className="font-bold text-white/80 text-sm">
                            {item.isSeasonFinale && !item.isMovie && "FIN. "}{item.isMovie ? "Movie" : "Ep. " + item.episodeNumber}
                        </Text>
                    </View>

                    {isWatchedAndDimmed && (
                        <View className="absolute bottom-1.5 right-1.5 bg-black/70 rounded-full p-1.5">
                            <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.5)" />
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
    firstFocusRef,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    settings: ScheduleSettings
    onSettingsChange: (update: ScheduleSettings | ((prev: ScheduleSettings) => ScheduleSettings)) => void
    // `| null` so the slot accepts the ref produced by
    // `useRef<React.ComponentRef<typeof Pressable>>(null)` — whose
    // `.current` is `View | null` rather than the slot's plain `View`.
    firstFocusRef?: React.RefObject<React.ComponentRef<typeof Pressable> | null>
}) {
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
        <SeaSideDrawer
            open={open}
            onOpenChange={onOpenChange}
            title="Schedule settings"
            widthFraction={0.55}
            maxWidth={520}
            firstFocusRef={firstFocusRef}
        >
            <View className="gap-5">
                <View className="gap-2">
                    <Text className="font-medium text-white/50 text-base">Filter by status</Text>
                    <Surface variant="muted" className="overflow-hidden">
                        {STATUS_OPTIONS.map((opt, i) => {
                            const active = settings.listStatuses.includes(opt.value)
                            const isFirst = i === 0
                            return (
                                <React.Fragment key={opt.value}>
                                    {i > 0 && <RowDivider />}
                                    {isFirst ? (
                                        // First row gets the explicit focus chain:
                                        // - `hasTVPreferredFocus` so the focus
                                        //   engine picks it on parent-focus
                                        //   re-entry.
                                        // - `ref={firstFocusRef}` so
                                        //   SeaSideDrawer's `firstFocusRef`
                                        //   prop can steer initial focus here
                                        //   on drawer mount.
                                        // - `blockUp` is the user-requested
                                        //   guard so DPAD-UP does not walk
                                        //   out of the drawer toward the
                                        //   header buttons.
                                        <Focusable
                                            ref={firstFocusRef}
                                            hasTVPreferredFocus
                                            noScale
                                            blockLeft
                                            blockRight
                                            blockUp
                                            focusedClassName="bg-white/10"
                                            className="flex-row items-center justify-between px-4 py-3 rounded-md"
                                            onPress={() => toggleStatus(opt.value)}
                                        >
                                            <Text className={cn("text-base", active ? "text-white" : "text-white/50")}>
                                                {opt.label}
                                            </Text>
                                            {active && (
                                                <Ionicons name="checkmark" size={22} color="rgb(97,82,223)" />
                                            )}
                                        </Focusable>
                                    ) : (
                                        <SettingsStatusItem
                                            label={opt.label}
                                            active={active}
                                            onPress={() => toggleStatus(opt.value)}
                                        />
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </Surface>
                </View>

                <View className="gap-3 px-1">
                    {/* block* pin the toggle's focus chain to itself on every
                        axis: LEFT/RIGHT can't escape sideways, DOWN past the
                        toggle keeps focus on the toggle (nextFocusDown = self)
                        rather than letting the focus engine walk into the
                        drawer's bottom guard. The drawer's bottom guard is a
                        safety net for any unblocked row below. */}
                    <LabeledSwitch
                        label="Indicate watched episodes"
                        helper="Dim episodes you've already watched"
                        checked={settings.indicateWatchedEpisodes}
                        onToggle={toggleIndicateWatched}
                        noScale
                        blockLeft
                        blockRight
                        blockDown
                    />
                </View>
            </View>
        </SeaSideDrawer>
    )
}

function SettingsStatusItem({
    label,
    active,
    onPress,
}: {
    label: string
    active: boolean
    onPress: () => void
}) {
    // Each row inside the SeaSideDrawer must trap LEFT/RIGHT focus so the
    // user can't escape the drawer sideways. The drawer's bottom guard
    // (in sea-side-drawer.tsx) handles DOWN past the last focusable by
    // wrapping focus back to the title, so no explicit blockDown is needed
    // on individual rows. `noScale` strips the scale-up animation so the
    // border highlight alone signals focus on TV — the dense rows would
    // otherwise jitter every DPAD press.
    return (
        <Focusable
            onPress={onPress}
            noScale
            blockLeft
            blockRight
            focusedClassName="bg-white/10"
            className="flex-row items-center justify-between px-4 py-3 rounded-md"
        >
            <Text className={cn("text-base", active ? "text-white" : "text-white/50")}>
                {label}
            </Text>
            {active && (
                <Ionicons name="checkmark" size={22} color="rgb(97,82,223)" />
            )}
        </Focusable>
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
                    <TvFocusablePressable onPress={() => setDisplayYear((y) => y - 1)}  hitSlop={12}>
                        <View className="p-2">
                            <Ionicons name="chevron-back" size={28} color="rgba(255,255,255,0.6)" />
                        </View>
                    </TvFocusablePressable>
                    <Text className="font-bold text-white min-w-[60px] text-center text-2xl">
                        {displayYear}
                    </Text>
                    <TvFocusablePressable onPress={() => setDisplayYear((y) => y + 1)}  hitSlop={12}>
                        <View className="p-2">
                            <Ionicons name="chevron-forward" size={28} color="rgba(255,255,255,0.6)" />
                        </View>
                    </TvFocusablePressable>
                </View>

                <View className="flex-row flex-wrap justify-center gap-2 px-4">
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
    monthIndex: _monthIndex,
    isCurrentSelection,
    isToday,
    onPress,
}: {
    label: string
    monthIndex: number
    isCurrentSelection: boolean
    isToday: boolean
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
            focusable={true}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPress={onPress}
            className={cn(
                "items-center justify-center rounded-lg w-[23%] py-4",
                isCurrentSelection && "bg-brand-500",
                !isCurrentSelection && isToday && "border border-white/20",
                !isCurrentSelection && !isToday && "bg-white/[0.04]",
            )}
        >
            <Animated.View style={animatedStyle}>
                <Text
                    className={cn(
                        "font-semibold text-base",
                        isCurrentSelection ? "text-black" : isToday ? "text-black" : "text-white/60",
                        isFocused && !isCurrentSelection ? "text-white" : "",
                    )}
                >
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    )
}
