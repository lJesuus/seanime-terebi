# Manga Entry Screen - Media Detail

**Files**:
- `app/(app)/entry/manga/[id]/index.tsx` → `Screen` (default export)
- `src/components/features/manga/manga-entry-screen.tsx` → `MangaEntryScreen`
- `src/components/features/manga/manga-entry-view-switcher.tsx` → `MangaEntryView`, `MangaEntryViewSwitcher`
- `src/components/features/manga/manga-entry-action-bar.tsx` → `MangaEntryActionBar`
- `src/components/features/manga/manga-entry-chapters-view.tsx` → `MangaEntryChaptersView`
- `src/components/features/manga/manga-entry-info-view.tsx` → `MangaEntryInfoView`
- `src/components/features/manga/manga-entry-downloaded-view.tsx` → `MangaEntryDownloadedView`

---

## Component Tree

```
Screen (app/entry/manga/[id])
└── MangaEntryScreen
    ├── Animated.View (flex-1, bg-background)
    │   ├── MediaEntryHeaderBackground (blur backdrop)
    │   ├── View (flex-1, currentView switch)
    │   │   ├── Chapters View (mountedViews.chapters)
    │   │   │   └── Reanimated.ScrollView
    │   │   │       ├── MediaEntryHeaderContent
    │   │   │       │   ├── Manga Cover Image
    │   │   │       │   ├── Title (no focusable)
    │   │   │       │   ├── Description (3 lines)
    │   │   │       │   └── Meta Info (score, chapters, etc.)
    │   │   │       ├── MangaEntryViewSwitcher (top tab bar)
    │   │   │       │   └── TvFocusablePressable (TV) / Pressable (mobile)
    │   │   │       ├── OfflineBanner
    │   │   │       ├── MangaEntryPrimaryContent
    │   │   │       │   ├── MangaEntryActionBar
    │   │   │       │   │   ├── Provider Selector (focusable)
    │   │   │       │   │   ├── Add to List (focusable)
    │   │   │       │   │   ├── Status Selector (focusable)
    │   │   │       │   │   └── Score Selector (focusable)
    │   │   │       │   └── MangaEntryChaptersView
    │   │   │       │       ├── Chapter Filter/Search
    │   │   │       │       └── ChapterCardList
    │   │   │       │           └── ChapterCard[] (focusable)
    │   │   │       └── Info Content (footer)
    │   │   │           └── MangaEntryInfoView
    │   │   │               ├── Description
    │   │   │               ├── Characters
    │   │   │               ├── Relations
    │   │   │               └── Recommendations
    │   │   │
    │   │   └── Downloaded View (mountedViews.downloaded)
    │   │       └── MediaEntryScrollShell
    │   │           ├── MangaEntryViewSwitcher (top tab bar)
    │   │           ├── MangaEntryDownloadedView
    │   │           │   └── DownloadedChapterCard[]
    │   │           └── Info Content (footer)
    │   │               └── MangaEntryInfoView
```

---

## View Switcher (2 Tabs)

| Index | View Name | Icon | Label | Content |
|-------|-----------|------|-------|---------|
| 0 | `chapters` | `list-outline` | Chapters | Chapter list, provider, download |
| 1 | `downloaded` | `download-outline` | Downloads | Downloaded chapters for offline |

---

## DPAD Navigation Flow

