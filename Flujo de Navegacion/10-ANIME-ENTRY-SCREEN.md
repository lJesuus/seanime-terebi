# Anime Entry Screen - Media Detail

**Files**:
- `app/(app)/entry/anime/[id]/index.tsx` → `Screen` (default export)
- `src/components/features/media/anime-entry-screen.tsx` → `AnimeEntryScreen`
- `src/components/features/media/anime-entry-screen-context.tsx` → `AnimeEntryScreenProvider`
- `src/components/features/media/anime-entry-view-switcher.tsx` → `AnimeEntryView`, `AnimeEntryViewSwitcher`
- `src/components/features/media/media-entry-header.tsx` → `MediaEntryHeaderBackground`, `MediaEntryHeaderContent`
- `src/components/features/media/media-entry-scroll-shell.tsx` → `MediaEntryScrollShell`

---

## Component Tree

```
Screen (app/entry/anime/[id])
├── AnimeEntryScreenProvider (context)
│   └── AnimeEntryScreen
│       ├── Animated.View (flex-1, bg-background)
│       │   ├── MediaEntryHeaderBackground (blur backdrop)
│       │   ├── AnimeEntryViewSwitcher
│       │   │   └── Focusable Tab Buttons
│       │   ├── View (flex-1, currentView switch)
│       │   │   ├── Library View (mountedViews.library)
│       │   │   │   └── AnimeEntryLibraryView
│       │   │   │       ├── MediaEntryHeaderContent
│       │   │   │       │   ├── Anime Cover Image
│       │   │   │       │   ├── Title (focusable → scroll to info section)
│       │   │   │       │   ├── Description (3 lines)
│       │   │   │       │   └── Meta Info (score, episodes, etc.)
│       │   │   │       ├── AnimeEntryActionBar
│       │   │   │       │   ├── Add to List (focusable)
│       │   │   │       │   ├── Status Selector (focusable)
│       │   │   │       │   └── Score Selector (focusable)
│       │   │   │       ├── EpisodeCardList (focusable cards)
│       │   │   │       │   └── EpisodeCard[]
│       │   │   │       │       ├── Episode Number + Title
│       │   │   │       │       ├── Progress Indicator
│       │   │   │       │       └── Play Button
│       │   │   │       ├── Special/NC Episodes
│       │   │   │       └── Info Content (ListFooterComponent)
│       │   │   │           └── AnimeEntryInfoView
│       │   │   │               ├── Description
│       │   │   │               ├── Characters
│       │   │   │               ├── Relations
│       │   │   │               └── Recommendations
│       │   │   │
│       │   │   ├── TorrentStream View (mountedViews.torrentstream)
│       │   │   │   └── MediaEntryScrollShell
│       │   │   │       ├── OfflineBanner
│       │   │   │       ├── AnimeEntryTorrentStreamSection
│       │   │   │       │   └── TorrentStreamPickerSheet
│       │   │   │       └── Info Content (footer)
│       │   │   │           └── AnimeEntryInfoView
│       │   │   │
│       │   │   ├── OnlineStream View (mountedViews.onlinestream)
│       │   │   │   └── MediaEntryScrollShell
│       │   │   │       ├── OfflineBanner
│       │   │   │       ├── AnimeEntryOnlinestreamSection
│       │   │   │       └── Info Content (footer)
│       │   │   │           └── AnimeEntryInfoView
│       │   │   │
│       │   │   └── Downloaded View (mountedViews.downloaded)
│       │   │       └── MediaEntryScrollShell
│       │   │           ├── OfflineBanner
│       │   │           ├── AnimeEntryDownloadedView
│       │   │           │   └── DownloadedEpisodeCard[]
│       │   │           └── Info Content (footer)
│       │   │               └── AnimeEntryInfoView
│       │   │
│       │
│       │
```

---

## View Switcher (4 Tabs)

| Index | View Name | Icon | Label | Content |
|-------|-----------|------|-------|---------|
| 0 | `library` | `folder` | Library | Local episodes, progress, play |
| 1 | `torrentstream` | `cloud` | Torrent | Torrent/debrid streaming |
| 2 | `onlinestream` | `play` | Online | Online streaming sources |
| 3 | `downloaded` | `download` | Downloaded | Downloaded episodes for offline |

---

## DPAD Navigation Flow

