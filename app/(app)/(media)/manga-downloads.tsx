import { EpisodePageSelector } from "@/components/shared/episode-page-selector"
import { RowDivider } from "@/components/shared/row-divider"
import { Surface } from "@/components/shared/surface"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { FormSectionLabel } from "@/components/ui/form-field"
import { useIsTV } from "@/hooks/use-device"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { usePaginatedItems } from "@/hooks/use-paginated-items"
import {
    useActiveMangaDownloads,
    useAllDownloadedManga,
    useFailedMangaDownloads,
} from "@/lib/downloads"
import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import { router } from "expo-router"
import React from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const DOWNLOADED_MANGA_PAGE_SIZE = 24

type DownloadedMangaInfo = {
    mediaId: number
    coverImageUrl?: string | null | undefined
    title: string
    downloadedCount: number
}

export default function MangaDownloadsScreen() {
    const insets = useSafeAreaInsets()
    const isTV = useIsTV()
    const downloadedManga = useAllDownloadedManga()
    const activeDownloads = useActiveMangaDownloads()
    const failedDownloads = useFailedMangaDownloads()

    useIOSScrollRefreshRateWorkaround()

    // The Jotai-backed download-store hooks (`useAllDownloadedManga` etc.)
    // already subscribe to queue updates. No manual refetch is needed on
    // focus; the empty `useFocusEffect` anchor is intentionally omitted to
    // avoid dead-code lint noise. Hook left as a comment marker below.
    // useFocusEffect(R => { /* no-op anchor */ }, [])

    const { pagedItems: items, page, setPage, totalPages } = usePaginatedItems({
        items: downloadedManga,
        pageSize: DOWNLOADED_MANGA_PAGE_SIZE,
    })

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>

            <View className="flex-row items-center gap-3 px-4 py-3" style={{ paddingLeft: 24, paddingVertical: 12 }}>
                <TvFocusablePressable
                    onPress={() => router.back()}
                    focusedClassName="bg-white/10 border border-white/20"
                    className="rounded-full p-2"
                >
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TvFocusablePressable>
                <Text className="text-xl font-bold text-foreground">Manga Downloads</Text>
            </View>

            <ScrollView
                className="flex-1"
                removeClippedSubviews={!isTV}
                contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 48, gap: 24 }}
            >

                <Surface variant="muted" className="p-4 gap-3" focusable={isTV}>
                    <EpisodePageSelector
                        totalCount={downloadedManga.length}
                        currentPage={page}
                        onPageChange={setPage}
                    />
                </Surface>

                <Surface
                    variant={failedDownloads.length > 0 ? "danger" : activeDownloads.length > 0 ? "brand" : "muted"}
                    className="overflow-hidden rounded-xl"
                >
                    <TvFocusablePressable
                        className="flex-row items-center justify-between px-4 py-4"
                        focusedClassName="bg-white/10"
                        onPress={() => router.push("/(app)/(media)/manga-download-queue" as never)}
                    >
                        <View className="flex-1 pr-3">
                            <Text className="text-base font-semibold text-foreground">
                                {failedDownloads.length > 0
                                    ? `${failedDownloads.length} download${failedDownloads.length !== 1 ? "s" : ""} failed`
                                    : activeDownloads.length > 0
                                        ? `${activeDownloads.length} active download${activeDownloads.length !== 1 ? "s" : ""}`
                                        : "No active downloads"}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                    </TvFocusablePressable>
                </Surface>


                {items.length > 0 && (
                    <View className="gap-2">
                        {items.map((manga) => (
                            <View key={manga.mediaId}>
                                <Surface variant="muted" className="overflow-hidden rounded-xl">
                                    <RowDivider />
                                    <MangaDownloadRow manga={manga} />
                                </Surface>
                            </View>
                        ))}
                    </View>
                )}

                {downloadedManga.length === 0 && activeDownloads.length === 0 && (
                    <View className="py-16 items-center gap-3" style={{ paddingVertical: 80 }}>
                        <Ionicons name="book-outline" size={56} color="rgba(255,255,255,0.2)" />
                        <Text className="text-white/40 text-sm">No manga downloads yet</Text>
                    </View>
                )}


                {downloadedManga.length > 0 && (
                    <Surface variant="danger" className="p-4 gap-3 rounded-xl overflow-hidden">
                        <FormSectionLabel>Danger Zone</FormSectionLabel>
                        <TvFocusablePressable
                            className="flex-row items-center justify-between py-2"
                            focusedClassName="bg-red-500/20"
                            onPress={() => {
                                Alert.alert(
                                    "Clear all downloads",
                                    "This will permanently delete every downloaded chapter for every series on this device. Continue?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Delete", style: "destructive", onPress: () => {} },
                                    ],
                                )
                            }}
                        >
                            <View className="flex-1">
                                <Text className="text-base font-semibold text-red-400">Clear all downloads</Text>
                                <Text className="text-xs text-white/55 mt-1">
                                    Permanently remove every downloaded chapter from this device.
                                </Text>
                            </View>
                            <Ionicons name="trash-outline" size={18} color="rgba(239,68,68,0.7)" />
                        </TvFocusablePressable>
                    </Surface>
                )}
            </ScrollView>
        </View>
    )
}

////////////////////////// Manga row, navigates to entry Downloads tab

function MangaDownloadRow({ manga }: { manga: DownloadedMangaInfo }) {
    return (
        <TvFocusablePressable
            className="flex-row items-center px-4 py-3"
            focusedClassName="bg-white/10"
            onPress={() =>
                router.push({
                    pathname: "/(app)/entry/manga/[id]",
                    params: { id: String(manga.mediaId), initialView: "downloaded" },
                })
            }
        >
            {manga.coverImageUrl ? (
                <Image
                    source={{ uri: manga.coverImageUrl }}
                    style={{ width: 44, height: 62, borderRadius: 6 }}
                    contentFit="cover"
                />
            ) : (
                <View className="w-11 h-16 rounded-md bg-white/10" />
            )}
            <View className="flex-1 px-3 gap-1">
                <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                    {manga.title}
                </Text>
                <Text className="text-xs text-white/60">
                    {manga.downloadedCount} chapter{manga.downloadedCount !== 1 ? "s" : ""}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.25)" />
        </TvFocusablePressable>
    )
}
