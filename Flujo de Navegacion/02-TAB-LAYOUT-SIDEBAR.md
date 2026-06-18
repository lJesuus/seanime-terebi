# Tab Layout & Sidebar - Main Navigation Container

**Files**:
- `app/(app)/(tabs)/_layout.tsx` → `TabLayout` (default export)
- `src/components/layout/sidebar.tsx` → `SidebarShell`, `SidebarButton`
- `src/components/layout/tabs.tsx` → `TabBar`, `BottomTabBar`, `TabBarButton`
- `src/components/layout/focusable-view.tsx` → `FocusableView`

---

## Component Tree

```
TabLayout (TVFocusContext.Provider)
├── SidebarShell (when showSidebar=true - TV/Landscape)
│   ├── FocusableView (ref=sidebarZoneRef, registers sidebarTag)
│   │   ├── Logo Section (SEANIME branding)
│   │   ├── Tab Navigation List
│   │   │   └── SidebarButton[] (one per tab)
│   │   │       ├── Pressable (focusable, nextFocusDown/Up)
│   │   │       ├── Icon + Label
│   │   │       └── Focus ring (border-brand-400) on btnFocused
│   │   └── Version Label (Terebi Edition)
│   └── Menu Backdrop (when menuOpen)
│
└── Content Area (View flex-1)
    └── Tabs (expo-router Bottom Tabs)
        ├── Tab.Screen: (library) → LibraryScreen
        ├── Tab.Screen: (manga) → MangaLibraryScreen
        ├── Tab.Screen: schedule → ScheduleScreen
        ├── Tab.Screen: discover → DiscoverScreen
        ├── Tab.Screen: (profile) → ProfileScreen
        └── TabBar (when showSidebar=false - Phone Portrait)
            └── BottomTabBar
                └── TabBarButton[] (one per visible tab)
                    ├── Pressable
                    ├── TabBarIcon / Avatar
                    └── Animated Label
```

---

## Tab Configuration (SidebarShell lines 102-133)

```typescript
const tabs: AppTabConfig[] = [
  { show: true, name: "(library)",  displayName: "Anime",    icon: "tv" },
  { show: true, name: "(manga)",    displayName: "Manga",    icon: "book" },
  { show: true, name: "schedule",   displayName: "Schedule", icon: "calendar" },
  { show: true, name: "discover",   displayName: "Discover", icon: "compass" },
  { show: true, name: "(profile)",  displayName: "Profile",  icon: "cog-outline" },
]
```

---

## DPAD Navigation Flow

### TV Mode (Sidebar Visible)

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIDEBAR (Focus Zone)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  						   LOGO                            │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  ► Anime         ← FOCUSED (Estilo blanco)                │  │
│  │    Manga                                                    │  │
│  │    Schedule                                                 │  │
│  │    Discover                                                 │  │
│  │    Profile                                                  │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  Terebi Edition                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │
│                              │                                   │
│                    DPAD RIGHT                                    │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    CONTENT AREA                             │  │
│  │  (Active Tab Screen - e.g., LibraryScreen)                 │  │
│  │  First focusable element gets focus                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Focus Chain (SidebarShell lines 109-120)

```typescript
// Auto-generated on mount
focusChain = {
  down: [tag1, tag2, tag3, tag4, null],  // nextFocusDown for each item
  up:   [null, tag0, tag1, tag2, tag3]   // nextFocusUp for each item
}
```

- **DPAD UP/DOWN**: Navigate between sidebar items (5 tabs)
- **DPAD RIGHT**: Move to content area (`nextFocusRight` set to `contentWrapperTag`)
- **DPAD LEFT**: From content, return to sidebar (handled by content screens)
- **OK/ENTER**: Activate tab (navigate)

### Phone Portrait (Sidebar Hidden)

- `TabBar` renders at bottom (BottomTabBar component)
- Standard touch navigation
- No DPAD focus management needed

---

## Hardware Back Button Handling (TabLayout lines 28-96)

```typescript
// Android/TV Back Button Logic:
if (router.canGoBack()) {
  router.back()  // Navigate back in stack
  return true
}

// At root level:
if (showSidebar) {  // TV/Landscape
  if (menuOpen) {
    setMenuOpen(false)  // Close sidebar menu
    exitReadyRef.current = true  // Arm exit
    showToast("Press back again to exit")
  } else {
    setMenuOpen(true)  // Open sidebar menu
  }
} else {  // Phone Portrait
  // Double back to exit
  if (exitReadyRef.current) BackHandler.exitApp()
  else armExit()
}
```

---

## Key Components

### SidebarButton (sidebar.tsx:195-269)
```typescript
Props:
- focused: boolean          // Active tab (matches route)
- btnFocused: boolean       // DPAD focus (visual highlight)
- onPress: () => void       // Navigate to tab
- onFocus: () => void       // Set focusedIndex
- onBlur: () => void        // Clear focusedIndex
- nextFocusDown: number     // Native tag for DPAD DOWN
- nextFocusUp: number       // Native tag for DPAD UP
- pressableRef: RefObject   // For focus chain
```

### FocusableView (focusable-view.tsx)
```typescript
// Wrapper that registers native view tag with TVFocusContext
interface FocusableViewHandle {
  nativeTag: number
}
```

---

## State Management

| Atom | Purpose |
|------|---------|
| `__sidebar_menuOpenAtom` | Sidebar menu open/close (TV) |
| `TVFocusContext` | Focus zone tags (sidebar, content) |

---

## Navigation Transitions

```
TabLayout (Root of Tab Navigation)
│
├── SidebarShell (persistent on TV)
│   └── Tab Selection → router.navigate(`/(tabs)/${tab.name}`)
│
├── Tab Screens (switched via Tabs navigator)
│   ├── (library) → LibraryScreen
│   ├── (manga) → MangaLibraryScreen
│   ├── schedule → ScheduleScreen
│   ├── discover → DiscoverScreen
│   └── (profile) → ProfileScreen
│
└── Stack Navigation (within tabs)
    ├── Entry Screens: /(app)/entry/anime/[id]
    ├── Entry Screens: /(app)/entry/manga/[id]
    ├── Profile Subpages: /(app)/(tabs)/(profile)/*
    └── Media: /(app)/(media)/*
```