```
┌────────────────────────────────────────────────────────────────┐
│  AnimeEntryScreen                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Blur Background Image]                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │  Cover Image    │  Title                          │  │   │
│  │  │                 │  Description                    │  │   │
│  │  │                 │  Airing Info + Score + Genres   │  │   │
│  │  │                 │  [Add to List] [Episodes]       │  │   │
│  │  │                 │            ACTION               │  │   │
│  │  │                 │   ◄── DPAD LEFT/RIGHT ──►       │  │   │
│  │  │                 │     OK to activate action       │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │  VIEW SWITCHER                                    │  │   │
│  │  │  [Library] [Torrent] [Online] [Downloaded]        │  │   │
│  │  │  ◄── DPAD LEFT/RIGHT to switch view ──►           │  │   │
│  │  │  OK to select view                                │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │  EPISODE LIST (Library View)                      │  │   │
│  │  │                                                   │  │   │
│  │  │  ┌─────────────────────────────────────────────┐  │  │   │
│  │  │  │ Ep 12 ▸ Attack on Titan    [▶]              │  │  │   │
│  │  │  │ Ep 11 ▸ Attack on Titan    [▶]              │  │  │   │
│  │  │  │ Ep 10 ▸ Attack on Titan    [▶]              │  │  │   │
│  │  │  │ ...                                         │  │  │   │
│  │  │  │ ◄── DPAD UP/DOWN: navigate episodes ──►     │  │  │   │
│  │  │  │ OK to play episode                          │  │  │   │
│  │  │  └─────────────────────────────────────────────┘  │  │   │
│  │  ├───────────────────────────────────────────────────┤  │   │
│  │  │  ┌─────────────────────────────────────────────┐  │  │   │
│  │  │  │  INFO CONTENT                               │  │  │   │
│  │  │  │  Description                                │  │  │   │
│  │  │  │  Characters                                 │  │  │   │
│  │  │  │  Relations                                  │  │  │   │
│  │  │  │  Recommendations                            │  │  │   │
│  │  │  │  ◄── DPAD UP/DOWN to navigate ──►           │  │  │   │
│  │  │  └─────────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

- **Title press (OK)**: scrolls to the Info Content section at the bottom.
- **Info Content is embedded** in every view (Library = ListFooterComponent, others = ScrollView footer).

---

## Focusable Components

### 1. MediaEntryHeaderContent → Title
```tsx
Focusable buttons:
  - Add to List: OK → Open list selector
  - Status: OK → Open status dropdown
  - Score: OK → Open score selector
```

### 2. AnimeEntryViewSwitcher
```tsx
Pressable focusable={isTV}:
  - Focus: Scale animation, border highlight
  - DPAD LEFT/RIGHT: Navigate view tabs
  - OK → Switch view
```

### 3. EpisodeCardList → EpisodeCard
```tsx
Pressable focusable={isTV}:
  - Focus: Scale animation, border highlight
  - DPAD UP/DOWN: Navigate episode list
  - OK → Play episode (playLocalFileEpisode)
  - Each card shows: number, title, progress, play button
```

### 4. TorrentStreamPickerSheet
```tsx
Pressable focusable={isTV}:
  - Focus: Scale animation, border highlight
  - DPAD LEFT/RIGHT: Navigate servers
  - OK → Start torrent stream
```

### 5. Info Content (embedded footer)
```tsx
Components within AnimeEntryInfoView:
  - Description (Text, not focusable)
  - Characters (TvFocusablePressable per row — pending)
  - Relations (MediaEntryCard focusable — pending)
  - Recommendations (HorizontalMediaCardList focusable — pending)
```

---

## View Switching Logic

```typescript
// Auto-switching based on server settings (anime-entry-screen.tsx)
function getDefaultAnimeEntryView(serverStatus, hasLibraryData) {
  if (hasLibraryData) return "library"
  if (debridSettings.enabled) return "torrentstream"
  if (torrentstreamSettings.enabled) return "torrentstream"
  if (enableOnlinestream) return "onlinestream"
  return "library"
}

// Hidden views based on settings
const hiddenViews = useMemo(() => {
  const hidden = new Set<AnimeEntryView>()
  if (!serverStatus?.settings?.library?.enableOnlinestream) {
    hidden.add("onlinestream")
  }
  return hidden
}, [serverStatus])
```

---

## State & Context

| Provider/Atom | Purpose |
|---------------|---------|
| `AnimeEntryScreenProvider` | Entry data, refetch, id |
| `animeEntryPlaybackIntentAtom` | Play episode intent |
| `TVFocusContext` | Content wrapper tag |
| `mountedViews` | Lazy mount per view |
| `currentView` | Active view state |

---

## Navigation Transitions

```
AnimeEntryScreen
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
├── ViewSwitcher OK
│   └── → Switch view (no navigation)
│
├── EpisodeCard OK (Library View)
│   └── → Video Player (MPV/External)
│       └── PlayerPanelOverlay (settings panels)
│
├── TorrentStreamPicker OK (Torrent View)
│   └── → Video Player (Torrent Stream)
│
├── Title OK (any view)
│   └── → Scroll to Info Content section
│
└── BACK
    └── → Return to previous screen (Library/Search/Discover)
```
