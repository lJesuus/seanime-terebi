# Discover Search - Search Functionality

**File**: `app/(app)/(tabs)/discover/search.tsx`
**Component**: `SearchScreen` (default export)

---

## Component Tree

```
SearchScreen
├── SafeView (flex-1, bg-background)
│   ├── Header Section (border-b)
│   │   ├── Row 1: Back Button + LibrarySearchBar
│   │   │   ├── Pressable (Back Button - focusable)
│   │   │   └── LibrarySearchBar (focusable input)
│   │   └── Row 2: DiscoverModeToggle + FilterButton
│   │       ├── DiscoverModeToggle (Anime/Manga - focusable)
│   │       └── FilterButton (focusable, shows active count)
│   ├── FlatList (Grid: 3 columns)
│   │   └── MediaEntryCard[] (focusable cards)
│   │       ├── Cover Image
│   │       ├── Title
│   │       ├── Score
│   │       └── Format Badge
│   ├── EmptyState (when no results)
│   └── SearchFilterSheet (Bottom Sheet)
│       ├── Format Chips (TV, Movie, OVA, ONA, Special)
│       ├── Status Chips (Releasing, Finished, Not Yet Aired)
│       ├── Genre Chips (Action, Comedy, Drama, etc.)
│       ├── Year Selector
│       ├── Sort Selector
│       └── Apply Button (focusable)
```

---

## DPAD Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  SearchScreen                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [← Back]  ┌─────────────────────────────────────┐  │   │
│  │            │  🔍 Search anime...                   │  │   │
│  │            └─────────────────────────────────────┘  │   │
│  │  ◄── DPAD LEFT/RIGHT between back and search ──►    │   │
│  │  OK: Focus search input (on-screen keyboard)        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  [Anime] [Manga]                    [⚙ Filters (3)] │   │
│  │  ◄── DPAD LEFT/RIGHT between mode toggle and filter │   │
│  │  OK: Switch mode / Open filter sheet                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                       │   │
│  │  │ Card │  │ Card │  │ Card │  ← Row 1              │   │
│  │  └──────┘  └──────┘  └──────┘                       │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                       │   │
│  │  │ Card │  │ Card │  │ Card │  ← Row 2              │   │
│  │  └──────┘  └──────┘  └──────┘                       │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                       │   │
│  │  │ Card │  │ Card │  │ Card │  ← Row 3              │   │
│  │  └──────┘  └──────┘  └──────┘                       │   │
│  │                                                      │   │
│  │  ◄── DPAD LEFT/RIGHT: navigate cards in row ──►     │   │
│  │  ◄── DPAD UP/DOWN: navigate between rows ──►        │   │
│  │  OK: Open anime/manga entry                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Focusable Components

### 1. Back Button
```tsx
Pressable:
  - OK → router.back() (return to Discover)
```

### 2. LibrarySearchBar
```tsx
TextInput focusable={isTV}:
  - OK → Focus input (show on-screen keyboard)
  - Text input with debounce (350ms)
  - Placeholder: "Search anime..." / "Search manga..."
```

### 3. DiscoverModeToggle
```tsx
TogglePill focusable={isTV}:
  - Focus: Scale 1.05x, border-brand-400
  - DPAD LEFT/RIGHT: Switch between Anime/Manga pills
  - OK → Switch search type
```

### 4. FilterButton
```tsx
Pressable focusable={isTV}:
  - Badge shows active filter count
  - OK → Open SearchFilterSheet
```

### 5. MediaEntryCard (Grid)
```tsx
Pressable focusable={isTV}:
  - Focus: Scale 1.05x, border-brand-400
  - DPAD LEFT/RIGHT: Navigate cards in row
  - DPAD UP/DOWN: Navigate between rows
  - OK → router.push(/(app)/entry/[type]/[id])
```

---

## Search Behavior

### Debounced Search
```typescript
const [titleInput, setTitleInput] = React.useState(params.title ?? "")
const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

function handleTitleChange(text: string) {
  setTitleInput(text)
  if (debounceRef.current) clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    setParams(p => ({ ...p, title: text.trim() || null }))
  }, 350)
}
```

### Infinite Scroll
```typescript
const handleLoadMore = () => {
  if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
    activeQuery.fetchNextPage()
  }
}
```

### Grid Layout
```typescript
const NUM_COLUMNS = 3
const H_PADDING = 14
const GAP = 10
const CARD_WIDTH = (SCREEN_WIDTH - (NUM_COLUMNS-1) * GAP - 2 * H_PADDING) / NUM_COLUMNS
```

---

## SearchFilterSheet (Bottom Sheet)

```
┌─────────────────────────────────────────────────────┐
│  Search Filters                    [X Close]         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Format:                                             │
│  [TV] [Movie] [OVA] [ONA] [Special] [Music]         │
│  ◄── DPAD LEFT/RIGHT: toggle format chips ──►       │
│                                                      │
│  Status:                                             │
│  [Releasing] [Finished] [Not Yet Aired] [Cancelled]  │
│  ◄── DPAD LEFT/RIGHT: toggle status chips ──►       │
│                                                      │
│  Genre:                                              │
│  [Action] [Adventure] [Comedy] [Drama] [Fantasy]    │
│  [Horror] [Mystery] [Romance] [Sci-Fi] [Slice]      │
│  ◄── DPAD LEFT/RIGHT: toggle genre chips ──►        │
│                                                      │
│  Year:                                               │
│  [◀] 2024 [▶]                                        │
│  ◄── DPAD LEFT/RIGHT: adjust year ──►               │
│                                                      │
│  Sort:                                               │
│  [Score ▼] [Title ▼] [Date ▼]                       │
│  ◄── DPAD LEFT/RIGHT: change sort ──►               │
│                                                      │
│  [Apply Filters]                                     │
│  OK: Apply filters and close                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## State Management

| Atom | Purpose |
|------|---------|
| `searchParamsAtom` (Jotai) | Search filters and query state |
| `DEFAULT_SEARCH_PARAMS` | Initial filter values |

### SearchParams Structure
```typescript
type SearchParams = {
  type: "anime" | "manga"
  title: string | null
  format: string[]
  status: string[]
  genre: string[]
  year: number | null
  sort: string
}
```

---

## Navigation Transitions

```
SearchScreen
│
├── Back Button OK
│   └── → Return to Discover Screen
│
├── MediaEntryCard OK
│   └── → /(app)/entry/anime/[id] (AnimeEntryScreen)
│   └── → /(app)/entry/manga/[id] (MangaEntryScreen)
│
├── FilterButton OK
│   └── → SearchFilterSheet (Bottom Sheet)
│       └── Apply Filters → Close sheet, update results
│
├── Mode Toggle OK
│   └── → Switch Anime/Manga (reset filters, keep title)
│
└── SearchBar Focus
    └── → On-screen keyboard (text input)
```