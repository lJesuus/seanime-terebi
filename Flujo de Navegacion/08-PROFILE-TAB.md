# Profile Tab - Settings & Profile

**Files**:
- `app/(app)/(tabs)/(profile)/index.tsx` → `ProfileScreen` (default export)
- `src/components/features/profile/profile-tv-layout.tsx` → `ProfileTVLayout`, `TVActionPanel`, `TVPlayerOptions`
- `src/components/features/profile/profile-menu.tsx` → `ProfileMenuItem`, `ProfileMenuSection`, `ProfileMenuToggle`

---

## Component Tree (Phone Mode)

```
ProfileScreen
├── SafeView
│   └── ScrollView
│       ├── Header (avatar, name, connection status)
│       ├── ProfileMenuSection: "AniList"
│       │   └── ProfileMenuItem: "My Lists"
│       ├── ProfileMenuSection: "Streaming" (if active)
│       │   └── ProfileMenuItem: "Server Stream"
│       ├── ProfileMenuSection: "Downloads"
│       │   ├── ProfileMenuItem: "Anime Downloads"
│       │   ├── ProfileMenuItem: "Manga Downloads"
│       │   └── ProfileMenuItem: "Download Settings"
│       ├── ProfileMenuSection: "Server Library" (if local server)
│       │   ├── ProfileMenuItem: "Server Download Queue"
│       │   ├── ProfileMenuItem: "Resolve Unmatched"
│       │   └── ProfileMenuItem: "Rescan Library"
│       ├── ProfileMenuSection: "App"
│       │   ├── ProfileMenuToggle: "Offline Mode"
│       │   ├── ProfileMenuItem: "Clear Image Cache"
│       │   ├── ProfileMenuItem: "Logs"
│       │   ├── ProfileMenuItem: "Check New Release"
│       │   ├── ProfileMenuItem: "Check OTA Update"
│       │   └── ProfileMenuItem: "Change Server URL"
│       ├── ProfileMenuSection: "Player"
│       │   └── ProfileMenuItem: "External Player"
│       ├── ExternalPlayerPickerSheet
│       └── Version Label
```

---

## Component Tree (TV Mode - ProfileTVLayout)

```
ProfileScreen (isTV=true)
├── SafeView
│   └── View (ref=contentZoneRef, registers contentWrapperTag)
│       ├── ProfileTVLayout
│       │   └── View (flex-row)
│       │       ├── LEFT COLUMN (flex-1): Menu List
│       │       │   ├── Compact User Info (avatar, name, connection)
│       │       │   └── ScrollView
│       │       │       └── TVSection[] (visible sections)
│       │       │           ├── TVSectionHeader (title)
│       │       │           └── TVContentItem[] (focusable rows)
│       │       │               ├── Icon + Label + Detail
│       │       │               ├── Accessory (badge)
│       │       │               └── Chevron-forward indicator
│       │       └── RIGHT COLUMN (w-300px): Detail Panel
│       │           └── ScrollView (content based on activeItem)
│       │               ├── TVActionPanel (for actions)
│       │               │   ├── Description text
│       │               │   └── Action Button (focusable)
│       │               ├── TVPlayerOptions (radio list)
│       │               │   └── TVPlayerOptionRow[] (focusable)
│       │               ├── TVToggle (for toggles)
│       │               │   └── Focusable toggle switch
│       │               └── Default Detail (label, detail, chevron hint)
│       └── Version Label
```

---

## DPAD Navigation Flow (TV Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│  ProfileScreen (TV 2-Column Layout)                              │
│  ┌─────────────────────────────────┬───────────────────────────┐│
│  │  LEFT: Menu Column               │  RIGHT: Detail Panel      ││
│  │  ┌───────────────────────────┐  │  ┌─────────────────────┐ ││
│  │  │  👤 User Name              │  │  │                     │ ││
│  │  │  ● Connected               │  │  │  [Active Item       │ ││
│  │  ├───────────────────────────┤  │  │   Detail/Action]    │ ││
│  │  │ ANILIST                    │  │  │                     │ ││
│  │  │ ► My Lists                 │◄─┤  │  TVActionPanel      │ ││
│  │  ├───────────────────────────┤  │  │  TVPlayerOptions    │ ││
│  │  │ STREAMING                  │  │  │  TVToggle           │ ││
│  │  │   Server Stream            │  │  │                     │ ││
│  │  ├───────────────────────────┤  │  │                     │ ││
│  │  │ DOWNLOADS                  │  │  │  [Press OK to open] │ ││
│  │  │ ► Anime Downloads          │  │  │                     │ ││
│  │  │   Manga Downloads          │  │  └─────────────────────┘ ││
│  │  │   Download Settings        │  │                           ││
│  │  ├───────────────────────────┤  │                           ││
│  │  │ SERVER LIBRARY             │  │                           ││
│  │  │   Server Download Queue    │  │                           ││
│  │  │   Resolve Unmatched        │  │                           ││
│  │  │   Rescan Library           │  │                           ││
│  │  ├───────────────────────────┤  │                           ││
│  │  │ APP                        │  │                           ││
│  │  │   Offline Mode (toggle)    │  │                           ││
│  │  │   Clear Image Cache        │  │                           ││
│  │  │   Logs                     │  │                           ││
│  │  │   Check New Release        │  │                           ││
│  │  │   Check OTA Update         │  │                           ││
│  │  │   Change Server URL        │  │                           ││
│  │  ├───────────────────────────┤  │                           ││
│  │  │ PLAYER                     │  │                           ││
│  │  │   External Player          │  │                           ││
│  │  └───────────────────────────┘  │                           ││
│  │                                   │                           ││
│  │  ◄── DPAD UP/DOWN: navigate ──►  │  ◄── DPAD RIGHT: ──►     ││
│  │  OK: select item (updates right) │      Enter right panel    ││
│  │                                   │  DPAD LEFT: back to menu  ││
│  │                                   │  OK: activate action      ││
│  └─────────────────────────────────┴───────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Focusable Components (TV)

