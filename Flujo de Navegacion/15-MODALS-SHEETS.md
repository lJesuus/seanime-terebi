# Modals & Sheets - Overlay Components

**Files**:
- `src/components/ui/bottom-sheet.tsx` → `SeaBottomSheet`
- `src/components/features/media/download-episodes-modal.tsx` → `DownloadEpisodesModal`
- `src/components/features/manga/download-chapters-modal.tsx` → `DownloadChaptersModal`
- `src/components/features/player/external-player-picker-sheet.tsx` → `ExternalPlayerPickerSheet`
- `src/components/features/discover/search-filter-sheet.tsx` → `SearchFilterSheet`
- `src/components/features/torrentstream/torrent-stream-picker-sheet.tsx` → `TorrentStreamPickerSheet`
- `src/components/features/media/media-entry-quick-info-sheet.tsx` → Quick Info Sheet
- `src/components/features/media/media-episode-info-sheet.tsx` → Episode Info Sheet
- `src/components/features/media/server-download-modal.tsx` → Server Download Modal
- `src/components/features/manga/manga-manual-match-modal.tsx` → Manga Manual Match
- `src/components/features/onlinestream/onlinestream-manual-match-modal.tsx` → Online Stream Match

---

## Sheet Types

### 1. SeaBottomSheet (Bottom Sheet)
```tsx
<SeaBottomSheet
  open={open}
  onOpenChange={setOpen}
  title="Sheet Title"
  snapPoints={["45%", "90%"]}
>
  {children}
</SeaBottomSheet>
```

**DPAD Navigation in Sheet**:
- Opens from bottom (animated)
- Focus trapped within sheet
- DPAD UP/DOWN: Navigate focusable items
- OK: Activate focused item
- Back/X button: Close sheet
- Swipe down: Close sheet (phone)

---

### 2. Modal (Center Dialog)
```tsx
<Modal visible={open} transparent>
  <View className="flex-1 items-center justify-center bg-black/50">
    <View className="bg-background rounded-2xl p-6">
      {children}
    </View>
  </View>
</Modal>
```

**DPAD Navigation in Modal**:
- Opens centered (animated)
- Focus trapped within modal
- DPAD UP/DOWN/LEFT/RIGHT: Navigate items
- OK: Activate focused item
- BACK: Close modal

---

## Sheet Navigation Patterns

### DownloadEpisodesModal
```
┌─────────────────────────────────────────────┐
│  Download Episodes          [X Close]        │
├─────────────────────────────────────────────┤
│  Select episodes to download:                │
│  ┌───────────────────────────────────────┐  │
│  │  [✓] Ep 12 - Title of Episode        │  │
│  │  [✓] Ep 11 - Title of Episode        │  │
│  │  [ ] Ep 10 - Title of Episode        │  │
│  │  [ ] Ep 9 - Title of Episode         │  │
│  │  ...                                  │  │
│  └───────────────────────────────────────┘  │
│  ◄── DPAD UP/DOWN: navigate episodes ──►    │
│  OK: Toggle selection                        │
│                                              │
│  [Cancel]  [Download Selected (3)]           │
│  ◄── DPAD LEFT/RIGHT between buttons ──►    │
│  OK: Activate button                         │
└─────────────────────────────────────────────┘
```

### DownloadChaptersModal
```
┌─────────────────────────────────────────────┐
│  Download Chapters          [X Close]        │
├─────────────────────────────────────────────┤
│  Select chapters to download:                │
│  ┌───────────────────────────────────────┐  │
│  │  [✓] Ch 45 - Title of Chapter        │  │
│  │  [✓] Ch 44 - Title of Chapter        │  │
│  │  [ ] Ch 43 - Title of Chapter        │  │
│  │  ...                                  │  │
│  └───────────────────────────────────────┘  │
│  ◄── DPAD UP/DOWN: navigate chapters ──►    │
│  OK: Toggle selection                        │
│                                              │
│  [Cancel]  [Download Selected (2)]           │
│  ◄── DPAD LEFT/RIGHT between buttons ──►    │
│  OK: Activate button                         │
└─────────────────────────────────────────────┘
```

