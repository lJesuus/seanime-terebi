import { Anime_Entry, Anime_Episode } from "@/api/generated/types"
import { DownloadEpisodesModal } from "@/components/features/media/download-episodes-modal"
import { ServerDownloadModal } from "@/components/features/media/server-download-modal"
import { Button } from "@/components/ui/button"
import { useCompletedEpisodesForMedia, useIsLocalServer } from "@/lib/downloads"
import { useIsServerConnected } from "@/lib/offline"
import { Ionicons } from "@expo/vector-icons"
import React, { useMemo, useState } from "react"
import { Text, View } from "react-native"

type AnimeEntryActionBarProps = {
    entry: Anime_Entry
}

// The Library switcher's primary "Play" button moved into the media
// entry header (see `MediaEntryHeaderContent`'s `nextEpisode`/
// `onPlayPress` props). This action bar is now strictly the download
// controls row, so it no longer needs the play affordance.
export function AnimeEntryActionBar({
    entry,
}: AnimeEntryActionBarProps) {
    const [downloadModalOpen, setDownloadModalOpen] = useState(false)
    const [serverDownloadModalOpen, setServerDownloadModalOpen] = useState(false)
    const downloadedEpisodes = useCompletedEpisodesForMedia(entry.mediaId)
    const isConnected = useIsServerConnected()
    const isLocalServer = useIsLocalServer()

    const allEpisodes = useMemo(() => {
        return entry.episodes?.filter(ep => ep.localFile?.path) ?? []
    }, [entry.episodes])

    const hasDownloads = downloadedEpisodes.length > 0
    const hasDownloadableEpisodes = allEpisodes.length > 0 && isConnected && !isLocalServer

    return (
        <>
            <View className="flex-row items-center gap-2.5 px-4 pb-4 pt-1">
                {hasDownloadableEpisodes && (
                    <Button
                        variant="secondary"
                        className="rounded-md h-11 flex-1"
                        onPress={() => setDownloadModalOpen(true)}
                    >
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="download-outline" size={17} color="white" />
                            {hasDownloads ? (
                                <Text className="text-sm font-medium text-secondary-foreground">
                                    {downloadedEpisodes.length}
                                </Text>
                            ) : (
                                <Text className="text-sm font-medium text-secondary-foreground">
                                    Download
                                </Text>
                            )}
                        </View>
                    </Button>
                )}

                {(isConnected && isLocalServer) && (
                    <Button
                        variant="secondary"
                        className="rounded-md h-11 px-3.5"
                        style={!hasDownloadableEpisodes ? { flex: 1 } : undefined}
                        onPress={() => setServerDownloadModalOpen(true)}
                    >
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="cloud-download-outline" size={17} color="white" />
                            <Text className="text-sm font-medium text-secondary-foreground">
                                {hasDownloadableEpisodes ? "Server" : "Download on Server"}
                            </Text>
                        </View>
                    </Button>
                )}
            </View>

            <DownloadEpisodesModal
                entry={entry}
                episodes={allEpisodes}
                open={downloadModalOpen}
                onOpenChange={setDownloadModalOpen}
            />

            <ServerDownloadModal
                entry={entry}
                open={serverDownloadModalOpen}
                onOpenChange={setServerDownloadModalOpen}
            />
        </>
    )
}
