import { AL_FuzzyDateInput, AL_MediaListStatus, Anime_Entry, Manga_Entry } from "@/api/generated/types"
import { useDeleteAnilistListEntry, useEditAnilistListEntry } from "@/api/hooks/anilist.hooks"
import { SheetFooter, SheetFooterButton } from "@/components/shared/sheet-footer"
import { SeaBottomSheet } from "@/components/ui/bottom-sheet"
import { SeaSideDrawer } from "@/components/ui/sea-side-drawer"
import { TvFocusablePressable as Focusable } from "@/components/ui/tv-focusable"
import { Button } from "@/components/ui/button"
import { ChipOption, ChipSelector } from "@/components/ui/chip-selector"
import { DatePicker } from "@/components/ui/date-picker"
import { FormField, FormSectionLabel } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Surface } from "@/components/shared/surface"
import { Text } from "@/components/ui/text"
import { useIsServerConnected } from "@/lib/offline"
import { cn } from "@/lib/utils"
import { useIsTV } from "@/hooks/use-device"
import { Ionicons } from "@expo/vector-icons"
import Slider from "@react-native-community/slider"
import * as Haptics from "expo-haptics"
import React from "react"
import { Alert, Platform, Pressable, View } from "react-native"
import { NativeViewGestureHandler } from "react-native-gesture-handler"

type EditAnilistEntryProps = {
    entry?: Anime_Entry | Manga_Entry
    type: "anime" | "manga"
    buttonSize?: "sm" | "default" | "lg" | "icon"
    buttonClassName?: string
    /**
     * Visual shape of the trigger button. Defaults to `"pill"` so any
     * existing callers keep their previous rounded-full look. Pass
     * `"rect"` from contexts (e.g. the media entry header) where the
     * button should sit flush alongside other rectangular controls.
     */
    roundedShape?: "pill" | "rect"
    /**
     * Optional override for the trigger button's visible label. When
     * provided, the label is paired with an icon (`create-outline` if
     * the entry is already on the user's list, `add-outline` otherwise).
     * When omitted, the trigger renders a bare icon (add for empty
     * lists, pencil for in-list edits). Useful in dense layouts where
     * the icon alone isn't self-explanatory.
     */
    addLabel?: string
}

type FormState = {
    status: AL_MediaListStatus
    score: string
    progress: string
    startedAt: Date | null
    completedAt: Date | null
}

const DEFAULT_STATUS: AL_MediaListStatus = "PLANNING"

