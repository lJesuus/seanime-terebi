import { useGetMangaEntry, useGetMangaEntryChapters, useGetMangaEntryPages, useUpdateMangaProgress } from "@/api/hooks/manga.hooks"
import { useServerStatus, useServerUrl } from "@/atoms/server.atoms"
import { getReaderImageSize, getReaderPageAspectRatio } from "@/components/features/manga/reader/manga-reader-layout"
import { MangaReaderSettingsSheet } from "@/components/features/manga/reader/manga-reader-settings-sheet"
import {
    MANGA_READING_DIRECTION,
    MANGA_READING_MODE,
    useMangaReaderPosition,
    useMangaReaderSettings,
} from "@/components/features/manga/reader/manga-reader-state"
import {
    buildReaderPages,
    buildReaderSpreads,
    clamp,
    formatMangaReaderHref,
    formatPageLabel,
    getAdjacentChapters,
    getChapterProgressNumber,
    getCurrentSpreadPages,
    getSpreadIndexForPage,
    type MangaReaderChapterRef,
    type MangaReaderPage,
} from "@/components/features/manga/reader/manga-reader-utils"
import { MangaReaderZoomSurface } from "@/components/features/manga/reader/manga-reader-zoom-surface"
import { useMangaReaderAndroidLongStrip } from "@/components/features/manga/reader/use-manga-reader-android-long-strip"
import { Button } from "@/components/ui/button"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { useIsTV } from "@/hooks/use-device"
import {
    useAllDownloadedMangaChapters,
    useIsMangaChapterDownloaded,
    useLocalMangaChapterPages,
    useMangaChapterDownloadInfo,
} from "@/lib/downloads/use-manga-downloads"
import { useIsServerConnected } from "@/lib/offline"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import Slider from "@react-native-community/slider"
import { FlashList, type FlashListRef, type ListRenderItemInfo, type ViewToken } from "@shopify/flash-list"
import { Image } from "expo-image"
import { Stack, useRouter } from "expo-router"
import * as React from "react"
import {
    ActivityIndicator,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    useWindowDimensions,
    View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type MangaReaderScreenProps = {
    mediaId: number
    provider: string
    chapterId: string
    chapterNumber?: string
}

type SpreadState = {
    currentPageIndex: number
    currentSpreadIndex: number
}

const VIRTUALIZED_LONG_STRIP_DRAW_DISTANCE_MULTIPLIER = 1.75

export function MangaReaderScreen({ mediaId, provider, chapterId, chapterNumber }: MangaReaderScreenProps) {
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const isTV = useIsTV()
    const serverUrl = useServerUrl()
    const serverStatus = useServerStatus()
    const { width: screenWidth, height: screenHeight } = useWindowDimensions()
    const isConnected = useIsServerConnected()

    const readerHeight = Math.max(320, screenHeight - insets.top - insets.bottom - 44)
    const isCompact = screenWidth < 900

    const { data: entry } = useGetMangaEntry(mediaId)
    const { data: chapterContainer } = useGetMangaEntryChapters({
        mediaId,
        provider: isConnected ? provider : undefined,
    })

    const currentChapterDownloaded = useIsMangaChapterDownloaded(mediaId, provider, chapterId)
    const downloadedChapterInfo = useMangaChapterDownloadInfo(mediaId, provider, chapterId)
    const localPages = useLocalMangaChapterPages(mediaId, provider, chapterId)
    const downloadedChapters = useAllDownloadedMangaChapters(mediaId)

    const { settings, setSetting, resetSettings, defaults } = useMangaReaderSettings(mediaId, isCompact)
    const { pageIndex: savedPageIndex, setPageIndex: setSavedPageIndex } = useMangaReaderPosition(mediaId, provider, chapterId)
    const isDoublePageOrLongStrip = settings.readingMode === MANGA_READING_MODE.DOUBLE_PAGE
        || settings.readingMode === MANGA_READING_MODE.LONG_STRIP

    const { data: pageContainer, isLoading: pageContainerLoading, isError: pageContainerError } = useGetMangaEntryPages({
        mediaId,
        provider: isConnected ? provider : undefined,
        chapterId: isConnected ? chapterId : undefined,
        doublePage: isDoublePageOrLongStrip, // doublePage returns page dimensions
    })

    const onlineChapters = chapterContainer?.chapters ?? []
    const currentChapter = React.useMemo<MangaReaderChapterRef>(() => {
        // mix live and downloaded chapter data so the header still works offline
        const onlineMatch = onlineChapters.find(chapter => chapter.id === chapterId)
        const downloadedMatch = downloadedChapters.find(chapter => chapter.chapterId === chapterId && chapter.provider === provider)

        return {
            mediaId,
            provider,
            chapterId,
            chapterNumber: onlineMatch?.chapter ?? downloadedMatch?.chapterNumber ?? chapterNumber ?? "0",
            title: onlineMatch?.title ?? downloadedMatch?.title,
            scanlator: onlineMatch?.scanlator ?? downloadedMatch?.scanlator,
            downloaded: currentChapterDownloaded,
        }
    }, [chapterId, chapterNumber, currentChapterDownloaded, downloadedChapters, mediaId, onlineChapters, provider])

    const { previousChapter, nextChapter } = React.useMemo(
        () => getAdjacentChapters(currentChapter, onlineChapters, downloadedChapters),
        [currentChapter, downloadedChapters, onlineChapters],
    )

    // keep the next chapter warm so chapter turns do not flash a loader
    // devnote: disabled for local-manga to prevent cache pollution (until i fix the server-side handling)
    useGetMangaEntryPages({
        mediaId,
        provider: (isConnected && nextChapter && provider !== "local-manga") ? nextChapter.provider : undefined,
        chapterId: (isConnected && nextChapter && provider !== "local-manga") ? nextChapter.chapterId : undefined,
        doublePage: isDoublePageOrLongStrip,
    })

    const rawPages = React.useMemo(() => buildReaderPages(serverUrl, pageContainer, localPages, downloadedChapterInfo?.pageDimensions),
        [downloadedChapterInfo?.pageDimensions, localPages, pageContainer, serverUrl])

    const pages = rawPages
    const spreads = React.useMemo(() => buildReaderSpreads(pages, settings), [pages, settings])

    // TV-only: controls start hidden. The user toggles them via a tap or
    // DPAD_CENTER; on TV they auto-hide on a delay once visible.
    const [controlsVisible, setControlsVisible] = React.useState(false)
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [spreadState, setSpreadState] = React.useState<SpreadState>({ currentPageIndex: 0, currentSpreadIndex: 0 })
    const [flashText, setFlashText] = React.useState<string | null>(null)
    const [activeZoomId, setActiveZoomId] = React.useState<string | null>(null)
    const [settingsSheetNonce, setSettingsSheetNonce] = React.useState(0)
    const [viewMode, setViewMode] = React.useState(0) // 0=full-width, 1=intermediate, 2=fit-page

    const cycleViewMode = React.useCallback(() => {
        setViewMode(prev => {
            const next = ((prev + 1) % 3) as 0 | 1 | 2
            const labels = ["Fit Width", "Fit Height", "Fit Page"]
            setFlashText(labels[next])
            return next
        })
    }, [])

    const horizontalListRef = React.useRef<FlashListRef<number[]> | null>(null)
    const verticalListRef = React.useRef<FlashListRef<number[]> | null>(null)
    const longStripScrollRef = React.useRef<ScrollView | null>(null)
    const longStripContentOffsetRef = React.useRef(0)
    const currentPageIndexRef = React.useRef(0)
    const restoringPositionRef = React.useRef(false)
    const didRestoreInitialPageRef = React.useRef(false)
    const pendingLongStripRestoreRef = React.useRef<number | null>(null)
    const syncMarkerRef = React.useRef<string | null>(null)
    const longStripSpreadLayoutsRef = React.useRef<Record<number, { y: number; height: number }>>({})

    const updateMangaProgress = useUpdateMangaProgress(mediaId)

    const chapterKey = `${provider}:${chapterId}`
    // keep the chrome out of the first and last visible pages in long strip mode
    const longStripTopInset = insets.top + 86
    const longStripBottomInset = insets.bottom + 120
    const hudTapExclusionTop = controlsVisible ? insets.top + 112 : 0
    const hudTapExclusionBottom = controlsVisible ? insets.bottom + 86 : 0
    const pageGapAmount = settings.pageGap ? settings.pageGapAmount : 0
    const currentSpreadPages = React.useMemo(
        () => getCurrentSpreadPages(spreads, spreadState.currentSpreadIndex),
        [spreadState.currentSpreadIndex, spreads],
    )
    const currentProgressPageIndex = React.useMemo(() => {
        // progress follows the trailing page so paired spreads do not under report
        const lastPageIndex = currentSpreadPages[currentSpreadPages.length - 1]
        return typeof lastPageIndex === "number" ? lastPageIndex : spreadState.currentPageIndex
    }, [currentSpreadPages, spreadState.currentPageIndex])
    const readingProgress = pages.length > 0
        ? clamp((currentProgressPageIndex + 1) / pages.length, 0, 1)
        : 0
    const longStripLayoutProfile = React.useMemo(() => {
        // this decides when full zoom is worth it and when virtualization should win
        let narrowestAspectRatio = Number.POSITIVE_INFINITY
        let widestAspectRatio = 0
        let hasMissingDimensions = false

        for (const page of pages) {
            if (!page.width || !page.height) {
                hasMissingDimensions = true
            }

            const aspectRatio = getReaderPageAspectRatio(page)
            if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) continue

            narrowestAspectRatio = Math.min(narrowestAspectRatio, aspectRatio)
            widestAspectRatio = Math.max(widestAspectRatio, aspectRatio)
        }

        const hasMeasuredAspectRatios = Number.isFinite(narrowestAspectRatio) && widestAspectRatio > 0

        return {
            hasMissingDimensions,
            hasVeryTallPages: hasMeasuredAspectRatios && narrowestAspectRatio < 0.45,
            hasWideAspectRatioSpread: hasMeasuredAspectRatios
                && widestAspectRatio / Math.max(narrowestAspectRatio, 0.01) > 2.4,
        }
    }, [pages])

    const useFullLongStripZoom = settings.readingMode === MANGA_READING_MODE.LONG_STRIP
        && !longStripLayoutProfile.hasMissingDimensions
        && !longStripLayoutProfile.hasVeryTallPages
    const virtualizedLongStripDrawDistance = React.useMemo(() => Math.round(screenHeight * VIRTUALIZED_LONG_STRIP_DRAW_DISTANCE_MULTIPLIER),
        [screenHeight])

    const longStripContentContainerStyle = React.useMemo(() => ({
        paddingTop: longStripTopInset,
        paddingBottom: longStripBottomInset,
    }), [longStripBottomInset, longStripTopInset])
    const longStripViewabilityConfig = React.useMemo(() => ({ itemVisiblePercentThreshold: 50 }), [])
    const disabledMaintainVisibleContentPosition = React.useMemo(() => ({ disabled: true }), [])
    const {
        getVirtualizedLongStripItemType,
        isAndroidLongStrip,
        longStripScrollEventThrottle,
        measuredPageAspectRatios,
        rememberPageAspectRatio,
        shouldRenderLongStripImages,
        androidLongStripInitialWarmupComplete,
    } = useMangaReaderAndroidLongStrip({
        chapterKey,
        currentPageIndex: spreadState.currentPageIndex,
        currentSpreadIndex: spreadState.currentSpreadIndex,
        pages,
        readingMode: settings.readingMode,
        savedPageIndex,
    })

    React.useEffect(() => {
        setActiveZoomId(null)
        currentPageIndexRef.current = Math.max(0, savedPageIndex)
        didRestoreInitialPageRef.current = false
        restoringPositionRef.current = false
        pendingLongStripRestoreRef.current = null
        syncMarkerRef.current = null
        longStripSpreadLayoutsRef.current = {}
        setSpreadState({ currentPageIndex: Math.max(0, savedPageIndex), currentSpreadIndex: 0 })
    }, [chapterId, mediaId, provider])

    React.useEffect(() => {
        setActiveZoomId(null)
    }, [settings.readingMode])

    React.useEffect(() => {
        currentPageIndexRef.current = spreadState.currentPageIndex
    }, [spreadState.currentPageIndex])

    React.useEffect(() => {
            if (spreads.length === 0) return
            if (isAndroidLongStrip && !androidLongStripInitialWarmupComplete) return

            // restore by page index first so mode changes can remap to a new spread layout
            const basePageIndex = didRestoreInitialPageRef.current ? currentPageIndexRef.current : savedPageIndex
            const pageIndex = clamp(basePageIndex, 0, Math.max(pages.length - 1, 0))
            currentPageIndexRef.current = pageIndex
            const mappedSpreadIndex = getSpreadIndexForPage(spreads, pageIndex)

            setSpreadState(prev => (
                prev.currentPageIndex === pageIndex && prev.currentSpreadIndex === mappedSpreadIndex
                    ? prev
                    : { currentPageIndex: pageIndex, currentSpreadIndex: mappedSpreadIndex }
            ))

            restoringPositionRef.current = true

            requestAnimationFrame(() => {
                if (settings.readingMode === MANGA_READING_MODE.LONG_STRIP) {
                    pendingLongStripRestoreRef.current = mappedSpreadIndex

                    if (useFullLongStripZoom) {
                        const targetLayout = longStripSpreadLayoutsRef.current[mappedSpreadIndex]
                        if (targetLayout) {
                            longStripScrollRef.current?.scrollTo({
                                y: Math.max(0, targetLayout.y - 12),
                                animated: false,
                            })
                            pendingLongStripRestoreRef.current = null
                        }
                    } else {
                        verticalListRef.current?.scrollToIndex({ index: mappedSpreadIndex, animated: false })
                        pendingLongStripRestoreRef.current = null
                    }
                } else {
                    horizontalListRef.current?.scrollToIndex({ index: mappedSpreadIndex, animated: false })
                }

                requestAnimationFrame(() => {
                    restoringPositionRef.current = false
                    didRestoreInitialPageRef.current = true
                })
            })
        },
        [androidLongStripInitialWarmupComplete, isAndroidLongStrip, pages.length, settings.doublePageOffset, settings.readingDirection,
            settings.readingMode, spreads, useFullLongStripZoom])

    React.useEffect(() => {
        if (!didRestoreInitialPageRef.current) return
        if (pages.length === 0 || currentSpreadPages.length === 0) return

        // save the last page in the spread so double page progress feels natural
        setSavedPageIndex(currentProgressPageIndex)
    }, [currentProgressPageIndex, currentSpreadPages.length, pages.length, setSavedPageIndex])

    React.useEffect(() => {
        if (!flashText) return

        const timeout = setTimeout(() => setFlashText(null), 850)
        return () => clearTimeout(timeout)
    }, [flashText])

    const onSettingChange = React.useCallback(
        <Key extends keyof typeof settings>(key: Key, value: (typeof settings)[Key]) => {
            setSetting(key, value)
            let label: string | undefined

            if (key === "readingMode") {
                label = value === MANGA_READING_MODE.LONG_STRIP
                    ? "Long Strip"
                    : value === MANGA_READING_MODE.DOUBLE_PAGE
                        ? "Double Page"
                        : "Single Page"
            } else if (key === "readingDirection") {
                label = value === MANGA_READING_DIRECTION.RTL ? "Right to Left" : "Left to Right"
            } else if (key === "pageGap") {
                label = value ? "Page Gaps On" : "Page Gaps Off"
            } else if (key === "pageGapAmount") {
                label = `Gap ${String(value)}px`
            } else if (key === "pageGapShadow") {
                label = value ? "Gap Shadow On" : "Gap Shadow Off"
            } else if (key === "showProgressBar") {
                label = value ? "Progress Bar On" : "Progress Bar Off"
            } else if (key === "doublePageOffset") {
                label = `Offset ${String(value)}`
            } else if (key === "zoomLevel") {
                label = `Zoom ${String(value)}x`
            } else if (key === "brightness") {
                label = `Brightness ${Math.round(Number(value) * 100)}%`
            } else if (key === "fitToWidth") {
                label = value ? "Fit to Width On" : "Fit to Width Off"
            }

            if (label) setFlashText(label)
        },
        [setSetting],
    )

    const doSyncProgress = React.useCallback(() => {
        if (serverStatus?.settings?.manga?.mangaAutoUpdateProgress === false) return

        const chapterProgress = getChapterProgressNumber(currentChapter.chapterNumber)
        const currentProgress = entry?.listData?.progress ?? 0
        if (!entry?.media || !chapterProgress || chapterProgress <= currentProgress) return

        // only send one completion sync per chapter finish
        if (syncMarkerRef.current === chapterKey) return

        syncMarkerRef.current = chapterKey

        const payload = {
            mediaId,
            malId: entry.media.idMal,
            chapterNumber: chapterProgress,
            totalChapters: entry.media.chapters ?? 0,
        }

        updateMangaProgress.mutate(payload, {
            onError: () => {
                syncMarkerRef.current = null
            },
        })
    }, [chapterKey, currentChapter.chapterNumber, entry, mediaId, serverStatus?.settings?.manga?.mangaAutoUpdateProgress, updateMangaProgress])

    React.useEffect(() => {
        if (spreads.length === 0) return
        if (pages.length === 0) return
        if (currentProgressPageIndex < pages.length - 1) return

        doSyncProgress()
    }, [currentProgressPageIndex, doSyncProgress, pages.length, spreads.length])

    const navigateToChapter = React.useCallback((target: MangaReaderChapterRef | undefined) => {
        if (!target) return
        router.replace(formatMangaReaderHref({
            mediaId: target.mediaId,
            provider: target.provider,
            chapterId: target.chapterId,
            chapterNumber: target.chapterNumber,
        }))
    }, [router])

    const scrollToSpread = React.useCallback((targetIndex: number) => {
        const clampedIndex = clamp(targetIndex, 0, Math.max(spreads.length - 1, 0))

        // long strip can restore by layout or by list index depending on the render path
        if (settings.readingMode === MANGA_READING_MODE.LONG_STRIP) {
            if (useFullLongStripZoom) {
                const targetLayout = longStripSpreadLayoutsRef.current[clampedIndex]
                longStripScrollRef.current?.scrollTo({
                    y: Math.max(0, (targetLayout?.y ?? 0) - 12),
                    animated: true,
                })
                return
            }

            verticalListRef.current?.scrollToIndex({ index: clampedIndex, animated: true })
            return
        }

        horizontalListRef.current?.scrollToIndex({ index: clampedIndex, animated: true })
    }, [settings.readingMode, spreads.length, useFullLongStripZoom])

    const handleSpreadZoomChange = React.useCallback((spreadId: string, zoomed: boolean) => {
        setActiveZoomId(current => {
            if (zoomed) return spreadId
            return current === spreadId ? null : current
        })
    }, [])

    const handleOpenSettings = React.useCallback(() => {
        setSettingsOpen(current => {
            if (!current) return true

            // closing first forces the sheet to rebuild its snap state
            setSettingsSheetNonce(value => value + 1)
            requestAnimationFrame(() => {
                setSettingsOpen(true)
            })

            return false
        })
    }, [])

    const handleLongStripSpreadLayout = React.useCallback((index: number, event: LayoutChangeEvent) => {
        const { y, height } = event.nativeEvent.layout
        longStripSpreadLayoutsRef.current[index] = { y, height }

        if (pendingLongStripRestoreRef.current === index && useFullLongStripZoom) {
            longStripScrollRef.current?.scrollTo({
                y: Math.max(0, y - 12),
                animated: false,
            })
            pendingLongStripRestoreRef.current = null
            requestAnimationFrame(() => {
                restoringPositionRef.current = false
            })
        }
    }, [useFullLongStripZoom])

    const updateSpreadStateFromIndex = React.useCallback((nextIndex: number) => {
        const clampedIndex = clamp(nextIndex, 0, Math.max(spreads.length - 1, 0))
        const spread = spreads[clampedIndex] ?? []

        setSpreadState(current => (
            current.currentSpreadIndex === clampedIndex && current.currentPageIndex === (spread[0] ?? 0)
                ? current
                : {
                    currentPageIndex: spread[0] ?? 0,
                    currentSpreadIndex: clampedIndex,
                }
        ))
    }, [spreads])

    const handlePagedScrollSettled = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (restoringPositionRef.current) return

        // wait for scroll
        const layoutWidth = event.nativeEvent.layoutMeasurement.width || screenWidth
        if (!layoutWidth) return

        const nextIndex = Math.round(event.nativeEvent.contentOffset.x / layoutWidth)
        updateSpreadStateFromIndex(nextIndex)
    }, [screenWidth, updateSpreadStateFromIndex])

    const handleLongStripScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (restoringPositionRef.current) return

        longStripContentOffsetRef.current = event.nativeEvent.contentOffset.y

        const anchorY = event.nativeEvent.contentOffset.y + Math.min(220, event.nativeEvent.layoutMeasurement.height * 0.28)
        let nextIndex = 0

        for (let index = 0; index < spreads.length; index += 1) {
            const layout = longStripSpreadLayoutsRef.current[index]
            if (!layout) continue
            if (layout.y <= anchorY) {
                nextIndex = index
                continue
            }
            break
        }

        updateSpreadStateFromIndex(nextIndex)
    }, [spreads, updateSpreadStateFromIndex])

    const handleLongStripViewableItemsChanged = React.useCallback(({
        viewableItems,
    }: {
        viewableItems: ViewToken<number[]>[]
        changed: ViewToken<number[]>[]
    }) => {
        if (restoringPositionRef.current) return

        const firstVisible = viewableItems[0]
        if (!firstVisible?.index) {
            if (firstVisible?.index !== 0) return
        }

        updateSpreadStateFromIndex(firstVisible.index ?? 0)
    }, [updateSpreadStateFromIndex])

    const toggleControlsVisible = React.useCallback(() => {
        setControlsVisible(prev => !prev)
    }, [])

    const handleContentFocus = React.useCallback(() => {
        setControlsVisible(false)
    }, [])

    const renderVirtualizedLongStripItem = React.useCallback(({ item }: ListRenderItemInfo<number[]>) => {
        const zoomId = `${chapterKey}-${item.join("-")}`

        return (
            // each row keeps local pinch state
            <ReaderLongStripItem
                key={zoomId}
                spreadIndexes={item}
                pages={pages}
                settings={settings}
                screenWidth={screenWidth}
                screenHeight={readerHeight}
                pageGapAmount={pageGapAmount}
                zoomId={zoomId}
                pinchEnabled
                onTap={toggleControlsVisible}
                onZoomChange={(zoomed) => handleSpreadZoomChange(zoomId, zoomed)}
                measuredAspectRatios={measuredPageAspectRatios}
                onPageAspectRatioMeasured={rememberPageAspectRatio}
                reduceImageTransition
                tapExclusionBottom={hudTapExclusionBottom}
                tapExclusionTop={hudTapExclusionTop}
                tapViewportHeight={screenHeight}
            />
        )
    }, [
        chapterKey,
        handleSpreadZoomChange,
        hudTapExclusionBottom,
        hudTapExclusionTop,
        pageGapAmount,
        pages,
        readerHeight,
        screenHeight,
        screenWidth,
        settings,
        toggleControlsVisible,
    ])


    const goToPreviousSpread = React.useCallback(() => {
        scrollToSpread(spreadState.currentSpreadIndex - 1)
    }, [scrollToSpread, spreadState.currentSpreadIndex])

    const goToNextSpread = React.useCallback(() => {
        scrollToSpread(spreadState.currentSpreadIndex + 1)
    }, [scrollToSpread, spreadState.currentSpreadIndex])

    const scrollLongStripSmooth = React.useCallback((direction: "up" | "down") => {
        const step = screenHeight * 0.75

        if (useFullLongStripZoom) {
            const currentY = longStripContentOffsetRef.current
            const targetY = direction === "down" ? currentY + step : Math.max(0, currentY - step)
            longStripScrollRef.current?.scrollTo({ y: targetY, animated: true })
        } else {
            const listRef = verticalListRef.current
            if (!listRef) return
            const currentOffset = longStripContentOffsetRef.current
            const targetOffset = direction === "down" ? currentOffset + step : Math.max(0, currentOffset - step)
            ;(listRef as any)?.scrollToOffset?.({ offset: targetOffset, animated: true })
        }
    }, [screenHeight, useFullLongStripZoom])

    const handleOpenNextChapter = React.useCallback(() => {
        // try to sync before navigation so the finished chapter is not lost
        doSyncProgress()
        navigateToChapter(nextChapter)
    }, [doSyncProgress, navigateToChapter, nextChapter])

    const handleKeyDown = React.useCallback((e: any) => {
        // Enter/Select solo cuando controles ocultos (no interferir con botones del header)
        if (e.key === "Enter" || e.key === "Select" || e.code === "Space") {
            if (!controlsVisible) {
                cycleViewMode()
                return true
            }
            return false // controles visibles → que lo maneje el botón enfocado
        }

        // Back → show controls (return to header)
        if (e.key === "Back" || e.key === "Escape") {
            if (!controlsVisible) {
                toggleControlsVisible()
                return true
            }
            return false // header Back → system handles exit
        }

        if (!controlsVisible) {
            if (e.key === "ArrowLeft" || e.key === "Left") {
                if (previousChapter) {
                    navigateToChapter(previousChapter)
                }
                return true
            }
            if (e.key === "ArrowRight" || e.key === "Right") {
                if (nextChapter) {
                    navigateToChapter(nextChapter)
                }
                return true
            }
            if (e.key === "ArrowDown" || e.key === "Down") {
                if (settings.readingMode === MANGA_READING_MODE.LONG_STRIP) {
                    scrollLongStripSmooth("down")
                } else {
                    goToNextSpread()
                }
                return true
            }
            if (e.key === "ArrowUp" || e.key === "Up") {
                if (settings.readingMode === MANGA_READING_MODE.LONG_STRIP) {
                    scrollLongStripSmooth("up")
                } else {
                    goToPreviousSpread()
                }
                return true
            }
        }

        return false
    }, [controlsVisible, cycleViewMode, goToNextSpread, goToPreviousSpread, navigateToChapter, nextChapter, previousChapter, scrollLongStripSmooth, toggleControlsVisible, settings.readingMode])

    const showUnavailableState = !currentChapterDownloaded && !isConnected
    const showLoading = !showUnavailableState && pages.length === 0 && pageContainerLoading
    // android waits for warmup so restore does not jump after first render
    const showPreparingSavedPosition = !showUnavailableState && !showLoading && pages.length > 0 && isAndroidLongStrip && !androidLongStripInitialWarmupComplete
    const showEmpty = !showUnavailableState && !showLoading && pages.length === 0
    const chapterTitle = currentChapter.title || `Chapter ${currentChapter.chapterNumber}`
    const mangaTitle = entry?.media?.title?.userPreferred || entry?.media?.title?.english || entry?.media?.title?.romaji || `Manga #${mediaId}`
    const isUsingLocalPages = localPages.length > 0

    return (
        <View
            className="flex-1 bg-[#080808]"
            {...(isTV ? { onKeyDown: handleKeyDown as any } : {})}
        >
            <StatusBar hidden={!controlsVisible} animated barStyle="light-content" />
            <Stack.Screen options={{ autoHideHomeIndicator: true }} />

            {showLoading ? (
                <View className="flex-1 items-center justify-center gap-4">
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                    <Text className="text-sm text-white/40">
                        Loading chapter pages...
                    </Text>
                </View>
            ) : showPreparingSavedPosition ? (
                <View className="flex-1 items-center justify-center gap-4 px-6">
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                    <Text className="text-center text-sm text-white/40">Preparing pages...</Text>
                </View>
            ) : showUnavailableState ? (
                <ReaderStateCard
                    title="Chapter unavailable offline"
                    description="This chapter is not downloaded on your device yet. Open a downloaded chapter or reconnect to your Seanime server."
                    actionLabel="Back"
                    onPress={() => router.back()}
                />
            ) : showEmpty ? (
                <ReaderStateCard
                    title={pageContainerError ? "Could not load chapter" : "No pages found"}
                    description={pageContainerError
                        ? "The chapter could not be loaded from the selected source. Try another chapter or reopen the entry screen."
                        : "This chapter did not return any readable pages."}
                    actionLabel="Back"
                    onPress={() => router.back()}
                />
            ) : (
                <>
                    {/* TV header: in-flow, not overlay */}
                    {controlsVisible && (
                        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, backgroundColor: "rgba(8,8,8,0.95)" }}>
                            <View className="gap-2.5">
                                <View className="flex-row items-center gap-3">
                                    <ReaderIconButton icon="chevron-back" onPress={() => router.back()} />
                                    <View className="flex-1">
                                        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                                            {chapterTitle}
                                        </Text>
                                        <Text className="mt-0.5 text-xs text-white/40" numberOfLines={1}>
                                            {mangaTitle}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center gap-1.5">
                                        <ReaderSmallButton
                                            icon="chevron-back"
                                            disabled={!previousChapter}
                                            onPress={() => previousChapter && navigateToChapter(previousChapter)}
                                        />
                                        <ReaderSmallButton
                                            icon="chevron-forward"
                                            disabled={!nextChapter}
                                            onPress={() => nextChapter && handleOpenNextChapter()}
                                        />
                                        <ReaderIconButton icon="settings-outline" onPress={handleOpenSettings} />
                                    </View>
                                </View>

                                {settings.showProgressBar && pages.length > 0 && (
                                    <View className="mx-1 h-0.5 overflow-hidden rounded-full bg-white/8">
                                        <View
                                            className="h-full rounded-full bg-brand-300/60"
                                            style={{ width: `${readingProgress * 100}%` }}
                                        />
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* TV flashText */}
                    {flashText && (
                        <View
                            pointerEvents="none"
                            style={{ position: "absolute", top: insets.top + 60, left: 0, right: 0, zIndex: 50 }}
                        >
                            <Animated.View
                                entering={FadeIn.duration(120)}
                                exiting={FadeOut.duration(180)}
                                className="items-center"
                            >
                                <View className="rounded-full border border-white/8 bg-black/60 px-4 py-1.5">
                                    <Text className="text-xs font-medium text-white/70">{flashText}</Text>
                                </View>
                            </Animated.View>
                        </View>
                    )}

                    {/* Contenido manga */}
                    <View className="flex-1">
                        {settings.readingMode === MANGA_READING_MODE.LONG_STRIP ? (
                            useFullLongStripZoom ? (
                                <MangaReaderZoomSurface
                                    scrollViewRef={longStripScrollRef}
                                    style={{ flex: 1 }}
                                    contentContainerStyle={{
                                        paddingTop: longStripTopInset,
                                        paddingBottom: longStripBottomInset,
                                    }}
                                    maxScale={settings.zoomLevel}
                                    onScroll={handleLongStripScroll}
                                    onTap={toggleControlsVisible}
                                    pinchEnabled
                                    removeClippedSubviews={isAndroidLongStrip}
                                    scrollEventThrottle={longStripScrollEventThrottle}
                                    tapExclusionBottom={hudTapExclusionBottom}
                                    tapExclusionTop={hudTapExclusionTop}
                                    tapViewportHeight={screenHeight}
                                >
                                    <View className="gap-0">
                                        {spreads.map((item, index) => (
                                            <View
                                                key={`${chapterKey}-${item.join("-")}`}
                                                onLayout={(event) => handleLongStripSpreadLayout(index, event)}
                                            >
                                                <ReaderLongStripItem
                                                    spreadIndexes={item}
                                                    pages={pages}
                                                    settings={settings}
                                                    screenWidth={screenWidth}
                                                    screenHeight={readerHeight}
                                                    pageGapAmount={pageGapAmount}
                                                    zoomId={`${chapterKey}-${item.join("-")}`}
                                                    withZoom={false}
                                                    renderImages={shouldRenderLongStripImages(index)}
                                                    measuredAspectRatios={measuredPageAspectRatios}
                                                    onPageAspectRatioMeasured={rememberPageAspectRatio}
                                                    reduceImageTransition={isAndroidLongStrip}
                                                    onTap={toggleControlsVisible}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </MangaReaderZoomSurface>
                            ) : (
                                // the virtualized path trades continuous zoom for smoother tall chapter scrolling
                                <FlashList
                                    key={`list-vertical-${chapterKey}`}
                                    ref={verticalListRef}
                                    data={spreads}
                                    keyExtractor={(item) => `${chapterKey}-${item.join("-")}`}
                                    contentInsetAdjustmentBehavior="never"
                                    scrollEnabled={isTV ? false : !activeZoomId}
                                    drawDistance={virtualizedLongStripDrawDistance}
                                    maintainVisibleContentPosition={disabledMaintainVisibleContentPosition}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={longStripContentContainerStyle}
                                    viewabilityConfig={longStripViewabilityConfig}
                                    getItemType={getVirtualizedLongStripItemType}
                                    onViewableItemsChanged={handleLongStripViewableItemsChanged}
                                    onScroll={(event) => {
                                        longStripContentOffsetRef.current = event.nativeEvent.contentOffset.y
                                    }}
                                    renderItem={renderVirtualizedLongStripItem}
                                    onFocus={handleContentFocus}
                                />
                            )
                        ) : (
                            <FlashList
                                key={`list-horizontal-${settings.readingDirection}`}
                                ref={horizontalListRef}
                                data={spreads}
                                keyExtractor={(item) => item.join("-")}
                                horizontal
                                pagingEnabled
                                scrollEnabled={isTV ? false : !activeZoomId}
                                showsHorizontalScrollIndicator={false}
                                contentInsetAdjustmentBehavior="never"
                                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                                onMomentumScrollEnd={handlePagedScrollSettled}
                                onScrollEndDrag={handlePagedScrollSettled}
                                style={settings.readingDirection === MANGA_READING_DIRECTION.RTL
                                    ? { transform: [{ scaleX: -1 }] }
                                    : undefined}
                                renderItem={({ item }) => (
                                    <ReaderPagedItem
                                        key={`${chapterKey}-${item.join("-")}`}
                                        spreadIndexes={item}
                                        pages={pages}
                                        settings={settings}
                                        screenWidth={screenWidth}
                                        screenHeight={screenHeight}
                                        pageGapAmount={pageGapAmount}
                                        zoomId={`${chapterKey}-${item.join("-")}`}
                                        flipForRtl={settings.readingDirection === MANGA_READING_DIRECTION.RTL}
                                        onTap={toggleControlsVisible}
                                        onZoomChange={(zoomed) => handleSpreadZoomChange(`${chapterKey}-${item.join("-")}`, zoomed)}
                                        tapExclusionBottom={hudTapExclusionBottom}
                                        tapExclusionTop={hudTapExclusionTop}
                                        tapViewportHeight={screenHeight}
                                    />
                                )}
                                onFocus={handleContentFocus}
                            />
                        )}
                    </View>

                    {settings.brightness < 1 && (
                        <View
                            pointerEvents="none"
                            className="absolute inset-0 bg-black"
                            style={{ opacity: 1 - settings.brightness }}
                        />
                    )}
                </>
            )}

            <MangaReaderSettingsSheet
                key={settingsSheetNonce}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                settings={settings}
                defaults={defaults}
                onSettingChange={onSettingChange}
                onReset={resetSettings}
            />
        </View>
    )
}

function PageScrubber({
    currentSpreadPages,
    totalPages,
    scanlator,
    spreads,
    onSeek,
}: {
    currentSpreadPages: number[]
    totalPages: number
    scanlator: string
    spreads: number[][]
    onSeek: (spreadIndex: number) => void
}) {
    const isTV = useIsTV()
    const [open, setOpen] = React.useState(false)
    const [dragSpreadIndex, setDragSpreadIndex] = React.useState<number | null>(null)

    const scale = useSharedValue(1)
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    const displayPages = dragSpreadIndex !== null
        ? (spreads[dragSpreadIndex] ?? currentSpreadPages)
        : currentSpreadPages

    const pageLabel = formatPageLabel(displayPages, totalPages)

    const currentSpreadIndex = React.useMemo(
        () => getSpreadIndexForPage(spreads, currentSpreadPages[0] ?? 0),
        [currentSpreadPages, spreads],
    )

    if (isTV) {
        const spreadIndex = dragSpreadIndex ?? currentSpreadIndex
        return (
            <View className="flex-1 flex-row items-center justify-center gap-3">
                <TvFocusablePressable
                    onPress={spreadIndex > 0 ? () => onSeek(spreadIndex - 1) : undefined}
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/5"
                    focusedClassName="bg-white/15 border border-brand-400/60"
                >
                    <Ionicons name="remove" size={16} color="rgba(255,255,255,0.75)" />
                </TvFocusablePressable>
                <Text className="text-xs font-medium text-white/50">{pageLabel}</Text>
                <TvFocusablePressable
                    onPress={spreadIndex < spreads.length - 1 ? () => onSeek(spreadIndex + 1) : undefined}
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/5"
                    focusedClassName="bg-white/15 border border-brand-400/60"
                >
                    <Ionicons name="add" size={16} color="rgba(255,255,255,0.75)" />
                </TvFocusablePressable>
            </View>
        )
    }

    function handleOpen() {
        setDragSpreadIndex(currentSpreadIndex)
        scale.value = withSpring(0.96, { damping: 18, stiffness: 280 })
        requestAnimationFrame(() => {
            scale.value = withSpring(1, { damping: 16, stiffness: 250 })
        })
        setOpen(true)
    }

    function handleClose() {
        setOpen(false)
        setDragSpreadIndex(null)
    }

    function handleSliderChange(value: number) {
        const index = Math.round(value)
        setDragSpreadIndex(index)
    }

    function handleSliderComplete(value: number) {
        const index = Math.round(value)
        setDragSpreadIndex(index)
        onSeek(index)
    }

    return (
        <View className="flex-1 items-center">
            {open && (
                <Pressable
                    onPress={handleClose}
                    style={{ position: "absolute", inset: -200, zIndex: 0 }}
                />
            )}
            <Animated.View style={[animatedStyle, { zIndex: 1 }]}>
                {open ? (
                    <Animated.View
                        entering={FadeIn.duration(140)}
                        exiting={FadeOut.duration(120)}
                        className="items-center px-2"
                        style={{ width: 220 }}
                    >
                        <Text className="mb-1.5 text-xs font-medium text-white/60">{pageLabel}</Text>
                        <Slider
                            style={{ width: "100%", height: 32 }}
                            minimumValue={0}
                            maximumValue={Math.max(0, spreads.length - 1)}
                            step={1}
                            value={dragSpreadIndex ?? currentSpreadIndex}
                            minimumTrackTintColor="rgba(161,152,255,0.9)"
                            maximumTrackTintColor="rgba(255,255,255,0.15)"
                            thumbTintColor="rgba(199,194,255,1)"
                            onValueChange={handleSliderChange}
                            onSlidingComplete={handleSliderComplete}
                        />
                    </Animated.View>
                ) : (
                    <Animated.View
                        entering={FadeIn.duration(140)}
                        exiting={FadeOut.duration(120)}
                        className="items-center"
                    >
                        <Pressable onPress={handleOpen} hitSlop={10}>
                            <View className="rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-1.5">
                                <Text className="text-xs font-medium text-white/50">{pageLabel}</Text>
                            </View>
                        </Pressable>
                        <Text className="mt-1.5 text-xs text-white/30">{scanlator}</Text>
                    </Animated.View>
                )}
            </Animated.View>
        </View>
    )
}

function ReaderLongStripItem({
    spreadIndexes,
    pages,
    settings,
    screenWidth,
    screenHeight,
    pageGapAmount,
    zoomId,
    pinchEnabled,
    withZoom = true,
    renderImages = true,
    measuredAspectRatios,
    onPageAspectRatioMeasured,
    reduceImageTransition,
    onTap,
    onZoomChange,
    tapExclusionTop,
    tapExclusionBottom,
    tapViewportHeight,
}: {
    spreadIndexes: number[]
    pages: MangaReaderPage[]
    settings: ReturnType<typeof useMangaReaderSettings>["settings"]
    screenWidth: number
    screenHeight: number
    pageGapAmount: number
    zoomId: string
    pinchEnabled?: boolean
    withZoom?: boolean
    renderImages?: boolean
    measuredAspectRatios?: Record<string, number>
    onPageAspectRatioMeasured?: (uri: string, aspectRatio: number) => void
    reduceImageTransition?: boolean
    onTap: () => void
    onZoomChange?: (zoomed: boolean) => void
    tapExclusionTop?: number
    tapExclusionBottom?: number
    tapViewportHeight?: number
}) {
    const longStripContentWidth = Math.max(screenWidth, 1)

    const content = (
        // long strip still renders spreads not raw pages so progress and scrubber stay aligned
        <View className="gap-3 items-center">
            {spreadIndexes.map(pageIndex => {
                const page = pages[pageIndex]
                if (!page) return null

                return (
                    <ReaderImageCard
                        key={page.uri}
                        page={page}
                        settings={settings}
                        screenWidth={longStripContentWidth}
                        screenHeight={screenHeight}
                        mode="vertical"
                        measuredAspectRatio={measuredAspectRatios?.[page.uri]}
                        onAspectRatioMeasured={onPageAspectRatioMeasured}
                        renderImage={renderImages}
                        transitionDuration={reduceImageTransition ? 0 : 120}
                    />
                )
            })}
        </View>
    )

    return (
        <View style={{ paddingBottom: pageGapAmount }}>
            {withZoom ? (
                <MangaReaderZoomSurface
                    instanceKey={zoomId}
                    onTap={onTap}
                    onZoomChange={onZoomChange}
                    contentContainerStyle={{
                        width: longStripContentWidth,
                    }}
                    pinchEnabled={pinchEnabled}
                    style={pinchEnabled
                        ? {
                            width: longStripContentWidth,
                            alignSelf: "center",
                        }
                        : undefined}
                    tapExclusionBottom={tapExclusionBottom}
                    tapExclusionTop={tapExclusionTop}
                    tapViewportHeight={tapViewportHeight}
                >
                    {content}
                </MangaReaderZoomSurface>
            ) : content}
        </View>
    )
}

function ReaderPagedItem({
    spreadIndexes,
    pages,
    settings,
    screenWidth,
    screenHeight,
    pageGapAmount,
    zoomId,
    flipForRtl,
    onTap,
    onZoomChange,
    tapExclusionTop,
    tapExclusionBottom,
    tapViewportHeight,
}: {
    spreadIndexes: number[]
    pages: MangaReaderPage[]
    settings: ReturnType<typeof useMangaReaderSettings>["settings"]
    screenWidth: number
    screenHeight: number
    pageGapAmount: number
    zoomId: string
    flipForRtl: boolean
    onTap: () => void
    onZoomChange: (zoomed: boolean) => void
    tapExclusionTop: number
    tapExclusionBottom: number
    tapViewportHeight: number
}) {
    const twoPages = spreadIndexes.length > 1
    const spreadShadowSides = ["left", "right"] as const

    return (
        <View
            style={flipForRtl
                ? { width: screenWidth, height: screenHeight, transform: [{ scaleX: -1 }] }
                : { width: screenWidth, height: screenHeight }}
        >
            <MangaReaderZoomSurface
                instanceKey={zoomId}
                contentContainerStyle={{
                    width: screenWidth,
                    height: screenHeight,
                    justifyContent: "center",
                    alignItems: "center",
                }}
                maxScale={4}
                onTap={onTap}
                onZoomChange={Platform.OS === "ios" ? onZoomChange : undefined}
                pinchEnabled
                style={{ flex: 1 }}
                tapExclusionBottom={tapExclusionBottom}
                tapExclusionTop={tapExclusionTop}
                tapViewportHeight={tapViewportHeight}
            >
                <View
                    className={cn(
                        "items-center justify-center",
                        twoPages && "flex-row",
                        "flex-row-reverse", // spreads are built in reading order so the row stays reversed
                        // twoPages && settings.readingDirection === MANGA_READING_DIRECTION.RTL && "flex-row-reverse",
                    )}
                    style={{
                        gap: pageGapAmount,
                        minHeight: screenHeight,
                        width: screenWidth,
                    }}
                >
                    {spreadIndexes.map(pageIndex => {
                        const pagePosition = spreadIndexes.indexOf(pageIndex)
                        const page = pages[pageIndex]
                        if (!page) return null

                        return (
                            <ReaderImageCard
                                key={page.uri}
                                page={page}
                                settings={settings}
                                screenWidth={twoPages ? (screenWidth - pageGapAmount) / 2 : screenWidth}
                                screenHeight={screenHeight}
                                mode="horizontal"
                                shadowEdge={spreadShadowSides[pagePosition] ?? null}
                            />
                        )
                    })}
                </View>
            </MangaReaderZoomSurface>
        </View>
    )
}

function ReaderImageCard({
    page,
    settings,
    screenWidth,
    screenHeight,
    mode,
    shadowEdge,
    measuredAspectRatio,
    onAspectRatioMeasured,
    renderImage = true,
    transitionDuration = 120,
}: {
    page: MangaReaderPage
    settings: ReturnType<typeof useMangaReaderSettings>["settings"]
    screenWidth: number
    screenHeight: number
    mode: "vertical" | "horizontal"
    shadowEdge?: "left" | "right" | null
    measuredAspectRatio?: number
    onAspectRatioMeasured?: (uri: string, aspectRatio: number) => void
    renderImage?: boolean
    transitionDuration?: number
}) {
    const isDoublePage = mode === "horizontal" && settings.readingMode === MANGA_READING_MODE.DOUBLE_PAGE
    const isPagedMode = mode === "horizontal"
    const pageAspectRatio = measuredAspectRatio ?? getReaderPageAspectRatio(page)
    const [aspectRatio, setAspectRatio] = React.useState(pageAspectRatio)

    React.useEffect(() => {
        setAspectRatio(pageAspectRatio)
    }, [pageAspectRatio, page.uri])

    const viewportWidth = screenWidth
    const viewportHeight = screenHeight
    const { width: imageWidth, height: imageHeight } = getReaderImageSize({
        aspectRatio,
        screenWidth: viewportWidth,
        screenHeight: viewportHeight,
        mode,
    })

    const contentFit = "contain"

    const pagedFrameStyle = isPagedMode
        ? {
            width: isDoublePage ? imageWidth : screenWidth,
            height: isDoublePage ? imageHeight : screenHeight,
            alignItems: "center" as const,
            justifyContent: "center" as const,
        }
        : undefined

    const imageStyle = isPagedMode
        ? (isDoublePage ? { width: imageWidth, height: imageHeight } : { width: screenWidth, height: screenHeight })
        : { width: imageWidth, height: imageHeight }

    const showCardShadow = settings.pageGap && settings.pageGapShadow
    const cardShapeClassName = settings.pageGap
        ? (isPagedMode ? "border border-white/6" : "border border-white/6")
        : ""
    // only paired pages get the inner seam so single pages do not look framed twice
    const showInnerEdgeShadow = Boolean(showCardShadow && isDoublePage && shadowEdge)

    return (
        <View
            className="bg-transparent"
            style={[
                pagedFrameStyle,
                showCardShadow ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.6,
                    shadowRadius: 10,
                    elevation: 12,
                } : undefined,
            ]}
        >
            <View className={cn("relative overflow-hidden", cardShapeClassName)}>
                {renderImage ? (
                    <Image
                        source={{ uri: page.uri }}
                        style={imageStyle}
                        contentFit={contentFit}
                        transition={transitionDuration}
                        recyclingKey={`${page.index}-${page.uri}`}
                        onLoad={(event) => {
                            if (event.source.width && event.source.height) {
                                // trust the real bitmap size because some providers lie about dimensions
                                const nextAspectRatio = event.source.width / event.source.height
                                setAspectRatio(current => Math.abs(current - nextAspectRatio) < 0.001 ? current : nextAspectRatio)
                                onAspectRatioMeasured?.(page.uri, nextAspectRatio)
                            }
                        }}
                    />
                ) : (
                    <View style={imageStyle} />
                )}
                {showInnerEdgeShadow && (
                    <LinearGradient
                        pointerEvents="none"
                        colors={shadowEdge === "left"
                            ? ["rgba(0,0,0,0.34)", "rgba(0,0,0,0.1)", "transparent"]
                            : ["transparent", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.34)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={shadowEdge === "left"
                            ? {
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: 0,
                                width: 22,
                            }
                            : {
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                right: 0,
                                width: 22,
                            }}
                    />
                )}
            </View>
        </View>
    )
}

const ReaderIconButton = React.forwardRef<React.ComponentRef<typeof Pressable>, {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    onPress: () => void
    nextFocusLeft?: number | null
    nextFocusRight?: number | null
    nextFocusDown?: number | null
    nextFocusUp?: number | null
    hasTVPreferredFocus?: boolean
}>(function ReaderIconButton({
    icon,
    onPress,
    nextFocusLeft,
    nextFocusRight,
    nextFocusDown,
    nextFocusUp,
    hasTVPreferredFocus,
}, ref) {
    return (
        <TvFocusablePressable
            ref={ref}
            onPress={onPress}
            className="h-12 w-12 items-center justify-center rounded-full bg-white/5"
            focusedClassName="bg-white/15 border border-brand-400/60"
            nextFocusLeft={nextFocusLeft ?? undefined}
            nextFocusRight={nextFocusRight ?? undefined}
            nextFocusDown={nextFocusDown ?? undefined}
            nextFocusUp={nextFocusUp ?? undefined}
            hasTVPreferredFocus={hasTVPreferredFocus}
        >
            <Ionicons name={icon} size={19} color="rgba(255,255,255,0.82)" />
        </TvFocusablePressable>
    )
})

function ReaderSmallButton({
    icon,
    disabled,
    onPress,
    nextFocusLeft,
    nextFocusRight,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    disabled?: boolean
    onPress: () => void
    nextFocusLeft?: number | null
    nextFocusRight?: number | null
}) {
    return (
        <TvFocusablePressable
            onPress={disabled ? undefined : onPress}
            className={cn(
                "h-9 w-9 items-center justify-center rounded-full bg-white/5",
                disabled && "opacity-30",
            )}
            focusedClassName="bg-white/15 border border-brand-400/60"
            nextFocusLeft={nextFocusLeft ?? undefined}
            nextFocusRight={nextFocusRight ?? undefined}
        >
            <Ionicons name={icon} size={16} color="rgba(255,255,255,0.75)" />
        </TvFocusablePressable>
    )
}

function ReaderStateCard({
    title,
    description,
    actionLabel,
    onPress,
}: {
    title: string
    description: string
    actionLabel: string
    onPress: () => void
}) {
    return (
        <View className="flex-1 items-center justify-center px-6">
            <View className="w-full max-w-md gap-4 rounded-3xl border border-white/8 bg-white/[0.04] p-6">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-300/10">
                    <Ionicons name="book-outline" size={24} color="rgb(199,194,255)" />
                </View>
                <View className="gap-2">
                    <Text className="text-xl font-semibold text-white">{title}</Text>
                    <Text className="text-sm leading-6 text-white/40">{description}</Text>
                </View>
                <Button className="rounded-2xl" onPress={onPress}>
                    <Text className="text-primary-foreground text-sm font-semibold">{actionLabel}</Text>
                </Button>
            </View>
        </View>
    )
}
