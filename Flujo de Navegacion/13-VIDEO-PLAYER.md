# Video Player - Full-Screen Playback

**Files**:
- `src/components/features/player/player-panel.tsx` → `PlayerPanelOverlay`
- `src/components/features/player/player-controls.tsx` → Player controls
- `src/components/features/player/player-overlays.tsx` → Overlay UI
- `src/components/features/player/player-auto-next.tsx` → Auto-next episode
- `src/components/features/player/hooks/use-player-gestures.ts` → Gesture handling
- `src/components/features/player/hooks/use-controls-visibility.ts` → Auto-hide controls
- `src/lib/player/use-mpv-player.ts` → MPV player integration

---

## Component Tree

```
Video Player (Full-Screen)
├── Animated.View (flex-1, bg-black)
│   ├── MPV Player Surface / External Player
│   ├── Player Overlays (auto-hide on idle)
│   │   ├── Top Overlay
│   │   │   ├── Back Button (focusable)
│   │   │   ├── Episode Title
│   │   │   ├── PiP Button (focusable)
│   │   │   └── Lock Screen Button (focusable)
│   │   ├── Center Overlay
│   │   │   ├── Skip Previous (focusable, left)
│   │   │   ├── Rewind (focusable, left-center)
│   │   │   ├── Play/Pause (focusable, center)
│   │   │   ├── Forward (focusable, right-center)
│   │   │   └── Skip Next (focusable, right)
│   │   └── Bottom Overlay
│   │       ├── Current Time
│   │       ├── Progress Slider (focusable)
│   │       ├── Duration
│   │       ├── Subtitle Toggle (focusable)
│   │       └── Settings Gear (focusable)
│   ├── Player Panel Overlay (settings drawer)
│   │   └── See Player Panels documentation
│   └── Player Auto Next
│       └── Next Episode Preview (focusable)

```

---

## DPAD Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Video Player (Full-Screen)                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [← Back]    Episode Title    [PiP] [🔒]               │   │
│  │  ◄── DPAD LEFT/RIGHT between top controls ──►           │   │
│  │  OK: Activate (back/pip/lock)                           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  ┌───────────────────────────────────────────────────┐   │   │
│  │  │                                                   │   │   │
│  │  │            VIDEO CONTENT                           │   │   │
│  │  │                                                   │   │   │
│  │  │  ◄── DPAD LEFT: Rewind (configurable seconds)    │   │   │
│  │  │  ◄── DPAD RIGHT: Forward (configurable seconds)  │   │   │
│  │  │  ◄── DPAD UP/DOWN: Volume control                │   │   │
│  │  │                                                   │   │   │
│  │  │  OK: Play/Pause                                   │   │   │
│  │  │                                                   │   │   │
│  │  └───────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  00:12:34 ━━━━━━━━━●━━━━━━━━━━━━━━━ 00:24:00           │   │
│  │  ◄── DPAD LEFT/RIGHT: seek ──►                          │   │
│  │  ◄── DPAD UP/DOWN: navigate controls ──►                │   │
│  │                                                          │   │
│  │  [CC] [⚙️]                                              │   │
│  │  ◄── DPAD LEFT/RIGHT between bottom controls ──►        │   │
│  │  OK: Toggle subtitles / Open settings                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Focusable Components

### 1. Top Overlay Controls
```tsx
Pressable focusable={isTV}:
  - Back Button: OK → Close player, return to entry screen
  - PiP Button: OK → Start Picture-in-Picture
  - Lock Screen: OK → Lock screen (show unlock overlay)
```

### 2. Center Overlay Controls
```tsx
Pressable focusable={isTV}:
  - Skip Previous: OK → Play previous episode
  - Rewind: OK → Seek backward (configurable seconds)
  - Play/Pause: OK → Toggle playback
  - Forward: OK → Seek forward (configurable seconds)
  - Skip Next: OK → Play next episode
```

### 3. Bottom Overlay Controls
```tsx
Pressable focusable={isTV}:
  - Progress Slider: DPAD LEFT/RIGHT to seek
  - Subtitle Toggle: OK → Toggle subtitle visibility
  - Settings Gear: OK → Open PlayerPanelOverlay
```

### 4. Player Panel Overlay (Settings Drawer)
```tsx
// Slides in from right (340px wide)
PanelSelectableRow focusable={isTV}:
  - DPAD UP/DOWN: Navigate settings options
  - OK: Select option / Toggle setting
  - Chevron-left: Navigate back to parent panel
  - X: Close panel overlay
```

### 5. Screen Lock Overlay
```tsx
Pressable focusable={isTV}:
  - Unlock Button: OK → Unlock screen, show controls
```

---

## Settings Panels (PlayerPanelOverlay)

| Panel | Content | Navigation |
|-------|---------|------------|
| `main` | Speed, Seek, Audio/Sub, Toggles | UP/DOWN to navigate, OK to select |
| `episodes` | Episode list | UP/DOWN to navigate, OK to play |
| `audio-subtitles` | Audio & Subtitle settings | UP/DOWN to navigate, OK to select |
| `speed` | Playback speed options | UP/DOWN to navigate, OK to select |
| `seek-buttons` | Forward/Back seek amount | UP/DOWN to navigate, OK to select |
| `double-tap-seek` | Double-tap seek amount | UP/DOWN to navigate, OK to select |
| `subtitle-delay` | Subtitle delay adjustment | LEFT/RIGHT to adjust, OK to reset |
| `audio-delay` | Audio delay adjustment | LEFT/RIGHT to adjust, OK to reset |
| `subtitle-size` | Subtitle font size | UP/DOWN to navigate, OK to select |
| `audio-tracks` | Available audio tracks | UP/DOWN to navigate, OK to select |
| `subtitle-tracks` | Available subtitle tracks | UP/DOWN to navigate, OK to select |
| `external-subtitles` | Find subtitles online | UP/DOWN to navigate, OK to add |
| `default-audio-lang` | Default audio language | Text input |
| `default-subtitle-lang` | Default subtitle language | Text input |

---

## Gesture Handling (Phone Mode)

| Gesture | Action |
|---------|--------|
| Double-tap left | Rewind (configurable seconds) |
| Double-tap right | Forward (configurable seconds) |
| Swipe left | Seek backward |
| Swipe right | Seek forward |
| Swipe up left | Brightness up |
| Swipe down left | Brightness down |
| Swipe up right | Volume up |
| Swipe down right | Volume down |
| Pinch | Zoom in/out |
| Center tap | Play/Pause (if enabled) |

---

## State Management

| Atom/Hook | Purpose |
|-----------|---------|
| `PlayerState` | Current playback state (paused, speed, time, tracks) |
| `PlayerPreferences` | User settings (seek amounts, auto-next, etc.) |
| `useControlsVisibility` | Auto-hide controls on idle |
| `usePlayerGestures` | Gesture recognition and handling |
| `useAutoNextEpisode` | Auto-play next episode |
| `useSkipData` | OP/ED skip timestamps |

---

## Navigation Transitions

```
Video Player
│
├── Back Button OK / BACK
│   └── → Return to AnimeEntryScreen
│
├── Settings Gear OK
│   └── → PlayerPanelOverlay (settings drawer)
│       └── Panel navigation (sub-panels)
│
├── Episode List OK (in Player Panel)
│   └── → Switch episode (no navigation)
│
├── Skip Next/Previous OK
│   └── → Load next/previous episode (no navigation)
│
└── Auto Next Episode
   └── → Auto-play next episode (no navigation)

```