### 1. TVContentItem (Left Column)
```tsx
Pressable focusable={true} nextFocusRight={rightPanelNode}:
  - Focus: Scale 1.03x, border-brand-400/60, bg-white/[0.04]
  - DPAD UP/DOWN: Navigate between items (auto scroll)
  - DPAD RIGHT: Move to right panel (nextFocusRight)
  - OK: Activate item (updates right panel content)
```

### 2. TVActionPanel (Right Column)
```tsx
Pressable focusable={!isProcessing}:
  - Focus: Scale 1.03x, border-brand-400/60, bg-brand-500/20
  - DPAD LEFT: Return to menu column
  - OK: Execute action (clear cache, change URL, etc.)
```

### 3. TVPlayerOptionRow (Right Column)
```tsx
Pressable focusable={true}:
  - Focus: Scale 1.02x, border-brand-400/60, bg-white/[0.04]
  - DPAD UP/DOWN: Navigate between player options
  - OK: Select player option
  - Visual: Radio button style (circle + checkmark)
```

### 4. TVToggle (Right Column)
```tsx
Pressable focusable={true}:
  - Focus: Scale 1.03x, bg-white border-brand-400/80
  - OK: Toggle value (on/off)
  - Visual: Switch indicator with label
```

---

## Menu Sections (Phone Mode)

| Section | Items | Navigation |
|---------|-------|------------|
| AniList | My Lists → `/(profile)/my-lists` | OK → Push screen |
| Streaming | Server Stream → `/(profile)/active-stream` | OK → Push screen |
| Downloads | Anime Downloads → `/(media)/anime-downloads` | OK → Push screen |
| | Manga Downloads → `/(media)/manga-downloads` | OK → Push screen |
| | Download Settings → `/(profile)/download-settings` | OK → Push screen |
| Server Library | Server Download Queue → `/(profile)/server-downloads` | OK → Push screen |
| | Resolve Unmatched → `/(profile)/unmatched` | OK → Push screen |
| | Rescan Library | OK → Trigger scan |
| App | Offline Mode | OK → Toggle |
| | Clear Image Cache | OK → Clear cache |
| | Logs → `/(profile)/logs` | OK → Push screen |
| | Check New Release | OK → Check update |
| | Check OTA Update | OK → Check update |
| | Change Server URL → `/(out)/set-server-url` | OK → Push screen |
| Player | External Player | OK → Open picker sheet |

---

## Navigation Transitions

```
ProfileScreen
│
├── My Lists OK
│   └── → /(app)/(tabs)/(profile)/my-lists
│
├── Server Stream OK
│   └── → /(app)/(tabs)/(profile)/active-stream
│
├── Anime Downloads OK
│   └── → /(app)/(media)/anime-downloads
│
├── Manga Downloads OK
│   └── → /(app)/(media)/manga-downloads
│
├── Download Settings OK
│   └── → /(app)/(tabs)/(profile)/download-settings
│
├── Server Download Queue OK
│   └── → /(app)/(tabs)/(profile)/server-downloads
│
├── Resolve Unmatched OK
│   └── → /(app)/(tabs)/(profile)/unmatched
│
├── Logs OK
│   └── → /(app)/(tabs)/(profile)/logs
│
├── Change Server URL OK
│   └── → /(out)/set-server-url
│
├── External Player OK
│   └── → ExternalPlayerPickerSheet (Bottom Sheet)
│
├── Clear Image Cache OK (TV)
│   └── → TVActionPanel (right column)
│
└── Offline Mode OK (TV)
    └── → TVToggle (right column)
```