# SEANIME Terebi - TV/DPAD Navigation Flow Overview

## Application Architecture

**Framework**: Expo Router + React Native + React Navigation (Bottom Tabs)
**TV Support**: Custom sidebar navigation + TVFocusContext for focus management
**State Management**: Jotai atoms + TanStack Query

---

## Global Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ROOT LAYOUT (App Root)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Providers: Theme, Jotai, QueryClient, WebSocket, ServerUrl,    │   │
│  │  OTA Updates, Offline Logger, Toast, PortalHost                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  EXPO ROUTER SLOT                                               │   │
│  │    ├── (out)/set-server-url  (Server setup - no tabs)          │   │
│  │    └── (app)/                                                  │   │
│  │         ├── _layout.tsx (TabLayout with SidebarShell)          │   │
│  │         ├── (tabs)/                                            │   │
│  │         │    ├── discover/              ← TAB 1                 │   │
│  │         │    │    ├── index.tsx                                  │   │
│  │         │    │    └── search.tsx                                 │   │
│  │         │    ├── (library)/index.tsx    ← TAB 2 (Anime)         │   │
│  │         │    ├── (manga)/index.tsx      ← TAB 3 (Manga)         │   │
│  │         │    ├── schedule/index.tsx     ← TAB 4                 │   │
│  │         │    └── (profile)/             ← TAB 5                 │   │
│  │         │         ├── index.tsx                                   │   │
│  │         │         ├── my-lists.tsx                                │   │
│  │         │         ├── active-stream.tsx                           │   │
│  │         │         ├── download-settings.tsx                       │   │
│  │         │         ├── logs.tsx                                    │   │
│  │         │         ├── server-downloads.tsx                        │   │
│  │         │         └── unmatched.tsx                               │   │
│  │         ├── entry/                                               │   │
│  │         │    ├── anime/[id]/index.tsx    (AnimeEntryScreen)      │   │
│  │         │    └── manga/[id]/index.tsx    (MangaEntryScreen)      │   │
│  │         └── (media)/                                             │   │
│  │              ├── anime-downloads.tsx                              │   │
│  │              └── manga-downloads.tsx                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TV/DPAD Navigation Modes

### 1. **Phone Portrait** (Sidebar Hidden)
- Bottom Tab Bar visible (`TabBar` component)
- Standard touch navigation
- Back button: Double-tap to exit

### 2. **TV / Landscape** (Sidebar Visible)
- Left Sidebar (`SidebarShell` component) - persistent navigation
- Right Content Area - active tab content
- Hardware back button: Toggle sidebar → Exit app
- DPAD navigation between sidebar items and content

---

## Focus Management System

### TVFocusContext (`src/contexts/tv-focus-context.ts`)
```typescript
{
  sidebarTag: number | null           // Native tag for sidebar focus zone
  setSidebarTag: (tag) => void
  contentWrapperTag: number | null    // Native tag for content focus zone
  setContentWrapperTag: (tag) => void
}
```

### FocusableView (`src/components/layout/focusable-view.tsx`)
- Wraps scrollable/content areas
- Registers native view tags for TV focus engine
- Enables `nextFocusDown`, `nextFocusUp`, `nextFocusRight`, `nextFocusLeft`

### Sidebar Focus Chain (`SidebarShell` - lines 109-120)
```typescript
// Auto-calculates focus chain for UP/DOWN navigation
const down: (number | null)[] = []
const up: (number | null)[] = []
for (let i = 0; i < tabs.length; i++) {
  const nextRef = i < tabs.length - 1 ? pressableRefs.current[i + 1] : null
  const prevRef = i > 0 ? pressableRefs.current[i - 1] : null
  down.push(nextRef?.current ? findNodeHandle(nextRef.current) : null)
  up.push(prevRef?.current ? findNodeHandle(prevRef.current) : null)
}
```

---

## Tab Configuration (5 Main Tabs)

| Index | Route Name | Display Name | Icon | Component |
|-------|------------|--------------|------|-----------|
| 0 | `(library)` | **Anime** | `tv` | `LibraryScreen` |
| 1 | `(manga)` | **Manga** | `book` | `MangaLibraryScreen` |
| 2 | `schedule` | **Schedule** | `calendar` | `ScheduleScreen` |
| 3 | `discover` | **Discover** | `compass` | `DiscoverScreen` |
| 4 | `(profile)` | **Profile** | `cog-outline` | `ProfileScreen` |

---

## DPAD Navigation Patterns

### Sidebar Navigation (TV Mode)
```
DPAD UP/DOWN     → Navigate between sidebar tab items
DPAD RIGHT       → Move focus to Content Area (first focusable element)
DPAD LEFT        → From Content Area, return to Sidebar
DPAD OK/ENTER    → Activate selected tab / Press focused button
BACK BUTTON      → Toggle sidebar menu / Exit app (double back)
```

### Content Area Navigation (Per Screen)
Each screen implements its own focusable elements with:
- `focusable={isTV}` on Pressable/Touchable components
- `onFocus` / `onBlur` handlers for visual feedback
- `nextFocusDown/Up/Left/Right` for explicit focus control
- Animated scale/opacity feedback on focus

### Common Focus Patterns
```tsx
// Standard TV focusable button pattern
<Pressable
  focusable={isTV}
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  onPress={onPress}
  nextFocusDown={nextElementTag}
  nextFocusUp={prevElementTag}
>
  <Animated.View style={animatedStyle}>
    {children}
  </Animated.View>
</Pressable>
```

---

## Screen Hierarchy & Navigation Files

See individual markdown files for each screen:
- `01-ROOT-LAYOUT.md`
- `02-TAB-LAYOUT-SIDEBAR.md`
- `03-DISCOVER-TAB.md`
- `04-DISCOVER-SEARCH.md`
- `05-LIBRARY-TAB-ANIME.md`
- `06-LIBRARY-TAB-MANGA.md`
- `07-SCHEDULE-TAB.md`
- `08-PROFILE-TAB.md`
- `09-PROFILE-SUBPAGES.md`
- `10-ANIME-ENTRY-SCREEN.md`
- `11-MANGA-ENTRY-SCREEN.md`
- `12-MANGA-READER.md`
- `13-VIDEO-PLAYER.md`
- `14-PLAYER-PANELS.md`
- `15-MODALS-SHEETS.md`
- `16-OFFLINE-ERROR-STATES.md`