import {
    MANGA_READING_DIRECTION,
    MANGA_READING_MODE,
    type MangaReaderSettings,
} from "@/components/features/manga/reader/manga-reader-state"
import { LabeledSwitch } from "@/components/shared/labeled-switch"
import { RowDivider } from "@/components/shared/row-divider"
import { Surface } from "@/components/shared/surface"
import { SeaSideDrawer } from "@/components/ui/sea-side-drawer"
import { Button } from "@/components/ui/button"
import { FormSectionLabel } from "@/components/ui/form-field"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as React from "react"
import { findNodeHandle, Pressable, Text, View } from "react-native"

type MangaReaderSettingsSheetProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    settings: MangaReaderSettings
    defaults: MangaReaderSettings
    onSettingChange: <Key extends keyof MangaReaderSettings>(
        key: Key,
        value: MangaReaderSettings[Key],
    ) => void
    onReset: () => void
    /**
     * Optional ref whose target should receive the first focus when the
     * drawer opens and serve as the focus-trap landing point across the
     * drawer body's title/backdrop. Wired through to `SeaSideDrawer` so
     * the drawer's 60ms-after-mount focus call lands on the caller's
     * target (the first Reading Mode option) instead of the title
     * Pressable, matching the spec of TV drawers that should open with
     * focus on the topmost interactive row, not the panel header.
     *
     * Internally re-threaded to the first option of the Reading Mode
     * `OptionGrid` so the same ref is mounted on the underlying
     * `<Pressable>` (a forwardRef'd `TvFocusablePressable`) and picked up
     * by both the program's first-focus call AND `hasTVPreferredFocus`
     * — belt-and-braces so the entry row is the focus target no matter
     * which focus mechanism Android TV / tvOS picks.
     */
    firstFocusRef?: React.RefObject<React.ComponentRef<typeof Pressable> | null>
}

