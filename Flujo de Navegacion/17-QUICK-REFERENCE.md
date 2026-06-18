# TV/DPAD Navigation Quick Reference

## Global Navigation Keys

| Button | Action |
|--------|--------|
| **DPAD UP/DOWN** | Navigate between focusable items (vertical) |
| **DPAD LEFT/RIGHT** | Navigate between focusable items (horizontal) |
| **OK/ENTER** | Activate focused item |
| **BACK** | Return to previous screen / Close sheet / Exit app |
| **MENU** | (Reserved) |

---

## Screen Navigation Map

```
APP START
    │
    ▼
ROOT LAYOUT (Providers)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  TAB LAYOUT (Sidebar on TV)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SIDEBAR (Focus Zone)                                │   │
│  │  ► Anime  ← DPAD UP/DOWN                            │   │
│  │    Manga                                              │   │
│  │    Schedule                                           │   │
│  │    Discover                                           │   │
│  │    Profile                                            │   │
│  │                         │                             │   │
│  │                    DPAD RIGHT                         │   │
│  │                         ▼                             │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              CONTENT AREA                      │  │   │
│  │  │  (Active Tab Screen)                           │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tab → Screen → Navigation Flow

### 1. Anime Tab (Library)
```
Anime Tab
├── Hero Carousel → DPAD LEFT/RIGHT → OK → Anime Entry
├── Continue Watching → DPAD LEFT/RIGHT → OK → Play Episode
├── Shelf Sections → DPAD UP/DOWN → DPAD LEFT/RIGHT → OK → Anime Entry
└── Downloaded → DPAD LEFT/RIGHT → OK → Anime Entry
```

### 2. Manga Tab
```
Manga Tab
├── Hero Carousel → DPAD LEFT/RIGHT → OK → Manga Entry
├── Shelf Sections → DPAD UP/DOWN → DPAD LEFT/RIGHT → OK → Manga Entry
└── Downloaded → DPAD LEFT/RIGHT → OK → Manga Entry
```

### 3. Schedule Tab
```
Schedule Tab
├── Header Controls → DPAD LEFT/RIGHT → OK → Navigate/Settings
├── Week Days → DPAD LEFT/RIGHT → OK → Select Day
└── Schedule Grid → DPAD LEFT/RIGHT → DPAD UP/DOWN → OK → Anime Entry
```

### 4. Discover Tab
```
Discover Tab
├── Mode Toggle → DPAD LEFT/RIGHT → OK → Switch Anime/Manga
├── Search → OK → Discover Search Screen
├── Hero Carousel → DPAD LEFT/RIGHT → OK → Anime/Manga Entry
├── Genre Selector → OK → Select Genre
└── Media Cards → DPAD LEFT/RIGHT → OK → Anime/Manga Entry
```

### 5. Profile Tab
```
Profile Tab (TV 2-Column)
├── Menu Column → DPAD UP/DOWN → OK → Select Item
├── Detail Column → DPAD RIGHT → DPAD UP/DOWN → OK → Activate Action
└── Sub-pages → DPAD navigation → BACK → Return to Profile
```

---

## Entry Screen Navigation

### Anime Entry
```
Anime Entry Screen
├── Cover/Title → OK → Switch to Info View
├── Action Bar → DPAD LEFT/RIGHT → OK → Action
├── Episode List → DPAD UP/DOWN → OK → Play Episode
├── View Switcher → DPAD LEFT/RIGHT → OK → Switch View
└── Torrent/Online Stream → DPAD LEFT/RIGHT → OK → Start Stream
```

### Manga Entry
```
Manga Entry Screen
├── Cover/Title → OK → Switch to Info View
├── Action Bar → DPAD LEFT/RIGHT → OK → Action
├── Chapter List → DPAD UP/DOWN → OK → Open in Reader
├── View Switcher → DPAD LEFT/RIGHT → OK → Switch View
└── Downloaded → DPAD UP/DOWN → OK → Open in Reader
```

---

## Player Navigation

```
Video Player
├── Top Overlay → DPAD LEFT/RIGHT → OK → Back/PiP/Lock
├── Center Controls → DPAD LEFT/RIGHT → OK → Skip/Rewind/Play/Forward
├── Bottom Overlay → DPAD LEFT/RIGHT → OK → Subtitles/Settings
├── Progress Slider → DPAD LEFT/RIGHT → Seek
└── Settings Panel → DPAD UP/DOWN → OK → Select Option
    └── Sub-panels → DPAD UP/DOWN → OK → Select/Adjust
