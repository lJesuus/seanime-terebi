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
