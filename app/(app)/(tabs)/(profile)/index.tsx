import { useScanLocalFiles } from "@/api/hooks/scan.hooks"
import { useCurrentUser } from "@/atoms/server.atoms"
import { websocketAtom } from "@/atoms/websocket.atoms"
import { ProfileTVLayout, TVActionPanel, TVPlayerOptions, type TVSection } from "@/components/features/profile/profile-tv-layout"
import { ActiveStreamPanel } from "./active-stream"
import { AnimeDownloadsPanel } from "@/components/features/profile/anime-downloads-panel"
import { DownloadSettingsPanel } from "./download-settings"
import { MangaDownloadsPanel } from "@/components/features/profile/manga-downloads-panel"
import { LogsPanel } from "./logs"
import { MyListsPanel } from "./my-lists"
import { ServerDownloadsPanel } from "./server-downloads"
import { UnmatchedPanel } from "./unmatched"
import { SafeView } from "@/components/layout/layout-view"
import { Badge } from "@/components/ui/badge"
import { Text as UIText } from "@/components/ui/text"
import { TabFadeView } from "@/components/layout/tab-fade-view"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { checkForAppReleaseUpdateManually } from "@/lib/app-release-updates"
import {
    useActiveAnimeDownloads,
    useActiveMangaDownloads,
    useAllDownloadedAnime,
    useAllDownloadedManga,
    useAnimeTotalDownloadSize,
    useFailedAnimeDownloads,
    useFailedMangaDownloads,
    useIsLocalServer,
    useMangaDownloadDiskUsage,
} from "@/lib/downloads"
import { useIsServerConnected, useManualOfflineMode, useServerConnectionState } from "@/lib/offline"
import { checkForOtaUpdateManually, getOtaVersionInfo } from "@/lib/ota/updates"
import { type ActiveStreamSession, activeStreamSessionAtom } from "@/lib/player"
import { getPlatformExternalPlayers } from "@/lib/player/external-players"
import { getPlayerPreferences } from "@/lib/player/player-preferences"
import { toast } from "@/lib/utils/toast"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useAtomValue } from "jotai"
import * as React from "react"
import { ActivityIndicator, Text, View } from "react-native"

