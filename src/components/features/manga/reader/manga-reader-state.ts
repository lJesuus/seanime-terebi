import { createAtomStorage } from "@/atoms/storage"
import { useAtom } from "jotai/react"
import { atomWithStorage } from "jotai/utils"
import * as React from "react"

export const MANGA_READING_DIRECTION = {
    LTR: "ltr",
    RTL: "rtl",
} as const

export type MangaReadingDirection = typeof MANGA_READING_DIRECTION[keyof typeof MANGA_READING_DIRECTION]

export const MANGA_READING_MODE = {
    LONG_STRIP: "longStrip",
    DOUBLE_PAGE: "doublePage",
} as const

export type MangaReadingMode = typeof MANGA_READING_MODE[keyof typeof MANGA_READING_MODE]

// TV-only reader settings. The previous `zoomLevel` field is gone —
// per-page image sizing is fully driven by the layout helper and the
// Fit-to-Width toggle. Stored payloads from older sessions that still
// mention that key are silently dropped on merge: the spread
// `{ ...defaults, ...store[mediaKey] }` only fills in keys that exist
// on `MangaReaderSettings`, so unknown keys are quietly ignored.
export type MangaReaderSettings = {
    readingDirection: MangaReadingDirection
    readingMode: MangaReadingMode
    pageGap: boolean
    pageGapAmount: number
    pageGapShadow: boolean
    showProgressBar: boolean
    brightness: number
    fitToWidth: boolean
}

type MangaReaderPosition = {
    pageIndex: number
    updatedAt: number
}

const mangaReaderSettingsAtom = atomWithStorage<Record<string, Partial<MangaReaderSettings>>>(
    "sea-mobile-manga-reader-settings",
    {},
    createAtomStorage<Record<string, Partial<MangaReaderSettings>>>(),
    { getOnInit: true },
)

const mangaReaderPositionsAtom = atomWithStorage<Record<string, MangaReaderPosition>>(
    "sea-mobile-manga-positions",
    {},
    createAtomStorage<Record<string, MangaReaderPosition>>(),
    { getOnInit: true },
)

export function getDefaultMangaReaderSettings(): MangaReaderSettings {
    return {
        readingDirection: MANGA_READING_DIRECTION.RTL,
        readingMode: MANGA_READING_MODE.LONG_STRIP,
        pageGap: true,
        pageGapAmount: 10,
        pageGapShadow: true,
        showProgressBar: true,
        brightness: 1,
        fitToWidth: true,
    }
}

export function useMangaReaderSettings(mediaId: number | undefined) {
    const [store, setStore] = useAtom(mangaReaderSettingsAtom)
    const mediaKey = String(mediaId ?? "")
    const defaults = React.useMemo(() => getDefaultMangaReaderSettings(), [])

    const settings = React.useMemo<MangaReaderSettings>(() => {
        if (!mediaId) return defaults
        return {
            ...defaults,
            ...store[mediaKey],
        }
    }, [defaults, mediaId, mediaKey, store])

    const setSetting = React.useCallback(<Key extends keyof MangaReaderSettings>(key: Key, value: MangaReaderSettings[Key]) => {
        if (!mediaId) return

        setStore(prev => ({
            ...prev,
            [mediaKey]: {
                ...defaults,
                ...prev[mediaKey],
                [key]: value,
            },
        }))
    }, [defaults, mediaId, mediaKey, setStore])

    const resetSettings = React.useCallback(() => {
        if (!mediaId) return

        setStore(prev => ({
            ...prev,
            [mediaKey]: defaults,
        }))
    }, [defaults, mediaId, mediaKey, setStore])

    return {
        settings,
        setSetting,
        resetSettings,
        defaults,
    }
}

export function useMangaReaderPosition(mediaId: number | undefined, provider: string | undefined, chapterId: string | undefined) {
    const [store, setStore] = useAtom(mangaReaderPositionsAtom)

    const positionKey = React.useMemo(() => {
        if (!mediaId || !provider || !chapterId) return null
        return `${String(mediaId)}:${provider}:${chapterId}`
    }, [chapterId, mediaId, provider])

    const pageIndex = positionKey ? store[positionKey]?.pageIndex ?? 0 : 0

    const setPageIndex = React.useCallback((nextPageIndex: number) => {
        if (!positionKey) return

        setStore(prev => ({
            ...prev,
            [positionKey]: {
                pageIndex: Math.max(0, nextPageIndex),
                updatedAt: Date.now(),
            },
        }))
    }, [positionKey, setStore])

    return {
        pageIndex,
        setPageIndex,
    }
}