export function MangaReaderSettingsSheet({
    open,
    onOpenChange,
    settings,
    defaults,
    onSettingChange,
    onReset,
    firstFocusRef,
}: MangaReaderSettingsSheetProps) {
    const hasCustomSettings = JSON.stringify(settings) !== JSON.stringify(defaults)

    // Resolved native tag for the Reset Button so we can wire
    // `nextFocusDown` to its own handle (effectively `blockDown`).
    // Mirrors TvFocusablePressable's `block*` mechanism but on the raw
    // `<Pressable>` that `Button` renders — `Button` doesn't expose the
    // block* props, so we use the same ref-tag-state cycle: a callback
    // ref fires on layout, finds the native nodeHandle, stores it in
    // state, and the JSX `nextFocusDown={resetTag}` is applied on the
    // next render. Until that first paint DPAD-DOWN may briefly land on
    // the drawer's hidden bottom guard, but the trap there redirects
    // straight back to the firstFocusRef so the leak is momentary.
    const [resetTag, setResetTag] = React.useState<number | null>(null)
    const handleResetRef = React.useCallback(
        (instance: React.ComponentRef<typeof Pressable> | null) => {
            if (instance) {
                const tag = findNodeHandle(instance)
                if (tag !== null) setResetTag(tag)
            } else {
                setResetTag(null)
            }
        },
        [],
    )

    // No "Done" button — settings auto-apply as the user toggles, so the
    // drawer stays open until the user backs out (TV remote's Back, the
    // backdrop tap, or the title Pressable in `SeaSideDrawer`). Reset to
    // Default remains so the user can revert the entire chapter profile
    // in one shot. `nextFocusDown={resetTag}` + `nextFocusLeft={resetTag}`
    // trap DPAD-DOWN and DPAD-LEFT on the button itself — mirror the
    // TvFocusablePressable `block*` mechanism since `Button` only exposes
    // standard `<Pressable>` props.
    const footer = (
        <Button
            ref={handleResetRef}
            variant="secondary"
            className="w-full rounded-xl"
            onPress={onReset}
            disabled={!hasCustomSettings}
            {...(resetTag !== null
                ? { nextFocusDown: resetTag, nextFocusLeft: resetTag }
                : {})}
        >
            <Text className="text-secondary-foreground text-sm font-medium">Reset to Default</Text>
        </Button>
    )

    return (
        <SeaSideDrawer
            // TV-only. Lateral drawer from the right; widthFraction=0.32 +
            // maxWidth=520 gives a ~480–520px panel on 1920px TV (ratio
            // clamped) so the manga content remains visible behind it.
            // SeaSideDrawer registers a hardware-back listener so the TV
            // remote's Back button closes the panel cleanly.
            title="Reader Settings"
            open={open}
            onOpenChange={onOpenChange}
            widthFraction={0.32}
            maxWidth={520}
            footer={footer}
            firstFocusRef={firstFocusRef}
            footerSeparator={false}
        >
            <View className="gap-7 pb-4">
                <SettingsSection title="Reading Mode">
                    {/* Same visual size as the LabeledSwitch rows in the
                        Display section below: full-width rows inside a
                        `Surface overflow-hidden` with `px-4 py-3` + subtle
                        border + active brand tint + checkmark on the right. */}
                    <OptionGrid
                        options={[
                            { value: MANGA_READING_MODE.LONG_STRIP, label: "Long Strip" },
                            { value: MANGA_READING_MODE.DOUBLE_PAGE, label: "Double Page" },
                        ]}
                        value={settings.readingMode}
                        onChange={(value) => onSettingChange("readingMode", value)}
                        firstOptionRef={firstFocusRef}
                    />
                </SettingsSection>

                <SettingsSection title="Reading Direction">
                    <OptionGrid
                        options={[
                            { value: MANGA_READING_DIRECTION.RTL, label: "Right to Left" },
                            { value: MANGA_READING_DIRECTION.LTR, label: "Left to Right" },
                        ]}
                        value={settings.readingDirection}
                        onChange={(value) => onSettingChange("readingDirection", value)}
                    />
                </SettingsSection>

                <SettingsSection title="Display">
                    <Surface className="overflow-hidden border-0">
                        {/* LabeledSwitch wraps the row in a `TvFocusablePressable`
                            so DPAD focus lands on the BAR (the full row),
                            not on the small Switch thumb inside it. This is
                            the standard TV-friendly toggle idiom and matches
                            what other drawers (torrentstream, search-filter,
                            schedule) already use. `blockLeft` + `blockRight`
                            keep DPAD horizontal escapes inside this drawer
                            so focus can't leak left to the manga canvas nor
                            right off the panel edge (which is the screen's
                            right border). */}
                        <LabeledSwitch
                            label="Reading progress bar"
                            value={settings.showProgressBar}
                            onValueChange={(value) => onSettingChange("showProgressBar", value)}
                            blockLeft
                            blockRight
                        />
                        <RowDivider />
                        <LabeledSwitch
                            label="Page gaps"
                            value={settings.pageGap}
                            onValueChange={(value) => onSettingChange("pageGap", value)}
                            blockLeft
                            blockRight
                        />
                        {settings.pageGap && (
                            <>
                                <RowDivider />
                                {/* Was a Slider; cannot shift numerical value
                                    via DPAD on TV. Stepper +/- reads cleanly. */}
                                <StepperRow
                                    title="Gap amount"
                                    description="Adjust the spacing between reader pages."
                                    min={0}
                                    max={24}
                                    step={1}
                                    value={settings.pageGapAmount}
                                    formatValue={(value) => `${value}px`}
                                    onChange={(value) => onSettingChange("pageGapAmount", value)}
                                />
                                <RowDivider />
                                <LabeledSwitch
                                    label="Gap shadow"
                                    value={settings.pageGapShadow}
                                    onValueChange={(value) => onSettingChange("pageGapShadow", value)}
                                    blockLeft
                                    blockRight
                                />
                            </>
                        )}
                        <RowDivider />
                        <LabeledSwitch
                            label="Fit to Width"
                            value={settings.fitToWidth}
                            onValueChange={(value) => onSettingChange("fitToWidth", value)}
                            blockLeft
                            blockRight
                        />
                    </Surface>
                </SettingsSection>

                <SettingsSection title="Image">
                    <Surface className="overflow-hidden border-0">
                        <StepperRow
                            title="Brightness"
                            description="Adjust the screen brightness for reading."
                            min={0.1}
                            max={1}
                            step={0.1}
                            value={settings.brightness}
                            formatValue={(value) => `${Math.round(value * 100)}%`}
                            onChange={(value) => onSettingChange("brightness", value)}
                        />
                    </Surface>
                </SettingsSection>
            </View>
        </SeaSideDrawer>
    )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View className="gap-2">
            <FormSectionLabel className="px-1">{title}</FormSectionLabel>
            {children}
        </View>
    )
}

