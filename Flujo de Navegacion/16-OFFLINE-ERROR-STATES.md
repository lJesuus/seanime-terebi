# Offline, Error & Loading States

**Files**:
- `src/components/shared/centered-spinner.tsx` → `CenteredSpinner`
- `src/components/shared/luffy-error.tsx` → `LuffyError`
- `src/components/shared/offline-banner.tsx` → `OfflineBanner`
- `src/lib/offline/use-offline.ts` → `useIsServerConnected`, `useServerConnectionState`
- `src/lib/connection-state.ts` → Connection state monitoring
- `app/(out)/set-server-url.tsx` → Server URL setup screen

---

## State Types

### 1. Loading State (CenteredSpinner)
```tsx
// Shown when data is being fetched
<View className="flex-1 bg-background justify-center items-center">
  <CenteredSpinner />
</View>
```

**No DPAD navigation** - Loading state is non-interactive.

---

### 2. Error State (LuffyError)
```tsx
// Shown when data fetch fails or unavailable
<View className="flex-1 items-center justify-center px-8">
  <LuffyError
    title="Error title"
    description="Error description"
  />
  <TouchableOpacity onPress={() => router.back()}>
    <Text>Go back</Text>
  </TouchableOpacity>
</View>
```

**DPAD Navigation**:
- Focus on "Go back" button
- OK → Return to previous screen

---

### 3. Offline State (OfflineBanner)
```tsx
// Banner shown at top of screen when disconnected
<OfflineBanner />
// Shows: "Offline" with connection icon
```

**No DPAD navigation** - Informational banner only.

---

### 4. Empty State (LuffyError with custom content)
```tsx
// Shown when library/list is empty
<View className="flex-1 items-center justify-center px-8">
  <Ionicons name="tv-outline" size={40} color="rgba(255,255,255,0.2)" />
  <Text>Your anime library is empty</Text>
  <Text>Add anime to your collection or use the Discover tab</Text>
</View>
```

**No DPAD navigation** - Informational state.

---

## Connection States

| State | Description | UI Behavior |
|-------|-------------|-------------|
| `connected` | Server is reachable | Normal operation |
| `connecting` | Checking server | "Checking server" indicator |
| `disconnected` | Server unreachable | Offline mode, cached data |

---

## Server URL Setup Screen

**File**: `app/(out)/set-server-url.tsx`

```
ServerUrlScreen
├── SafeView
│   └── ScrollView
│       ├── Header: "Connect to Server"
│       ├── Server URL Input (focusable)
│       │   └── TextInput with validation
│       ├── Connect Button (focusable)
│       ├── QR Code Scanner Button (focusable)
│       ├── Recent Servers List
│       │   └── ServerItem[] (focusable)
│       │       ├── Server Name
│       │       └── Server URL
│       └── Help/Instructions
```

### DPAD Flow (Server Setup)
```
┌─────────────────────────────────────────────────────────────┐
│  Server URL Setup                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Connect to Server                                   │   │
│  │                                                      │   │
│  │  Enter your Seanime server URL:                      │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  http://192.168.1.100:8095                    │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ◄── DPAD LEFT/RIGHT to move cursor ──►             │   │
│  │  OK to focus input (on-screen keyboard)             │   │
│  │                                                      │   │
│  │  [Connect]  [Scan QR Code]                           │   │
│  │  ◄── DPAD LEFT/RIGHT between buttons ──►            │   │
│  │  OK to activate                                      │   │
│  │                                                      │   │
│  │  Recent Servers:                                     │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  ► Home Server - 192.168.1.100:8095           │  │   │
│  │  │    Office Server - 192.168.1.50:8095          │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ◄── DPAD UP/DOWN: navigate servers ──►             │   │
│  │  OK to select server                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Offline Mode Behaviors

### Manual Offline Mode
```typescript
// Profile toggle: "Offline Mode"
// Forces offline behavior even when connected
const [manualOffline, setManualOffline] = useManualOfflineMode()
```

### Offline Entry Resolution
```typescript
// When offline, entries are resolved from cache
const offlineEntry = resolveOfflineAnimeEntry(mediaId)
const offlineEntry = resolveOfflineMangaEntry(mediaId)
```

### View Switching (Offline)
```typescript
// AnimeEntryScreen: Force "downloaded" view when offline
useEffect(() => {
  if (isOffline && (currentView === "library" || 
      currentView === "torrentstream" || 
      currentView === "onlinestream")) {
    setCurrentView("downloaded")
  }
}, [isOffline, currentView])

// MangaEntryScreen: Force "downloaded" view when offline
useEffect(() => {
  if (isOffline && currentView === "chapters") {
    setCurrentView("downloaded")
  }
}, [isOffline, currentView])
```

---

## Navigation Behaviors by State

| State | Navigation Behavior |
|-------|---------------------|
| Loading | No interaction, spinner shown |
| Error | "Go back" button focusable |
| Empty | Informational, no interaction |
| Offline | Limited navigation (no streaming) |
| Connected | Full navigation available |

---

## Focus Implications

### When Offline:
- Streaming views hidden (torrentstream, onlinestream)
- Downloaded view forced
- Streaming profile items hidden
- Server library items hidden

### When Error:
- Error state shown
- Back button available
- No other navigation

### When Loading:
- Spinner shown
- No focusable elements
- Wait for data

---

## Navigation Transitions

```
Any Screen (Loading)
│
├── Data Loaded
│   └── → Normal screen content
│
├── Data Error
│   └── → LuffyError state
│       └── Back Button OK → router.back()
│
└── No Connection
    └── → OfflineBanner + Limited content
        └── Offline views only

Server URL Setup
│
├── Connect OK
│   └── → Validate URL → Connect → Navigate to main app
│
├── Scan QR OK
│   └── → Open camera scanner
│
└── Select Server OK
    └── → Set URL → Connect → Navigate to main app
```
