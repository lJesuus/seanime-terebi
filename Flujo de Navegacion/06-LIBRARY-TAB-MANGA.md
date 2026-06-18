# Library Tab - Manga Library

**File**: `app/(app)/(tabs)/(manga)/index.tsx`
**Component**: `MangaLibraryScreen` (default export)

---

## Component Tree

```
MangaLibraryScreen
├── View (flex-1, bg-background)
│   ├── OfflineBanner (if disconnected)
│   ├── TabFadeView
│   │   └── View (flex-1)
│   │       ├── MediaEntryGrid (when searching)
│   │       └── Animated.FlatList (when not searching)
│   │           ├── ListHeaderComponent: LibraryHeroCarousel
│   │           │   └── Hero items (manga covers - focusable)
│   │           ├── RenderItem: HorizontalMediaCardList
│   │           │   ├── "Currently reading"
│   │           │   ├── "Paused"
│   │           │   ├── "Planning"
│   │           │   ├── "Completed"
│   │           │   └── "Dropped"
│   │           │       └── MediaEntryCard[] (focusable)
│   │           └── ListFooterComponent: DownloadedMangaList
│   │  
```

---

## DPAD Navigation Flow

```
┌────────────────────────────────────────────────────────────┐
│  MangaLibraryScreen                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LibraryHeroCarousel (currently reading manga)      │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  [Ch 45 - One Piece] [Ch 12 - JJK] ...        │  │   │
│  │  │  ◄── DPAD LEFT/RIGHT ──►                      │  │   │
│  │  │  OK to open Entry Screen                      │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Currently reading (HorizontalMediaCardList)        │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  [Card1] [Card2] [Card3] ...                  │  │   │
│  │  │  ◄── DPAD LEFT/RIGHT ──►                      │  │   │
│  │  │  OK to open manga entry                       │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Paused, Planning, Completed, Dropped               │   │
│  │  (HorizontalMediaCardList per status)               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  DownloadedMangaList (footer)                       │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  📥 Downloaded Manga                          │  │   │
│  │  │  [Item1] [Item2] [Item3] ...                  │  │   │
│  │  │  DPAD LEFT/RIGHT                              │  │   │
│  │  │  OK to open manga entry                       │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## Focusable Components

### 1. LibraryHeroCarousel (manga mode)
- **DPAD LEFT/RIGHT**: Navigate reading progress items
- **OK**: Open manga entry screen

### 2. HorizontalMediaCardList → MediaEntryCard
- **DPAD LEFT/RIGHT**: Navigate cards within shelf
- **DPAD UP/DOWN**: Move between shelf sections
- **OK**: Open manga entry screen (`/(app)/entry/manga/[id]`)

### 3. DownloadedMangaList
- **DPAD LEFT/RIGHT**: Navigate downloaded items
- **OK**: Open manga entry screen

---

## Navigation Transitions

```
MangaLibraryScreen
│
├── MediaEntryCard OK
│   └── → /(app)/entry/manga/[id] (MangaEntryScreen)
│
├── LibraryHeroCarousel item OK
│   └── → /(app)/entry/manga/[id]?initialView=chapters
│
└── DownloadedMangaList item OK
    └── → /(app)/entry/manga/[id]?initialView=downloaded
```