function StepperRow({
    title,
    description,
    min,
    max,
    step,
    value,
    formatValue,
    onChange,
}: {
    title: string
    description: string
    min: number
    max: number
    step: number
    value: number
    formatValue: (value: number) => string
    onChange: (value: number) => void
}) {
    return (
        <View className="px-4 py-3.5 gap-3">
            <View className="gap-0.5">
                <Text className="text-sm font-medium text-foreground">{title}</Text>
                <Text className="text-xs text-muted-foreground">{description}</Text>
            </View>
            <View className="flex-row items-center gap-3">
                <StepperButton
                    icon="remove"
                    disabled={value <= min}
                    onPress={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
                />
                <View className="flex-1 items-center">
                    <Text className="text-base font-semibold text-foreground">{formatValue(value)}</Text>
                </View>
                <StepperButton
                    icon="add"
                    disabled={value >= max}
                    onPress={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}
                />
            </View>
        </View>
    )
}

function StepperButton({
    icon,
    disabled,
    onPress,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    disabled?: boolean
    onPress: () => void
}) {
    return (
        <TvFocusablePressable
            onPress={disabled ? undefined : onPress}
            className={cn(
                "h-10 w-10 items-center justify-center rounded-full bg-white/5",
                disabled && "opacity-30",
            )}
            focusedClassName="bg-white/15 border border-brand-400/60"
            focusable={!disabled}
            blockLeft
            blockRight
        >
            <Ionicons name={icon} size={17} color="rgba(255,255,255,0.80)" />
        </TvFocusablePressable>
    )
}

function OptionGrid<TValue extends string>({
    options,
    value,
    onChange,
    firstOptionRef,
}: {
    options: Array<{ value: TValue; label: string }>
    value: TValue
    onChange: (value: TValue) => void
    /**
     * Optional ref attached to the FIRST option's underlying `<Pressable>`
     * (forwardRef'd through `TvFocusablePressable`). The settings sheet
     * threads its `firstFocusRef` here so that:
     *   1. `SeaSideDrawer` can run its 60 ms-after-mount
     *      `firstFocusRef.current?.focus()` and land on the first Reading
     *      Mode option (Long Strip) on every open.
     *   2. The same row carries `hasTVPreferredFocus` so the native TV
     *      focus engine also recognises it as the entry-point when the
     *      drawer re-renders (e.g. after a settings change closes /
     *      re-opens the panel).
     * Only the FIRST option wires these; later options rely on
     * `blockLeft`/`blockRight` and native vertical spatial nav.
     */
    firstOptionRef?: React.RefObject<React.ComponentRef<typeof Pressable> | null>
}) {
    // Mirrors the Display section's `LabeledSwitch` rows visually so the
    // single-select radio reads as the same control primitive. Same
    // padding (`px-4 py-3`), same border/bg baseline, same focused state
    // (`border-brand-400/80 bg-white/[0.08]`), wrapped in the same
    // `<Surface className="overflow-hidden border-0">` clipping container with a
    // `RowDivider` between options. Every row hangs `blockLeft` +
    // `blockRight` so DPAD lateral nav cannot escape the right-edge
    // drawer (no sibling to the LEFT = manga canvas; no sibling to the
    // RIGHT = off-screen).
    return (
        <Surface className="overflow-hidden border-0">
            {options.map((option, i) => {
                const active = option.value === value
                const isFirstOption = i === 0
                return (
                    <React.Fragment key={option.value}>
                        <TvFocusablePressable
                            {...(firstOptionRef !== undefined && isFirstOption
                                ? { ref: firstOptionRef }
                                : {})}
                            hasTVPreferredFocus={firstOptionRef !== undefined && isFirstOption}
                            // Block UP only on the first Reading Mode option
                            // (Long Strip) — native spatial nav from there
                            // would otherwise walk UP into the drawer's
                            // title `<Pressable>` (whose onPress closes the
                            // drawer via `handleBackdropPress`), making the
                            // DPAD-UP / OK combo accidentally close the
                            // panel. Trapping UP keeps focus on Long Strip.
                            {...(firstOptionRef !== undefined && isFirstOption
                                ? { blockUp: true }
                                : {})}
                            onPress={() => onChange(option.value)}
                            scaleTo={1.02}
                            focusedClassName="border-brand-400/80 bg-white/[0.08]"
                            blockLeft
                            blockRight
                            className={cn(
                                "flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04]",
                                active && "bg-brand-300/10 border-brand-300/40",
                            )}
                        >
                            <View className="flex-1">
                                <Text
                                    className={cn(
                                        "text-sm font-semibold",
                                        active ? "text-white" : "text-white/85",
                                    )}
                                >
                                    {option.label}
                                </Text>
                            </View>
                        </TvFocusablePressable>
                        {i < options.length - 1 && <RowDivider />}
                    </React.Fragment>
                )
            })}
        </Surface>
    )
}
