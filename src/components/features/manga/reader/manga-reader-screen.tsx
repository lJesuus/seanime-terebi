import { useGetMangaEntry, useGetMangaEntryChapters, useGetMangaEntryPages, useUpdateMangaProgress } from "@/api/hooks/manga.hooks"
import { __mangaReaderChromeBackTagAtom, __mangaReaderFirstPageTagAtom, __mangaReaderLastPageTagAtom } from "@/atoms/library.atoms"
import { useServerStatus, useServerUrl } from "@/atoms/server.atoms"
import { DEFAULT_READER_PAGE_ASPECT_RATIO, getReaderImageSize } from "@/components/features/manga/reader/manga-reader-layout"
import { MangaReaderSettingsSheet } from "@/components/features/manga/reader/manga-reader-settings-sheet"
import {
    MANGA_READING_DIRECTION,
    MANGA_READING_MODE,
    useMangaReaderPosition,
    useMangaReaderSettings,
    type MangaReaderSettings,
} from "@/components/features/manga/reader/manga-reader-state"
import {
    buildReaderPages,
    clamp,
    formatMangaReaderHref,
    getAdjacentChapters,
    getChapterProgressNumber,
    type MangaReaderChapterRef,
    type MangaReaderPage,
} from "@/components/features/manga/reader/manga-reader-utils"
import { Button } from "@/components/ui/button"
import { TVFocusContext } from "@/contexts/tv-focus-context"
import { useAtom, useSetAtom } from "jotai/react"
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
import { Image } from "expo-image"
import { Stack, useRouter } from "expo-router"
import * as React from "react"
import {
    ActivityIndicator,
    findNodeHandle,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    useWindowDimensions,
    View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type MangaReaderScreenProps = {
    mediaId: number
    provider: string
    chapterId: string
    chapterNumber?: string
}

export function MangaReaderScreen({ mediaId, provider, chapterId, chapterNumber }: MangaReaderScreenProps) {
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const isTV = useIsTV()
    const { sidebarTag } = React.useContext(TVFocusContext)
    const serverUrl = useServerUrl()
    const serverStatus = useServerStatus()
    const { width: screenWidth, height: screenHeight } = useWindowDimensions()
    const isConnected = useIsServerConnected()

    // ─── Data fetching ─────────────────────────────────────────────────────
    const { data: entry } = useGetMangaEntry(mediaId)
    const { data: chapterContainer } = useGetMangaEntryChapters({
        mediaId,
        provider: isConnected ? provider : undefined,
    })

    const currentChapterDownloaded = useIsMangaChapterDownloaded(mediaId, provider, chapterId)
    const downloadedChapterInfo = useMangaChapterDownloadInfo(mediaId, provider, chapterId)
    const localPages = useLocalMangaChapterPages(mediaId, provider, chapterId)
    const downloadedChapters = useAllDownloadedMangaChapters(mediaId)

    const { settings, setSetting, resetSettings, defaults } = useMangaReaderSettings(mediaId)
    const { pageIndex: savedPageIndex, setPageIndex: setSavedPageIndex } = useMangaReaderPosition(mediaId, provider, chapterId)

    // Page container fetch — TV doesn't need page dimensions (no pinch
    // zoom); the only reason `doublePage` was flipped on was to bring back
    // measurements for spreads. The LONG_STRIP vertical path now happily
    // works on whatever the server returns.
    const { data: pageContainer, isLoading: pageContainerLoading, isError: pageContainerError } = useGetMangaEntryPages({
        mediaId,
        provider: isConnected ? provider : undefined,
        chapterId: isConnected ? chapterId : undefined,
        doublePage: false,
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

    // Pre-warm the next chapter so chapter turns don't flash a loader.
    // Disabled for local-manga to prevent cache pollution.
    useGetMangaEntryPages({
        mediaId,
        provider: (isConnected && nextChapter && provider !== "local-manga") ? nextChapter.provider : undefined,
        chapterId: (isConnected && nextChapter && provider !== "local-manga") ? nextChapter.chapterId : undefined,
        doublePage: false,
    })

    const pages = React.useMemo(() => buildReaderPages(serverUrl, pageContainer, localPages, downloadedChapterInfo?.pageDimensions),
        [downloadedChapterInfo?.pageDimensions, localPages, pageContainer, serverUrl])

    // `displayPages` is the order pages are actually rendered. `pages` keeps
    // the server's natural (RTL) order; `displayPages` reverses it when
    // the user picked LTR. Reading-direction toggles flip this array only;
    // `pages[i].index` (the server's stamp) is preserved through the
    // reversal — we use it at the restore/save boundary so the
    // chapterKey-indexed Jotai position storage stays direction-agnostic
    // and toggling direction mid-chapter translates the saved offset
    // correctly across the mirror.
    const displayPages = React.useMemo(
        () => settings.readingDirection === MANGA_READING_DIRECTION.LTR ? [...pages].reverse() : pages,
        [pages, settings.readingDirection],
    )

    const serverToDisplayIdx = React.useCallback(
        (serverIdx: number) => settings.readingDirection === MANGA_READING_DIRECTION.LTR
            ? pages.length - 1 - serverIdx
            : serverIdx,
        [pages.length, settings.readingDirection],
    )
    const displayToServerIdx = React.useCallback(
        (displayIdx: number) => settings.readingDirection === MANGA_READING_DIRECTION.LTR
            ? pages.length - 1 - displayIdx
            : displayIdx,
        [pages.length, settings.readingDirection],
    )

    // Reading mode affects the per-row layout: LONG_STRIP keeps one page
    // per row (full screen width); DOUBLE_PAGE pairs pages side-by-side
    // (each column at half width). `displaySpreads` is the array of
    // `MangaReaderPage` rows the renderer iterates over; `findTopmostVisiblePage`
    // and the pageGeometry deps below operate on spreads (not pages)
    // because every row has identical height in the chosen mode — the
    // focus chain inside a spread continues to be a flat list of pages
    // for native spatial nav.
    const displaySpreads = React.useMemo(() => {
        if (settings.readingMode === MANGA_READING_MODE.DOUBLE_PAGE) {
            const spreads: Array<MangaReaderPage[]> = []
            for (let i = 0; i < displayPages.length; i += 2) {
                spreads.push(displayPages.slice(i, i + 2))
            }
            return spreads
        }
        return displayPages.map(page => [page])
    }, [displayPages, settings.readingMode])

    // Effective per-page width passed to `getReaderImageSize` and to
    // `ReaderPageImage` so render-bounds and layout math agree. In
    // LONG_STRIP each page gets the full screen width; in DOUBLE_PAGE
    // pages share the row so each gets half (minus a small inter-page gap
    // so two manga pages don't touch edge-to-edge at TV scale).
    const interColumnGap = 8
    const pagesPerSpread = settings.readingMode === MANGA_READING_MODE.DOUBLE_PAGE ? 2 : 1
    const effectiveScreenWidth = React.useMemo(() => (
        pagesPerSpread === 1
            ? screenWidth
            : Math.max(1, (screenWidth - interColumnGap * (pagesPerSpread - 1)) / pagesPerSpread)
    ), [pagesPerSpread, screenWidth])

    // Index translators between display-page-index and spread-index.
    // LONG_STRIP: spread = page, so the two indices are equal.
    // DOUBLE_PAGE: each spread contains two display-pages; spreadIdx =
    // floor(displayIdx / 2) and the first page of spread k sits at
    // displayIdx 2k. These helpers are the boundary between
    // `pages`-derived math (always per-page) and `pageGeometry.tops` /
    // `findTopmostVisiblePage` (always per-spread).
    const displayToSpreadIdx = React.useCallback(
        (displayIdx: number) => pagesPerSpread === 2 ? Math.floor(displayIdx / 2) : displayIdx,
        [pagesPerSpread],
    )
    const spreadIdxToFirstDisplayIdx = React.useCallback(
        (spreadIdx: number) => pagesPerSpread === 2 ? spreadIdx * 2 : spreadIdx,
        [pagesPerSpread],
    )

    // ─── Local UI state ────────────────────────────────────────────────────
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [settingsSheetNonce, setSettingsSheetNonce] = React.useState(0)
    const [flashText, setFlashText] = React.useState<string | null>(null)

    // Ref attached to the FIRST option (Long Strip) inside the settings
    // sheet's Reading Mode section. Threaded through
    // `MangaReaderSettingsSheet.firstFocusRef` so SeaSideDrawer's
    // 60 ms-after-mount focus call lands on Long Strip and the same
    // row carries `hasTVPreferredFocus` for the native TV focus engine
    // on Android TV / tvOS. Setting firstFocusSettingOptionRef is the
    // single handle the consumer needs — the sheet internally mirrors
    // the ref onto the OptionGrid's first option's `TvFocusablePressable`.
    const firstFocusSettingOptionRef = React.useRef<React.ComponentRef<typeof Pressable>>(null)

    const scrollRef = React.useRef<ScrollView | null>(null)
    // Dual ref+state pattern: ref is the live truth for anything that reads
    // the offset inside JS-side callbacks (rAF animators, restore effect);
    // state drives React re-renders so the progress bar updates during
    // smooth-scroll animations (~60Hz scrollEventThrottle fires on each
    // rAF tick when the animator writes the offset).
    const scrollOffsetRef = React.useRef(0)
    const [scrollOffset, setScrollOffset] = React.useState(0)
    const restoringPositionRef = React.useRef(false)
    const didRestoreInitialPageRef = React.useRef(false)
    const syncMarkerRef = React.useRef<string | null>(null)
    // Last chapter we auto-restored scroll for. Layout-affecting settings
    // (page gap toggle, gap amount step, etc.) recompute `pageGeometry.tops`
    // and would otherwise re-fire the restore effect mid-session, snapping
    // the user back to their saved page. We restore at most once per
    // chapter and let mid-session geometry changes adjust the live editor
    // without disrupting the user's current scroll position.
    const restoredChapterRef = React.useRef<string | null>(null)
    // Stored lazily by the save effect: only `setSavedPageIndex(...)`
    // when the topmost-visible page actually changes. Without this gate
    // the atom gets a fresh write on every scroll tick (~60Hz), each with
    // a new `updatedAt: Date.now()`, triggering a Jotai re-render each time.
    const lastSavedPageIndexRef = React.useRef(0)

    const updateMangaProgress = useUpdateMangaProgress(mediaId)

    const chapterKey = `${provider}:${chapterId}`

    // Layout insets leave room for the floating chrome at top.
    const scrollTopInset = isTV ? insets.top + 96 : insets.top + 56
    const scrollBottomInset = insets.bottom + 28
    const pageGapAmount = settings.pageGap ? settings.pageGapAmount : 0

    // Per-spread layout: each row's height matches what
    // `ReaderPageImage` actually renders (via `getReaderImageSize` on
    // `effectiveScreenWidth`). In LONG_STRIP each row contains exactly
    // one page; in DOUBLE_PAGE each row contains a 2-page pair, all of the
    // same effective width — every row has identical height in the chosen
    // mode, so `tops[spreadIdx] = scroll-offset at the top of row i` and
    // `findTopmostVisiblePage` returns spreadIdx (not pageIdx).
    // `totalHeight` drives the chrome progress bar's percentage fill.
    const pageGeometry = React.useMemo<{ tops: number[]; totalHeight: number }>(() => {
        if (displaySpreads.length === 0) return { tops: [], totalHeight: scrollTopInset + scrollBottomInset }
        const tops: number[] = new Array(displaySpreads.length)
        let acc = scrollTopInset
        for (let i = 0; i < displaySpreads.length; i++) {
            tops[i] = acc
            // The first page of the spread represents the row's aspect;
            // all pages within the row render at the same effective width
            // and therefore the same height.
            const page = displaySpreads[i][0]
            const aspectRatio = page.width && page.height ? page.width / page.height : DEFAULT_READER_PAGE_ASPECT_RATIO
            const pageHeight = getReaderImageSize({
                aspectRatio,
                screenWidth: effectiveScreenWidth,
                screenHeight,
                mode: "vertical",
                fitToWidth: settings.fitToWidth,
            }).height
            acc += pageHeight + pageGapAmount
        }
        // Subtract the trailing page-gap (CSS gap doesn't apply past the
        // last item) and add the bottom padding.
        return { tops, totalHeight: acc - pageGapAmount + scrollBottomInset }
    }, [displaySpreads, effectiveScreenWidth, screenHeight, settings.fitToWidth, scrollTopInset, scrollBottomInset, pageGapAmount])

    // Reading progress as a fraction of total scrollable height. Bounded
    // to [0, 1] so a brief over-scroll (e.g. rubber-band) doesn't widen
    // the bar past 100%. Note: this is the fraction of ROWS scrolled,
    // not pages. In LONG_STRIP each row is one page (1:1). In DOUBLE_PAGE
    // each row holds two pages, so the bar visually fills twice as fast.
    // That asymmetry is acceptable: the bar is a "how far through the
    // chapter am I" gauge that follows scrolling-position, while the
    // toast label / chapter-progress sync at the last row are independent
    // of progress-bar velocity.
    const readingProgress = clamp(scrollOffset / Math.max(1, pageGeometry.totalHeight), 0, 1)

    // Topmost-visible page: largest index such that `tops[i] <= offset`.
    // O(log n) binary search keeps it cheap during smooth scroll and
    // during the live save effect below.
    const findTopmostVisiblePage = React.useCallback((offset: number): number => {
        const tops = pageGeometry.tops
        if (tops.length === 0) return 0
        let lo = 0
        let hi = tops.length - 1
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2)
            if (tops[mid] <= offset) lo = mid
            else hi = mid - 1
        }
        return lo
    }, [pageGeometry.tops])

    // Reset on chapter change. Focus-tag atom lifecycle is handled by the
    // Pressables' callback refs (refs fire during commit, BEFORE this
    // useEffect runs) — explicitly clearing the atoms here would overwrite
    // the freshly-registered tags.
    React.useEffect(() => {
        didRestoreInitialPageRef.current = false
        restoringPositionRef.current = false
        syncMarkerRef.current = null
        restoredChapterRef.current = null
        lastSavedPageIndexRef.current = 0
        scrollOffsetRef.current = 0
        setScrollOffset(0)
        scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, [chapterId, mediaId, provider])

    // ─── Restore saved position once per chapter mount ─────────────────────
    // Gated by `restoredChapterRef` so layout-affecting settings (page gap
    // toggle, gap amount, reading direction, reading mode) can rebuild
    // `pageGeometry.tops` without snapping the user back to their saved
    // page mid-reading. The stored index is the server-side page index
    // (i.e. the index that survives the reading-direction mirror). We
    // translate through `serverToDisplayIdx` then `displayIdxToSpreadIdx`
    // to land on the correct spread row in `tops[]`.
    React.useEffect(() => {
        if (pages.length === 0) return
        if (displaySpreads.length === 0) return
        if (restoredChapterRef.current === chapterKey) return
        restoredChapterRef.current = chapterKey
        if (savedPageIndex <= 0) {
            // No saved position; simply mark as restored after one rAF.
            requestAnimationFrame(() => {
                restoringPositionRef.current = false
                didRestoreInitialPageRef.current = true
            })
            return
        }

        restoringPositionRef.current = true
        // Defer one rAF so the ScrollView has committed its first layout
        // pass with the new spread array; without this, Android TV can
        // snap back to y=0 because ScrollView's contentSize is still 0.
        requestAnimationFrame(() => {
            // Translate the persisted server-index to the display-index
            // for the current reading direction. Both ends are clamped
            // because the chapter may have shrunk between sessions, and
            // the mirror may overshoot otherwise.
            const clampedStore = clamp(savedPageIndex, 0, pages.length - 1)
            const displayIdx = clamp(serverToDisplayIdx(clampedStore), 0, pages.length - 1)
            const spreadIdx = clamp(displayToSpreadIdx(displayIdx), 0, displaySpreads.length - 1)
            const targetY = pageGeometry.tops[spreadIdx] ?? 0
            if (clampedStore !== lastSavedPageIndexRef.current) lastSavedPageIndexRef.current = clampedStore
            scrollOffsetRef.current = targetY
            setScrollOffset(targetY)
            scrollRef.current?.scrollTo({ y: targetY, animated: false })
            requestAnimationFrame(() => {
                restoringPositionRef.current = false
                didRestoreInitialPageRef.current = true
            })
        })
    }, [chapterKey, pages.length, displaySpreads.length, savedPageIndex, pageGeometry.tops, serverToDisplayIdx, displayToSpreadIdx])

    // ─── Save position as the user scrolls past page boundaries ────────────
    // The Jotai store is keyed by chapter, so we persist the server-side
    // page index — this way an RTL save is correctly mirrored to the LTR
    // viewing direction on the next mount (and vice-versa). The reading
    // mode affects only the visual layout; the saved server-index always
    // refers to a specific manga page, regardless of mode.
    React.useEffect(() => {
        if (!didRestoreInitialPageRef.current) return
        if (displaySpreads.length === 0) return
        const currentSpreadIdx = findTopmostVisiblePage(scrollOffset)
        const firstDisplayPageIdx = spreadIdxToFirstDisplayIdx(currentSpreadIdx)
        const serverIdx = clamp(displayToServerIdx(firstDisplayPageIdx), 0, pages.length - 1)
        if (serverIdx === lastSavedPageIndexRef.current) return
        lastSavedPageIndexRef.current = serverIdx
        setSavedPageIndex(serverIdx)
    }, [findTopmostVisiblePage, displaySpreads.length, scrollOffset, displayToServerIdx, spreadIdxToFirstDisplayIdx, pages.length, setSavedPageIndex])

    // ─── Re-position scroll when reading direction flips mid-session ──────
    // When the user toggles LTR↔RTL, `displayPages` reverses and
    // `pageGeometry.tops` mirrors accordingly, but `ScrollView`'s
    // absolute contentOffset stays put. The user would otherwise see a
    // different page at the same y. We pin the user's view to the same
    // **image** by translating the last-saved server-index through the
    // new direction and scrolling to that y. The `restoredChapterRef`
    // gate above already prevents this from being mistaken for a fresh
    // restore, so the live scroll position survives the flip.
    const prevReadingDirectionRef = React.useRef(settings.readingDirection)
    React.useEffect(() => {
        if (prevReadingDirectionRef.current === settings.readingDirection) return
        prevReadingDirectionRef.current = settings.readingDirection
        if (displaySpreads.length === 0) return
        if (pageGeometry.tops.length !== displaySpreads.length) return
        if (!didRestoreInitialPageRef.current) return
        const serverIdx = clamp(lastSavedPageIndexRef.current, 0, pages.length - 1)
        const displayIdx = clamp(serverToDisplayIdx(serverIdx), 0, displayPages.length - 1)
        const spreadIdx = clamp(displayToSpreadIdx(displayIdx), 0, displaySpreads.length - 1)
        const targetY = pageGeometry.tops[spreadIdx] ?? 0
        scrollOffsetRef.current = targetY
        setScrollOffset(targetY)
        scrollRef.current?.scrollTo({ y: targetY, animated: false })
    }, [settings.readingDirection, displaySpreads.length, displayPages.length, pageGeometry.tops, didRestoreInitialPageRef.current, serverToDisplayIdx, displayToSpreadIdx, pages.length])

    // ─── Re-position scroll when reading mode flips mid-session ─────────────
    // Toggle between LONG_STRIP and DOUBLE_PAGE reshapes `displaySpreads`
    // (and therefore `pageGeometry.tops`) so live `scrollOffset` no longer
    // points at the same image. Same fix as the direction-flip: translate
    // the user's last-saved server-index through the new (direction, mode)
    // and scroll to the matching spread. The `restoredChapterRef` gate
    // already prevents re-entry on layout-affecting settings changes
    // (page gap, gap amount); the additional `prevReadingModeRef` check
    // ensures we only re-scroll on actual mode flips, not on the initial
    // mount.
    const prevReadingModeRef = React.useRef(settings.readingMode)
    React.useEffect(() => {
        if (prevReadingModeRef.current === settings.readingMode) return
        prevReadingModeRef.current = settings.readingMode
        if (displaySpreads.length === 0) return
        if (pageGeometry.tops.length !== displaySpreads.length) return
        if (!didRestoreInitialPageRef.current) return
        const serverIdx = clamp(lastSavedPageIndexRef.current, 0, pages.length - 1)
        const displayIdx = clamp(serverToDisplayIdx(serverIdx), 0, displayPages.length - 1)
        const spreadIdx = clamp(displayToSpreadIdx(displayIdx), 0, displaySpreads.length - 1)
        const targetY = pageGeometry.tops[spreadIdx] ?? 0
        scrollOffsetRef.current = targetY
        setScrollOffset(targetY)
        scrollRef.current?.scrollTo({ y: targetY, animated: false })
    }, [settings.readingMode, displaySpreads.length, displayPages.length, pageGeometry.tops, didRestoreInitialPageRef.current, serverToDisplayIdx, displayToSpreadIdx, pages.length])

    // ─── Flash text auto-hide ──────────────────────────────────────────────
    React.useEffect(() => {
        if (!flashText) return
        const timeout = setTimeout(() => setFlashText(null), 850)
        return () => clearTimeout(timeout)
    }, [flashText])

    // ─── Sync progress to server when chapter completes ─────────────────────
    const doSyncProgress = React.useCallback(() => {
        if (serverStatus?.settings?.manga?.mangaAutoUpdateProgress === false) return
        const chapterProgress = getChapterProgressNumber(currentChapter.chapterNumber)
        const currentProgress = entry?.listData?.progress ?? 0
        if (!entry?.media || !chapterProgress || chapterProgress <= currentProgress) return
        if (syncMarkerRef.current === chapterKey) return
        syncMarkerRef.current = chapterKey

        const payload = {
            mediaId,
            malId: entry.media.idMal,
            chapterNumber: chapterProgress,
            totalChapters: entry.media.chapters ?? 0,
        }
        updateMangaProgress.mutate(payload, { onError: () => { syncMarkerRef.current = null } })
    }, [chapterKey, currentChapter.chapterNumber, entry, mediaId, serverStatus?.settings?.manga?.mangaAutoUpdateProgress, updateMangaProgress])

    React.useEffect(() => {
        if (displaySpreads.length === 0) return
        if (!didRestoreInitialPageRef.current) return
        const currentVisibleSpread = findTopmostVisiblePage(scrollOffset)
        if (currentVisibleSpread < displaySpreads.length - 1) return
        doSyncProgress()
    }, [doSyncProgress, findTopmostVisiblePage, displaySpreads.length, scrollOffset])

    // ─── Settings handler — produces the small toast badge ──────────────────
    const onSettingChange = React.useCallback(
        <Key extends keyof MangaReaderSettings>(key: Key, value: MangaReaderSettings[Key]) => {
            setSetting(key, value)
            let label: string | undefined
            if (key === "readingMode") label = value === MANGA_READING_MODE.LONG_STRIP ? "Long Strip" : "Double Page"
            else if (key === "readingDirection") label = value === MANGA_READING_DIRECTION.RTL ? "Right to Left" : "Left to Right"
            else if (key === "pageGap") label = value ? "Page Gaps On" : "Page Gaps Off"
            else if (key === "pageGapAmount") label = `Gap ${String(value)}px`
            else if (key === "pageGapShadow") label = value ? "Gap Shadow On" : "Gap Shadow Off"
            else if (key === "showProgressBar") label = value ? "Progress Bar On" : "Progress Bar Off"
            else if (key === "brightness") label = `Brightness ${Math.round(Number(value) * 100)}%`
            else if (key === "fitToWidth") label = value ? "Fit to Width On" : "Fit to Width Off"
            if (label) setFlashText(label)
        },
        [setSetting],
    )

    // ─── Chapter navigation ────────────────────────────────────────────────
    const navigateToChapter = React.useCallback((target: MangaReaderChapterRef | undefined) => {
        if (!target) return
        router.replace(formatMangaReaderHref({
            mediaId: target.mediaId,
            provider: target.provider,
            chapterId: target.chapterId,
            chapterNumber: target.chapterNumber,
        }))
    }, [router])

    const handleOpenNextChapter = React.useCallback(() => {
        doSyncProgress()
        navigateToChapter(nextChapter)
    }, [doSyncProgress, navigateToChapter, nextChapter])

    const handleOpenSettings = React.useCallback(() => {
        setSettingsOpen(current => {
            if (!current) return true
            setSettingsSheetNonce(value => value + 1)
            requestAnimationFrame(() => { setSettingsOpen(true) })
            return false
        })
    }, [])

    // ─── Scroll tracking ───────────────────────────────────────────────────
    const handleScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (restoringPositionRef.current) return
        const y = event.nativeEvent.contentOffset.y
        scrollOffsetRef.current = y
        setScrollOffset(y)
    }, [])

    // ─── DPAD handler ──────────────────────────────────────────────────────
    // LONG_STRIP mode: LEFT/RIGHT = chapter nav (today's behaviour).
    // DOUBLE_PAGE mode: LEFT/RIGHT stepping across the spread's two pages
    // is handled by native spatial nav, so we don't intercept it — the
    // chrome's prev/next-chapter buttons remain the only chapter-level
    // control. UP/DOWN always flow through to native spatial nav so
    // focus traverses the per-page chain (chrome BACK → page 1 → … →
    // last page → chrome BACK) without being held by the JS layer.
    const handleDpadNavigation = React.useCallback((e: any) => {
        if (settings.readingMode !== MANGA_READING_MODE.DOUBLE_PAGE) {
            if (e.key === "ArrowLeft" || e.key === "Left") {
                if (previousChapter) navigateToChapter(previousChapter)
                return true
            }
            if (e.key === "ArrowRight" || e.key === "Right") {
                if (nextChapter) navigateToChapter(nextChapter)
                return true
            }
        }
        return false
    }, [navigateToChapter, previousChapter, nextChapter, settings.readingMode])

    const showUnavailableState = !currentChapterDownloaded && !isConnected
    const showLoading = !showUnavailableState && pages.length === 0 && pageContainerLoading
    const showEmpty = !showUnavailableState && !showLoading && pages.length === 0
    const chapterTitle = currentChapter.title || `Chapter ${currentChapter.chapterNumber}`
    const mangaTitle = entry?.media?.title?.userPreferred || entry?.media?.title?.english || entry?.media?.title?.romaji || `Manga #${mediaId}`

    return (
        <View
            className="flex-1 bg-[#080808]"
            {...(isTV ? { onKeyDown: handleDpadNavigation as any } : {})}
        >
            <StatusBar hidden barStyle="light-content" />
            <Stack.Screen options={{ autoHideHomeIndicator: true }} />

            {showLoading ? (
                <View className="flex-1 items-center justify-center gap-4">
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                    <Text className="text-sm text-white/40">
                        Loading chapter pages...
                    </Text>
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
                    {/* Floating chrome: TV-focusable row at the top of the canvas.
                        Always visible on TV — the user has at most ~5m distance
                        to interrupt reading and the persistent chrome doubles as
                        the focus anchor for spatial nav. DPAD forward to the
                        first manga image once focus leaves the chrome via
                        `onKeyDown`. */}
                    <View
                        pointerEvents="box-none"
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            paddingTop: insets.top + 10,
                            paddingHorizontal: 16,
                            backgroundColor: "rgba(8,8,8,0.95)",
                            zIndex: 40,
                        }}
                    >
                        <View pointerEvents="auto" className="gap-2.5">
                            <View className="flex-row items-center gap-3">
                                <ReaderIconButton
                                    icon="chevron-back"
                                    onPress={() => router.back()}
                                    role="back"
                                    hasTVPreferredFocus={isTV}
                                    nextFocusLeft={isTV ? sidebarTag ?? undefined : undefined}
                                />
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                                        {chapterTitle}
                                    </Text>
                                    <Text className="mt-0.5 text-xs text-white/40" numberOfLines={1}>
                                        {mangaTitle}
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-1.5">
                                    <ReaderIconButton
                                        icon="chevron-back"
                                        disabled={!previousChapter}
                                        onPress={() => previousChapter && navigateToChapter(previousChapter)}
                                        role="prev"
                                    />
                                    <ReaderIconButton
                                        icon="chevron-forward"
                                        disabled={!nextChapter}
                                        onPress={() => nextChapter && handleOpenNextChapter()}
                                        role="next"
                                    />
                                    <ReaderIconButton
                                        icon="settings-outline"
                                        onPress={handleOpenSettings}
                                        role="settings"
                                    />
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

                    {/* Setting-change toast — small chip below the chrome. */}
                    {flashText && (
                        <View
                            pointerEvents="none"
                            style={{ position: "absolute", top: insets.top + 60, left: 0, right: 0, zIndex: 50 }}
                        >
                            <View className="items-center">
                                <View className="rounded-full border border-white/8 bg-black/60 px-4 py-1.5">
                                    <Text className="text-xs font-medium text-white/70">{flashText}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Single vertical ScrollView. Each row is a spread:
                        LONG_STRIP = 1 page, DOUBLE_PAGE = 2 pages in a
                        flex-row. Each page is still wrapped individually in
                        a focusable Pressable so native spatial navigation
                        walks DOWN/UP through pages. The chrome prev/next
                        buttons remain chapter navigators in both modes. */}
                    <ScrollView
                        ref={scrollRef}
                        focusable={false}
                        contentContainerStyle={{
                            paddingTop: scrollTopInset,
                            paddingBottom: scrollBottomInset,
                            gap: pageGapAmount,
                            alignItems: settings.readingMode === MANGA_READING_MODE.DOUBLE_PAGE ? "center" : undefined,
                        }}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        contentInsetAdjustmentBehavior="never"
                    >
                        {displaySpreads.map((spread, spreadIdx) => (
                            <View
                                key={`spread-${spreadIdx}`}
                                className="flex-row justify-center items-start"
                                style={{ gap: interColumnGap }}
                            >
                                {spread.map((page, withinIdx) => {
                                    const displayPageIndex = spreadIdx * pagesPerSpread + withinIdx
                                    const isFirst = displayPageIndex === 0
                                    const isLast = displayPageIndex === displayPages.length - 1
                                    return (
                                        <ReaderPageImage
                                            key={page.uri}
                                            page={page}
                                            index={displayPageIndex}
                                            isFirst={isFirst}
                                            isLast={isLast}
                                            settings={settings}
                                            screenWidth={effectiveScreenWidth}
                                            screenHeight={screenHeight}
                                        />
                                    )
                                })}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Brightness overlay dims the canvas as configured. */}
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
                firstFocusRef={firstFocusSettingOptionRef}
            />
        </View>
    )
}

// ─── Reader icon button ─────────────────────────────────────────────────────
//
// Thin wrapper around `TvFocusablePressable` so the chrome stays compact.
// The optional `role` prop tells the chain which DPAD exit this button is:
//   - "back": publishes its native tag to `__mangaReaderChromeBackTagAtom`
//     so the first page can wire its `nextFocusUp` back to this anchor.
//   - "prev"/"next"/"settings" / undefined: just a regular chrome button.
//
// Every button — regardless of role — reads `__mangaReaderFirstPageTagAtom`
// for its `nextFocusDown`, so DPAD-DOWN from any header button lands on
// page 1. Native spatial navigation then walks down the per-page focus
// chain from there.
// `disabled` removes the Pressable from the focusable tree
// (`focusable={false}`) so DPAD skips it cleanly.
function ReaderIconButton({
    icon,
    onPress,
    role,
    disabled,
    nextFocusLeft,
    hasTVPreferredFocus,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"]
    onPress: () => void
    role?: "back" | "prev" | "next" | "settings"
    disabled?: boolean
    nextFocusLeft?: number | null
    hasTVPreferredFocus?: boolean
}) {
    const [firstPageTag] = useAtom(__mangaReaderFirstPageTagAtom)
    const setChromeBackTag = useSetAtom(__mangaReaderChromeBackTagAtom)

    // Ref resolves the native tag on mount and clears it on unmount so the
    // chain doesn't retain a stale anchor after the chrome changes. Only
    // the BACK button publishes its tag — it's the single upward target.
    const handleRef = React.useCallback((instance: React.ComponentRef<typeof Pressable> | null) => {
        if (instance && role === "back") {
            const tag = findNodeHandle(instance)
            if (tag !== null) setChromeBackTag(tag)
        } else if (!instance && role === "back") {
            setChromeBackTag(null)
        }
    }, [role, setChromeBackTag])

    return (
        <TvFocusablePressable
            ref={handleRef}
            onPress={disabled ? undefined : onPress}
            className="h-12 w-12 items-center justify-center rounded-full bg-white/5"
            focusedClassName="bg-white/15 border border-brand-400/60"
            focusable={!disabled}
            nextFocusLeft={nextFocusLeft ?? undefined}
            {...(firstPageTag !== null ? { nextFocusDown: firstPageTag } : {})}
            hasTVPreferredFocus={hasTVPreferredFocus}
        >
            <Ionicons name={icon} size={20} color="rgba(255,255,255,0.82)" />
        </TvFocusablePressable>
    )
}

// ─── Page image ─────────────────────────────────────────────────────────────
//
// Single focusable page image. Width = screenWidth; height auto from the
// page's aspect ratio. Wrapped in a `TvFocusablePressable` with `noScale` so
// Android TV's native spatial navigation can walk through the chain page
// by page. The first page publishes its tag to
// `__mangaReaderFirstPageTagAtom` (so the chrome can wire its
// `nextFocusDown` to it); the last page publishes to
// `__mangaReaderLastPageTagAtom`. The first page's `nextFocusUp` reads
// `__mangaReaderChromeBackTagAtom`; the last page's `nextFocusDown` cycles
// back to chrome BACK so the focus loop is self-contained. Middle pages
// rely on native spatial navigation between adjacent siblings in the
// ScrollView — no explicit chain route needed.
function ReaderPageImage({
    page,
    index,
    isFirst,
    isLast,
    settings,
    screenWidth,
    screenHeight,
}: {
    page: MangaReaderPage
    index: number
    isFirst: boolean
    isLast: boolean
    settings: MangaReaderSettings
    screenWidth: number
    /**
     * Real screen height is required for `fitToWidth: false` — the contain
     * math in `getReaderImageSize` clamps the page to the viewport height.
     * Without this prop the contain branch falls through with `screenHeight = 0`
     * and the page renders sub-pixel sized.
     */
    screenHeight: number
}) {
    const setFirstPageTag = useSetAtom(__mangaReaderFirstPageTagAtom)
    const setLastPageTag = useSetAtom(__mangaReaderLastPageTagAtom)
    const [chromeBackTag] = useAtom(__mangaReaderChromeBackTagAtom)

    // Ref resolves and publishes the tag on mount; clears on unmount.
    // Pages that aren't edge cases have a no-op effect because the gated
    // `isFirst` / `isLast` checks below skip the atom write.
    const handlePageRef = React.useCallback((instance: React.ComponentRef<typeof Pressable> | null) => {
        if (!instance) {
            if (isFirst) setFirstPageTag(null)
            if (isLast) setLastPageTag(null)
            return
        }
        const tag = findNodeHandle(instance)
        if (tag === null) return
        if (isFirst) setFirstPageTag(tag)
        if (isLast) setLastPageTag(tag)
    }, [isFirst, isLast, setFirstPageTag, setLastPageTag])

    const aspectRatio = page.width && page.height ? page.width / page.height : DEFAULT_READER_PAGE_ASPECT_RATIO
    const { width: imageWidth, height: imageHeight } = getReaderImageSize({
        aspectRatio,
        screenWidth,
        screenHeight,
        mode: "vertical",
        fitToWidth: settings.fitToWidth,
    })

    return (
        <TvFocusablePressable
            ref={handlePageRef}
            noScale
            focusable
            className={cn(
                "mx-auto overflow-hidden bg-[#0c0c0c]",
                settings.pageGap && "rounded-md border border-white/8",
            )}
            focusedClassName={cn(
                settings.pageGap
                    ? "border-brand-400 bg-white/5"
                    : "border border-brand-400/60",
            )}
            {...(isFirst && chromeBackTag !== null ? { nextFocusUp: chromeBackTag } : {})}
            {...(isLast ? { nextFocusDown: chromeBackTag ?? undefined } : {})}
            style={[
                { width: imageWidth, height: imageHeight },
                settings.pageGap && settings.pageGapShadow ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 8,
                } : undefined,
            ]}
        >
            <Image
                source={{ uri: page.uri }}
                style={{ width: imageWidth, height: imageHeight }}
                contentFit="contain"
                transition={120}
                recyclingKey={`${page.index}-${page.uri}`}
            />
        </TvFocusablePressable>
    )
}

// ─── Reader state card (loading / error / unavailable) ──────────────────────
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
