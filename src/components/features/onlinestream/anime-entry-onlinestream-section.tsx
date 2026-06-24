import type { Anime_Entry, Anime_Episode, HibikeOnlinestream_SearchResult, Onlinestream_Episode } from "@/api/generated/types"
import {
    useGetOnlinestreamMapping,
    useOnlinestreamManualMapping,
    useOnlinestreamManualSearch,
    useRemoveOnlinestreamMapping,
} from "@/api/hooks/onlinestream.hooks"
import { animeEntryPlaybackIntentAtom } from "@/atoms/anime-entry.atoms"
import { EpisodeListItem } from "@/components/features/anime/episode-list-item"
import { useOnlinestreamController } from "@/components/features/onlinestream/use-onlinestream-controller"
import { CenteredSpinner } from "@/components/shared/centered-spinner"
import { EPISODE_PAGE_SIZE, EpisodePageSelector } from "@/components/shared/episode-page-selector"
import { NativeSelect } from "@/components/shared/native-select"
import { Surface } from "@/components/shared/surface"
import { FormSectionLabel } from "@/components/ui/form-field"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { useIsTV } from "@/hooks/use-device"
import { usePlaybackCoordinator } from "@/lib/player"
import { cn } from "@/lib/utils"
import { Ionicons } from "@expo/vector-icons"
import { useAtom } from "jotai"
import * as React from "react"
import { ActivityIndicator, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native"

type AnimeEntryOnlinestreamSectionProps = {
    entry: Anime_Entry
}

export function AnimeEntryOnlinestreamSection({ entry }: AnimeEntryOnlinestreamSectionProps) {
    const controller = useOnlinestreamController({ entry })
    const { playOnlineStreamEpisode } = usePlaybackCoordinator(entry)
    const isTV = useIsTV()
    const [playbackIntent, setPlaybackIntent] = useAtom(animeEntryPlaybackIntentAtom)
    const [manualMatchOpen, setManualMatchOpen] = React.useState(false)

    const searchTriggerRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)

    const mediaTitle = React.useMemo(
        () =>
            entry.media?.title?.userPreferred
            ?? entry.media?.title?.english
            ?? entry.media?.title?.romaji
            ?? "",
        [entry.media?.title?.userPreferred, entry.media?.title?.english, entry.media?.title?.romaji],
    )
    const [query, setQuery] = React.useState(mediaTitle)

    const { data: currentMapping } = useGetOnlinestreamMapping({
        provider: controller.provider,
        mediaId: controller.mediaId ?? 0,
    })
    const { mutate: runSearch, data: searchResults, isPending: isSearching } = useOnlinestreamManualSearch(
        controller.mediaId ?? 0,
        controller.provider,
    )
    const { mutate: mapAnime, isPending: isMapping } = useOnlinestreamManualMapping()
    const { mutate: removeMapping, isPending: isRemoving } = useRemoveOnlinestreamMapping()

    React.useEffect(() => {
        if (manualMatchOpen) setQuery(mediaTitle)
    }, [manualMatchOpen, mediaTitle])

    // Single close path so every route that dismisses the panel (X button,
    // selecting a mapping, removing a mapping) bounces focus back to the
    // trigger that opened it. Reusing this for onSuccess callbacks avoids
    // leaving the D-pad stranded on a vanished element.
    const closeManualMatch = React.useCallback(() => {
        setManualMatchOpen(false)
        if (isTV) {
            // Defer so the panel's unmount has settled before we steal focus.
            setTimeout(() => searchTriggerRef.current?.focus(), 16)
        }
    }, [isTV])

    const handleSearch = React.useCallback(() => {
        if (!query.trim() || !controller.provider) return
        runSearch({ provider: controller.provider, query: query.trim(), dubbed: controller.dubbed })
    }, [query, controller.provider, controller.dubbed, runSearch])

    const handleSelectResult = React.useCallback((result: HibikeOnlinestream_SearchResult) => {
        if (!controller.provider) return
        mapAnime(
            { provider: controller.provider, mediaId: controller.mediaId ?? 0, animeId: result.id },
            { onSuccess: closeManualMatch },
        )
    }, [controller.provider, controller.mediaId, mapAnime, closeManualMatch])

    const handleRemoveMapping = React.useCallback(() => {
        if (!controller.provider) return
        removeMapping(
            { provider: controller.provider, mediaId: controller.mediaId ?? 0 },
            { onSuccess: closeManualMatch },
        )
    }, [controller.provider, controller.mediaId, removeMapping, closeManualMatch])



    const onlinestreamEpisodeMap = React.useMemo(() => {
        const map = new Map<number, Onlinestream_Episode>()
        for (const ep of controller.episodes) {
            map.set(ep.number, ep)
        }
        return map
    }, [controller.episodes])

    const handleEpisodePress = React.useCallback((episode: Anime_Episode) => {
        const epNumber = episode.episodeNumber
        if (controller.playRequestedEpisode === epNumber) {
            controller.cancelPlayRequest()
            return
        }
        firedPlayRef.current = null
        controller.requestPlay(epNumber)
    }, [controller])

    const firedPlayRef = React.useRef<string | null>(null)
    React.useEffect(() => {
        if (!controller.playRequestedEpisode) return
        if (!controller.selectedVideoSource) return
        if (controller.isLoadingSource) return

        const key = `${controller.provider}-${controller.playRequestedEpisode}-${controller.selectedVideoSource.server}`
        if (firedPlayRef.current === key) return
        firedPlayRef.current = key

        const ep = controller.episodes.find(e => e.number === controller.playRequestedEpisode)

        playOnlineStreamEpisode({
            videoSource: controller.selectedVideoSource,
            episodeNumber: controller.playRequestedEpisode,
            episode: ep?.metadata,
        })

        controller.cancelPlayRequest()
    }, [
        controller.playRequestedEpisode,
        controller.selectedVideoSource,
        controller.isLoadingSource,
        controller.provider,
        controller.episodes,
        playOnlineStreamEpisode,
        controller,
    ])

    React.useEffect(() => {
        firedPlayRef.current = null
    }, [controller.provider, controller.dubbed])

    const handledPlaybackIntentRef = React.useRef<string | null>(null)
    React.useEffect(() => {
        if (!playbackIntent || playbackIntent.mediaId !== entry.mediaId) return
        if (playbackIntent.kind !== "onlinestream-play") return
        if (!controller.provider || controller.isLoadingEpisodes) return
        if (handledPlaybackIntentRef.current === playbackIntent.id) return

        if (controller.episodes.length > 0 && !controller.episodes.some(episode => episode.number === playbackIntent.episodeNumber)) {
            handledPlaybackIntentRef.current = playbackIntent.id
            setPlaybackIntent(current => current?.id === playbackIntent.id ? null : current)
            return
        }

        handledPlaybackIntentRef.current = playbackIntent.id
        firedPlayRef.current = null
        controller.requestPlay(playbackIntent.episodeNumber)
        setPlaybackIntent(current => current?.id === playbackIntent.id ? null : current)
    }, [controller, entry.mediaId, playbackIntent, setPlaybackIntent])

    const { width: windowWidth } = useWindowDimensions()
    const thumbnailWidth = React.useMemo(
        () => Math.min(Math.max(windowWidth * 0.4, 128), 160),
        [windowWidth],
    )

    const [onlinePage, setOnlinePage] = React.useState(() =>
        Math.floor(controller.progress / EPISODE_PAGE_SIZE),
    )

    React.useEffect(() => {
        setOnlinePage(Math.floor(controller.progress / EPISODE_PAGE_SIZE))
    }, [controller.provider, controller.dubbed, controller.progress])

    const pagedOnlineEpisodes = React.useMemo(() => {
        const start = onlinePage * EPISODE_PAGE_SIZE
        return controller.episodes.slice(start, start + EPISODE_PAGE_SIZE)
    }, [controller.episodes, onlinePage])

    return (
        <>

            <View className="px-4 mb-5">
                <Surface variant="muted" className="p-3.5 gap-4">

                    <View className="gap-2">
                        <FormSectionLabel>Provider</FormSectionLabel>
                        {controller.isLoadingProviders ? (
                            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                        ) : controller.providerExtensions.length === 0 ? (
                            <Text className="text-sm text-white/35">No online streaming extensions installed</Text>
                        ) : isTV ? (
                            <View className="flex-row flex-wrap gap-2">
                                {controller.providerExtensions.map(p => {
                                    const selected = controller.provider === p.id
                                    return (
                                        <TvFocusablePressable
                                            key={p.id}
                                            hasTVPreferredFocus={selected}
                                            focusedClassName="border-brand-400"
                                            onPress={() => controller.setProvider(p.id)}
                                            className={cn(
                                                "h-11 flex-row items-center justify-center gap-2 rounded-md border px-5",
                                                selected
                                                    ? "border-brand-300 bg-brand-300/15"
                                                    : "border-white/10 bg-white/[0.04]",
                                            )}
                                        >
                                            <Text className={cn(
                                                "text-sm font-semibold",
                                                selected ? "text-brand-300" : "text-white/70",
                                            )}>
                                                {p.name}
                                            </Text>
                                        </TvFocusablePressable>
                                    )
                                })}
                            </View>
                        ) : (
                            <NativeSelect
                                options={controller.providerExtensions.map(p => ({ id: p.id, label: p.name }))}
                                selectedId={controller.provider}
                                onSelect={controller.setProvider}
                                title="Select Provider"
                                placeholder="Select provider"
                            />
                        )}
                    </View>


                    {controller.availableServers.length > 1 && (
                        <View className="gap-2">
                            <FormSectionLabel>Server</FormSectionLabel>
                            <View className="flex-row flex-wrap gap-2">
                                {controller.availableServers.map(server => {
                                    const selected = controller.selectedServer === server
                                    return (
                                        <Pressable
                                            key={server}
                                            onPress={() => controller.setSelectedServer(server)}
                                            className={cn(
                                                "h-9 flex-row items-center gap-1.5 rounded-full border px-3.5",
                                                selected
                                                    ? "border-brand-300 bg-brand-300/15"
                                                    : "border-white/10 bg-white/[0.04] active:bg-white/10",
                                            )}
                                        >
                                            <Text
                                                className={cn(
                                                    "text-sm font-medium",
                                                    selected ? "text-brand-300" : "text-foreground/70",
                                                )}
                                            >
                                                {server}
                                            </Text>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </View>
                    )}


                    <View className="items-center gap-4">
                        {controller.availableQualities.length > 1 && (
                            <View className="gap-2 w-full">
                                <FormSectionLabel>Quality</FormSectionLabel>
                                <View className="flex-row flex-wrap gap-2">
                                    {controller.availableQualities.map(quality => {
                                        const normalizedSelected = controller.selectedQuality?.includes("p")
                                            ? controller.selectedQuality.split("p")[0].toLowerCase() + "p"
                                            : controller.selectedQuality
                                        const normalizedQuality = quality?.includes("p")
                                            ? quality.split("p")[0].toLowerCase() + "p"
                                            : quality
                                        const selected = normalizedSelected
                                            ? normalizedQuality?.toLowerCase().includes(normalizedSelected)
                                            : controller.selectedVideoSource?.quality === quality
                                        return (
                                            <Pressable
                                                key={quality}
                                                onPress={() => controller.setSelectedQuality(quality)}
                                                className={cn(
                                                    "h-9 flex-row items-center gap-1.5 rounded-full border px-3.5",
                                                    selected
                                                        ? "border-brand-300 bg-brand-300/15"
                                                        : "border-white/10 bg-white/[0.04] active:bg-white/10",
                                                )}
                                            >
                                                <Text
                                                    className={cn(
                                                        "text-sm font-medium",
                                                        selected ? "text-brand-300" : "text-foreground/70",
                                                    )}
                                                >
                                                    {quality}
                                                </Text>
                                            </Pressable>
                                        )
                                    })}
                                </View>
                            </View>
                        )}

                        <View className="flex-row w-full gap-2">

                            {controller.currentProvider?.supportsDub && (
                                <TvFocusablePressable
                                    onPress={() => controller.setDubbed(!controller.dubbed)}
                                    accessibilityLabel={controller.dubbed ? "Dubbed (on)" : "Dubbed (off)"}
                                    focusedClassName="border-brand-400"
                                    className={cn(
                                        "h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border px-3.5",
                                        controller.dubbed
                                            ? "border-brand-300 bg-brand-300/15"
                                            : "border-white/10 bg-white/[0.04] active:bg-white/10",
                                    )}
                                >
                                    <Text className={cn(
                                        "text-sm",
                                        controller.dubbed ? "font-semibold text-brand-300" : "font-medium text-foreground/70",
                                    )} numberOfLines={1}>Dubbed</Text>
                                </TvFocusablePressable>
                            )}

                            <TvFocusablePressable
                                ref={searchTriggerRef}
                                onPress={() => setManualMatchOpen(prev => !prev)}
                                accessibilityLabel="Matching Problems"
                                focusedClassName="border-brand-400"
                                className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/10 px-3.5 bg-white/[0.04] active:bg-white/10"
                            >
                                <Text className="text-sm font-medium text-foreground/70" numberOfLines={1}>Matching Problems?</Text>
                            </TvFocusablePressable>


                            <TvFocusablePressable
                                onPress={controller.handleEmptyCache}
                                disabled={controller.isEmptyingCache}
                                accessibilityLabel="Refresh Episodes"
                                focusedClassName="border-brand-400"
                                className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/10 px-3.5 bg-white/[0.04] active:bg-white/10"
                            >
                                {controller.isEmptyingCache ? (
                                    <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                                ) : (
                                    <Text className="text-sm font-medium text-foreground/70" numberOfLines={1}>Refresh Episodes</Text>
                                )}
                            </TvFocusablePressable>
                        </View>
                    </View>
                </Surface>
        </View>


        {manualMatchOpen && (
            <View className="px-4 mb-5">
                <View className="bg-card/30 border border-border/50 rounded-2xl p-4 gap-3">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-bold text-foreground flex-1">Manual Match</Text>
                    </View>

                    <View className="flex-row gap-2">
                        <View className="flex-1 h-11 bg-card/30 border border-border/50 rounded-xl px-3 flex-row items-center">
                            <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                                placeholder="Search title..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                className="ml-2 flex-1 text-sm text-white"
                                autoCapitalize="none"
                            />
                        </View>
                        <Pressable
                            onPress={handleSearch}
                            disabled={isSearching || !query.trim()}
                            focusable={isTV}
                            className={cn(
                                "h-11 px-4 items-center justify-center rounded-xl",
                                isSearching || !query.trim()
                                    ? "bg-card/30 border border-border/50"
                                    : "bg-primary active:opacity-80",
                            )}
                        >
                            {isSearching ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-sm font-medium text-primary-foreground">Search</Text>
                            )}
                        </Pressable>
                    </View>

                    {currentMapping?.animeId && (
                        <View className="bg-brand-300/10 border border-brand-300/20 rounded-xl px-3 py-2">
                            <Text className="text-xs text-brand-300">
                                Currently mapped to: {currentMapping.animeId}
                            </Text>
                        </View>
                    )}

                    {searchResults && searchResults.length === 0 && (
                        <View className="py-8 items-center">
                            <Text className="text-white/40 text-sm">No results found</Text>
                        </View>
                    )}

                    {searchResults && searchResults.map((result, index) => (
                        <Pressable
                            key={`${result.id}-${index}`}
                            onPress={() => handleSelectResult(result)}
                            disabled={isMapping}
                            focusable={isTV}
                            className={cn(
                                "px-4 py-3.5 bg-card/30 border-x border-border/50 active:bg-white/10",
                                index === 0 && "rounded-t-2xl border-t",
                                index === searchResults.length - 1 && "rounded-b-2xl border-b",
                                index < searchResults.length - 1 && "border-b border-b-border/30",
                            )}
                        >
                            <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                                {result.title}
                            </Text>
                            <Text className="text-xs text-white/40 mt-1">
                                {result.subOrDub === "both" ? "Sub & Dub" : result.subOrDub === "dub" ? "Dub" : "Sub"}
                            </Text>
                        </Pressable>
                    ))}

                    {currentMapping?.animeId && (
                        <Pressable
                            onPress={handleRemoveMapping}
                            disabled={isRemoving}
                            focusable={isTV}
                            className={cn(
                                "h-11 mt-1 items-center justify-center rounded-xl border",
                                isRemoving
                                    ? "border-red-500/20 bg-red-500/[0.02]"
                                    : "border-red-500/30 bg-red-500/[0.04] active:bg-red-500/[0.08]",
                            )}
                        >
                            {isRemoving ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Text className="text-sm font-medium text-red-400">Remove mapping</Text>
                            )}
                        </Pressable>
                    )}
                </View>
            </View>
        )}


        {controller.isLoadingEpisodes && (
                <View className="py-10">
                    <CenteredSpinner />
                </View>
            )}


            {!controller.isLoadingEpisodes && controller.episodes.length === 0 && !!controller.provider && (
                <View className="py-16 items-center gap-3">
                    <Ionicons name="videocam-off-outline" size={40} color="rgba(255,255,255,0.2)" />
                    <Text className="text-white/40 text-sm text-center px-8">
                        No episodes found for this provider.{"\n"}Try a different provider or use manual matching.
                    </Text>
                </View>
            )}


            {!controller.isLoadingEpisodes && controller.episodes.length > 0 && (
                <View className="px-4">
                    <Text className="text-xl font-bold text-foreground mb-3">Episodes</Text>
                    {controller.episodes.length > EPISODE_PAGE_SIZE && (
                        <View className="mb-3 -mx-4">
                            <EpisodePageSelector
                                totalCount={controller.episodes.length}
                                currentPage={onlinePage}
                                onPageChange={setOnlinePage}
                            />
                        </View>
                    )}
                    <View>
                        {pagedOnlineEpisodes.map((onlineEp, index) => {
                            const isWatched = onlineEp.number <= controller.progress
                            const isLoading = onlineEp.number === controller.playRequestedEpisode && controller.isLoadingSource

                            const animeEpisode: Anime_Episode = onlineEp.metadata ?? {
                                type: "main",
                                displayTitle: `Episode ${onlineEp.number}`,
                                episodeTitle: onlineEp.title ?? "",
                                episodeNumber: onlineEp.number,
                                absoluteEpisodeNumber: onlineEp.number,
                                progressNumber: onlineEp.number,
                                isDownloaded: false,
                                isInvalid: false,
                                _isNakamaEpisode: false,
                            }

                            return (
                                <EpisodeListItem
                                    key={`${onlineEp.number}-${index}`}
                                    episode={animeEpisode}
                                    fallbackImage={entry.media?.bannerImage}
                                    isWatched={isWatched}
                                    thumbnailWidth={thumbnailWidth}
                                    onEpisodePress={handleEpisodePress}
                                    isFirst={index === 0}
                                    isLast={index === pagedOnlineEpisodes.length - 1}
                                    // showPlayOverlay={onlineEp.number !== controller.playRequestedEpisode}
                                    isLoadingOverlay={isLoading}
                                    isFiller={onlineEp.isFiller}
                                    imageOverride={onlineEp.image}
                                    watchedProgress={controller.progress}
                                />
                            )
                        })}
                    </View>
                </View>
            )}


        </>
    )
}