function parseEntryDate(value?: string) {
    if (!value) return null

    const parsedDate = new Date(value)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function toFuzzyDate(value: Date | null): AL_FuzzyDateInput | undefined {
    if (!value) return undefined

    return {
        day: value.getDate(),
        month: value.getMonth() + 1,
        year: value.getFullYear(),
    }
}

function clampNumber(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

function createInitialState(entry?: Anime_Entry | Manga_Entry, isNotYetReleased: boolean = false): FormState {
    return {
        status: isNotYetReleased ? DEFAULT_STATUS : (entry?.listData?.status ?? DEFAULT_STATUS),
        score: entry?.listData?.score ? String(entry.listData.score / 10) : "",
        progress: entry?.listData?.progress ? String(entry.listData.progress) : "",
        startedAt: parseEntryDate(entry?.listData?.startedAt),
        completedAt: parseEntryDate(entry?.listData?.completedAt),
    }
}

export function EditAnilistEntry(props: EditAnilistEntryProps) {
    const { entry, type, buttonSize = "sm", buttonClassName, roundedShape = "pill", addLabel } = props
    const isTV = useIsTV()
    const firstFocusRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)

    const [open, setOpen] = React.useState(false)
    const lastScoreSliderStepRef = React.useRef<number | null>(null)
    const isNotYetReleased = entry?.media?.status === "NOT_YET_RELEASED"
    const animeMedia = type === "anime" ? entry?.media as Anime_Entry["media"] : undefined
    const mangaMedia = type === "manga" ? entry?.media as Manga_Entry["media"] : undefined
    const [formState, setFormState] = React.useState<FormState>(() => createInitialState(entry, isNotYetReleased))

    const isInList = Boolean(entry?.listData)

    const { mutate: saveEntry, isPending: isSaving } = useEditAnilistListEntry(entry?.mediaId, type)
    const isConnected = useIsServerConnected()
    const { mutate: removeEntry, isPending: isRemoving } = useDeleteAnilistListEntry(entry?.mediaId, type, () => {
        setOpen(false)
    }, false)
    const isMutating = isSaving || isRemoving
    const hasUserChangedRef = React.useRef(false)
    // Track the last entry we initialised formState from so we only
    // reset when the user opens a *different* entry, not on every
    // drawer open.
    const lastInitializedMediaIdRef = React.useRef<number | null>(null)

    const statusOptions = React.useMemo((): ChipOption<AL_MediaListStatus>[] => {
        const options: Array<ChipOption<AL_MediaListStatus> | undefined> = [
            !isNotYetReleased ? {
                value: "CURRENT" as const,
                label: type === "anime" ? "Watching" : "Reading",
                icon: type === "anime" ? "play-circle-outline" : "book-outline",
            } : undefined,
            {
                value: "PLANNING" as const,
                label: "Planning",
                icon: "bookmark-outline",
            },
            !isNotYetReleased ? { value: "PAUSED" as const, label: "Paused", icon: "pause-circle-outline" } : undefined,
            !isNotYetReleased ? { value: "COMPLETED" as const, label: "Completed", icon: "checkmark-circle-outline" } : undefined,
            !isNotYetReleased ? { value: "DROPPED" as const, label: "Dropped", icon: "close-circle-outline" } : undefined,
            !isNotYetReleased ? {
                value: "REPEATING" as const,
                label: type === "anime" ? "Rewatching" : "Rereading",
                icon: "refresh-circle-outline",
            } : undefined,
        ]

        return options.filter((o): o is ChipOption<AL_MediaListStatus> => Boolean(o))
    }, [isNotYetReleased, type])

    const maxProgress = React.useMemo(() => {
        if (type === "anime") {
            return animeMedia?.nextAiringEpisode?.episode
                ? animeMedia.nextAiringEpisode.episode - 1
                : animeMedia?.episodes
        }

        return mangaMedia?.chapters
    }, [animeMedia, mangaMedia, type])

    const handleAutoSave = React.useCallback(() => {
        if (!entry?.mediaId) return
        const parsedScore = Number.parseFloat(formState.score)
        const parsedProgress = Number.parseInt(formState.progress, 10)
        const normalizedScore = Number.isNaN(parsedScore) ? 0 : clampNumber(Math.round(parsedScore * 10), 0, 100)
        const normalizedProgress = Number.isNaN(parsedProgress) ? 0 : clampNumber(parsedProgress, 0, maxProgress ?? Number.MAX_SAFE_INTEGER)
        saveEntry({
            mediaId: entry.mediaId,
            type,
            status: formState.status,
            score: normalizedScore,
            progress: normalizedProgress,
            startedAt: toFuzzyDate(formState.startedAt),
            completedAt: toFuzzyDate(formState.completedAt),
        })
    }, [entry?.mediaId, formState, maxProgress, saveEntry, type])

    // Debounced auto-save while the drawer is open. Every formState
    // change resets the 600ms timer so a burst of arrow-key presses
    // collapses to a single network round-trip.
    React.useEffect(() => {
        if (!open || !isTV) return
        if (!hasUserChangedRef.current) return
        if (!entry?.mediaId) return
        const timer = setTimeout(() => {
            hasUserChangedRef.current = false
            handleAutoSave()
        }, 600)
        return () => clearTimeout(timer)
    }, [formState, open, isTV, handleAutoSave, entry?.mediaId])

    // Flush-on-close: when the user dismisses the drawer mid-debounce,
    // any pending edit is sent synchronously so the latest arrow-key
    // press isn't lost just because the user backed out before the 600ms
    // debounce window elapsed.
    React.useEffect(() => {
        if (open || !isTV) return
        if (!hasUserChangedRef.current) return
        if (!entry?.mediaId) return
        hasUserChangedRef.current = false
        handleAutoSave()
    }, [open, isTV, handleAutoSave, entry?.mediaId])

    React.useEffect(() => {
        if (!open) return
        const mediaId = entry?.mediaId
        // Only reset formState when the *entry* changes (different
        // media), not on every drawer open. Otherwise changes saved
        // via auto-save are clobbered by stale entry data on reopen.
        if (mediaId !== lastInitializedMediaIdRef.current) {
            lastInitializedMediaIdRef.current = mediaId ?? null
            setFormState(createInitialState(entry, isNotYetReleased))
        }
    }, [entry, isNotYetReleased, open])

    const triggerScoreSliderHaptic = React.useCallback(() => {
        void Haptics.selectionAsync().catch(() => undefined)
    }, [])

    const handleOpenPress = () => {
        setOpen(true)
    }

    const handleChange = React.useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
        hasUserChangedRef.current = true
        setFormState(previousState => ({
            ...previousState,
            [key]: value,
        }))
    }, [])

    const handleScoreSlidingStart = React.useCallback((value: number) => {
        lastScoreSliderStepRef.current = value
    }, [])

    const handleScoreChange = React.useCallback((value: number) => {
        handleChange("score", value === 0 ? "" : String(value))

        if (lastScoreSliderStepRef.current === value) return
        lastScoreSliderStepRef.current = value
        triggerScoreSliderHaptic()
    }, [handleChange, triggerScoreSliderHaptic])

    const handleScoreSlidingComplete = React.useCallback((value: number) => {
        handleChange("score", value === 0 ? "" : String(value))
        lastScoreSliderStepRef.current = null
    }, [handleChange])

    const handleSave = React.useCallback(() => {
            if (!entry?.mediaId) return
            const parsedScore = Number.parseFloat(formState.score)
            const parsedProgress = Number.parseInt(formState.progress, 10)

            const normalizedScore = Number.isNaN(parsedScore)
                ? 0
                : clampNumber(Math.round(parsedScore * 10), 0, 100)
            const normalizedProgress = Number.isNaN(parsedProgress)
                ? 0
                : clampNumber(parsedProgress, 0, maxProgress ?? Number.MAX_SAFE_INTEGER)
            const payload = {
                mediaId: entry.mediaId,
                type: type,
                status: formState.status,
                score: normalizedScore,
                progress: normalizedProgress,
                startedAt: toFuzzyDate(formState.startedAt),
                completedAt: toFuzzyDate(formState.completedAt),
            }

            saveEntry(payload, {
                onSuccess: () => {
                    setOpen(false)
                },
            })
        },
        [entry?.mediaId, formState.completedAt, formState.progress, formState.score, formState.startedAt, formState.status, maxProgress, saveEntry,
            type])

    const handleRemove = React.useCallback(() => {
        if (!entry?.mediaId || !isConnected) return

        const title = entry.media?.title?.userPreferred ?? "this entry"
        Alert.alert(
            "Remove from list?",
            `This removes ${title} from your AniList ${type === "anime" ? "anime" : "manga"} list.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => removeEntry({ mediaId: entry.mediaId, type }),
                },
            ],
        )
    }, [entry?.media?.title?.userPreferred, entry?.mediaId, isConnected, removeEntry, type])

    const triggerShapeClass = roundedShape === "rect" ? "rounded-md" : "rounded-full"
    const triggerSizeClass = buttonSize === "sm"
        ? (roundedShape === "rect" ? "h-9 px-3" : "h-8 px-4 py-0")
        : ""
    /**
     * Header-label rendering helper. Renders the action's leading icon
     * paired with a textual label inside a flex-row so the icon and
     * label stay horizontally aligned with a 6px gap.
     */
    const renderIconLabel = (iconName: "add-outline" | "create-outline", label: string) => (
        <View className="flex-row items-center gap-1.5">
            <Ionicons name={iconName} size={15} color="#fff" />
            <Text className="text-sm font-semibold text-foreground">{label}</Text>
        </View>
    )

    // The trigger button renders one of four affordances depending on
    // whether `addLabel` was provided and whether the entry is already
    // on the user's list:
    //   - in list    + addLabel  -> "Edit List" with `create-outline`
    //   - in list    + no label  -> bare `create-outline` icon
    //   - not in list + addLabel -> "Add to list" with `add-outline`
    //   - not in list + no label -> bare `add-outline` icon
    // Callers decide the visible label (e.g. `"Add to list"` vs
    // `"Edit List"`); the component picks the semantically appropriate
    // icon based on `isInList`. Both states mutate through
    // `handleOpenPress`, which opens the same edit sheet.

    const triggerIconName: "add-outline" | "create-outline" = isInList ? "create-outline" : "add-outline"

    return (
        <>
            <Button
                variant="outline"
                size={buttonSize}
                className={cn(triggerShapeClass, triggerSizeClass, buttonClassName)}
                onPress={handleOpenPress}
            >
                {addLabel
                    ? renderIconLabel(triggerIconName, addLabel)
                    : <Text className="text-foreground">
                        <Ionicons name={triggerIconName} size={15} />
                    </Text>}
            </Button>

            {isTV ? (
                <SeaSideDrawer
                    title={entry?.media?.title?.userPreferred ?? ""}
                    open={open}
                    onOpenChange={setOpen}
                    widthFraction={0.38}
                    maxWidth={420}
                    firstFocusRef={firstFocusRef}
                >
                    <View className="gap-6">
                        <View className="gap-3">
                            <FormSectionLabel icon="albums-outline">Status</FormSectionLabel>
                            <Surface variant="muted" className="overflow-hidden rounded-xl">
                                {statusOptions.map((opt, i) => {
                                    const isSelected = formState.status === opt.value
                                    return (
                                        <React.Fragment key={opt.value}>
                                            {i > 0 && <Separator />}
                                            <Focusable
                                                ref={i === 0 ? firstFocusRef : undefined}
                                                hasTVPreferredFocus={i === 0}
                                                noScale
                                                blockLeft
                                                blockRight
                                                blockUp={i === 0}
                                                focusedClassName="bg-white/10"
                                                className="flex-row items-center justify-between px-4 py-3"
                                                onPress={() => handleChange("status", opt.value)}
                                            >
                                                <View className="flex-row items-center gap-3">
                                                    <Ionicons name={opt.icon as any} size={20} color="white" />
                                                    <Text className={cn("text-base", isSelected ? "text-white font-semibold" : "text-white/60")}>
                                                        {opt.label}
                                                    </Text>
                                                </View>
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={22} color="rgb(97,82,223)" />
                                                )}
                                            </Focusable>
                                        </React.Fragment>
                                    )
                                })}
                            </Surface>
                        </View>

                        {!isNotYetReleased && (
                            <>
                                <View className="flex gap-3">
                                    <FormField
                                        className="flex-1"
                                        label="Score"
                                        icon="star-outline"
                                        trailing={formState.score ?
                                            <View className="flex-row"><Text className="text-foreground font-semibold">{formState.score}</Text><Text className="text-muted-foreground">{` / 10`}</Text></View>
                                            : <Text className="text-muted-foreground text-xs">Not scored</Text>}
                                    >
                                        <ScoreStepper
                                            value={formState.score}
                                            onChange={(val) => handleChange("score", val)}
                                        />
                                    </FormField>

                                    <FormField
                                        className="flex-1"
                                        label={type === "anime" ? "Episodes" : "Chapters"}
                                        icon={type === "anime" ? "film-outline" : "library-outline"}
                                        trailing={maxProgress ? <Text className="text-xs text-white/35">/ {maxProgress}</Text> : undefined}
                                    >
                                        <View className="flex-row items-center rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
                                            <Focusable
                                                blockLeft
                                                noScale
                                                focusedClassName="bg-white/10"
                                                className="w-10 h-11 items-center justify-center"
                                                onPress={() => {
                                                    const current = Number.parseInt(formState.progress, 10) || 0
                                                    handleChange("progress", String(Math.max(0, current - 1)))
                                                }}
                                            >
                                                <Ionicons name="remove-outline" size={20} color="white" />
                                            </Focusable>
                                            <View style={{ flex: 1 }}>
                                                <Focusable
                                                    noScale
                                                    focusedClassName="bg-white/10"
                                                    className="items-center justify-center h-11"
                                                >
                                                    <Text className="text-base font-semibold text-foreground">
                                                        {formState.progress || "0"}{maxProgress ? ` / ${maxProgress}` : ""}
                                                    </Text>
                                                </Focusable>
                                            </View>
                                            <Focusable
                                                blockRight
                                                noScale
                                                focusedClassName="bg-white/10"
                                                className="w-10 h-11 items-center justify-center"
                                                onPress={() => {
                                                    const current = Number.parseInt(formState.progress, 10) || 0
                                                    const maxVal = maxProgress ?? Number.MAX_SAFE_INTEGER
                                                    handleChange("progress", String(Math.min(maxVal, current + 1)))
                                                }}
                                            >
                                                <Ionicons name="add-outline" size={20} color="white" />
                                            </Focusable>
                                        </View>
                                    </FormField>
                                </View>

                                <Separator />

                                <View className="gap-3">
                                    <FormSectionLabel icon="calendar-outline">Dates</FormSectionLabel>
                                    <View className="gap-3">
                                        <FormField label="Start date">
                                            <DatePicker
                                                value={formState.startedAt}
                                                onChange={value => handleChange("startedAt", value)}
                                                placeholder="Select a start date"
                                                focusable
                                                blockLeft
                                                blockRight
                                            />
                                        </FormField>
                                        <FormField label="Completion date">
                                            <DatePicker
                                                value={formState.completedAt}
                                                onChange={value => handleChange("completedAt", value)}
                                                placeholder="Select a completion date"
                                                focusable
                                                blockLeft
                                                blockRight
                                            />
                                        </FormField>
                                    </View>
                                </View>
                            </>
                        )}

                        {isInList && isConnected && (
                            <Focusable
                                noScale
                                blockLeft
                                blockRight
                                blockDown
                                focusedClassName="bg-white/10"
                                className="flex-row items-center gap-2 px-4 py-3 rounded-xl border border-white/10"
                                onPress={handleRemove}
                                disabled={isMutating}
                            >
                                <Ionicons
                                    name={isRemoving ? "sync-outline" : "trash-outline"}
                                    size={15}
                                    color="rgba(248, 113, 113, 0.78)"
                                />
                                <Text className="text-sm font-medium text-red-300/80">
                                    {isRemoving ? "Removing..." : "Remove from list"}
                                </Text>
                            </Focusable>
                        )}
                    </View>
                </SeaSideDrawer>
            ) : (
                <SeaBottomSheet
                    title={entry?.media?.title?.userPreferred ?? ""}
                    open={open}
                    onOpenChange={setOpen}
                    index={1}
                    snapPoints={["60%", "92%"]}
                    footer={
                        <SheetFooter>
                            <SheetFooterButton
                                variant="cancel"
                                onPress={() => setOpen(false)}
                                disabled={isMutating}
                            >
                                <Text className="font-medium text-foreground/70">Cancel</Text>
                            </SheetFooterButton>
                            <SheetFooterButton
                                variant="primary"
                                onPress={handleSave}
                                disabled={isMutating}
                            >
                                <View className="flex-row items-center gap-2">
                                    <Ionicons
                                        name={isSaving ? "sync-outline" : !isConnected ? "cloud-offline-outline" : "checkmark"}
                                        size={16}
                                        color="#09090b"
                                    />
                                    <Text className="font-semibold text-primary-foreground">
                                        {isSaving ? "Saving..." : !isConnected ? (isInList ? "Queue changes" : "Queue add") : isInList
                                            ? "Save changes"
                                            : "Add to list"}
                                    </Text>
                                </View>
                            </SheetFooterButton>
                        </SheetFooter>
                    }
                >
                    <View className="gap-6">

                        <View className="gap-3">
                            <FormSectionLabel icon="albums-outline">Status</FormSectionLabel>
                            <ChipSelector
                                options={statusOptions}
                                value={formState.status}
                                onSelect={value => handleChange("status", value)}
                            />
                        </View>

                        {!isNotYetReleased && (
                            <>
                                <View className="flex gap-3">
                                    <FormField
                                        className="flex-1"
                                        label="Score"
                                        icon="star-outline"
                                        trailing={Platform.OS !== "android" && formState.score ?
                                            <View className="text-md text-muted-foreground flex-row"><Text className="text-foreground font-semibold">{formState.score}</Text><Text
                                                className="text-muted-foreground"
                                            >{` / 10`}</Text></View> : Platform.OS !== "android"
                                                ? <Text className="text-muted-foreground text-xs">Not scored</Text>
                                                : undefined}
                                    >
                                        {Platform.OS === "android" ? (
                                            <ScoreStepper
                                                value={formState.score}
                                                onChange={(val) => handleChange("score", val)}
                                            />
                                        ) : (
                                            <NativeViewGestureHandler disallowInterruption>
                                                <View className="justify-center" style={{ height: 40 }}>
                                                    <Slider
                                                        minimumValue={0}
                                                        maximumValue={10}
                                                        step={0.5}
                                                        value={Number.parseFloat(formState.score) || 0}
                                                        onSlidingStart={handleScoreSlidingStart}
                                                        onValueChange={handleScoreChange}
                                                        onSlidingComplete={handleScoreSlidingComplete}
                                                        minimumTrackTintColor="rgb(97 82 223)"
                                                        maximumTrackTintColor="rgba(255,255,255,0.15)"
                                                        thumbTintColor="rgb(97 82 223)"
                                                    />
                                                </View>
                                            </NativeViewGestureHandler>
                                        )}
                                    </FormField>

                                    <FormField
                                        className="flex-1"
                                        label={type === "anime" ? "Episodes" : "Chapters"}
                                        icon={type === "anime" ? "film-outline" : "library-outline"}
                                        trailing={maxProgress ? <Text className="text-xs text-white/35">/ {maxProgress}</Text> : undefined}
                                    >
                                        <Input
                                            value={formState.progress}
                                            onChangeText={value => handleChange("progress", value.replace(/[^0-9]/g, ""))}
                                            keyboardType="number-pad"
                                            placeholder={maxProgress ? `0 - ${maxProgress}` : "0"}
                                        />
                                    </FormField>
                                </View>

                                <Separator />

                                <View className="gap-3">
                                    <FormSectionLabel icon="calendar-outline">Dates</FormSectionLabel>
                                    <View className="gap-3">
                                        <FormField label="Start date">
                                            <DatePicker
                                                value={formState.startedAt}
                                                onChange={value => handleChange("startedAt", value)}
                                                placeholder="Select a start date"
                                            />
                                        </FormField>
                                        <FormField label="Completion date">
                                            <DatePicker
                                                value={formState.completedAt}
                                                onChange={value => handleChange("completedAt", value)}
                                                placeholder="Select a completion date"
                                            />
                                        </FormField>
                                    </View>
                                </View>

                            </>
                        )}

                        {isInList && isConnected && (
                            <>
                                <Separator />

                                <View className="items-start">
                                    <Button
                                        variant="unstyled"
                                        className="h-10 rounded-full border border-white/10 bg-white/[0.03] px-3 active:bg-white/5"
                                        disabled={isMutating}
                                        onPress={handleRemove}
                                    >
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons
                                                name={isRemoving ? "sync-outline" : "trash-outline"}
                                                size={15}
                                                color="rgba(248, 113, 113, 0.78)"
                                            />
                                            <Text className="text-sm font-medium text-red-300/80">
                                                {isRemoving ? "Removing..." : "Remove from list"}
                                            </Text>
                                        </View>
                                    </Button>
                                </View>
                            </>
                        )}
                    </View>
                </SeaBottomSheet>
            )}
        </>
    )
}

type ScoreStepperProps = {
    value: string
    onChange: (value: string) => void
}

const ScoreStepper = React.memo(function ScoreStepper({ value, onChange }: ScoreStepperProps) {
    const isTV = useIsTV()
    const valueRef = React.useRef(value)

    React.useEffect(() => {
        valueRef.current = value
    }, [value])

    const intervalRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const updateScore = React.useCallback((direction: "increment" | "decrement") => {
        const current = Number.parseFloat(valueRef.current) || 0
        let next = direction === "increment" ? current + 0.5 : current - 0.5
        next = Math.min(Math.max(next, 0), 10)
        onChange(next === 0 ? "" : String(next))
        void Haptics.selectionAsync().catch(() => undefined)
    }, [onChange])

    const startTimer = React.useCallback((direction: "increment" | "decrement") => {
        stopTimer()
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                updateScore(direction)
            }, 80)
        }, 400)
    }, [updateScore])

    const stopTimer = React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
    }, [])

    React.useEffect(() => {
        return () => stopTimer()
    }, [stopTimer])

    const currentScore = Number.parseFloat(value) || 0

    if (isTV) {
        return (
            <View className="flex-row items-center rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
                <Focusable
                    blockLeft
                    noScale
                    focusedClassName="bg-white/10"
                    className="w-10 h-11 items-center justify-center"
                    onPress={() => {
                        const current = Number.parseFloat(value) || 0
                        const next = Math.max(0, current - 0.5)
                        onChange(next === 0 ? "" : String(next))
                        void Haptics.selectionAsync().catch(() => undefined)
                    }}
                >
                    <Ionicons name="remove-outline" size={20} color="white" />
                </Focusable>
                <View style={{ flex: 1 }}>
                    <Focusable
                        noScale
                        focusedClassName="bg-white/10"
                        className="items-center justify-center h-11"
                    >
                        <Text className="text-base font-semibold text-foreground">
                            {value ? `${value} / 10` : "Not scored"}
                        </Text>
                    </Focusable>
                </View>
                <Focusable
                    blockRight
                    noScale
                    focusedClassName="bg-white/10"
                    className="w-10 h-11 items-center justify-center"
                    onPress={() => {
                        const current = Number.parseFloat(value) || 0
                        const next = Math.min(10, current + 0.5)
                        onChange(next === 0 ? "" : String(next))
                        void Haptics.selectionAsync().catch(() => undefined)
                    }}
                >
                    <Ionicons name="add-outline" size={20} color="white" />
                </Focusable>
            </View>
        )
    }

    return (
        <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-2 h-11">
            <Pressable
                onPress={() => updateScore("decrement")}
                onPressIn={() => startTimer("decrement")}
                onPressOut={stopTimer}
                disabled={currentScore <= 0}
                className={cn(
                    "w-10 h-7 items-center justify-center rounded-lg active:bg-white/5",
                    currentScore <= 0 && "opacity-30",
                )}
            >
                <Ionicons name="remove-outline" size={20} color="white" />
            </Pressable>

            <View className="flex-1 items-center justify-center">
                <Text className="text-base font-semibold text-foreground">
                    {value ? `${value} / 10` : "Not scored"}
                </Text>
            </View>

            <Pressable
                onPress={() => updateScore("increment")}
                onPressIn={() => startTimer("increment")}
                onPressOut={stopTimer}
                disabled={currentScore >= 10}
                className={cn(
                    "w-10 h-7 items-center justify-center rounded-lg active:bg-white/5",
                    currentScore >= 10 && "opacity-30",
                )}
            >
                <Ionicons name="add-outline" size={20} color="white" />
            </Pressable>
        </View>
    )
})