### ExternalPlayerPickerSheet
```
┌─────────────────────────────────────────────┐
│  External Player           [X Close]         │
├─────────────────────────────────────────────┤
│  Select external player:                     │
│  ┌───────────────────────────────────────┐  │
│  │  ○ Built-in player (mpv)              │  │
│  │  ● VLC Player                          │  │
│  │  ○ MX Player                           │  │
│  │  ○ Custom                              │  │
│  └───────────────────────────────────────┘  │
│  ◄── DPAD UP/DOWN: navigate players ──►     │
│  OK: Select player (radio button)           │
└─────────────────────────────────────────────┘
```

### SearchFilterSheet
```
┌─────────────────────────────────────────────┐
│  Search Filters            [X Close]         │
├─────────────────────────────────────────────┤
│  Format:                                     │
│  [TV] [Movie] [OVA] [ONA] [Special]         │
│  ◄── DPAD LEFT/RIGHT: toggle format ──►     │
│                                              │
│  Status:                                     │
│  [Releasing] [Finished] [Not Yet Aired]      │
│  ◄── DPAD LEFT/RIGHT: toggle status ──►     │
│                                              │
│  Genre:                                      │
│  [Action] [Comedy] [Drama] ...              │
│  ◄── DPAD LEFT/RIGHT: toggle genre ──►      │
│                                              │
│  Year: 2024 ▼                                │
│  ◄── DPAD LEFT/RIGHT: adjust year ──►       │
│                                              │
│  Sort: [Score ▼]                             │
│  ◄── DPAD LEFT/RIGHT: change sort ──►       │
│                                              │
│  [Apply Filters]                             │
│  OK: Apply and close                         │
└─────────────────────────────────────────────┘
```

### TorrentStreamPickerSheet
```
┌─────────────────────────────────────────────┐
│  Torrent Stream             [X Close]        │
├─────────────────────────────────────────────┤
│  Available streams:                          │
│  ┌───────────────────────────────────────┐  │
│  │  ► Server 1 - Peers: 15 - Seeds: 8   │  │
│  │    Speed: 2.5 MB/s                     │  │
│  │    Size: 1.2 GB                        │  │
│  ├───────────────────────────────────────┤  │
│  │    Server 2 - Peers: 8 - Seeds: 5    │  │
│  │    Speed: 1.8 MB/s                     │  │
│  │    Size: 800 MB                        │  │
│  ├───────────────────────────────────────┤  │
│  │    Server 3 - Peers: 3 - Seeds: 2    │  │
│  │    Speed: 0.5 MB/s                     │  │
│  │    Size: 600 MB                        │  │
│  └───────────────────────────────────────┘  │
│  ◄── DPAD UP/DOWN: navigate servers ──►     │
│  OK: Start stream                            │
│                                              │
│  [Cancel]                                    │
└─────────────────────────────────────────────┘
```

---

## Focus Trapping

All modals/sheets implement focus trapping:

```tsx
// Focus trap pattern
<Pressable
  accessible={true}
  accessibilityViewIsModal={true}
  // Focus is trapped within this view
>
  {children}
</Pressable>
```

**TV/DPAD Behavior**:
- When sheet opens, first focusable element gets focus
- DPAD navigation stays within sheet boundaries
- BACK button closes sheet (returns focus to trigger)
- Swipe down closes sheet (phone)

---

## Navigation Transitions

```
Any Screen
│
├── Download Button OK
│   └── → DownloadEpisodesModal / DownloadChaptersModal
│       └── Select items → Download → Close modal
│
├── External Player OK
│   └── → ExternalPlayerPickerSheet
│       └── Select player → Close sheet
│
├── Search Filter OK
│   └── → SearchFilterSheet
│       └── Apply filters → Close sheet
│
├── Torrent Stream OK
│   └── → TorrentStreamPickerSheet
│       └── Select server → Start stream → Close sheet
│
└── BACK / Close OK
    └── → Close sheet/modal, return focus to trigger
```
