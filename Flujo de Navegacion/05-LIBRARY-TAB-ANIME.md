# Library Tab - Anime Library

**File**: `app/(app)/(tabs)/(library)/index.tsx`
**Component**: `LibraryScreen` (default export)

---

## Component Tree

```
LibraryScreen
├── View (flex-1, bg-background)
│   ├── OfflineBanner (if disconnected)
│   ├── TabFadeView (noSidebarOffset)
│   │   ├── View (flex-1)
│   │   │   └── Animated.FlatList (when not searching)
│   │   │       ├── ListHeaderComponent:
│   │   │       │   ├── LibraryHeroCarousel (if hasHero)
│   │   │       │   │   └── Hero items (focusable cards)
│   │   │       │   └── ContinueWatching
│   │   │       │       └── EpisodeCard[] (focusable)
│   │   │       ├── RenderItem: HorizontalMediaCardList
│   │   │       │   ├── "Currently watching"
│   │   │       │   ├── "Paused"
│   │   │       │   ├── "Planning"
│   │   │       │   ├── "Completed"
│   │   │       │   └── "Dropped"
│   │   │       │       └── MediaEntryCard[] (focusable)
│   │   │       └── ListFooterComponent: DownloadedAnimeList
│   │   └── LibrarySearchHeader (Phone: floating overlay)
```

---

## DPAD Navigation Flow

```
┌────────────────────────────────────────────────────────────┐
│  LibraryScreen                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LibraryHeroCarousel (if hasHero)                   │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  [EP 12 - Attack on Titan] [EP 5 - JJK] ...   │  │   │
│  │  │  ◄── DPAD LEFT/RIGHT to navigate ──►          │  │   │
│  │  │  OK to play episode / open entry              │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ContinueWatching (flat list of recent episodes)    │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  Ep 12 ▸ Attack on Titan    │ Ep 5 ▸ JJK      │  │   │
│  │  │  ◄── DPAD LEFT/RIGHT to navigate ──►          │  │   │
│  │  │  OK to play                                   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Currently watching (HorizontalMediaCardList)       │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  [Card1] [Card2] [Card3] [Card4] ...          │  │   │
│  │  │  ◄── DPAD LEFT/RIGHT to navigate ──►          │  │   │
│  │  │  OK to open Entry Screen                      │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Paused (HorizontalMediaCardList)                   │   │
│  │  Planning (HorizontalMediaCardList)                 │   │
│  │  Completed (HorizontalMediaCardList)                │   │
│  │  Dropped (HorizontalMediaCardList)                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  DownloadedAnimeList (footer)                       │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  📥 Downloaded Anime                          │  │   │
│  │  │  [Item1] [Item2] [Item3] ...                  │  │   │
│  │  │  DPAD LEFT/RIGHT to navigate                  │  │   │
│  │  │  OK to open Entry Screen                      │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## Focusable Components

### 1. LibraryHeroCarousel
- Auto-scrolls, manual DPAD LEFT/RIGHT navigation
- **OK**: Open anime entry screen or play episode

### 2. ContinueWatching → EpisodeCard
- **DPAD LEFT/RIGHT**: Navigate episodes
- **OK**: Play episode (sets playback intent, navigates to entry)

### 3. HorizontalMediaCardList → MediaEntryCard
- **DPAD LEFT/RIGHT**: Navigate cards within shelf
- **DPAD UP/DOWN**: Move between shelf sections
- **OK**: Open anime entry screen

### 4. DownloadedAnimeList
- **DPAD LEFT/RIGHT**: Navigate downloaded items
- **OK**: Open anime entry screen

---

## Key Behaviors

| Feature | Behavior |
|---------|----------|
| Remove Search Function | Remove search filter and button bc already have a search button |
| Pull-to-Refresh | Refreshes library data |
| Hero Carousel | Shows continue-watching items |
| Continue Watching | Flat list of recent episodes with play button |
| Shelf Sections | Horizontal scroll lists per status |
| Downloaded | Footer section for offline content |

---

## Navigation Transitions

```
LibraryScreen
│
├── MediaEntryCard OK
│   └── → /(app)/entry/anime/[id] (AnimeEntryScreen)
│
├── ContinueWatching episode OK
│   └── → /(app)/entry/anime/[id]?initialView=library
│         (sets playbackIntent, auto-plays episode)
│
├── LibraryHeroCarousel item OK
│   └── → /(app)/entry/anime/[id]?initialView=library
│
└── DownloadedAnimeList item OK
   └── → /(app)/entry/anime/[id]?initialView=downloaded


```
