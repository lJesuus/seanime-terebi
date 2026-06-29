import { HibikeManga_ChapterDetails, HibikeManga_SearchResult, Manga_EntryListData } from "@/api/generated/types"
import { useEmptyMangaEntryCache, useGetMangaMapping, useMangaManualMapping, useMangaManualSearch, useRemoveMangaMapping } from "@/api/hooks/manga.hooks"
import { formatMangaReaderHref, getChapterDecimal } from "@/components/features/manga/reader/manga-reader-utils"
import { CenteredSpinner } from "@/components/shared/centered-spinner"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { LuffyError } from "@/components/shared/luffy-error"
import { NativeSelect } from "@/components/shared/native-select"
import { Surface } from "@/components/shared/surface"
import { FormSectionLabel } from "@/components/ui/form-field"
import { useHandleMangaChapters } from "@/hooks/use-manga-chapters"
import { useCompletedMangaChapters, useIsMangaChapterDownloaded, useMangaChapterDownloadInfo } from "@/lib/downloads/use-manga-downloads"
import { cn } from "@/lib/utils"
import { useIsTV } from "@/hooks/use-device"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useRouter } from "expo-router"
import * as React from "react"
import { ActivityIndicator, findNodeHandle, Pressable, Text, TextInput, View } from "react-native"
import { MangaPaginationControls } from "./manga-pagination-controls"

const PAGE_SIZE = 30

function getChapterNumberValue(chapterNumber: string | undefined) {
    if (!chapterNumber || !/(\d+(\.\d+)?)/.test(chapterNumber)) return null
    return getChapterDecimal(chapterNumber)
}

function isChapterUnread(chapter: Pick<HibikeManga_ChapterDetails, "chapter">, progress: number) {
    const chapterValue = getChapterNumberValue(chapter.chapter)
    return chapterValue === null || chapterValue > progress
}

function getDefaultChapterPage(chapters: HibikeManga_ChapterDetails[], progress: number) {
    if (chapters.length === 0) return 0

    let candidateIndex = -1
    let candidateValue = Number.POSITIVE_INFINITY

    chapters.forEach((chapter, index) => {
        const chapterValue = getChapterNumberValue(chapter.chapter)
        if (chapterValue === null || chapterValue <= progress) return

        if (chapterValue < candidateValue) {
            candidateValue = chapterValue
            candidateIndex = index
        }
    })

    if (candidateIndex >= 0) {
        return Math.floor(candidateIndex / PAGE_SIZE)
    }

    const fallbackIndex = chapters.findIndex(chapter => isChapterUnread(chapter, progress))
    return fallbackIndex >= 0 ? Math.floor(fallbackIndex / PAGE_SIZE) : 0
}

type MangaEntryChaptersViewProps = {
    mediaId: number
    listData?: Manga_EntryListData
    mediaTitle?: string
    selectedChapterIds: Set<string>
    selectionMode: boolean
    onToggleChapter: (chapterId: string) => void
}

