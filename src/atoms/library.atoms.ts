import { atom } from "jotai"

/**
 * Number of focusable elements in the library shelves (Continue Watching,
 * Downloaded cards, horizontal media card lists) that currently have TV
 * focus. Atomic counter so concurrent focus / blur events stay balanced.
 */
export const __libraryShelvesFocusCountAtom = atom<number>(0)

/**
 * True iff at least one focusable element in the library shelves has TV
 * focus. Read by the hero carousel to know when to suppress the "active"
 * button highlight because the user has moved focus onto a media card.
 */
export const __libraryShelvesFocusedAtom = atom<boolean>((get) =>
    get(__libraryShelvesFocusCountAtom) > 0,
)

/**
 * Stores the mediaId and episodeNumber of the currently focused Continue
 * Watching episode card. Set by ContinueWatching/EpisodeCardList on focus,
 * read by LibraryHeroCarousel to display the focused anime's info in the
 * hero banner when the user navigates to the Continue Watching row.
 */
export const __focusedContinueWatchingEpisodeAtom = atom<{ mediaId: number, episodeNumber: number } | null>(null)

/**
 * Native React tag of the Anime pill in the Discover tab's mode toggle.
 * Written by `TogglePill` after its inner `TvFocusablePressable` resolves
 * a nodeHandle. Read by the hero carousel so DPAD-UP from a carousel
 * item jumps directly to the active mode pill instead of relying on the
 * broken native spatial search (which gets trapped inside the horizontal
 * `pagingEnabled` ScrollView on Android TV).
 */
export const __discoverAnimePillTagAtom = atom<number | null>(null)

/**
 * Native React tag of the Manga pill in the Discover tab's mode toggle.
 * Same role as {@link __discoverAnimePillTagAtom}, kept in a separate
 * atom so the Anime and Manga pills can write their tags independently
 * without racing over the same slot.
 */
export const __discoverMangaPillTagAtom = atom<number | null>(null)

/**
 * Native React tag of the first focusable card in section 0 of the
 * Discover tab's section FlatList ("Trending Right Now" for anime,
 * "Trending Manga" for manga). Written by the section components when
 * the first `<MediaEntryCard>` resolves a nodeHandle. Read by the hero
 * carousel so DPAD-DOWN from a carousel item lands on the first card
 * of the section row, bypassing the spatial neighbour search that fails
 * to escape the carousel's paging horizontal ScrollView.
 */
export const __discoverFirstCardTagAtom = atom<number | null>(null)

/**
 * Native React tag of the first focusable PAGE in the manga reader.
 * Written by the `ReaderPageImage` whose `index === 0` after its
 * `TvFocusablePressable` resolves a nodeHandle via a callback ref.
 * Read by every chrome button to set `nextFocusDown`, so DPAD-DOWN from
 * any header button lands on page 1 and Android TV's native spatial
 * navigation walks down the chain from there.
 *
 * The middle pages don't register their own tags here: native
 * spatial navigation handles DOWN/UP traversal between adjacent
 * sibling focusables inside the same ScrollView automatically.
 */
export const __mangaReaderFirstPageTagAtom = atom<number | null>(null)

/**
 * Native React tag of the last focusable PAGE in the manga reader.
 * Used as `nextFocusDown` on that page so DPAD-DOWN cycles back to
 * chrome BACK. Lets the focus loop stay self-contained inside the
 * reader and avoids leaving the user "stuck at the end".
 */
export const __mangaReaderLastPageTagAtom = atom<number | null>(null)

/**
 * Native React tag of the chrome's BACK button. Used as `nextFocusUp`
 * on the manga reader's first page so DPAD-UP from page 1 returns
 * focus to the header anchor. The other chrome buttons (prev/next/
 * settings) don't expose their own atom — they read
 * `__mangaReaderFirstPageTagAtom` for `nextFocusDown` and the BACK
 * button owns the single upward anchor into the chain.
 */
export const __mangaReaderChromeBackTagAtom = atom<number | null>(null)
