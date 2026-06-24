import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { Image } from "expo-image"
import { router, useFocusEffect } from "expo-router"
import * as React from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { useServerUrl } from "@/atoms/server.atoms"
import {
    useActiveAnimeDownloads,
    useAllDownloadedAnime,
    useAnimeDownloadDiskUsage,
    useAnimeTotalDownloadSize,
    useDownloadedEpisodeCount,
    useFailedAnimeDownloads,
    syncLocalServerFilesToDownloads,
    useIsLocalServer,
    useDeleteAllAnimeDownloadsForMedia,
    getCompletedEpisodesForMedia,
    type DownloadedAnimeInfo,
} from "@/lib/downloads"
import { Ionicons } from "@expo/vector-icons"

export function AnimeDownloadsPanel({
    nextFocusLeft,
}: {
    nextFocusLeft?: number | null
}) {
    const serverUrl = useServerUrl()
    const isLocal = useIsLocalServer()
    const downloadedAnime = useAllDownloadedAnime()
    const activeDownloads = useActiveAnimeDownloads()
    const failedDownloads = useFailedAnimeDownloads()
    const episodeCount = useDownloadedEpisodeCount()
    const totalSize = useAnimeTotalDownloadSize()
    const diskUsage = useAnimeDownloadDiskUsage()

    useFocusEffect(
        React.useCallback(() => {
            if (serverUrl) {
                void syncLocalServerFilesToDownloads(serverUrl)
            }
        }, [serverUrl]),
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

    const hasContent = downloadedAnime.length > 0 || activeDownloads.length > 0

    return (
        <ScrollView className="flex-1 px-4 pt-2">
            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Storage</Text>

            <View className="bg-white/5 rounded-xl p-4 gap-2.5">
                <Row label="Disk usage" value={diskUsage.formatted} />
                <Row label="Downloaded episodes" value={String(episodeCount)} />
                <Row label="Downloaded anime" value={String(downloadedAnime.length)} />
            </View>

            <Text className="text-xs font-semibold text-white/30 uppercase tracking-widest mt-5 mb-3">Queue</Text>

            <TvFocusablePressable
                className="flex-row items-center px-4 py-3 rounded-xl bg-white/5"
                focusedClassName="border border-brand-400/60 bg-white/[0.08]"
                onPress={() => router.push("/(app)/(media)/anime-download-queue" as never)}
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
                        Downloaded Anime ({downloadedAnime.length})
                    </Text>
                    <View className="gap-1.5">
                        {downloadedAnime.map((anime) => (
                            <AnimeDownloadRow
                                key={anime.mediaId}
                                anime={anime}
                                isLocal={isLocal}
                                nextFocusLeft={nextFocusLeft}
                            />
                        ))}
                    </View>
                </>
            )}

            {!hasContent && (
                <View className="py-12 items-center gap-2">
                    <Ionicons name="tv-outline" size={28} color="rgba(255,255,255,0.15)" />
                    <Text className="text-white/30 text-sm">No anime downloads yet</Text>
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

function AnimeDownloadRow({
    anime,
    isLocal,
    nextFocusLeft,
}: {
    anime: DownloadedAnimeInfo
    isLocal: boolean
    nextFocusLeft?: number | null
}) {
    const deleteAllForMedia = useDeleteAllAnimeDownloadsForMedia()
    const completed = React.useMemo(() => getCompletedEpisodesForMedia(anime.mediaId), [anime.mediaId])
    const hasDeletable = React.useMemo(() => {
        return completed.some(ep => ep.localFilePath && !ep.isLocalServerFile)
    }, [completed])

    return (
        <TvFocusablePressable
            className="flex-row items-center px-3 py-2.5 rounded-lg"
            focusedClassName="bg-white/10 border border-white/10"
            onPress={() => router.push({
                pathname: "/(app)/entry/anime/[id]",
                params: { id: String(anime.mediaId), initialView: "downloaded" },
            })}
            onLongPress={(!isLocal && hasDeletable) ? () => {
                Alert.alert(
                    "Delete downloads",
                    `Remove all ${anime.downloadedCount} downloaded episodes for "${anime.title}"?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => deleteAllForMedia(anime.mediaId),
                        },
                    ],
                )
            } : undefined}
            nextFocusLeft={nextFocusLeft ?? undefined}
        >
            {anime.coverImageUrl ? (
                <Image
                    source={{ uri: anime.coverImageUrl }}
                    style={{ width: 28, height: 40, borderRadius: 4 }}
                    contentFit="cover"
                />
            ) : (
                <View className="h-10 w-7 items-center justify-center rounded-md bg-white/10">
                    <Ionicons name="tv" size={14} color="rgba(255,255,255,0.3)" />
                </View>
            )}
            <View className="flex-1 ml-3 mr-2">
                <Text className="text-foreground text-sm font-medium" numberOfLines={1}>
                    {anime.title}
                </Text>
                <Text className="text-white/40 text-xs mt-0.5">
                    {anime.downloadedCount} episode{anime.downloadedCount !== 1 ? "s" : ""}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
        </TvFocusablePressable>
    )
}