export function MangaEntryChaptersView({
    mediaId,
    listData,
    mediaTitle = "",
    selectedChapterIds,
    selectionMode,
    onToggleChapter,
}: MangaEntryChaptersViewProps) {
    const router = useRouter()
    const {
        selectedExtension,
        providerOptions,
        providerExtensionsLoading,
        selectedProvider,
        setSelectedProvider,
        selectedFilters,
        setSelectedLanguage,
        setSelectedScanlator,
        languageOptions,
        scanlatorOptions,
        chapterContainer,
        chapterContainerLoading,
        chapterContainerError,
    } = useHandleMangaChapters(String(mediaId))

    const { mutate: emptyCache, isPending: isEmptyingCache } = useEmptyMangaEntryCache()
    const [manualMatchOpen, setManualMatchOpen] = React.useState(false)
    const isTV = useIsTV()
    const searchTriggerRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)
    const [query, setQuery] = React.useState(mediaTitle)

    const { data: currentMapping } = useGetMangaMapping({ provider: selectedProvider ?? undefined, mediaId })
    const { mutate: search, data: searchResults, isPending: isSearching } = useMangaManualSearch(mediaId, selectedProvider)
    const { mutate: mapManga, isPending: isMapping } = useMangaManualMapping()
    const { mutate: removeMapping, isPending: isRemoving } = useRemoveMangaMapping()

    React.useEffect(() => {
        if (manualMatchOpen) setQuery(mediaTitle)
    }, [manualMatchOpen, mediaTitle])

    const closeManualMatch = React.useCallback(() => {
        setManualMatchOpen(false)
        if (isTV) {
            setTimeout(() => searchTriggerRef.current?.focus(), 16)
        }
    }, [isTV])

    const handleSearch = React.useCallback(() => {
        if (!query.trim() || !selectedProvider) return
        search({ provider: selectedProvider, query: query.trim() })
    }, [query, selectedProvider, search])

    const handleSelectResult = React.useCallback((result: HibikeManga_SearchResult) => {
        if (!selectedProvider) return
        mapManga(
            { provider: selectedProvider, mediaId, mangaId: result.id },
            { onSuccess: closeManualMatch },
        )
    }, [selectedProvider, mediaId, mapManga, closeManualMatch])

    const handleRemoveMapping = React.useCallback(() => {
        if (!selectedProvider) return
        removeMapping(
            { provider: selectedProvider, mediaId },
            { onSuccess: closeManualMatch },
        )
    }, [selectedProvider, mediaId, removeMapping, closeManualMatch])

    const chapters = chapterContainer?.chapters ?? []
    const progress = listData?.progress ?? 0
    const [unreadOnly, setUnreadOnly] = React.useState(true)

    const unreadChapters = React.useMemo(
        () => chapters.filter(chapter => isChapterUnread(chapter, progress)),
        [chapters, progress],
    )
    const visibleChapters = React.useMemo(
        () => unreadOnly ? unreadChapters : chapters,
        [chapters, unreadChapters, unreadOnly],
    )
    const defaultPage = React.useMemo(
        () => getDefaultChapterPage(visibleChapters, progress),
        [progress, visibleChapters],
    )

    // pagination state
    const [page, setPage] = React.useState(0)
    const chaptersKey = `${selectedProvider}-${selectedFilters.language}-${selectedFilters.scanlators[0]}-${unreadOnly
        ? "unread"
        : "all"}-${visibleChapters.length}-${progress}`

    React.useEffect(() => {
        setPage(defaultPage)
    }, [chaptersKey, defaultPage])

    const totalPages = Math.max(1, Math.ceil(visibleChapters.length / PAGE_SIZE))
    const pagedChapters = visibleChapters.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    // downloaded chapters count
    const completedChapters = useCompletedMangaChapters(mediaId, selectedProvider)
    const downloadedCount = completedChapters.length

    // Resolve native tags for hidden page-navigation triggers placed at the
    // left / right edges of the chapter list. The first chapter item gets
    // `nextFocusLeft` pointing to the prev-page trigger; the last item gets
    // `nextFocusRight` pointing to the next-page trigger. LEFT/RIGHT from
    // those items lands on the invisible 1×1 trigger, which changes the page
    // and bounces focus back to the list.
    //
    // These hooks MUST stay above the early returns below — moving them past
    // `if (providerExtensionsLoading)` makes React throw "Rendered more
    // hooks than during the previous render" once providers finish loading.
    const prevPageTriggerRef = React.useRef<number | null>(null)
    const nextPageTriggerRef = React.useRef<number | null>(null)
    const chapterItemRefs = React.useRef<Array<React.ComponentRef<typeof Pressable> | null>>([])
    const didMountForFocusRef = React.useRef(true)

    const prevPageTriggerCallbackRef = React.useCallback(
        (instance: React.ComponentRef<typeof Pressable> | null) => {
            if (instance) {
                const tag = findNodeHandle(instance)
                if (tag !== null) prevPageTriggerRef.current = tag
            } else {
                prevPageTriggerRef.current = null
            }
        },
        [],
    )
    const nextPageTriggerCallbackRef = React.useCallback(
        (instance: React.ComponentRef<typeof Pressable> | null) => {
            if (instance) {
                const tag = findNodeHandle(instance)
                if (tag !== null) nextPageTriggerRef.current = tag
            } else {
                nextPageTriggerRef.current = null
            }
        },
        [],
    )

    const handlePrevPageFocus = React.useCallback(() => {
        if (page === 0) return
        setPage(page - 1)
    }, [page])

    const handleNextPageFocus = React.useCallback(() => {
        if (page >= totalPages - 1) return
        setPage(page + 1)
    }, [page, totalPages])

    // After page changes, bounce focus to the first chapter of the new
    // page so the user never lands on a vanished element. Double rAF ensures
    // the new items have mounted and their refs are populated. Skipped on
    // initial mount to avoid stealing focus from the provider pills above.
    React.useEffect(() => {
        if (didMountForFocusRef.current) {
            didMountForFocusRef.current = false
            return
        }
        if (totalPages <= 1) return
        let innerRaf = 0
        const raf = requestAnimationFrame(() => {
            innerRaf = requestAnimationFrame(() => {
                chapterItemRefs.current[0]?.focus()
            })
        })
        return () => {
            cancelAnimationFrame(raf)
            if (innerRaf) cancelAnimationFrame(innerRaf)
        }
    }, [page, totalPages])

    if (providerExtensionsLoading) {
        return <CenteredSpinner />
    }

    if (providerOptions.length === 0) {
        return (
            <LuffyError
                title="No providers"
                description="No manga provider extensions are installed. Install one from the extension manager on your Seanime server."
            />
        )
    }

    return (
        <>
            <View className="px-4 mb-5">
                <Surface variant="muted" className="p-3.5 gap-4">
                    <View className="gap-2">
                        <FormSectionLabel>Source</FormSectionLabel>
                        <View className="flex-row flex-wrap gap-2">
                            {providerOptions.map(opt => {
                                const selected = selectedProvider === opt.value
                                return (
                                    <TvFocusablePressable
                                        key={opt.value}
                                        hasTVPreferredFocus={selected}
                                        focusedClassName="border-white/60"
                                        onPress={() => setSelectedProvider({ mId: mediaId, provider: opt.value })}
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
                                            {opt.label}
                                        </Text>
                                    </TvFocusablePressable>
                                )
                            })}
                        </View>
                    </View>

                    {(scanlatorOptions.length > 0 || languageOptions.length > 0) && (
                        <View className="flex-row gap-3">
                            {scanlatorOptions.length > 0 && (
                                <View className="flex-1 gap-2">
                                    <FormSectionLabel>Scanlator</FormSectionLabel>
                                    <NativeSelect
                                        options={[{ id: "", label: "All" }, ...scanlatorOptions.map(o => ({ id: o.value, label: o.label }))]}
                                        selectedId={selectedFilters.scanlators[0] ?? ""}
                                        onSelect={(id) => setSelectedScanlator({ mId: mediaId, scanlators: id ? [id] : [] })}
                                        title="Select Scanlator"
                                        placeholder="All"
                                    />
                                </View>
                            )}

                            {languageOptions.length > 0 && (
                                <View className="flex-1 gap-2">
                                    <FormSectionLabel>Language</FormSectionLabel>
                                    <NativeSelect
                                        options={[{ id: "", label: "All" }, ...languageOptions.map(o => ({ id: o.value, label: o.label }))]}
                                        selectedId={selectedFilters.language ?? ""}
                                        onSelect={(id) => setSelectedLanguage({ mId: mediaId, language: id })}
                                        title="Select Language"
                                        placeholder="All"
                                    />
                                </View>
                            )}
                        </View>
                    )}

                    <View className="flex-row gap-2">
                        <TvFocusablePressable
                            onPress={() => setUnreadOnly(current => !current)}
                            focusedClassName="border-white/60"
                            className={cn(
                                "h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border px-3.5",
                                unreadOnly
                                    ? "border-brand-300 bg-brand-300/15"
                                    : "border-white/10 bg-white/[0.04]",
                            )}
                        >
                            <Text className={cn(
                                "text-sm",
                                unreadOnly ? "font-semibold text-brand-300" : "font-medium text-foreground/70",
                            )} numberOfLines={1}>Unread only</Text>
                        </TvFocusablePressable>

                        <TvFocusablePressable
                            ref={searchTriggerRef}
                            onPress={() => setManualMatchOpen(prev => !prev)}
                            focusedClassName="border-white/60"
                            className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/10 px-3.5 bg-white/[0.04]"
                        >
                            <Text className="text-sm font-medium text-foreground/70" numberOfLines={1}>Manual Match</Text>
                        </TvFocusablePressable>

                        <TvFocusablePressable
                            onPress={() => emptyCache({ mediaId })}
                            disabled={isEmptyingCache}
                            focusedClassName="border-white/60"
                            className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-white/10 px-3.5 bg-white/[0.04]"
                        >
                            {isEmptyingCache ? (
                                <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                            ) : (
                                <Text className="text-sm font-medium text-foreground/70" numberOfLines={1}>Refresh Chapters</Text>
                            )}
                        </TvFocusablePressable>
                    </View>
                </Surface>
            </View>

            {/* Render the Manual Match inline box right under the controls
                row (where the user just pressed the button), instead of at
                the bottom of the page where it falls off-screen on TV. The
                Online Steam section places it the same way. */}
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
                                disabled={isSearching || !query.trim() || !selectedProvider}
                                focusable={isTV}
                                className={cn(
                                    "h-11 px-4 items-center justify-center rounded-xl",
                                    isSearching || !query.trim() || !selectedProvider
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

                        {currentMapping?.mangaId && (
                            <View className="bg-brand-300/10 border border-brand-300/20 rounded-xl px-3 py-2">
                                <Text className="text-xs text-brand-300">
                                    Currently mapped to: {currentMapping.mangaId}
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
                                {!!result.year && (
                                    <Text className="text-xs text-white/40 mt-1">{result.year}</Text>
                                )}
                            </Pressable>
                        ))}

                        {currentMapping?.mangaId && (
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

            {!chapterContainerLoading && chapters.length > 0 && (
                <View className="flex-row items-center justify-between px-4 mb-3">
                    <Text className="text-sm font-medium text-foreground/70">
                        {unreadOnly
                            ? `${unreadChapters.length} unread chapter${unreadChapters.length !== 1 ? "s" : ""}`
                            : `${chapters.length} chapter${chapters.length !== 1 ? "s" : ""}`}
                    </Text>
                    {downloadedCount > 0 && (
                        <View className="flex-row items-center gap-1.5 rounded-full border border-green-400/15 bg-green-400/10 px-2.5 py-1">
                            <Ionicons name="download" size={12} color="rgba(120,200,120,0.8)" />
                            <Text className="text-xs font-medium text-green-400/80">{downloadedCount}</Text>
                        </View>
                    )}
                </View>
            )}

            {visibleChapters.length > PAGE_SIZE && (
                <View className="px-4 mb-3">
                    <MangaPaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
                </View>
            )}

            {chapterContainerLoading ? (
                <View className="py-10">
                    <CenteredSpinner />
                </View>
            ) : chapterContainerError ? (
                <View className="px-4">
                    <LuffyError
                        title="Could not load chapters"
                        description="Failed to fetch chapters from this provider. Try a different source or check your connection."
                    />
                </View>
            ) : chapters.length === 0 ? (
                <View className="px-4">
                    <LuffyError
                        title="No chapters"
                        description="No chapters found from this provider."
                    />
                </View>
            ) : visibleChapters.length === 0 ? (
                <View className="px-4">
                    <LuffyError
                        title="All caught up"
                        description="No unread chapters match the current filters. Turn off Unread only to browse the full list."
                    />
                </View>
            ) : (
                <View className="px-4">
                    <Text className="text-xl font-bold text-foreground mb-4">Chapters</Text>
                    <Surface className="overflow-hidden">
                        {/* Invisible page-navigation triggers at the edges of
                            the chapter list. LEFT on the first chapter item
                            lands here (prev page); RIGHT on the last item
                            lands here (next page). Focus bounces back to the
                            first chapter of the new page after 100ms. */}
                        <TvFocusablePressable
                            ref={prevPageTriggerCallbackRef}
                            onFocus={handlePrevPageFocus}
                            noScale
                            style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, opacity: 0.01 }}
                        >
                            <View />
                        </TvFocusablePressable>
                        <TvFocusablePressable
                            ref={nextPageTriggerCallbackRef}
                            onFocus={handleNextPageFocus}
                            noScale
                            style={{ position: "absolute", right: 0, top: 0, width: 1, height: 1, opacity: 0.01 }}
                        >
                            <View />
                        </TvFocusablePressable>

                        {pagedChapters.map((item, index) => (
                            <ChapterListItem
                                key={item.id}
                                ref={(el) => { chapterItemRefs.current[index] = el }}
                                chapter={item}
                                mediaId={mediaId}
                                provider={item.provider || selectedProvider}
                                progress={progress}
                                isLast={index === pagedChapters.length - 1}
                                showScanlator={!!selectedExtension?.settings?.supportsMultiScanlator && !selectedFilters.scanlators[0]}
                                selectionMode={selectionMode}
                                selected={selectedChapterIds.has(item.id)}
                                onToggle={() => onToggleChapter(item.id)}
                                onReadChapter={() => {
                                    const routeProvider = item.provider || selectedProvider
                                    if (!routeProvider) return

                                    router.push(formatMangaReaderHref({
                                        mediaId,
                                        provider: routeProvider,
                                        chapterId: item.id,
                                        chapterNumber: item.chapter,
                                    }))
                                }}
                                nextFocusLeft={index === 0 ? (prevPageTriggerRef.current ?? undefined) : undefined}
                                nextFocusRight={index === pagedChapters.length - 1 ? (nextPageTriggerRef.current ?? undefined) : undefined}
                            />
                        ))}
                    </Surface>
                </View>
            )}

            {visibleChapters.length > PAGE_SIZE && (
                <View className="px-4 mt-3">
                    <MangaPaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
                </View>
            )}
        </>
    )
}

