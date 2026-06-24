import {
    Anime_Episode,
    DebridClient_FilePreview,
    ExtensionRepo_AnimeTorrentProviderExtensionItem,
    Habari_Metadata,
    HibikeTorrent_AnimeProviderSmartSearchFilter,
    HibikeTorrent_AnimeTorrent,
    Torrentstream_BatchHistoryResponse,
    Torrentstream_FilePreview,
} from "@/api/generated/types"
import { LabeledSwitch } from "@/components/shared/labeled-switch"
import { NativeSelect, type NativeSelectOption } from "@/components/shared/native-select"
import { SegmentedControl } from "@/components/shared/segmented-control"
import { SeaSideDrawer } from "@/components/ui/sea-side-drawer"
import { FormSectionLabel } from "@/components/ui/form-field"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { useIsTV } from "@/hooks/use-device"
import { copyOfflineLogTextToClipboard } from "@/lib/offline-logger"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/utils/toast"
import { Ionicons } from "@expo/vector-icons"
import * as React from "react"
import { ActivityIndicator, findNodeHandle, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native"
import { NONE_PROVIDER, TORRENT_RESOLUTIONS, TorrentResolution, TorrentSearchMode, TorrentSheetStage } from "./use-torrent-stream-controller"
import type { StreamMode } from "./use-torrent-stream-controller"

type TorrentStreamPickerSheetProps = {
    batchHistory?: Torrentstream_BatchHistoryResponse
    batchHistoryMetadata?: Habari_Metadata
    bestRelease: boolean
    canUsePreviousBatch: boolean
    episodes: Anime_Episode[]
    episodeCollectionHasMappingError: boolean
    filePreviews?: Array<Torrentstream_FilePreview | DebridClient_FilePreview>
    isLoadingFilePreviews: boolean
    isSearching: boolean
    isStarting: boolean
    onConfirmFileSelection: () => void
    onConfirmTorrentSelection: () => void
    onOpenChange: (open: boolean) => void
    onBackToTorrentList: () => void
    onRefetchSearch: () => void
    onSelectFileId: (fileId: string) => void
    onSelectProvider: (providerId: string) => void
    onSelectResolution: (resolution: TorrentResolution) => void
    onSelectSearchMode: (mode: TorrentSearchMode) => void
    onSelectTorrent: (torrent: HibikeTorrent_AnimeTorrent | null) => void
    onToggleBestRelease: () => void
    onToggleSmartBatch: () => void
    onToggleUsePreviousBatch: () => void
    onUpdateSearchQuery: (value: string) => void
    open: boolean
    pickerStage: TorrentSheetStage
    providerExtensions: ExtensionRepo_AnimeTorrentProviderExtensionItem[]
    streamMode: StreamMode
    searchMode: TorrentSearchMode
    searchQuery: string
    selectedEpisode: Anime_Episode | null
    selectedFileId: string | null
    selectedProvider?: ExtensionRepo_AnimeTorrentProviderExtensionItem | null
    selectedProviderId: string
    selectedTorrent: HibikeTorrent_AnimeTorrent | null
    smartSearchBatch: boolean
    smartSearchFilters: HibikeTorrent_AnimeProviderSmartSearchFilter[]
    supportsSmartSearch: boolean
    torrents: HibikeTorrent_AnimeTorrent[]
    torrentMetadataByInfoHash?: Record<string, Habari_Metadata | undefined>
    usePreviousBatch: boolean
    resolution: TorrentResolution
    autoSelect?: boolean
    autoSelectFile?: boolean
    onToggleAutoSelect?: () => void
    onToggleAutoSelectFile?: () => void
    mode?: "stream" | "download"
    onDownloadTorrent?: (torrent: HibikeTorrent_AnimeTorrent, smartSelect: boolean) => void
    onDownloadFile?: (torrent: HibikeTorrent_AnimeTorrent, fileId: string | null) => void
    isDownloading?: boolean
    hasTorrentClient?: boolean
    searchAcrossProviders: boolean
    onToggleSearchAcrossProviders: () => void
    extraProviderIds: string[]
    onSelectExtraProviderIds: (ids: string[]) => void
    onSelectStage: (stage: TorrentSheetStage) => void
    availableModes: StreamMode[]
    onSelectStreamMode: (mode: StreamMode) => void
    destination?: string
    onChangeDestination?: (path: string) => void
    onSelectEpisodeNumber?: (episodeNumber: number) => void
}

export function TorrentStreamPickerSheet(props: TorrentStreamPickerSheetProps) {
    const isTV = useIsTV()
    const {
        batchHistory,
        batchHistoryMetadata,
        bestRelease,
        canUsePreviousBatch,
        episodes,
        episodeCollectionHasMappingError,
        filePreviews,
        isLoadingFilePreviews,
        isSearching,
        isStarting,
        onConfirmFileSelection,
        onConfirmTorrentSelection,
        onBackToTorrentList,
        onOpenChange,
        onRefetchSearch,
        onSelectFileId,
        onSelectProvider,
        onSelectResolution,
        onSelectSearchMode,
        onSelectTorrent,
        onToggleBestRelease,
        onToggleSmartBatch,
        onToggleUsePreviousBatch,
        onUpdateSearchQuery,
        open,
        pickerStage,
        providerExtensions,
        streamMode,
        searchMode,
        searchQuery,
        selectedEpisode,
        selectedFileId,
        selectedProvider,
        selectedProviderId,
        selectedTorrent,
        smartSearchBatch,
        smartSearchFilters,
        supportsSmartSearch,
        torrents,
        torrentMetadataByInfoHash,
        usePreviousBatch,
        resolution,
        autoSelect = false,
        autoSelectFile = false,
        onToggleAutoSelect = () => {},
        onToggleAutoSelectFile = () => {},
        mode = "stream",
        onDownloadTorrent,
        onDownloadFile,
        isDownloading = false,
        hasTorrentClient = false,
        searchAcrossProviders,
        onToggleSearchAcrossProviders,
        extraProviderIds,
        onSelectExtraProviderIds,
        onSelectStage,
        availableModes,
        onSelectStreamMode,
        destination,
        onChangeDestination,
        onSelectEpisodeNumber,
    } = props

    const [headerActionTag, setHeaderActionTag] = React.useState<number | null>(null)

    return (
        <SeaSideDrawer
            title={selectedEpisode ? `Episode ${selectedEpisode.episodeNumber}` : streamMode === "debrid" ? "Select release" : "Select torrent"}
            open={open}
            onOpenChange={onOpenChange}
            headerAction={isTV ? (
                <Pressable onPress={onRefetchSearch} focusable={isTV} className="pr-1">
                    <Ionicons name="refresh" size={24} color="rgba(255,255,255,0.55)" />
                </Pressable>
            ) : undefined}
            onHeaderActionLayout={setHeaderActionTag}
        >
            <View className="gap-4">
                <View className="gap-1.5">
                    <Text className="text-sm font-medium text-muted-foreground">
                        {selectedEpisode?.episodeTitle || selectedEpisode?.displayTitle || (streamMode === "debrid"
                            ? "Choose a release"
                            : "Choose a torrent")}
                    </Text>
                </View>

                {pickerStage === "providers" ? (
                    <TorrentProviderSelectionStage
                        providerExtensions={providerExtensions}
                        extraProviderIds={extraProviderIds}
                        selectedProviderId={selectedProviderId}
                        onSelectExtraProviderIds={onSelectExtraProviderIds}
                        onBack={onBackToTorrentList}
                    />
                ) : (
                    <TorrentSelectionStage
                        batchHistory={batchHistory}
                        batchHistoryMetadata={batchHistoryMetadata}
                        bestRelease={bestRelease}
                        canUsePreviousBatch={canUsePreviousBatch}
                        episodes={episodes}
                        episodeCollectionHasMappingError={episodeCollectionHasMappingError}
                        isSearching={isSearching}
                        onRefetchSearch={onRefetchSearch}
                        onSelectProvider={onSelectProvider}
                        onSelectResolution={onSelectResolution}
                        onSelectSearchMode={onSelectSearchMode}
                        onSelectTorrent={onSelectTorrent}
                        onToggleBestRelease={onToggleBestRelease}
                        onToggleSmartBatch={onToggleSmartBatch}
                        onToggleUsePreviousBatch={onToggleUsePreviousBatch}
                        onUpdateSearchQuery={onUpdateSearchQuery}
                        providerExtensions={providerExtensions}
                        resolution={resolution}
                        searchMode={searchMode}
                        searchQuery={searchQuery}
                        selectedProvider={selectedProvider}
                        selectedProviderId={selectedProviderId}
                        selectedTorrent={selectedTorrent}
                        smartSearchBatch={smartSearchBatch}
                        smartSearchFilters={smartSearchFilters}
                        supportsSmartSearch={supportsSmartSearch}
                        torrents={torrents}
                        torrentMetadataByInfoHash={torrentMetadataByInfoHash}
                        usePreviousBatch={usePreviousBatch}
                        searchAcrossProviders={searchAcrossProviders}
                        onToggleSearchAcrossProviders={onToggleSearchAcrossProviders}
                        extraProviderIds={extraProviderIds}
                        onSelectExtraProviderIds={onSelectExtraProviderIds}
                        onSelectStage={onSelectStage}
                        availableModes={availableModes}
                        onSelectStreamMode={onSelectStreamMode}
                        streamMode={streamMode}
                        selectedEpisode={selectedEpisode}
                        onSelectEpisodeNumber={onSelectEpisodeNumber}
                        autoSelect={autoSelect}
                        autoSelectFile={autoSelectFile}
                        onToggleAutoSelect={onToggleAutoSelect}
                        onToggleAutoSelectFile={onToggleAutoSelectFile}
                        mode={mode}
                        headerActionTag={headerActionTag}
                        onConfirmTorrentSelection={onConfirmTorrentSelection}
                        rightColumnOverride={pickerStage === "files" ? (
                            <TorrentFileSelectionStage
                                filePreviews={filePreviews}
                                isLoading={isLoadingFilePreviews}
                                onBack={onBackToTorrentList}
                                selectedFileId={selectedFileId}
                                onSelectFileId={onSelectFileId}
                                onConfirmFileSelection={onConfirmFileSelection}
                                streamMode={streamMode}
                            />
                        ) : undefined}
                    />
                )}
            </View>
        </SeaSideDrawer>
    )
}

type TorrentSelectionStageProps = {
    batchHistory?: Torrentstream_BatchHistoryResponse
    batchHistoryMetadata?: Habari_Metadata
    bestRelease: boolean
    canUsePreviousBatch: boolean
    episodes: Anime_Episode[]
    episodeCollectionHasMappingError: boolean
    isSearching: boolean
    onRefetchSearch: () => void
    onSelectProvider: (providerId: string) => void
    onSelectResolution: (resolution: TorrentResolution) => void
    onSelectSearchMode: (mode: TorrentSearchMode) => void
    onSelectTorrent: (torrent: HibikeTorrent_AnimeTorrent | null) => void
    onToggleBestRelease: () => void
    onToggleSmartBatch: () => void
    onToggleUsePreviousBatch: () => void
    onUpdateSearchQuery: (value: string) => void
    providerExtensions: ExtensionRepo_AnimeTorrentProviderExtensionItem[]
    resolution: TorrentResolution
    searchMode: TorrentSearchMode
    searchQuery: string
    selectedProvider?: ExtensionRepo_AnimeTorrentProviderExtensionItem | null
    selectedProviderId: string
    selectedTorrent: HibikeTorrent_AnimeTorrent | null
    smartSearchBatch: boolean
    smartSearchFilters: HibikeTorrent_AnimeProviderSmartSearchFilter[]
    supportsSmartSearch: boolean
    torrents: HibikeTorrent_AnimeTorrent[]
    torrentMetadataByInfoHash?: Record<string, Habari_Metadata | undefined>
    usePreviousBatch: boolean
    searchAcrossProviders: boolean
    onToggleSearchAcrossProviders: () => void
    extraProviderIds: string[]
    onSelectExtraProviderIds: (ids: string[]) => void
    onSelectStage: (stage: TorrentSheetStage) => void
    availableModes: StreamMode[]
    onSelectStreamMode: (mode: StreamMode) => void
    streamMode: StreamMode
    selectedEpisode: Anime_Episode | null
    onSelectEpisodeNumber?: (episodeNumber: number) => void
    autoSelect: boolean
    autoSelectFile: boolean
    onToggleAutoSelect: () => void
    onToggleAutoSelectFile: () => void
    mode?: "stream" | "download"
    headerActionTag?: number | null
    onConfirmTorrentSelection?: () => void
    rightColumnOverride?: React.ReactNode
}

function TorrentSelectionStage(props: TorrentSelectionStageProps) {
    const isTV = useIsTV()
    const [isFiltersExpanded, setIsFiltersExpanded] = React.useState(false)
    const [previousFocused, setPreviousFocused] = React.useState(false)
    const {
        batchHistory,
        batchHistoryMetadata,
        bestRelease,
        canUsePreviousBatch,
        episodes,
        episodeCollectionHasMappingError,
        isSearching,
        onRefetchSearch,
        onSelectProvider,
        onSelectResolution,
        onSelectSearchMode,
        onSelectTorrent,
        onToggleBestRelease,
        onToggleSmartBatch,
        onToggleUsePreviousBatch,
        onUpdateSearchQuery,
        providerExtensions,
        resolution,
        searchMode,
        searchQuery,
        selectedProvider,
        selectedProviderId,
        selectedTorrent,
        headerActionTag,
        smartSearchBatch,
        smartSearchFilters,
        supportsSmartSearch,
        torrents,
        torrentMetadataByInfoHash,
        usePreviousBatch,
        autoSelect,
        autoSelectFile,
        onToggleAutoSelect,
        onToggleAutoSelectFile,
        searchAcrossProviders,
        onToggleSearchAcrossProviders,
        extraProviderIds,
        onSelectExtraProviderIds,
        onSelectStage,
        availableModes,
        onSelectStreamMode,
        streamMode,
        selectedEpisode,
        onSelectEpisodeNumber,
        mode,
        onConfirmTorrentSelection,
        rightColumnOverride,
    } = props

    const providerOptions = React.useMemo(
        () => [...providerExtensions].sort((a, b) => a.name.localeCompare(b.name)),
        [providerExtensions],
    )

    const headerUpTag = isTV ? (headerActionTag ?? undefined) : undefined

    const releaseCards = React.useMemo(() => {
        return torrents.map((torrent, index) => {
            const isSelected = selectedTorrent?.infoHash === torrent.infoHash && selectedTorrent?.downloadUrl === torrent.downloadUrl

            return (
                <TorrentCardPressable
                    key={`${torrent.infoHash ?? torrent.downloadUrl}-${index}`}
                    torrent={torrent}
                    index={index}
                    isSelected={isSelected}
                    episodes={episodes}
                    torrentMetadataByInfoHash={torrentMetadataByInfoHash}
                    onSelectTorrent={onSelectTorrent}
                    onConfirmTorrentSelection={onConfirmTorrentSelection}
                    autoSelectFile={autoSelectFile}
                    onSelectStage={onSelectStage}
                    nextFocusUp={index === 0 ? headerUpTag : undefined}
                    blockDown={isTV && index === torrents.length - 1}
                />
            )
        })
    }, [episodes, onSelectTorrent, onConfirmTorrentSelection, autoSelectFile, onSelectStage, selectedTorrent?.downloadUrl, selectedTorrent?.infoHash, torrentMetadataByInfoHash, torrents])

    const segmentedOptions = React.useMemo(() => [
        { value: "torrent", label: "Torrent Client" },
        { value: "debrid", label: "Debrid Service" },
    ].filter(opt => availableModes?.includes(opt.value as StreamMode)), [availableModes])

    const nativeEpisodeOptions = React.useMemo<NativeSelectOption[]>(
        () => episodes.map(ep => ({
            id: String(ep.episodeNumber),
            label: `Episode ${ep.episodeNumber}`,
            sublabel: ep.episodeTitle || ep.displayTitle || undefined,
        })),
        [episodes],
    )

    const activeFilterCount = React.useMemo(() => {
        let count = 0
        if (searchAcrossProviders) count++
        if (searchMode === "smart" && supportsSmartSearch) {
            if (smartSearchBatch && smartSearchFilters.includes("batch")) count++
            if (resolution !== undefined && smartSearchFilters.includes("resolution")) count++
            if (bestRelease && smartSearchFilters.includes("bestReleases")) count++
        }
        return count
    }, [searchAcrossProviders, searchMode, supportsSmartSearch, smartSearchBatch, smartSearchFilters, resolution, bestRelease])

    const { width } = useWindowDimensions()
    const isWideLayout = isTV || width >= 700

    const settingsColumn = (
        <View className={cn("gap-3.5", isWideLayout && "flex-1 min-w-0")}>
            <View className="gap-1.5">
                <FormSectionLabel>Provider</FormSectionLabel>
                    {providerOptions.length === 0 ? (
                        <SurfaceMessage text="No provider extensions" tone="muted" />
                    ) : (
                        <View className="gap-2">
                            {providerOptions.map((p, idx) => {
                                const isActive = p.id === selectedProviderId
                                return (
                                    <TvFocusablePressable
                                        key={p.id}
                                        onPress={() => onSelectProvider(p.id)}
                                        hasTVPreferredFocus={isTV && idx === 0 && (!availableModes || availableModes.length <= 1)}
                                        blockLeft={isTV}
                                        blockUp={isTV && idx === 0}
                                        className={cn(
                                            "rounded-2xl p-3 border flex-row justify-between items-center",
                                            isActive
                                                ? "bg-indigo-500/15 border-indigo-400/30"
                                                : "bg-white/5 border-white/10",
                                        )}
                                        focusedClassName="border border-brand-400/80 bg-white/10"
                                    >
                                        <View className="flex-1 gap-1">
                                            <Text className="text-sm font-bold text-white" numberOfLines={1}>
                                                {p.name}
                                            </Text>
                                            {!!p.lang && (
                                                <Text className="text-[10px] text-white/35 uppercase">
                                                    {p.lang}
                                                </Text>
                                            )}
                                        </View>
                                        {isActive && (
                                            <Ionicons name="checkmark-circle" size={18} color="#a5b4fc" />
                                        )}
                                    </TvFocusablePressable>
                                )
                            })}
                        </View>
                    )}
                </View>

            {selectedProviderId !== NONE_PROVIDER && (
                <LabeledSwitch
                    label="Smart search"
                    checked={searchMode === "smart"}
                    onToggle={() => onSelectSearchMode(searchMode === "smart" ? "simple" : "smart")}
                    disabled={!supportsSmartSearch}
                    helper={supportsSmartSearch ? "Automated search based on given parameters." : "This provider does not support smart search."}
                    blockLeft={isTV}
                />
            )}

            {selectedProviderId !== NONE_PROVIDER && (
                <LabeledSwitch
                    label={streamMode === "debrid" ? "Auto-select debrid stream" : "Auto-select torrent"}
                    checked={autoSelect}
                    onToggle={onToggleAutoSelect}
                    helper={streamMode === "debrid"
                        ? "Automatically pick the best torrent and debrid file for the episode."
                        : "Automatically pick the best torrent and file for the episode."}
                    blockLeft={isTV}
                />
            )}

            {selectedProviderId !== NONE_PROVIDER && !autoSelect && usePreviousBatch && (
                <LabeledSwitch
                    label="Reuse previous batch"
                    checked={usePreviousBatch}
                    onToggle={onToggleUsePreviousBatch}
                    helper="Reuse the previously selected batch torrent for subsequent episodes when possible."
                />
            )}

            {selectedProviderId !== NONE_PROVIDER && !autoSelect && !usePreviousBatch && (
                <LabeledSwitch
                    label="Auto-select file"
                    checked={autoSelectFile}
                    onToggle={onToggleAutoSelectFile}
                    helper="Automatically select the matching file from batch torrents."
                    blockLeft={isTV}
                />
            )}

            {selectedProviderId !== NONE_PROVIDER && searchMode === "smart" && mode !== "stream" && supportsSmartSearch && smartSearchFilters.includes(
                "episodeNumber") && onSelectEpisodeNumber && episodes.length > 0 && (
                <View className="gap-1.5">
                    <FormSectionLabel>Episode</FormSectionLabel>
                    <NativeSelect
                        options={nativeEpisodeOptions}
                        selectedId={selectedEpisode ? String(selectedEpisode.episodeNumber) : ""}
                        onSelect={(id) => onSelectEpisodeNumber?.(Number(id))}
                        title="Select Episode"
                    />
                </View>
            )}

            {selectedProviderId !== NONE_PROVIDER && (searchMode === "simple") && (
                <View className="gap-2">
                    <Text className="text-xs text-white/35">Search query</Text>
                    <TorrentSearchQueryField
                        value={searchQuery}
                        onChangeText={onUpdateSearchQuery}
                    />
                </View>
            )}

            {false && selectedProviderId !== NONE_PROVIDER && (
                <View className="gap-3">
                    <TvFocusablePressable
                        onPress={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        blockLeft={isTV}
                        className="flex-row items-center justify-between py-1.5 px-0.5 border-b border-white/5 active:opacity-60"
                        focusedClassName="border-b border-brand-400/80"
                    >
                        <Text className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                            Search Settings
                        </Text>
                        <View className="flex-row items-center gap-2">
                            {activeFilterCount > 0 && (
                                <View className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                                    <Text className="text-[10px] font-semibold text-indigo-400">
                                        {activeFilterCount} active
                                    </Text>
                                </View>
                            )}
                            <Ionicons
                                name={isFiltersExpanded ? "chevron-up" : "chevron-down"}
                                size={14}
                                color="rgba(255,255,255,0.4)"
                            />
                        </View>
                    </TvFocusablePressable>

                    {isFiltersExpanded && (
                        <View className="gap-3.5 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                            {providerOptions.length > 1 && (
                                <View className="gap-2.5">
                                    <LabeledSwitch
                                        label="Search across providers"
                                        checked={searchAcrossProviders}
                                        onToggle={onToggleSearchAcrossProviders}
                                        helper="Runs the same search against other installed providers."
                                    />
                                    {searchAcrossProviders && (
                                        <Pressable
                                            onPress={() => onSelectStage("providers")}
                                            focusable={isTV}
                                            className="flex-row items-center justify-between h-11 px-3.5 rounded-xl border border-white/10 bg-white/[0.04] active:bg-white/5 mt-0.5"
                                        >
                                            <Text className="text-sm font-medium text-white">
                                                {extraProviderIds.filter(id => id !== selectedProviderId).length === 0
                                                    ? "Select providers..."
                                                    : `${extraProviderIds.filter(id => id !== selectedProviderId).length} selected`}
                                            </Text>
                                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.45)" />
                                        </Pressable>
                                    )}
                                </View>
                            )}

                            {(smartSearchFilters.includes("query")) && (
                                <View className="gap-2">
                                    <Text className="text-xs text-white/35">Search query</Text>
                                    <TorrentSearchQueryField
                                        value={searchQuery}
                                        onChangeText={onUpdateSearchQuery}
                                    />
                                </View>
                            )}

                            {searchMode === "smart" && (
                                <View className="gap-3.5">
                                    {smartSearchFilters.includes("batch") && (
                                        <LabeledSwitch
                                            label="Search batches"
                                            checked={smartSearchBatch}
                                            onToggle={onToggleSmartBatch}
                                            helper="Prefer finished-season batch releases when available."
                                        />
                                    )}

                                    {smartSearchFilters.includes("resolution") && (
                                        <View className="gap-2">
                                            <Text className="text-xs text-white/35">Resolution</Text>
                                            <ChipWrap>
                                                <ChoiceChip
                                                    key="any"
                                                    label="Any"
                                                    active={resolution === undefined || (resolution as any) === ""}
                                                    onPress={() => onSelectResolution(undefined)}
                                                />
                                                {TORRENT_RESOLUTIONS.map(item => (
                                                    <ChoiceChip
                                                        key={item}
                                                        label={item + "p"}
                                                        active={resolution === item}
                                                        onPress={() => onSelectResolution(resolution === item ? undefined : item)}
                                                    />
                                                ))}
                                            </ChipWrap>
                                        </View>
                                    )}

                                    {smartSearchFilters.includes("bestReleases") && (
                                        <LabeledSwitch
                                            label="Best releases"
                                            checked={bestRelease}
                                            onToggle={onToggleBestRelease}
                                            helper="Prefer best-ranked releases when the provider supports it."
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}
        </View>
    )

    const releasesColumn = (
        <View className={cn("gap-2", isWideLayout && "flex-[2] min-w-0")}>
            {!!batchHistory?.torrent && (
                <View className="gap-2">
                    <View className="flex-row justify-between items-center">
                        <FormSectionLabel>Previous Selection</FormSectionLabel>
                        {usePreviousBatch && (
                            <Text className="text-xs text-white/35">Auto-selected on episode tap</Text>
                        )}
                    </View>
                    <Pressable
                        onPress={() => onSelectTorrent(selectedTorrent?.infoHash === batchHistory.torrent?.infoHash
                            ? null
                            : batchHistory.torrent ?? null)}
                        focusable={isTV}
                        onFocus={() => setPreviousFocused(true)}
                        onBlur={() => setPreviousFocused(false)}
                    >
                        <TorrentCard
                            torrent={batchHistory.torrent!}
                            episodes={episodes}
                            metadata={batchHistoryMetadata}
                            isSelected={selectedTorrent?.infoHash === batchHistory.torrent?.infoHash}
                            isFocused={previousFocused}
                        />
                    </Pressable>
                </View>
            )}

            <View className="gap-2">
                <FormSectionLabel>Releases</FormSectionLabel>

                {selectedProviderId === NONE_PROVIDER ? (
                    <SurfaceMessage text="Select a provider to search for torrents." tone="muted" />
                ) : isSearching ? (
                    <View className="py-16 items-center gap-2.5">
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" />
                        <Text className="text-sm text-white/35">Searching torrents...</Text>
                    </View>
                ) : torrents.length === 0 ? (
                    <View className="py-16 items-center gap-2">
                        <Ionicons name="search-outline" size={32} color="rgba(255,255,255,0.15)" />
                        <Text className="text-sm text-white/35">No torrents found for this episode</Text>
                    </View>
                ) : (
                    <View className="gap-2.5">{releaseCards}</View>
                )}
            </View>
        </View>
    )

    return (
        <View className="gap-4">
            {availableModes && availableModes.length > 1 && (
                <SegmentedControl
                    options={segmentedOptions}
                    value={streamMode}
                    onChange={(val) => onSelectStreamMode(val as StreamMode)}
                    hasTVPreferredFocus={isTV}
                />
            )}
            {episodeCollectionHasMappingError && (
                <SurfaceMessage text="AniDB mapping is missing for this title. Manual torrent and file selection may be required." tone="warning" />
            )}

            {isWideLayout ? (
                <View className="flex-row gap-5">
                    {settingsColumn}
                    {rightColumnOverride ? (
                        <View className="flex-[2] min-w-0 gap-2">{rightColumnOverride}</View>
                    ) : releasesColumn}
                </View>
            ) : (
                <>
                    {settingsColumn}
                    {rightColumnOverride ?? releasesColumn}
                </>
            )}
        </View>
    )
}

function TorrentSearchQueryField({
    value,
    onChangeText,
}: {
    value: string
    onChangeText: (value: string) => void
}) {
    const [draftValue, setDraftValue] = React.useState(value)
    const isFocusedRef = React.useRef(false)

    React.useEffect(() => {
        if (!isFocusedRef.current) {
            setDraftValue(value)
        }
    }, [value])

    React.useEffect(() => {
        if (!isFocusedRef.current) return
        if (draftValue === value) return

        const timer = setTimeout(() => {
            React.startTransition(() => {
                onChangeText(draftValue)
            })
        }, 180)

        return () => clearTimeout(timer)
    }, [draftValue, onChangeText, value])

    const handleFocus = React.useCallback(() => {
        isFocusedRef.current = true
    }, [])

    const commitDraftValue = React.useCallback(() => {
        if (draftValue === value) return

        onChangeText(draftValue)
    }, [draftValue, onChangeText, value])

    const handleBlur = React.useCallback(() => {
        isFocusedRef.current = false
        commitDraftValue()
    }, [commitDraftValue])

    const handleSubmitEditing = React.useCallback(() => {
        commitDraftValue()
    }, [commitDraftValue])

    return (
        <View className="h-11 flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
            <TextInput
                value={draftValue}
                onChangeText={setDraftValue}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onSubmitEditing={handleSubmitEditing}
                placeholder="Search torrents"
                placeholderTextColor="rgba(255,255,255,0.35)"
                className="flex-1 py-0 text-foreground"
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
            />
        </View>
    )
}

type TorrentFileSelectionStageProps = {
    filePreviews?: Array<Torrentstream_FilePreview | DebridClient_FilePreview>
    isLoading: boolean
    onBack: () => void
    selectedFileId: string | null
    onSelectFileId: (fileId: string) => void
    onConfirmFileSelection?: () => void
    streamMode: StreamMode
}

function TorrentFileSelectionStage({ filePreviews, isLoading, onBack, selectedFileId, onSelectFileId, onConfirmFileSelection, streamMode }: TorrentFileSelectionStageProps) {
    const isTV = useIsTV()
    const [focusedFileId, setFocusedFileId] = React.useState<string | null>(null)
    const previews = React.useMemo(() => {
        return [...(filePreviews ?? [])].sort((a, b) => Number(b.isLikely) - Number(a.isLikely))
    }, [filePreviews])

    if (isLoading) {
        return (
            <View className="py-16 items-center gap-2.5">
                <ActivityIndicator size="small" color="rgba(255,255,255,0.45)" />
                <Text className="text-sm text-white/35">
                    {streamMode === "debrid" ? "Loading matching files..." : "Loading torrent files..."}
                </Text>
            </View>
        )
    }

    if (!previews.length) {
        return <SurfaceMessage text="No matching files were found in this torrent." tone="warning" />
    }

    return (
        <View className="gap-2.5">
            <View className="flex-row justify-between items-center">
                <FormSectionLabel>File Selection</FormSectionLabel>
                <Pressable onPress={onBack} focusable={isTV}>
                    <Text className="text-xs font-semibold text-white/40">
                        Back to releases
                    </Text>
                </Pressable>
            </View>

            <View className="gap-2.5">
                {previews.map((file, fileIndex) => {
                    const fileId = getFileSelectionValue(file)
                    const selected = selectedFileId === fileId
                    return (
                        <Pressable
                            key={fileId}
                            onPress={() => {
                                onSelectFileId(fileId)
                                setTimeout(() => onConfirmFileSelection?.(), 0)
                            }}
                            onFocus={() => setFocusedFileId(fileId)}
                            onBlur={() => setFocusedFileId(null)}
                            focusable={isTV}
                            hasTVPreferredFocus={isTV && fileIndex === 0 ? true : undefined}
                            className={cn(
                                "rounded-2xl p-3.5 border gap-2",
                                selected
                                    ? "bg-indigo-500/15 border-indigo-400/30"
                                    : "bg-white/5 border-white/10",
                                focusedFileId === fileId && "border-brand-400/80",
                            )}
                        >
                            <View className="flex-row justify-between items-center gap-2.5">
                                <Text className="text-sm font-bold text-white flex-1" numberOfLines={1}>
                                    {file.displayTitle || file.displayPath}
                                </Text>
                                {file.isLikely &&
                                    <MiniBadge label="Likely" color="#a7f3d0" bg="rgba(16,185,129,0.14)" border="rgba(16,185,129,0.24)" />}
                            </View>
                            <Text className="text-xs text-white/35" numberOfLines={2}>
                                {file.displayPath}
                            </Text>
                        </Pressable>
                    )
                })}
            </View>
        </View>
    )
}

type TorrentProviderSelectionStageProps = {
    providerExtensions: ExtensionRepo_AnimeTorrentProviderExtensionItem[]
    extraProviderIds: string[]
    selectedProviderId: string
    onSelectExtraProviderIds: (ids: string[]) => void
    onBack: () => void
}

function TorrentProviderSelectionStage({
    providerExtensions,
    extraProviderIds,
    selectedProviderId,
    onSelectExtraProviderIds,
    onBack,
}: TorrentProviderSelectionStageProps) {
    const isTV = useIsTV()
    const [searchQuery, setSearchQuery] = React.useState("")

    const providerOptions = React.useMemo(
        () => [...providerExtensions]
            .filter(p => p.id !== selectedProviderId)
            .sort((a, b) => a.name.localeCompare(b.name)),
        [providerExtensions, selectedProviderId],
    )

    const filteredProviders = React.useMemo(() => {
        if (!searchQuery.trim()) return providerOptions
        const query = searchQuery.toLowerCase().trim()
        return providerOptions.filter(p => p.name.toLowerCase().includes(query))
    }, [providerOptions, searchQuery])

    const handleSelectAll = React.useCallback(() => {
        onSelectExtraProviderIds(providerOptions.map(p => p.id))
    }, [onSelectExtraProviderIds, providerOptions])

    const handleClearAll = React.useCallback(() => {
        onSelectExtraProviderIds([])
    }, [onSelectExtraProviderIds])

    return (
        <View className="gap-3">
            <View className="flex-row justify-between items-center">
                <FormSectionLabel>Additional Providers</FormSectionLabel>
                <Pressable onPress={onBack} focusable={isTV}>
                    <Text className="text-xs font-semibold text-white/40">
                        Back to releases
                    </Text>
                </Pressable>
            </View>

            <View className="h-11 flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4">
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Filter providers..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    className="flex-1 py-0 text-foreground text-sm"
                    autoCorrect={false}
                    autoCapitalize="none"
                />
            </View>

            <View className="flex-row gap-2">
                <Pressable
                    onPress={handleSelectAll}
                    focusable={isTV}
                    className="flex-1 h-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                    <Text className="text-xs font-semibold text-white/70">Select All</Text>
                </Pressable>
                <Pressable
                    onPress={handleClearAll}
                    focusable={isTV}
                    className="flex-1 h-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                    <Text className="text-xs font-semibold text-white/70">Clear All</Text>
                </Pressable>
            </View>

            {filteredProviders.length === 0 ? (
                <View className="py-8 items-center">
                    <Text className="text-sm text-white/35">No providers found</Text>
                </View>
            ) : (
                <View className="gap-2">
                    {filteredProviders.map(p => {
                        const isActive = extraProviderIds.includes(p.id)
                        return (
                            <Pressable
                                key={p.id}
                                onPress={() => {
                                    if (isActive) {
                                        onSelectExtraProviderIds(extraProviderIds.filter(id => id !== p.id))
                                    } else {
                                        onSelectExtraProviderIds([...extraProviderIds, p.id])
                                    }
                                }}
                                focusable={isTV}
                                className={cn(
                                    "rounded-2xl p-3.5 border flex-row justify-between items-center",
                                    isActive
                                        ? "bg-indigo-500/15 border-indigo-400/30"
                                        : "bg-white/5 border-white/10",
                                )}
                            >
                                <View className="flex-1 gap-1">
                                    <Text className="text-sm font-bold text-white" numberOfLines={1}>
                                        {p.name}
                                    </Text>
                                    {!!p.lang && (
                                        <Text className="text-[10px] text-white/35 uppercase">
                                            {p.lang}
                                        </Text>
                                    )}
                                </View>
                                {isActive && (
                                    <Ionicons name="checkmark-circle" size={18} color="#a5b4fc" />
                                )}
                            </Pressable>
                        )
                    })}
                </View>
            )}
        </View>
    )
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const isTV = useIsTV()
    return (
        <Pressable
            onPress={onPress}
            focusable={isTV}
            className={cn(
                "px-3.5 py-2 rounded-full border",
                active ? "bg-indigo-500/60 border-indigo-500/80" : "bg-white/5 border-white/10",
            )}
        >
            <Text className={cn("text-xs font-semibold", active ? "text-white" : "text-white/45")}>
                {label}
            </Text>
        </Pressable>
    )
}

function ChipWrap({ children }: { children: React.ReactNode }) {
    return <View className="flex-row gap-2 flex-wrap">{children}</View>
}

function SurfaceMessage({ text, tone }: { text: string; tone: "warning" | "muted" }) {
    return (
        <View
            className={cn(
                "rounded-xl px-3 py-3 border",
                tone === "warning"
                    ? "bg-amber-400/10 border-amber-400/20"
                    : "bg-white/5 border-white/10",
            )}
        >
            <Text
                className={cn(
                    "text-xs leading-relaxed",
                    tone === "warning" ? "text-amber-200" : "text-white/35",
                )}
            >
                {text}
            </Text>
        </View>
    )
}

function getFileSelectionValue(file: Torrentstream_FilePreview | DebridClient_FilePreview): string {
    return "fileId" in file ? file.fileId : String(file.index)
}

function uniqueInts(values?: string[]) {
    return [...new Set(
        (values ?? [])
            .map(value => Number.parseInt(value, 10))
            .filter(value => Number.isFinite(value)),
    )]
}

function getResolutionStyle(resolution?: string): { color: string; bg: string } {
    if (!resolution) return { color: "rgba(255,255,255,0.35)", bg: "rgba(17,17,17,0.55)" }
    if (resolution.includes("1080")) return { color: "#a5b4fc", bg: "rgba(17,17,17,0.55)" }
    if (resolution.includes("2160") || resolution.toLowerCase().includes("4k")) return { color: "#93c5fd", bg: "rgba(17,17,17,0.55)" }
    if (resolution.includes("720")) return { color: "#86efac", bg: "rgba(17,17,17,0.55)" }
    return { color: "rgba(255,255,255,0.35)", bg: "rgba(17,17,17,0.55)" }
}

function getSeederInfo(seeders: number): { color: string; iconName: React.ComponentProps<typeof Ionicons>["name"] } {
    if (seeders >= 50) return { color: "#a5b4fc", iconName: "battery-full" }
    if (seeders >= 20) return { color: "#86efac", iconName: "battery-full" }
    if (seeders >= 10) return { color: "#86efac", iconName: "battery-half" }
    if (seeders >= 5) return { color: "#fdba74", iconName: "battery-half" }
    return { color: "#fca5a5", iconName: "battery-dead" }
}

function formatRelativeDate(dateStr: string): string {
    try {
        const date = new Date(dateStr)
        const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
        if (diffDays === 0) return "Today"
        if (diffDays === 1) return "1 day ago"
        if (diffDays < 30) return `${diffDays} days ago`
        const diffMonths = Math.floor(diffDays / 30)
        if (diffMonths === 1) return "1 month ago"
        if (diffMonths < 12) return `${diffMonths} months ago`
        return `${Math.floor(diffDays / 365)}y ago`
    }
    catch {
        return dateStr
    }
}

function normalizeEpisodeNumber(episodeNumber: number, episodes: Anime_Episode[]) {
    const matchingEpisode = episodes.find(episode => episode.absoluteEpisodeNumber === episodeNumber)
    return matchingEpisode?.episodeNumber ?? episodeNumber
}

function getTorrentCardTitle(torrent: HibikeTorrent_AnimeTorrent, metadata: Habari_Metadata | undefined, episodes: Anime_Episode[]) {
    const episodeNumbers = metadata?.episode_number

    if (!torrent.isBatch) {
        if (episodeNumbers?.length === 1) {
            const parsedEpisodeNumber = Number.parseInt(episodeNumbers[0], 10)
            return `Episode ${normalizeEpisodeNumber(parsedEpisodeNumber, episodes)}`
        }
        if (episodeNumbers?.length === 0) return "Batch"
        if (metadata?.formatted_title) return metadata.formatted_title
        return ""
    }

    const partNumbers = uniqueInts(metadata?.part_number)
    if (partNumbers.length > 1) {
        const first = partNumbers[0]
        const last = partNumbers[partNumbers.length - 1]
        if (first !== last) {
            return partNumbers.length === 2 && last - first === 1
                ? `Part ${first} and ${last}`
                : `Parts ${first} to ${last}`
        }
        return `Part ${first}`
    }

    const seasonNumbers = uniqueInts(metadata?.season_number)
    if (seasonNumbers.length > 1) {
        const first = seasonNumbers[0]
        const last = seasonNumbers[seasonNumbers.length - 1]
        if (first !== last) {
            return seasonNumbers.length === 2 && last - first === 1
                ? `Season ${first} and ${last}`
                : `Seasons ${first} to ${last}`
        }
        return `Season ${first}`
    }

    const batchEpisodeNumbers = uniqueInts(metadata?.episode_number)
    if (batchEpisodeNumbers.length > 1) {
        let title = `Episodes ${batchEpisodeNumbers[0]} to ${batchEpisodeNumbers[batchEpisodeNumbers.length - 1]}`
        if (seasonNumbers.length === 1) {
            title += ` (Season ${seasonNumbers[0]})`
        }
        return title
    }

    if (seasonNumbers.length === 1) return `Season ${seasonNumbers[0]}`
    return "Batch"
}

function startCaseLabel(value: string) {
    return value
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map(part => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
        .join(" ")
}

function MetaTag({ label, tone = "default", icon }: { label: string; tone?: "default" | "muted" | "subtle" | "indigo"; icon?: React.ReactNode }) {
    tone = "muted"
    const style = tone === "muted"
        ? { bg: "transparent", color: "rgba(255,255,255,0.55)" }
        : tone === "subtle"
            ? { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.92)" }
            : tone === "indigo"
                ? { bg: "#a5b4fc", color: "#111827" }
                : { bg: "transparent", color: "rgba(255,255,255,0.92)" }
    return (
        <View
            className={cn("rounded-md py-0.5 flex-row items-center gap-1", tone !== "muted" ? "px-1.5" : "pr-1.5")}
            style={{ backgroundColor: style.bg }}
        >
            {icon}
            <Text className="text-[11px] font-medium" style={{ color: style.color }}>{label}</Text>
        </View>
    )
}

function TorrentMetadataTags({ metadata }: { metadata?: Habari_Metadata }) {
    if (!metadata) return null

    const hasDubs = metadata.subtitles?.some(value => value.toLowerCase().includes("dub"))
    const hasMultiSubs = metadata.subtitles?.some(value => value.toLowerCase().includes("multi"))
    // const languages = metadata.language?.length ? [...new Set(metadata.language)] : []
    const languages: any[] = []
    const videoTerms = (metadata.video_term ?? []).filter(term => {
        return !(term.toLowerCase().includes("265") && metadata.video_term?.some(item => item.toLowerCase() === "hevc"))
    })
    const audioTerms = metadata.audio_term ?? []
    const standardAudioTerms = audioTerms.filter(term => !term.toLowerCase().includes("dual") && !term.toLowerCase().includes("multi"))
    const multiAudioTerms = audioTerms.filter(term => term.toLowerCase().includes("dual") || term.toLowerCase().includes("multi"))

    return (
        <View className="flex-row gap-1 flex-wrap">
            {languages.length === 2 && languages.slice(0, 2).map(term => (
                <MetaTag
                    key={term}
                    label={term}
                    icon={<Ionicons name="chatbubble-ellipses" size={11} color="#93c5fd" />}
                />
            ))}
            {videoTerms.map(term => (
                <MetaTag key={term} label={term} />
            ))}
            {standardAudioTerms.map(term => (
                <MetaTag key={term} label={term} tone="muted" />
            ))}
            {languages.length > 2 && (
                <MetaTag
                    label="Languages"
                    icon={<Ionicons name="chatbubble-ellipses" size={11} color="#93c5fd" />}
                />
            )}
            {multiAudioTerms.map(term => (
                <MetaTag
                    key={term}
                    label={term.toLowerCase().includes("dual") ? "Original + Dub" : startCaseLabel(term)}
                    tone="subtle"
                    icon={<Ionicons name="mic" size={11} color="#fda4af" />}
                />
            ))}
            {hasDubs && (
                <MetaTag
                    label="Dubbed"
                    tone="indigo"
                    icon={<Ionicons name="mic" size={11} color="#fca5a5" />}
                />
            )}
            {hasMultiSubs && (
                <MetaTag
                    label="Multi Subs"
                    tone="indigo"
                    icon={<Ionicons name="chatbubble-ellipses" size={11} color="#93c5fd" />}
                />
            )}
        </View>
    )
}

function formatProviderName(provider?: string) {
    if (!provider) return ""
    if (provider.toLowerCase() === "nyaa") return "Nyaa"
    if (provider.toLowerCase() === "animetosho") return "AnimeTosho"
    return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function TorrentCardPressable({ torrent, index, isSelected, episodes, torrentMetadataByInfoHash, onSelectTorrent, onConfirmTorrentSelection, autoSelectFile, onSelectStage, nextFocusUp, blockDown }: {
    torrent: HibikeTorrent_AnimeTorrent
    index: number
    isSelected: boolean
    episodes: Anime_Episode[]
    torrentMetadataByInfoHash?: Record<string, Habari_Metadata | undefined>
    onSelectTorrent: (torrent: HibikeTorrent_AnimeTorrent | null) => void
    onConfirmTorrentSelection?: () => void
    autoSelectFile?: boolean
    onSelectStage?: (stage: "torrents" | "files" | "providers") => void
    nextFocusUp?: number
    blockDown?: boolean
}) {
    const isTV = useIsTV()
    const [focused, setFocused] = React.useState(false)
    const pressableRef = React.useRef<React.ComponentRef<typeof TvFocusablePressable>>(null)
    const [selfTag, setSelfTag] = React.useState<number | null>(null)
    const tagResolved = React.useRef(false)

    const handleLayout = React.useCallback(() => {
        if (!isTV || tagResolved.current) return
        const node = pressableRef.current
        if (node) {
            const tag = findNodeHandle(node)
            if (tag !== null) {
                setSelfTag(tag)
                tagResolved.current = true
            }
        }
    }, [isTV])

    const handlePress = React.useCallback(() => {
        onSelectTorrent(isSelected ? null : torrent)
        if (!isSelected) {
            setTimeout(() => {
                if (autoSelectFile) {
                    onConfirmTorrentSelection?.()
                } else {
                    onSelectStage?.("files")
                }
            }, 0)
        }
    }, [torrent, isSelected, onSelectTorrent, onConfirmTorrentSelection, autoSelectFile, onSelectStage])

    return (
        <TvFocusablePressable
            ref={pressableRef}
            onPress={handlePress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onLayout={handleLayout}
            focusable={isTV}
            nextFocusUp={nextFocusUp}
            nextFocusRight={isTV && selfTag ? selfTag : undefined}
            nextFocusDown={blockDown && selfTag ? selfTag : undefined}
        >
            <TorrentCard
                torrent={torrent}
                episodes={episodes}
                metadata={torrent.infoHash ? torrentMetadataByInfoHash?.[torrent.infoHash] : undefined}
                isSelected={isSelected}
                isFocused={focused}
            />
        </TvFocusablePressable>
    )
}

function TorrentCard({
    torrent,
    episodes,
    metadata,
    isSelected,
    isFocused,
}: {
    torrent: HibikeTorrent_AnimeTorrent
    episodes: Anime_Episode[]
    metadata?: Habari_Metadata
    isSelected: boolean
    isFocused?: boolean
}) {
    const cardTitle = React.useMemo(() => getTorrentCardTitle(torrent, metadata, episodes), [episodes, torrent, metadata])
    const displayReleaseGroup = metadata?.release_group || torrent.releaseGroup || ""
    const displayResolution = torrent.resolution || metadata?.video_resolution
    const resStyle = getResolutionStyle(displayResolution)
    const seederInfo = getSeederInfo(torrent.seeders)
    const relDate = React.useMemo(() => formatRelativeDate(torrent.date), [torrent.date])
    const confirmedColor = torrent.isBestRelease ? "#f472b6" : "rgba(255,255,255,0.28)"

    return (
        <View
            className={cn(
                "rounded-2xl border overflow-hidden relative bg-[#0f0f0f]",
                isSelected ? "border-white/30 bg-[#1f1f1f]" : "border-white/10",
                isFocused && "border-brand-400/80",
            )}
        >
            <View className="p-3 relative z-10 gap-1">
                <View className="flex-row items-center justify-between gap-x-1.5 gap-y-1 flex-wrap">
                    <View className="flex-row items-center gap-x-1.5 gap-y-1 flex-wrap">
                        <Text className="text-white/95 text-md tracking-wide" numberOfLines={1}>
                            {cardTitle}
                        </Text>
                        {torrent.confirmed && (
                            <Ionicons name="checkmark-circle" size={14} color={confirmedColor} />
                        )}
                    </View>
                    <View className="flex-row items-center gap-x-1.5 gap-y-1 flex-wrap">
                        {!!displayReleaseGroup && (
                            <Text className="text-[13px] font-semibold text-white/70" numberOfLines={1}>
                                {displayReleaseGroup}
                            </Text>
                        )}
                        {!!displayResolution && (
                            <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: resStyle.bg }}>
                                <Text className="text-[10px] font-bold" style={{ color: resStyle.color }}>
                                    {displayResolution}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text className="text-[12px] text-white/30 leading-[17px]" numberOfLines={2}>
                    {torrent.name}
                </Text>

                <View className="gap-1.5 mt-1">
                    <View className="flex-row items-center gap-2.5 flex-wrap">
                        {torrent.isBestRelease && (
                            <View
                                className="rounded-md px-1.5 py-0.5 flex-row items-center gap-1"
                                style={{ backgroundColor: "rgba(131,24,67,0.72)" }}
                            >
                                <Ionicons name="diamond" size={11} color="#fbcfe8" />
                                <Text className="text-[11px] font-medium text-pink-100">Highest quality</Text>
                            </View>
                        )}

                        <View className="flex-row items-center gap-1">
                            <Ionicons name={seederInfo.iconName} size={13} color={seederInfo.color} />
                            <Text className="text-xs font-semibold" style={{ color: seederInfo.color }}>
                                {torrent.seeders || "No"}
                            </Text>
                            <Text className="text-xs text-white/35">seeder{torrent.seeders === 1 ? "" : "s"}</Text>
                        </View>

                        <Text className="text-xs font-medium text-white/55">{torrent.formattedSize}</Text>

                        {!!torrent.date && (
                            <View className="flex-row items-center gap-1">
                                <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.28)" />
                                <Text className="text-xs text-white/32">{relDate}</Text>
                            </View>
                        )}

                        {!!torrent.provider && (
                            <View className="flex-row items-center gap-1">
                                <Ionicons name="server-outline" size={11} color="rgba(255,255,255,0.28)" />
                                <Text className="text-xs text-white/32">{formatProviderName(torrent.provider)}</Text>
                            </View>
                        )}

                        {(!!torrent.magnetLink || !!torrent.downloadUrl || !!torrent.link) && (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation()
                                    const copyUrl = torrent.magnetLink || torrent.downloadUrl || torrent.link
                                    if (copyUrl) {
                                        copyOfflineLogTextToClipboard(copyUrl)
                                        toast.success("Link copied to clipboard")
                                    }
                                }}
                                className="ml-auto p-1.5 bg-white/5 border border-white/10 rounded-lg active:bg-white/10"
                                hitSlop={8}
                            >
                                <Ionicons name="copy-outline" size={12} color="rgba(255,255,255,0.5)" />
                            </Pressable>
                        )}
                    </View>

                    <TorrentMetadataTags metadata={metadata} />
                </View>
            </View>
        </View>
    )
}

function MiniBadge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
    return (
        <View className="rounded-full px-1.5 py-0.5 border" style={{ backgroundColor: bg, borderColor: border }}>
            <Text className="text-xs font-bold" style={{ color }}>
                {label}
            </Text>
        </View>
    )
}
