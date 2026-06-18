# Player Panels - Settings Overlay

**File**: `src/components/features/player/player-panel.tsx`
**Component**: `PlayerPanelOverlay`

---

## Panel Hierarchy

```
PlayerPanelOverlay (main entry point)
│
├── main (Main Settings)
│   ├── speed → SpeedContent
│   ├── double-tap-seek → SeekAmountContent
│   ├── audio-subtitles → AudioSubtitlesContent
│   ├── toggle-auto-next → (inline toggle)
│   ├── toggle-auto-skip-op-ed → (inline toggle)
│   ├── toggle-center-tap → (inline toggle)
│   ├── toggle-side-swipe → (inline toggle)
│   ├── pip → (Picture-in-Picture)
│   │
│   └── audio-subtitles (Sub-panel)
│       ├── audio-tracks → TrackContent
│       ├── audio-delay → DelayContent
│       ├── default-audio-lang → LanguagePrefContent
│       ├── subtitle-tracks → TrackContent
│       ├── subtitle-delay → DelayContent
│       ├── subtitle-size → SubSizeContent
│       ├── default-subtitle-lang → SubtitleLanguagePrefContent
│       └── external-subtitles → ExternalSubtitleSearchContent
│
├── episodes (Episode List)
│   └── EpisodesListContent
│
└── (back navigation via getBackPanel())
```

---

## Panel Navigation Map

```
┌─────────────────────────────────────────────────────────────┐
│  MAIN PANEL                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ← [Back]     Settings            [X Close]         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  ▸ Playback Speed        Normal       →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Double-Tap Seek       10s          →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Audio & Subtitles     Tracks, delays →     │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ● Auto Next Episode     On                   │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ● Auto Skip OP/ED      Off                   │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ● Tap to Play & Pause  On                    │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ● Gesture Controls     Off                   │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Picture-in-Picture                            │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Screen Lock                                    │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ◄── DPAD UP/DOWN: navigate options ──►              │   │
│  │  ◄── DPAD LEFT/RIGHT: no-op ──►                      │   │
│  │  OK: Select option / Toggle setting                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

│
│ OK on "Audio & Subtitles"
▼

┌─────────────────────────────────────────────────────────────┐
│  AUDIO & SUBTITLES PANEL                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [← Back]   Audio & Subtitles       [X Close]       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  AUDIO                                               │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  ▸ Track           Japanese           →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Delay           Off                →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Default Language Not set            →       │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  SUBTITLES                                          │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  ▸ Track           English            →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Delay           Off                →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Font Size       48                 →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Default Language Not set            →       │  │   │
│  │  ├───────────────────────────────────────────────┤  │   │
│  │  │  ▸ Find Subtitles  Key required       →       │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ◄── DPAD UP/DOWN: navigate options ──►              │   │
│  │  OK: Select option                                   │   │
│  │  [← Back]: Return to main panel                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Panel Content Components

### 1. SpeedContent
```tsx
PanelSelectableRow[]:
  - 0.25x, 0.5x, 0.75x, 1.0x (Normal), 1.25x, 1.5x, 1.75x, 2.0x
  - Focus: Active row highlighted
  - DPAD UP/DOWN: Navigate speeds
  - OK: Select speed, close panel
```

### 2. SeekAmountContent
```tsx
PanelSelectableRow[]:
  - 3s (Default), 5s, 10s, 15s, 30s, 60s
  - Focus: Active row highlighted
  - DPAD UP/DOWN: Navigate options
  - OK: Select amount, close panel
```

### 3. TrackContent (Audio/Subtitle)
```tsx
PanelSelectableRow[]:
  - None (if allowNone)
  - Track 1: Language, Codec
  - Track 2: Language, Codec
  - ...
  - Focus: Active row highlighted
  - DPAD UP/DOWN: Navigate tracks
  - OK: Select track, close panel
```

### 4. DelayContent (Subtitle/Audio Delay)
```tsx
Delay Controls:
  - Display: "+1.5s" / "-0.5s" / "No delay"
  - [-] Button: Decrease delay
  - [Reset] Button: Reset to 0
  - [+] Button: Increase delay
  - Focus: DPAD LEFT/RIGHT between buttons
  - OK: Activate button
```

### 5. SubSizeContent
```tsx
PanelSelectableRow[]:
  - 24, 32, 40, 48 (Default), 56, 64, 72
  - Focus: Active row highlighted
  - DPAD UP/DOWN: Navigate sizes
  - OK: Select size, close panel
```

### 6. ExternalSubtitleSearchContent
```tsx
Filter Controls:
  - Source: OpenSubtitles, etc. (horizontal chips)
  - Language: English, Japanese, etc. (horizontal chips)
  - Format: SRT, ASS, etc. (horizontal chips)
- Search Results:
  - PanelSelectableRow[]: Subtitle results
  - Focus: Row highlighted
  - OK: Add subtitle track
```

### 7. EpisodesListContent
```tsx
Episode Rows:
  - Episode Number + Title
  - Focus: Active episode highlighted
  - DPAD UP/DOWN: Navigate episodes
  - OK: Play episode (if not current)
  - Current episode: Highlighted, disabled
```

---

## Back Navigation Map

```typescript
const PANEL_BACK_MAP: Record<PlayerPanel, PlayerPanel | null> = {
  main: null,                              // Close panel
  episodes: "main",                        // Back to main
  "audio-subtitles": "main",              // Back to main
  speed: "main",                           // Back to main
  "seek-buttons": "main",                 // Back to main
  "double-tap-seek": "main",              // Back to main
  "subtitle-delay": "audio-subtitles",    // Back to audio-subtitles
  "audio-delay": "audio-subtitles",       // Back to audio-subtitles
  "subtitle-size": "audio-subtitles",     // Back to audio-subtitles
  "audio-tracks": "audio-subtitles",      // Back to audio-subtitles
  "subtitle-tracks": "audio-subtitles",   // Back to audio-subtitles
  "external-subtitles": "audio-subtitles", // Back to audio-subtitles
  "default-audio-lang": "audio-subtitles", // Back to audio-subtitles
  "default-subtitle-lang": "audio-subtitles", // Back to audio-subtitles
}
```

---

## Navigation Transitions

```
PlayerPanelOverlay
│
├── Back Button OK
│   └── → Previous panel (via getBackPanel())
│
├── Speed OK
│   └── → SpeedContent (select speed)
│       └── OK → Close panel, apply speed
│
├── Audio & Subtitles OK
│   └── → AudioSubtitlesContent (sub-panel)
│       ├── Track OK → TrackContent (select track)
│       ├── Delay OK → DelayContent (adjust delay)
│       ├── Font Size OK → SubSizeContent (select size)
│       └── Find Subtitles OK → ExternalSubtitleSearchContent
│
├── Episodes OK
│   └── → EpisodesListContent (episode list)
│       └── Episode OK → Play episode, close panel
│
└── Close (X) OK
    └── → Close panel overlay
```
