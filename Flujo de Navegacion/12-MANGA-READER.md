# Manga Reader - Full-Screen Reading

**Files**:
- `src/components/features/manga/reader/manga-reader-screen.tsx` → `MangaReaderScreen`
- `src/components/features/manga/reader/manga-reader-layout.ts` → Layout logic
- `src/components/features/manga/reader/manga-reader-state.ts` → Reader state
- `src/components/features/manga/reader/manga-reader-settings-sheet.tsx` → Settings Sheet
- `src/components/features/manga/reader/manga-reader-zoom-surface.tsx` → Zoom/Pan surface
- `src/components/features/manga/reader/use-manga-reader-android-long-strip.ts` → Long strip mode

---

## Component Tree

```
MangaReaderScreen
├── View (flex-1, bg-black, onKeyDown for TV)
│   ├── MangaReaderZoomSurface (gesture handling)
│   │   └── Chapter Pages
│   │       └── PageImage[]
│   ├── Manga Reader Header (auto-hide)
│   │   ├── Back Button (TvFocusablePressable on TV)
│   │   ├── Chapter Title
│   │   ├── Prev/Next Page Buttons (TvFocusablePressable on TV)
│   │   └── Settings Button (TvFocusablePressable on TV)
│   ├── Manga Reader Footer (auto-hide)
│   │   ├── Prev Chapter (TvFocusablePressable on TV)
│   │   ├── PageScrubber (stepper +/- on TV, slider on mobile)
│   │   └── Next Chapter / Done (TvFocusablePressable on TV)
│   └── MangaReaderSettingsSheet (Bottom Sheet) — TV focus pending
```

---

## DPAD Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  MangaReaderScreen (Full-Screen)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [← Back]     Chapter 45: Title      [◀] [▶] [⚙]      │   │
│  │  Controls visible:                                      │   │
│  │    ←/→ nav between header buttons                       │   │
│  │    OK activates button                                   │   │
│  │  Controls hidden (focus on root):                       │   │
│  │    ← previous page   → next page                        │   │
│  │    OK toggle controls                                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ┌───────────────────────────────────────────────────┐   │   │
│  │  │            MANGA PAGE                             │   │   │
│  │  │                                                   │   │   │
│  │  │  Controls hidden:                                 │   │   │
│  │  │    ← → pages via onKeyDown root handler           │   │   │
│  │  │    OK: Toggle controls visibility                 │   │   │
│  │  └───────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  [Prev]      [–]  Page 12/24  [+]      [Next/Done]     │   │
│  │  Controls visible:                                      │   │
│  │    ←/→ nav between footer buttons                       │   │
│  │    OK activates button                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Focusable Components

### 1. Header Controls (TvFocusablePressable on TV)
```tsx
TV: TvFocusablePressable with scale animation, focus ring
Mobile: Pressable

  - Back Button: OK → Close reader, return to entry screen
  - Prev Page: OK → goToPreviousSpread()
  - Next Page: OK → goToNextSpread()
  - Settings Button: OK → Open MangaReaderSettingsSheet
```

### 2. Root View (onKeyDown for TV)
```tsx
// TV onKeyDown handler (only when controls hidden):
  - ArrowLeft / Left: goToPreviousSpread()
  - ArrowRight / Right: goToNextSpread()
  - Enter / Select / Space: toggleControlsVisible()
```

### 3. Footer Controls (TvFocusablePressable on TV)
```tsx
TV: TvFocusablePressable with focus ring
Mobile: Pressable

  - Prev Chapter: OK → navigateToChapter(previousChapter)
  - PageScrubber (stepper): OK → - / + spread index
  - Next Chapter / Done: OK → navigateToChapter(nextChapter) or router.back()
```

### 4. PageScrubber
```tsx
TV: Stepper buttons (remove / add) + page label
Mobile: Slider (touch/drag) + page label with expand/collapse
```

### 5. MangaReaderSettingsSheet (TV focus — pending)
```tsx
SeaBottomSheet:
  - Reading Mode selector (L-to-R, R-to-L, Vertical)
  - Zoom Level slider
  - Brightness slider
  - Fit to Width toggle
  - TV focus: Pressable → TvFocusablePressable pending
```

---

## Reading Modes

| Mode | Description | DPAD LEFT/RIGHT |
|------|-------------|-----------------|
| Left-to-Right | Pages advance left → right | RIGHT = next, LEFT = prev |
| Right-to-Left | Pages advance right → left | LEFT = next, RIGHT = prev |
| Vertical/Long Strip | Pages scroll vertically | UP = prev, DOWN = next (via key handler) |

---

## State Management

| Atom/Hook | Purpose |
|-----------|---------|
| `manga-reader-state.ts` | Current page, zoom, reading mode |
| `manga-reader-layout.ts` | Page layout calculations |
| `manga-reader-zoom-surface.tsx` | Gesture state, pan/zoom values |

---

## Navigation Transitions

```
MangaReaderScreen
│
├── Back Button OK
│   └── → Return to MangaEntryScreen
│
├── Settings Button OK
│   └── → MangaReaderSettingsSheet (Bottom Sheet)
│
├── Next Chapter (end of chapter)
│   └── → Load next chapter (no navigation)
│
├── Root onKeyDown → LEFT/RIGHT
│   └── → goToPreviousSpread / goToNextSpread
│
├── Root onKeyDown → Enter/Select
│   └── → Toggle controls visibility
│
└── BACK (hardware)
    └── → Return to MangaEntryScreen
```
