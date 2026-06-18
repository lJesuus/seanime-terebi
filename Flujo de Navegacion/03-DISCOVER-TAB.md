# Discover Tab - Content Discovery

**File**: `app/(app)/(tabs)/discover/index.tsx`
**Component**: `DiscoverScreen` (default export)

---

## Component Tree

```
DiscoverScreen
├── View (flex-1, bg-background)
│   ├── OfflineBanner (if disconnected)
│   ├── TabFadeView (fade animation on tab switch)
│ 	├──	ListHeaderComponent: DiscoverListHeader
│ 	│ 	├── [1] View (flex-row)
│ 	│   │	├── DiscoverModeToggle (Anime/Manga pills) 
│ 	│   │	└── DiscoverSearchRow (Search button)
│   │   ├── DiscoverHeroCarouselBackdrop (animated backdrop)
│   │   ├── DiscoverHeroCarouselInteractionLayer (hero carousel - focusable)
│   │   └── Animated.FlatList (vertical sections)
│   │       ├── ListHeaderComponent: DiscoverListHeader
│   │       │   ├── DiscoverModeToggle (Anime/Manga pills)
│   │       │   └── DiscoverSearchRow (Search button)
│   │       └── RenderItem: DiscoverHorizontalSection[]
│   │           ├── MediaGenreSelector (for Trending section)
│   │           └── HorizontalMediaCardList (horizontal scroll)
│   │               └── MediaEntryCard[] (focusable cards)
│   └── (Search Modal: discover/search.tsx)
```

---

## DPAD Navigation Flow

### Main Discover Screen (Vertical FlatList)

```
DPAD UP/DOWN        → Scroll through sections (FlatList)
DPAD LEFT/RIGHT     → Navigate within HorizontalMediaCardList
DPAD OK/ENTER       → On MediaEntryCard: Navigate to Entry Screen
                      On Search Row: Open Search Screen
                      On Genre Selector: Open dropdown
```

### Section Structure (DISCOVER_ANIME_SECTION_ITEMS)

| Index | Section Key | Title | Focusable Elements |
|-------|-------------|-------|-------------------|
| 0 | Header Tabs | - | Mode Toggle Anime Manga, Search |
| 1 | Hero Carousel | - | Hero items (auto-scroll + manual), Entry Description, Button Watch, Buttin Add to Planning List |
| 2 | Trending | "Trending Right Now" | Genre Selector, Media Cards |
| 3 | Current Season | "Top of [Season]" | Media Cards |
| 4 | Past Season | "Best of [Season]" | Media Cards |
| 5 | Upcoming | "Coming Soon" | Media Cards |
| 6 | Movies | "Trending Movies" | Media Cards |
| 7 | Missed | "You Might Have Missed" | Media Cards |

### Manga Mode Sections (DISCOVER_MANGA_SECTION_ITEMS)

| Index | Section Key | Title |
|-------|-------------|-------|
| 0 | jp | "Trending Manga" |
| 1 | kr | "Trending Manhwa" |
| 2 | cn | "Trending Manhua" |

---

## Focusable Components

### 1. DiscoverModeToggle (lines 140-162)
```tsx
<TogglePill focusable={isTV} onFocus/onBlur animated scale>
  // DPAD LEFT/RIGHT between Anime/Manga pills
  // OK to switch mode
</TogglePill>
```

### 2. DiscoverSearchRow (lines 219-250)
```tsx
<Pressable focusable={isTV} onPress={router.push('/discover/search')}>
  // DPAD OK to open Search Screen
</Pressable>
```

### 3. MediaGenreSelector (Trending section)
- Dropdown for genre filtering
- Focusable when expanded

### 4. HorizontalMediaCardList → MediaEntryCard
```tsx
// MediaEntryCard (shared component)
<Pressable focusable={isTV} onFocus/onBlur onPress={router.push('/entry/...')}>
  // DPAD LEFT/RIGHT to navigate cards horizontally
  // DPAD OK to open Entry Screen
  // Scale animation on focus (1.05x)
</Pressable>
```

### 5. DiscoverHeroCarouselInteractionLayer
- Auto-scrolls when focused
- DPAD LEFT/RIGHT to navigate hero items
- DPAD OK to open Entry Screen

---

## Search Screen Navigation

**File**: `app/(app)/(tabs)/discover/search.tsx`
**Component**: `SearchScreen`

```
SearchScreen
├── Header: Back Button + LibrarySearchBar + Mode Toggle + Filter Button
├── FlatList (Grid: 3 columns)
│   └── MediaEntryCard[] (focusable)
└── SearchFilterSheet (Bottom Sheet)
    ├── Filter Chips (Source, Language, Format)
    └── Wyzie API Key Input
```

### DPAD Flow (Search)
```
DPAD UP/DOWN        → Navigate grid rows
DPAD LEFT/RIGHT     → Navigate grid columns
DPAD OK             → Open Entry Screen
BACK                → Return to Discover
Filter Button       → Open SearchFilterSheet (Bottom Sheet)
    DPAD in Sheet   → Navigate filter options
    OK              → Apply filters
```

---

## Key Focus Behaviors

| Component | Focus Style | Navigation |
|-----------|-------------|------------|
| `TogglePill` | Scale 1.05x, border-brand-400 | LEFT/RIGHT between pills |
| `DiscoverSearchRow` | Scale 1.1x, bg-white/10 | OK → Search Screen |
| `MediaEntryCard` | Scale 1.05x, border-brand-400 | LEFT/RIGHT in row, OK → Entry |
| `HeroCarousel` | Auto-focus current | LEFT/RIGHT hero items |
| `MediaGenreSelector` | Dropdown focus | OK → Open, UP/DOWN options |

---

## State & Data

| Hook/Atom | Purpose |
|-----------|---------|
| `useDiscoverHeroCarouselController` | Hero carousel state/animation |
| `useDiscoverSectionActivation` | Lazy-load sections on scroll |
| `searchParamsAtom` (Jotai) | Search filters state |
| `discover-queries.ts` hooks | TanStack Query data fetching |

---

## Navigation Transitions

```
DiscoverScreen (Tab Root)
│
├── DPAD OK on MediaEntryCard
│   └── → /(app)/entry/anime/[id] (AnimeEntryScreen)
│   └── → /(app)/entry/manga/[id] (MangaEntryScreen)
│
├── DPAD OK on Search Row
│   └── → /(app)/(tabs)/discover/search (SearchScreen)
│
├── DPAD OK on Filter Button (SearchScreen)
│   └── → SearchFilterSheet (Bottom Sheet)
│
└── Hero Carousel OK
    └── → /(app)/entry/anime/[id] or /(app)/entry/manga/[id]
```