```

---

## Sheet/Modal Navigation

```
Sheet/Modal Open
├── First focusable element gets focus
├── DPAD UP/DOWN/LEFT/RIGHT → Navigate within sheet
├── OK → Activate focused item
├── BACK → Close sheet/modal
└── Swipe Down → Close sheet (phone)
```

---

## Focus Patterns

### Standard TV Focusable
```tsx
<Pressable
  focusable={isTV}
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  onPress={onPress}
  nextFocusDown={nextTag}
  nextFocusUp={prevTag}
>
  <Animated.View style={animatedStyle}>
    {children}
  </Animated.View>
</Pressable>
```

### Focus Visual Feedback
- **Border**: `border-brand-400/60` (purple accent)
- **Background**: `bg-white/[0.04]` or `bg-brand-500/20`
- **Scale**: `1.02x` to `1.12x` (spring animation)
- **Shadow**: `shadow-lg` for elevated items

---

## Common Navigation Patterns

| Pattern | Implementation |
|---------|----------------|
| **Vertical List** | `FlatList` + `DPAD UP/DOWN` |
| **Horizontal Carousel** | `FlatList horizontal` + `DPAD LEFT/RIGHT` |
| **Grid** | `FlatList numColumns` + `DPAD UP/DOWN/LEFT/RIGHT` |
| **Tab Switcher** | `DPAD LEFT/RIGHT` between tabs |
| **2-Column Layout** | `DPAD LEFT/RIGHT` between columns |
| **Settings Panel** | `DPAD UP/DOWN` to navigate, `OK` to select |
| **Bottom Sheet** | Focus trapped, `DPAD` within, `BACK` to close |

---

## Hardware Button Handling

### Back Button (Android/TV)
```
1. If screen can go back → router.back()
2. If at root (TV) → Toggle sidebar
3. If sidebar open (TV) → Close sidebar, arm exit
4. If at root (Phone) → Double-back to exit
```

### Menu Button (TV)
```
(Reserved for future use)
```

---

## Focus Zone Registration

```typescript
// TVFocusContext tracks focus zones
const { sidebarTag, contentWrapperTag } = useContext(TVFocusContext)

// Sidebar registers its native tag
useLayoutEffect(() => {
  if (sidebarZoneRef.current) {
    setSidebarTag(sidebarZoneRef.current.nativeTag)
  }
}, [])

// Content registers its native tag
useLayoutEffect(() => {
  if (contentZoneRef.current) {
    setContentWrapperTag(findNodeHandle(contentZoneRef.current))
  }
}, [])
```

---

## File Reference

| File | Purpose |
|------|---------|
| `00-NAVIGATION-OVERVIEW.md` | Global architecture |
| `01-ROOT-LAYOUT.md` | App entry point |
| `02-TAB-LAYOUT-SIDEBAR.md` | Main navigation container |
| `03-DISCOVER-TAB.md` | Content discovery |
| `04-DISCOVER-SEARCH.md` | Search functionality |
| `05-LIBRARY-TAB-ANIME.md` | Anime library |
| `06-LIBRARY-TAB-MANGA.md` | Manga library |
| `07-SCHEDULE-TAB.md` | Anime calendar |
| `08-PROFILE-TAB.md` | Settings & profile |
| `09-PROFILE-SUBPAGES.md` | Profile sub-pages |
| `10-ANIME-ENTRY-SCREEN.md` | Anime media detail |
| `11-MANGA-ENTRY-SCREEN.md` | Manga media detail |
| `12-MANGA-READER.md` | Full-screen reading |
| `13-VIDEO-PLAYER.md` | Video playback |
| `14-PLAYER-PANELS.md` | Player settings |
| `15-MODALS-SHEETS.md` | Overlay components |
| `16-OFFLINE-ERROR-STATES.md` | Offline/error handling |
| `17-QUICK-REFERENCE.md` | This file |