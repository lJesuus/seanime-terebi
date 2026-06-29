import type { MangaReaderPage } from "@/components/features/manga/reader/manga-reader-utils"
import { Image } from "expo-image"

export const DEFAULT_READER_PAGE_ASPECT_RATIO = 0.7

export function getReaderPageAspectRatio(page: MangaReaderPage): number {
    if (page.width && page.height) {
        return page.width / page.height
    }

    // this keeps the first paint stable when a source skips page dimensions
    return DEFAULT_READER_PAGE_ASPECT_RATIO
}

export function getReaderImageSize({
    aspectRatio,
    screenWidth,
    screenHeight,
    mode,
    fitToWidth = true,
}: {
    aspectRatio: number
    screenWidth: number
    screenHeight: number
    /**
     * "vertical" = LONG_STRIP / webtoon reader; "horizontal" = bound-to-viewport page.
     * Optional, defaults to "vertical".
     */
    mode?: "vertical" | "horizontal"
    /**
     * Only meaningful in `vertical` mode. When true (default) the page
     * stretches to fill the screen width so every column is readable at
     * TV-distance — the page may overflow top/bottom and require scrolling,
     * which is the desired long-strip behaviour.
     *
     * When false, the page scales into a contain-in-screenHeight box: the
     * entire page is visible at once, narrower than the screen and centred.
     * Useful for letterboxing printed pages that aren't tall enough to be
     * worth scrolling.
     */
    fitToWidth?: boolean
}) {
    const boundedWidth = Math.max(1, screenWidth)
    const boundedHeight = Math.max(1, screenHeight)
    const boundedAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : DEFAULT_READER_PAGE_ASPECT_RATIO

    // Long strip ("vertical") pages. Fit-to-width is the default for TV so
    // each column is large enough to read at distance; the alternative
    // falls through to the contain-in-viewport logic below so the page is
    // fully visible without scrolling.
    if (mode === "vertical" && fitToWidth) {
        return {
            width: boundedWidth,
            height: boundedWidth / boundedAspectRatio,
        }
    }

    // binding the page to the viewport (or fitToWidth=false on vertical):
    // whichever dimension hits first wins so the page never overflows.
    const widthLimitedHeight = boundedWidth / boundedAspectRatio

    if (widthLimitedHeight <= boundedHeight) {
        return {
            width: boundedWidth,
            height: widthLimitedHeight,
        }
    }

    return {
        width: boundedHeight * boundedAspectRatio,
        height: boundedHeight,
    }
}

export async function loadReaderPageAspectRatio(page: MangaReaderPage): Promise<number | null> {
    if (page.width && page.height) {
        return page.width / page.height
    }

    try {
        // small decode is enough because we only need the shape for layout
        const image = await Image.loadAsync(page.uri, { maxWidth: 64 })
        const aspectRatio = image.width / image.height
        return Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : null
    }
    catch {
        return null
    }
}
