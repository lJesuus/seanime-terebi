import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { ProfileMenuItem, ProfileMenuSection, ProfileMenuToggle, ProfileSubpageHeader, RowDivider } from "@/components/features/profile/profile-menu"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsTV } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import {
    clearOfflineLogs,
    copyOfflineLogTextToClipboard,
    getOfflineCrashText,
    getOfflineLogEntries,
    getOfflineLogText,
    isOfflineLoggingEnabled,
    setOfflineLoggingEnabled,
} from "@/lib/offline-logger"
import { toast } from "@/lib/utils/toast"
import * as React from "react"
import { Alert, ScrollView, Share, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type LogSummary = {
    entries: number
    crashes: number
}

function readLogSummary(): LogSummary {
    const entries = getOfflineLogEntries()

    return {
        entries: entries.length,
        crashes: entries.filter(entry => entry.level === "fatal" || entry.scope.includes("crash")).length,
    }
}

function formatSummary(summary: LogSummary) {
    if (summary.entries === 0) return "No local logs saved"

    const entryLabel = summary.entries === 1 ? "1 entry" : `${summary.entries} entries`
    const crashLabel = summary.crashes === 0
        ? null
        : summary.crashes === 1 ? "1 crash" : `${summary.crashes} crashes`

    return crashLabel ? `${entryLabel} · ${crashLabel}` : entryLabel
}

function formatCrashSummary(crashes: number) {
    if (crashes === 0) return "No crash records saved"
    return crashes === 1 ? "1 crash record" : `${crashes} crash records`
}

export default function LogsScreen() {
    const insets = useSafeAreaInsets()
    const [loggingEnabled, setLoggingEnabledState] = React.useState(isOfflineLoggingEnabled)
    const [summary, setSummary] = React.useState(readLogSummary)
    const [copyingKind, setCopyingKind] = React.useState<"crash" | "logs" | null>(null)

    useIOSScrollRefreshRateWorkaround()

    const refreshSummary = React.useCallback(() => {
        setLoggingEnabledState(isOfflineLoggingEnabled())
        setSummary(readLogSummary())
    }, [])

    const handleToggleLogging = React.useCallback((enabled: boolean) => {
        setOfflineLoggingEnabled(enabled)
        refreshSummary()
        toast.info(enabled ? "Logging enabled" : "Logging disabled")
    }, [refreshSummary])

    const copyText = React.useCallback((kind: "crash" | "logs") => {
        if (copyingKind) return

        (async () => {
            setCopyingKind(kind)
            try {
                const text = kind === "crash" ? await getOfflineCrashText() : await getOfflineLogText()
                if (!text.trim()) {
                    toast.info(kind === "crash" ? "No crash records yet" : "No diagnostic logs yet")
                    return
                }

                const copied = copyOfflineLogTextToClipboard(text)
                if (copied) {
                    toast.success(kind === "crash" ? "Crash report copied" : "Logs copied")
                    return
                }

                await Share.share({ message: text })
                toast.success(kind === "crash" ? "Crash report ready to share" : "Logs ready to share")
            }
            catch {
                toast.error(kind === "crash" ? "Failed to copy crash report" : "Failed to copy logs")
            }
            finally {
                setCopyingKind(null)
                refreshSummary()
            }
        })()
    }, [copyingKind, refreshSummary])

    const handleClearLogs = React.useCallback(() => {
        clearOfflineLogs()
        refreshSummary()
        toast.success("Logs cleared")
    }, [refreshSummary])

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            <ProfileSubpageHeader
                title="Logs"
                detail="Crash records and temporary diagnostics."
            />

            <ScrollView
                className="flex-1 bg-background"
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                <View className="mx-4 mt-4 gap-4">
                    <ProfileMenuSection title="Capture">
                        <ProfileMenuToggle
                            icon="document-text-outline"
                            label="Enable Logging"
                            detail="Temporarily save app logs on this device"
                            value={loggingEnabled}
                            onToggle={handleToggleLogging}
                        />
                    </ProfileMenuSection>

                    <ProfileMenuSection title="Local Logs">
                        <ProfileMenuItem
                            icon="warning-outline"
                            label={copyingKind === "crash" ? "Preparing Crash Report" : "Copy Crash Report"}
                            detail={formatCrashSummary(summary.crashes)}
                            onPress={() => copyText("crash")}
                            hideChevron
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="copy-outline"
                            label={copyingKind === "logs" ? "Preparing Logs" : "Copy Diagnostic Logs"}
                            detail={formatSummary(summary)}
                            onPress={() => copyText("logs")}
                            hideChevron
                        />
                        <RowDivider />
                        <ProfileMenuItem
                            icon="trash-outline"
                            label="Clear Logs"
                            detail="Remove logs stored on this device"
                            onPress={handleClearLogs}
                            hideChevron
                        />
                    </ProfileMenuSection>

                    <Text className="px-1 text-xs leading-5 text-white/35">
                        Crash records are saved automatically. Continuous app logging is off unless enabled here.
                    </Text>
                </View>
            </ScrollView>
        </View>
    )
}

