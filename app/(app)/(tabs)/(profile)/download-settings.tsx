import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { downloadSettingsAtom } from "@/atoms/download-settings.atoms"
import { ProfileMenuSection, ProfileMenuToggle, ProfileSubpageHeader, RowDivider } from "@/components/features/profile/profile-menu"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { useIsTV } from "@/hooks/use-device"
import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import { useAtom } from "jotai"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function DownloadSettingsScreen() {
    const insets = useSafeAreaInsets()
    const [downloadSettings, setDownloadSettings] = useAtom(downloadSettingsAtom)

    useIOSScrollRefreshRateWorkaround()

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            <ProfileSubpageHeader
                title="Download Settings"
                detail="Control anime and manga downloads."
            />

            <ScrollView
                className="flex-1 bg-background"
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View className="mx-4 mt-4 gap-4">
                    <ProfileMenuSection title="Network">
                        <ProfileMenuToggle
                            icon="wifi-outline"
                            label="Only Download on Wi-Fi"
                            detail="Block new downloads when you are on cellular data"
                            value={downloadSettings.wifiOnly}
                            onToggle={(value) => setDownloadSettings(current => ({ ...current, wifiOnly: value }))}
                        />
                    </ProfileMenuSection>

                    <ProfileMenuSection title="Queue">
                        <ProfileMenuToggle
                            icon="albums-outline"
                            label="Background Downloading"
                            detail="Keep queued downloads running when the app is backgrounded, where supported"
                            value={downloadSettings.backgroundDownloading}
                            onToggle={(value) => setDownloadSettings(current => ({ ...current, backgroundDownloading: value }))}
                        />
                        <RowDivider />
                        <ProfileMenuToggle
                            icon="git-branch-outline"
                            label="Parallel Downloading"
                            detail="Download multiple episodes or chapters at the same time"
                            value={downloadSettings.parallelDownloading}
                            onToggle={(value) => setDownloadSettings(current => ({ ...current, parallelDownloading: value }))}
                        />
                    </ProfileMenuSection>

                    <Text className="px-1 text-xs leading-5 text-white/35">
                        Background downloading is enabled by default, but actual behavior still depends on platform background execution limits.
                    </Text>
                </View>
            </ScrollView>
        </View>
    )
}

// ── TV Panel ──────────────────────────────────────────────────────

export function DownloadSettingsPanel({
    nextFocusLeft,
}: {
    nextFocusLeft?: number | null
}) {
    const [downloadSettings, setDownloadSettings] = useAtom(downloadSettingsAtom)

    return (
        <ScrollView className="flex-1 px-4 pt-2">
            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Network</Text>
            <DownloadToggle
                icon="wifi-outline"
                label="Only Download on Wi-Fi"
                detail="Block new downloads when you are on cellular data"
                value={downloadSettings.wifiOnly}
                onToggle={(value) => setDownloadSettings(current => ({ ...current, wifiOnly: value }))}
                nextFocusLeft={nextFocusLeft}
            />

            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mt-5 mb-2">Queue</Text>
            <DownloadToggle
                icon="albums-outline"
                label="Background Downloading"
                detail="Keep queued downloads running when the app is backgrounded, where supported"
                value={downloadSettings.backgroundDownloading}
                onToggle={(value) => setDownloadSettings(current => ({ ...current, backgroundDownloading: value }))}
                nextFocusLeft={nextFocusLeft}
            />
            <DownloadToggle
                icon="git-branch-outline"
                label="Parallel Downloading"
                detail="Download multiple episodes or chapters at the same time"
                value={downloadSettings.parallelDownloading}
                onToggle={(value) => setDownloadSettings(current => ({ ...current, parallelDownloading: value }))}
                nextFocusLeft={nextFocusLeft}
            />

            <Text className="px-1 mt-4 text-xs leading-5 text-white/35">
                Background downloading is enabled by default, but actual behavior still depends on platform background execution limits.
            </Text>
        </ScrollView>
    )
}

function DownloadToggle({
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