export default function ProfileScreen() {
    const user = useCurrentUser()
    const connectionState = useServerConnectionState()
    const [manualOffline, setManualOffline] = useManualOfflineMode()
    const activeStream = useAtomValue(activeStreamSessionAtom)
    const isServerConnected = useIsServerConnected()
    const isLocalServer = useIsLocalServer()

    const socket = useAtomValue(websocketAtom)
    const [scanProgress, setScanProgress] = React.useState<number | null>(null)
    const [scanStatus, setScanStatus] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!socket) return

        const handleMessage = (event: WebSocketMessageEvent) => {
            try {
                const data = JSON.parse(event.data) as { type?: string; payload?: any }
                if (data?.type === "scan-progress") {
                    setScanProgress(data.payload as number)
                } else if (data?.type === "scan-status") {
                    setScanStatus(data.payload as string)
                }
            }
            catch (e) {
                // ignore
            }
        }

        socket.addEventListener("message", handleMessage)
        return () => socket.removeEventListener("message", handleMessage)
    }, [socket])

    React.useEffect(() => {
        if (scanProgress === 100) {
            const timer = setTimeout(() => {
                setScanProgress(null)
                setScanStatus(null)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [scanProgress])

    const { mutate: scanLibrary, isPending: isScanPending } = useScanLocalFiles()
    const isScanning = (scanProgress !== null && scanProgress < 100) || isScanPending

    const handleRescan = React.useCallback(() => {
        if (isScanning) return
        scanLibrary({
            enhanced: false,
            enhanceWithOfflineDatabase: false,
            skipLockedFiles: true,
            skipIgnoredFiles: true,
        })
    }, [isScanning, scanLibrary])

    useIOSScrollRefreshRateWorkaround()

    const downloadedAnime = useAllDownloadedAnime()
    const activeAnimeDownloads = useActiveAnimeDownloads()
    const failedAnimeDownloads = useFailedAnimeDownloads()
    const totalAnimeSize = useAnimeTotalDownloadSize()
    const downloadedManga = useAllDownloadedManga()
    const activeMangaDownloads = useActiveMangaDownloads()
    const failedMangaDownloads = useFailedMangaDownloads()
    const totalMangaSize = useMangaDownloadDiskUsage()

    const [isClearingImageCache, setIsClearingImageCache] = React.useState(false)
    const [isCheckingAppReleaseUpdate, setIsCheckingAppReleaseUpdate] = React.useState(false)
    const [isCheckingOtaUpdate, setIsCheckingOtaUpdate] = React.useState(false)
    const otaVersionInfo = React.useMemo(() => getOtaVersionInfo(), [])

    const [externalPlayerLabel] = React.useState(() =>
        getExternalPlayerLabel(getPlayerPreferences().externalPlayerTemplate),
    )

    const clearImageCache = React.useCallback(() => {
        if (isClearingImageCache) {
            return
        }

        (async () => {
            try {
                setIsClearingImageCache(true)

                const [memoryCleared, diskCleared] = await Promise.all([
                    Image.clearMemoryCache(),
                    Image.clearDiskCache(),
                ])

                if (!memoryCleared && !diskCleared) {
                    toast.info("Image cache was already empty")
                    return
                }

                toast.success("Image cache cleared")
            }
            catch {
                toast.error("Failed to clear image cache")
            }
            finally {
                setIsClearingImageCache(false)
            }
        })()
    }, [isClearingImageCache])

    const handleTVClearImageCache = React.useCallback(() => {
        if (isClearingImageCache) return
        clearImageCache()
    }, [isClearingImageCache, clearImageCache])

    const handleTVChangeServerUrl = React.useCallback(() => {
        router.push("/(out)/set-server-url" as never)
    }, [])

    const handleCheckForOtaUpdatePress = React.useCallback(() => {
        if (isCheckingOtaUpdate) {
            return
        }

        setIsCheckingOtaUpdate(true)
        checkForOtaUpdateManually()
            .finally(() => {
                setIsCheckingOtaUpdate(false)
            })
    }, [isCheckingOtaUpdate])

    const handleCheckForAppReleaseUpdatePress = React.useCallback(() => {
        if (isCheckingAppReleaseUpdate) {
            return
        }

        setIsCheckingAppReleaseUpdate(true)
        checkForAppReleaseUpdateManually()
            .finally(() => {
                setIsCheckingAppReleaseUpdate(false)
            })
    }, [isCheckingAppReleaseUpdate])

    const viewer = user?.viewer
    const connectionLabel = connectionState === "connected"
        ? "Connected to server"
        : connectionState === "connecting"
            ? "Checking server"
            : "Offline"
    const connectionColorClassName = connectionState === "connected"
        ? "bg-green-400"
        : connectionState === "connecting"
            ? "bg-amber-400"
            : "bg-red-400"

    // ── Build sections for TV 2-column layout ─────────────────────────
    // On TV the right column shows the active section's settings panel.
    const sections: TVSection[] = [
        {
            id: "anilist",
            title: "AniList",
            icon: "list-outline",
            items: [
                {
                    id: "my-lists",
                    icon: "list-outline",
                    label: "My Lists",
                    detail: "Browse your anime & manga lists",
                    onPress: () => router.push("/(app)/(tabs)/(profile)/my-lists" as never),
                    renderRightPanel: ({ leftColumnNode }) => <MyListsPanel nextFocusLeft={leftColumnNode} />,
                },
            ],
        },
        activeStream ? {
            id: "streaming",
            title: "Streaming",
            icon: "cloud-outline",
            show: true,
            items: [
                {
                    id: "server-stream",
                    icon: activeStream.streamMode === "debrid" ? "cloud-outline" : "radio-outline",
                    label: "Server Stream",
                    detail: formatActiveStreamDetail(activeStream),
                    accessory: <ActiveStreamBadge status={activeStream.status} />,
                    onPress: () => router.push("/(app)/(tabs)/(profile)/active-stream" as never),
                    renderRightPanel: ({ leftColumnNode }) => <ActiveStreamPanel nextFocusLeft={leftColumnNode} />,
                },
            ],
        } : { id: "streaming", title: "Streaming", icon: "cloud-outline", show: false, items: [] },
        {
            id: "downloads",
            title: "Downloads",
            icon: "download-outline",
            items: [
                {
                    id: "anime-downloads",
                    icon: "tv-outline",
                    label: "Anime Downloads",
                    detail: formatDownloadMenuDetail({
                        activeCount: activeAnimeDownloads.length,
                        failedCount: failedAnimeDownloads.length,
                        downloadedCount: downloadedAnime.length,
                        sizeLabel: totalAnimeSize.formatted,
                        mediaLabel: "anime",
                    }),
                    accessory: (activeAnimeDownloads.length > 0 || failedAnimeDownloads.length > 0)
                        ? <QueueBadges activeCount={activeAnimeDownloads.length} failedCount={failedAnimeDownloads.length} />
                        : undefined,
                    onPress: () => router.push("/(app)/(media)/anime-downloads" as never),
                    renderRightPanel: ({ leftColumnNode }) => <AnimeDownloadsPanel nextFocusLeft={leftColumnNode} />,
                },
                {
                    id: "manga-downloads",
                    icon: "book-outline",
                    label: "Manga Downloads",
                    detail: formatDownloadMenuDetail({
                        activeCount: activeMangaDownloads.length,
                        failedCount: failedMangaDownloads.length,
                        downloadedCount: downloadedManga.length,
                        sizeLabel: totalMangaSize.formatted,
                        mediaLabel: "manga",
                    }),
                    accessory: (activeMangaDownloads.length > 0 || failedMangaDownloads.length > 0)
                        ? <QueueBadges activeCount={activeMangaDownloads.length} failedCount={failedMangaDownloads.length} />
                        : undefined,
                    onPress: () => router.push("/(app)/(media)/manga-downloads" as never),
                    renderRightPanel: ({ leftColumnNode }) => <MangaDownloadsPanel nextFocusLeft={leftColumnNode} />,
                },
                {
                    id: "download-settings",
                    icon: "options-outline",
                    label: "Download Settings",
                    detail: "Wi-Fi, background, and queue preferences",
                    onPress: () => router.push("/(app)/(tabs)/(profile)/download-settings" as never),
                    renderRightPanel: ({ leftColumnNode }) => <DownloadSettingsPanel nextFocusLeft={leftColumnNode} />,
                },
            ],
        },
        {
            id: "server-library",
            title: "Server Library",
            icon: "server-outline",
            show: !!(isServerConnected && isLocalServer),
            items: [
                {
                    id: "server-download-queue",
                    icon: "cloud-download-outline",
                    label: "Server Download Queue",
                    detail: "Monitor active downloads running on the server",
                    onPress: () => router.push("/(app)/(tabs)/(profile)/server-downloads" as never),
                    renderRightPanel: ({ leftColumnNode }) => <ServerDownloadsPanel nextFocusLeft={leftColumnNode} />,
                },
                {
                    id: "resolve-unmatched",
                    icon: "alert-circle-outline",
                    label: "Resolve Unmatched",
                    detail: "Manually match unmatched files/folders to anime entries",
                    onPress: () => router.push("/(app)/(tabs)/(profile)/unmatched" as never),
                    renderRightPanel: ({ leftColumnNode }) => <UnmatchedPanel nextFocusLeft={leftColumnNode} />,
                },
                {
                    id: "rescan-library",
                    icon: isScanning ? "refresh" : "search-circle-outline",
                    label: isScanning ? (scanStatus || "Scanning library...") : "Rescan Library",
                    detail: isScanning ? `Progress: ${scanProgress ?? 0}%` : "Scan files in your host library",
                    accessory: isScanning ? <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" /> : undefined,
                    onPress: handleRescan,
                    hideChevron: isScanning,
                },
            ],
        },
        {
            id: "app",
            title: "App",
            icon: "apps-outline",
            items: [
                {
                    id: "offline-mode",
                    icon: "cloud-offline-outline",
                    label: "Offline Mode",
                    detail: "Force offline behavior even when connected",
                    isToggle: true,
                    toggleValue: manualOffline,
                    onToggle: setManualOffline,
                    onPress: () => setManualOffline(!manualOffline),
                },
                {
                    id: "clear-image-cache",
                    icon: "images-outline",
                    label: "Clear Image Cache",
                    detail: "Purge cached posters, banners, and avatars",
                    hideChevron: true,
                    renderRightPanel: ({ leftColumnNode }) => <TVActionPanel description="This removes cached posters, banners, and avatars. Images will download again the next time they are shown." actionLabel="Clear cache" onAction={handleTVClearImageCache} isProcessing={isClearingImageCache} nextFocusLeft={leftColumnNode} />,
                },
                {
                    id: "logs",
                    icon: "document-text-outline",
                    label: "Logs",
                    detail: "Crash records and temporary diagnostics",
                    onPress: () => router.push("/(app)/(tabs)/(profile)/logs" as never),
                    renderRightPanel: ({ leftColumnNode }) => <LogsPanel nextFocusLeft={leftColumnNode} />,
                },
                {
                    id: "check-new-release",
                    icon: "reload-circle-outline",
                    label: "Check New Release",
                    detail: isCheckingAppReleaseUpdate ? "Checking releases" : undefined,
                    accessory: isCheckingAppReleaseUpdate ? <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" /> : undefined,
                    onPress: handleCheckForAppReleaseUpdatePress,
                    hideChevron: true,
                },
                {
                    id: "check-ota-update",
                    icon: "code-download-outline",
                    label: "Check OTA Update",
                    detail: isCheckingOtaUpdate ? "Checking update server" : undefined,
                    accessory: isCheckingOtaUpdate ? <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" /> : undefined,
                    onPress: handleCheckForOtaUpdatePress,
                    hideChevron: true,
                },
                {
                    id: "change-server-url",
                    icon: "server-outline",
                    label: "Change Server URL",
                    hideChevron: true,
                    renderRightPanel: ({ leftColumnNode }) => <TVActionPanel description="Go to the server URL setup screen." actionLabel="Continue" onAction={handleTVChangeServerUrl} nextFocusLeft={leftColumnNode} />,
                },
            ],
        },
        {
            id: "player",
            title: "Player",
            icon: "play-circle-outline",
            items: [
                {
                    id: "external-player",
                    icon: "play-circle-outline",
                    label: "External Player",
                    detail: externalPlayerLabel,
                    renderRightPanel: ({ leftColumnNode }) => <TVPlayerOptions nextFocusLeft={leftColumnNode} />,
                },
            ],
        },
    ]

    // ── Render ────────────────────────────────────────────────────────
    return (
        <SafeView>
            <TabFadeView>
                <ProfileTVLayout
                    sections={sections}
                    viewerName={viewer?.name}
                    connectionLabel={connectionLabel}
                    connectionColor={connectionColorClassName}
                />
                <View className="mx-5 pt-4 pb-4">
                    <Text className="text-muted-foreground text-sm text-right">{`v0.1.3`} | {`${otaVersionInfo.otaVersion}`}</Text>
                </View>
            </TabFadeView>
        </SafeView>
    )
}

function ActiveStreamBadge({ status }: { status: ActiveStreamSession["status"] }) {
    const label = status === "playing" ? "Live" : "Loading"

    return (
        <Badge variant="secondary" className="items-center justify-center rounded-full bg-green-400/15 px-2 py-0.5">
            <UIText className="text-[11px] font-semibold text-green-300">{label}</UIText>
        </Badge>
    )
}

////////////////////////// Menu helpers

function getExternalPlayerLabel(template: string | null): string {
    if (!template) return "Built-in player"
    const match = getPlatformExternalPlayers().find(p => p.urlTemplate === template)
    return match ? match.name : "Custom"
}

function QueueBadges({ activeCount, failedCount }: { activeCount: number; failedCount: number }) {
    if (activeCount <= 0 && failedCount <= 0) {
        return null
    }

    return (
        <>
            {activeCount > 0 ? (
                <Badge variant="secondary" className="min-w-6 items-center justify-center rounded-full bg-brand-300/20 px-2 py-0.5">
                    <UIText className="text-[11px] font-semibold text-brand-200">{activeCount}</UIText>
                </Badge>
            ) : null}
            {failedCount > 0 ? (
                <Badge variant="destructive" className="min-w-6 items-center justify-center rounded-full bg-red-500/15 px-2 py-0.5">
                    <UIText className="text-[11px] font-semibold text-red-300">{failedCount}</UIText>
                </Badge>
            ) : null}
        </>
    )
}

function formatDownloadMenuDetail({
    activeCount,
    failedCount,
    downloadedCount,
    sizeLabel,
    mediaLabel,
}: {
    activeCount: number
    failedCount: number
    downloadedCount: number
    sizeLabel: string
    mediaLabel: string
}) {
    const parts: string[] = []

    if (activeCount > 0) {
        parts.push(`${activeCount} in queue`)
    }
    if (failedCount > 0) {
        parts.push(`${failedCount} failed`)
    }

    if (parts.length > 0) {
        return parts.join(" · ")
    }

    if (downloadedCount > 0) {
        return `${downloadedCount} ${mediaLabel} · ${sizeLabel}`
    }

    return "No downloads"
}

function formatActiveStreamDetail(activeStream: ActiveStreamSession): string {
    const mode = activeStream.streamMode === "debrid" ? "Debrid streaming" : "Torrent streaming"
    const subtitle = activeStream.subtitle ? ` · ${activeStream.subtitle}` : ""

    return `${mode}${subtitle}`
}