// ── TV Panel ──────────────────────────────────────────────────────

export function LogsPanel({
    nextFocusLeft,
}: {
    nextFocusLeft?: number | null
}) {
    const [loggingEnabled, setLoggingEnabledState] = React.useState(isOfflineLoggingEnabled)
    const [summary, setSummary] = React.useState(readLogSummary)
    const [copyingKind, setCopyingKind] = React.useState<"crash" | "logs" | null>(null)

    const refreshSummary = React.useCallback(() => {
        setLoggingEnabledState(isOfflineLoggingEnabled())
        setSummary(readLogSummary())
    }, [])

    const handleToggleLogging = React.useCallback((enabled: boolean) => {
        setOfflineLoggingEnabled(enabled)
        refreshSummary()
        toast.info(enabled ? "Logging enabled" : "Logging disabled")
    }, [refreshSummary])

    const copyText = React.useCallback((kind: "crash" | "logs") => {
        if (copyingKind) return

        (async () => {
            setCopyingKind(kind)
            try {
                const text = kind === "crash" ? await getOfflineCrashText() : await getOfflineLogText()
                if (!text.trim()) {
                    toast.info(kind === "crash" ? "No crash records yet" : "No diagnostic logs yet")
                    return
                }

                const copied = copyOfflineLogTextToClipboard(text)
                if (copied) {
                    toast.success(kind === "crash" ? "Crash report copied" : "Logs copied")
                    return
                }
            }
            catch {
                toast.error(kind === "crash" ? "Failed to copy crash report" : "Failed to copy logs")
            }
            finally {
                setCopyingKind(null)
                refreshSummary()
            }
        })()
    }, [copyingKind, refreshSummary])

    const handleClearLogs = React.useCallback(() => {
        clearOfflineLogs()
        refreshSummary()
        toast.success("Logs cleared")
    }, [refreshSummary])

    return (
        <ScrollView className="flex-1 px-4 pt-2">
            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Capture</Text>
            <LogsToggle
                icon="document-text-outline"
                label="Enable Logging"
                detail="Temporarily save app logs on this device"
                value={loggingEnabled}
                onToggle={handleToggleLogging}
                nextFocusLeft={nextFocusLeft}
            />

            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mt-5 mb-2">Local Logs</Text>

            <LogsItem
                icon="warning-outline"
                label={copyingKind === "crash" ? "Preparing Crash Report" : "Copy Crash Report"}
                detail={formatCrashSummary(summary.crashes)}
                onPress={() => copyText("crash")}
                nextFocusLeft={nextFocusLeft}
            />
            <LogsItem
                icon="copy-outline"
                label={copyingKind === "logs" ? "Preparing Logs" : "Copy Diagnostic Logs"}
                detail={formatSummary(summary)}
                onPress={() => copyText("logs")}
                nextFocusLeft={nextFocusLeft}
            />
            <LogsItem
                icon="trash-outline"
                label="Clear Logs"
                detail="Remove logs stored on this device"
                onPress={handleClearLogs}
                nextFocusLeft={nextFocusLeft}
            />

            <Text className="px-1 mt-4 text-xs leading-5 text-white/35">
                Crash records are saved automatically. Continuous app logging is off unless enabled here.
            </Text>
        </ScrollView>
    )
}

function LogsItem({
    icon,
    label,
    detail,
    onPress,
    nextFocusLeft,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail?: string
    onPress: () => void
    nextFocusLeft?: number | null
}) {
    return (
        <TvFocusablePressable
            className="flex-row items-center px-4 py-3.5 rounded-xl"
            focusedClassName="border border-brand-400/60 bg-white/[0.04]"
            onPress={onPress}
            nextFocusLeft={nextFocusLeft ?? undefined}
        >
            <Ionicons name={icon} size={20} color="rgba(255,255,255,0.6)" />
            <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-white/90">{label}</Text>
                {detail ? <Text className="mt-0.5 text-xs text-white/40">{detail}</Text> : null}
            </View>
        </TvFocusablePressable>
    )
}

function LogsToggle({
    icon,
    label,
    detail,
    value,
    onToggle,
    nextFocusLeft,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    detail?: string
    value: boolean
    onToggle: (value: boolean) => void
    nextFocusLeft?: number | null
}) {
    return (
        <TvFocusablePressable
            className="flex-row items-center px-4 py-3 rounded-xl"
            focusedClassName="border border-brand-400/60 bg-white/[0.04]"
            onPress={() => onToggle(!value)}
            nextFocusLeft={nextFocusLeft ?? undefined}
        >
            <Ionicons name={icon} size={20} color="rgba(255,255,255,0.6)" />
            <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-white/90">{label}</Text>
                {detail ? <Text className="mt-0.5 text-xs text-white/40">{detail}</Text> : null}
            </View>
            <View className={cn("w-10 h-6 rounded-full items-center justify-center ml-2", value ? "bg-brand-500" : "bg-white/20")}>
                <View className={cn("w-4 h-4 rounded-full bg-white", value ? "self-end mr-1" : "self-start ml-1")} />
            </View>
        </TvFocusablePressable>
    )
}