////////////////////////// Chapter list item

type ChapterListItemProps = {
    chapter: HibikeManga_ChapterDetails
    mediaId: number
    provider: string | null
    progress: number
    isLast: boolean
    showScanlator: boolean
    selectionMode: boolean
    selected: boolean
    onToggle: () => void
    onReadChapter: () => void
    /** Native tag of the hidden prev-page trigger. Set on the first item. */
    nextFocusLeft?: number
    /** Native tag of the hidden next-page trigger. Set on the last item. */
    nextFocusRight?: number
}

const ChapterListItem = React.forwardRef<React.ComponentRef<typeof Pressable>, ChapterListItemProps>(function ChapterListItem({
    chapter,
    mediaId,
    provider,
    progress,
    isLast,
    showScanlator,
    selectionMode,
    selected,
    onToggle,
    onReadChapter,
    nextFocusLeft,
    nextFocusRight,
}, ref) {
    const isRead = !isChapterUnread(chapter, progress)
    const isDownloaded = useIsMangaChapterDownloaded(mediaId, provider, chapter.id)
    const downloadInfo = useMangaChapterDownloadInfo(mediaId, provider, chapter.id)
    const isActivelyDownloading = downloadInfo?.status === "downloading"
    const isPending = downloadInfo?.status === "pending"
    const [isFocused, setIsFocused] = React.useState(false)

    return (
        <Pressable
            ref={ref}
            onPress={selectionMode ? onToggle : onReadChapter}
            onLongPress={!selectionMode ? onToggle : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            focusable={true}
            {...{ nextFocusLeft, nextFocusRight } as any}
            className={cn(
                "flex-row items-center gap-3 px-4 py-3.5 border border-transparent",
                !isLast && "border-b border-white/[0.05]",
                selectionMode && selected && "bg-brand-300/[0.08]",
                isFocused && "border-white/60 bg-white/[0.05]",
            )}
        >
            {selectionMode && (
                <View className="flex-none">
                    {isDownloaded ? (
                        <Ionicons name="checkmark-circle" size={22} color="rgba(120,200,120,0.8)" />
                    ) : (
                        <View
                            className="w-5 h-5 rounded-md border-2 items-center justify-center"
                            style={{
                                borderColor: selected ? "rgb(97,82,223)" : "rgba(255,255,255,0.25)",
                                backgroundColor: selected ? "rgb(97,82,223)" : "transparent",
                            }}
                        >
                            {selected && <Ionicons name="checkmark" size={13} color="white" />}
                        </View>
                    )}
                </View>
            )}

            <View
                className={cn(
                    "w-12 h-8 rounded-lg items-center justify-center flex-none",
                    isRead ? "bg-brand-300/10" : "bg-white/5",
                )}
            >
                <Text
                    className={cn(
                        "text-sm font-bold",
                        isRead ? "text-brand-300/60" : "text-white",
                    )}
                    numberOfLines={1}
                >
                    {chapter.chapter}
                </Text>
            </View>

            <View className="flex-1 gap-0.5">
                <Text
                    className={cn(
                        "text-sm font-medium",
                        isRead ? "text-white/40" : "text-foreground",
                    )}
                    numberOfLines={2}
                >
                    {chapter.title || `Chapter ${chapter.chapter}`}
                </Text>
                {(showScanlator && !!chapter.scanlator) && (
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {chapter.scanlator}
                    </Text>
                )}
            </View>

            <View className="flex-none flex-row items-center gap-1.5">
                {isDownloaded && (
                    <Ionicons name="download" size={15} color="rgba(120,200,120,0.7)" />
                )}
                {isActivelyDownloading && (
                    <View className="flex-row items-center gap-1">
                        <View className="w-4 h-4 rounded-full border-2 border-brand-300/50 border-t-brand-300" />
                        <Text className="text-xs text-brand-300/70">
                            {Math.round((downloadInfo.progress ?? 0) * 100)}%
                        </Text>
                    </View>
                )}
                {isPending && (
                    <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.3)" />
                )}
                {isRead && !selectionMode && (
                    <Ionicons name="checkmark-circle" size={18} color="rgba(157, 129, 255, 0.5)" />
                )}
                {!selectionMode && (
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.22)" />
                )}
            </View>
        </Pressable>
    )
})
