import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { Image } from "expo-image"
import { router } from "expo-router"
import * as React from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import {
    useActiveMangaDownloads,
    useAllDownloadedManga,
    useFailedMangaDownloads,
    useMangaDownloadDiskUsage,
    useClearAllMangaDownloads,
} from "@/lib/downloads"
import { type DownloadedMangaInfo } from "@/lib/downloads/manga-download-store"
import { Ionicons } from "@expo/vector-icons"

export function MangaDownloadsPanel({
    nextFocusLeft,
}: {
    nextFocusLeft?: number | null
}) {
    const downloadedManga = useAllDownloadedManga()
    const activeDownloads = useActiveMangaDownloads()
    const failedDownloads = useFailedMangaDownloads()
    const diskUsage = useMangaDownloadDiskUsage()
    const clearAll = useClearAllMangaDownloads()

    const totalChapters = React.useMemo(
        () => downloadedManga.reduce((sum, m) => sum + m.downloadedCount, 0),
        [downloadedManga],
    )

    const queueSummary = React.useMemo(() => {
        const parts: string[] = []
        if (activeDownloads.length > 0) {
            parts.push(`${activeDownloads.length} in queue`)
        }
        if (failedDownloads.length > 0) {
            parts.push(`${failedDownloads.length} failed`)
        }
        return parts.length > 0 ? parts.join(" · ") : null
    }, [activeDownloads.length, failedDownloads.length])

    const hasContent = downloadedManga.length > 0 || activeDownloads.length > 0

    return (
        <ScrollView className="flex-1 px-4 pt-2">
            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Storage</Text>

            <View className="bg-white/5 rounded-xl p-4 gap-2.5">
                <Row label="Disk usage" value={diskUsage.formatted} />
                <Row label="Downloaded chapters" value={String(totalChapters)} />
                <Row label="Downloaded manga" value={String(downloadedManga.length)} />
            </View>

            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mt-5 mb-3">Queue</Text>

            <TvFocusablePressable
                className="flex-row items-center px-4 py-3 rounded-xl bg-white/5"
                focusedClassName="border border-brand-400/60 bg-white/[0.08]"
                onPress={() => router.push("/(app)/(media)/manga-download-queue" as never)}
                nextFocusLeft={nextFocusLeft ?? undefined}
            >
                <View className="w-8 h-8 rounded-full bg-brand-500/20 items-center justify-center">
                    <Ionicons name="download-outline" size={18} color="rgba(251,191,36,0.9)" />
                </View>
                <View className="ml-3 flex-1">
                    <Text className="text-sm font-medium text-white/90">View Queue</Text>
                    {queueSummary && (
                        <Text className="text-xs text-white/50 mt-0.5">{queueSummary}</Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
            </TvFocusablePressable>

            {hasContent && (
                <>
                    <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mt-5 mb-3">
                        Downloaded Manga ({downloadedManga.length})
                    </Text>
                    <View className="gap-1.5">
                        {downloadedManga.map((manga) => (
                            <MangaDownloadRow
                                key={manga.mediaId}
                                manga={manga}
                                nextFocusLeft={nextFocusLeft}
                            />
                        ))}
                    </View>
                </>
            )}

            {!hasContent && (
                <View className="py-12 items-center gap-2">
                    <Ionicons name="book-outline" size={28} color="rgba(255,255,255,0.15)" />
                    <Text className="text-white/30 text-sm">No manga downloads yet</Text>
                </View>
            )}

            {downloadedManga.length > 0 && (
                <View className="mt-5">
                    <TvFocusablePressable
                        className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-red-500/10"
                        focusedClassName="border border-red-400/60 bg-red-500/20"
                        onPress={() => {
                            Alert.alert(
                                "Clear all manga downloads",
                                `This will delete all downloaded manga chapters (${diskUsage.formatted}) from your device. This cannot be undone.`,
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Delete All",
                                        style: "destructive",
                                        onPress: () => clearAll(),
                                    },
                                ],
                            )
                        }}
                        nextFocusLeft={nextFocusLeft ?? undefined}
                    >
                        <View className="flex-1">
                            <Text className="text-red-400 text-sm font-medium">Clear all manga downloads</Text>
                            <Text className="text-white/30 text-xs mt-0.5">
                                Remove all downloaded chapters and free up {diskUsage.formatted}
                            </Text>
                        </View>
                        <Ionicons name="trash-outline" size={18} color="rgba(239,68,68,0.7)" />
                    </TvFocusablePressable>
                </View>
            )}
        </ScrollView>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row justify-between items-center">
            <Text className="text-white/60 text-sm">{label}</Text>
            <Text className="text-foreground text-sm font-medium">{value}</Text>
        </View>
    )
}

function MangaDownloadRow({
    manga,
    nextFocusLeft,
}: {
    manga: DownloadedMangaInfo
    nextFocusLeft?: number | null
}) {
    return (
        <TvFocusablePressable
            className="flex-row items-center px-3 py-2.5 rounded-lg"
            focusedClassName="bg-white/10 border border-white/10"
            onPress={() => router.push({
                pathname: "/(app)/entry/manga/[id]",
                params: { id: String(manga.mediaId), initialView: "downloaded" },
            } as never)}
            nextFocusLeft={nextFocusLeft ?? undefined}
        >
            {manga.coverImageUrl ? (
                <Image
                    source={{ uri: manga.coverImageUrl }}
                    style={{ width: 28, height: 40, borderRadius: 4 }}
                    contentFit="cover"
                />
            ) : (
                <View className="h-10 w-7 items-center justify-center rounded-md bg-white/10">
                    <Ionicons name="book" size={14} color="rgba(255,255,255,0.3)" />
                </View>
            )}
            <View className="flex-1 ml-3 mr-2">
                <Text className="text-foreground text-sm font-medium" numberOfLines={1}>
                    {manga.title}
                </Text>
                <Text className="text-white/40 text-xs mt-0.5">
                    {manga.downloadedCount} chapter{manga.downloadedCount !== 1 ? "s" : ""}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
        </TvFocusablePressable>
    )
}