```
┌────────────────────────────────────────────────────────────────┐
│  MangaEntryScreen                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Blur Background Image]                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │  Cover Image    │  Title                          │  │   │
│  │  │                 │  Description                    │  │   │
│  │  │                 │  Airing Info + Score + Genres   │  │   │
│  │  │                 │  [Add to List] [Chapters]       │  │   │
│  │  │                 │            ACTION               │  │   │
│  │  │                 │   ◄── DPAD LEFT/RIGHT ──►       │  │   │
│  │  │                 │     OK to activate action       │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │  VIEW SWITCHER (centered, top tab bar)            │  │   │
│  │  │  [Chapters] [Downloads]                           │  │   │
│  │  │  ◄── DPAD LEFT/RIGHT to switch view ──►           │  │   │
│  │  │  OK to select view                                │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │  CHAPTER LIST                                     │  │   │
│  │  │                                                   │  │   │
│  │  │  ┌─────────────────────────────────────────────┐  │  │   │
│  │  │  │ [Search: Filter chapters...]                │  │  │   │
│  │  │  │ Ch 45 ▸ Title of Chapter      [📥] [✓]      │  │  │   │
│  │  │  │ Ch 44 ▸ Title of Chapter      [📥] [✓]      │  │  │   │
│  │  │  │ ...                                         │  │  │   │
│  │  │  │ ◄── DPAD UP/DOWN: navigate chapters ──►     │  │  │   │
│  │  │  │ OK to open chapter in reader                │  │  │   │
│  │  │  └─────────────────────────────────────────────┘  │  │   │
│  │  ├───────────────────────────────────────────────────┤  │   │
│  │  │  ┌─────────────────────────────────────────────┐  │  │   │
│  │  │  │  INFO CONTENT (footer)                      │  │  │   │
│  │  │  │  Description                                │  │  │   │
│  │  │  │  Characters                                 │  │  │   │
│  │  │  │  Relations                                  │  │  │   │
│  │  │  │  Recommendations                            │  │  │   │
│  │  │  └─────────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

- **Title**: not focusable (always plain Text)
- **View Switcher**: centered top tab bar (not absolute bottom pill)
- **Info Content**: embedded as footer in every view
- **TV focus**: `TvFocusablePressable` with scale animation, `nextFocusUp`/`nextFocusDown`

---

## Focusable Components

### 1. MediaEntryHeaderContent → Title
```tsx
Not focusable (plain Text).

Focusable buttons:
  - Provider Selector: OK → Open provider dropdown
  - Add to List: OK → Open list selector
  - Status: OK → Open status dropdown
  - Score: OK → Open score selector
```

### 2. MangaEntryViewSwitcher
```tsx
TV: TvFocusablePressable with scale animation, border highlight
Mobile: Pressable with active state

  - Focus: Scale animation, border highlight
  - DPAD LEFT/RIGHT: Navigate view tabs
  - OK → Switch view
  - nextFocusUp / nextFocusDown props for focus chain
  - hiddenViews prop to conditionally hide tabs
```

### 3. ChapterCardList → ChapterCard
```tsx
Pressable focusable={isTV}:
  - Focus: Scale animation, border highlight
  - DPAD UP/DOWN: Navigate chapter list
  - OK → Open chapter in MangaReader
  - Selection Mode: OK → Toggle chapter selection
  - Download Button: OK → Download chapter
```

### 4. Info Content (embedded footer)
```tsx
Components within MangaEntryInfoView:
  - Description (Text, not focusable)
  - Characters (TvFocusablePressable per row — pending)
  - Relations (MediaEntryCard focusable — pending)
  - Recommendations (HorizontalMediaCardList focusable — pending)
```

---

## Selection Mode

```typescript
// Chapter selection for batch download
const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())
const selectionMode = selectedChapterIds.size > 0

// Toggle chapter selection
const toggleChapter = useCallback((chapterId: string) => {
  setSelectedChapterIds(prev => {
    const next = new Set(prev)
    if (next.has(chapterId)) next.delete(chapterId)
    else next.add(chapterId)
    return next
  })
}, [])
```

---

## Navigation Transitions

```
MangaEntryScreen
│
├── ActionBar "Add to List" OK
│   └── → List Selector Modal
│
├── ActionBar "Status" OK
│   └── → Status Dropdown
│
├── ActionBar "Score" OK
│   └── → Score Selector
│
├── ActionBar "Provider" OK
│   └── → Provider Dropdown
│
├── ViewSwitcher OK
│   └── → Switch view (no navigation)
│
├── ChapterCard OK (Chapters View)
│   └── → Manga Reader Screen
│       └── Full-screen manga reading experience
│
├── DownloadedChapterCard OK (Downloaded View)
│   └── → Manga Reader Screen
│
└── BACK
    └── → Return to previous screen (Manga Library/Search/Discover)
```
