# Profile Subpages

**Files**:
- `app/(app)/(tabs)/(profile)/my-lists.tsx`
- `app/(app)/(tabs)/(profile)/active-stream.tsx`
- `app/(app)/(tabs)/(profile)/download-settings.tsx`
- `app/(app)/(tabs)/(profile)/logs.tsx`
- `app/(app)/(tabs)/(profile)/server-downloads.tsx`
- `app/(app)/(tabs)/(profile)/unmatched.tsx`

---

## My Lists Screen

**File**: `app/(app)/(tabs)/(profile)/my-lists.tsx`

```
MyListsScreen
├── SafeView
│   └── ScrollView
│       ├── Header: "My Lists" + Back Button
│       ├── Anime List Section
│       │   └── CollectionFilterSheet
│       │       └── MediaEntryCard[] (focusable)
│       └── Manga List Section
│           └── CollectionFilterSheet
│               └── MediaEntryCard[] (focusable)
```

### DPAD Flow
```
DPAD UP/DOWN    → Scroll between anime/manga lists
DPAD LEFT/RIGHT → Navigate media cards within list
DPAD OK         → Open media entry screen
BACK            → Return to Profile
```

---

## Active Stream Screen

**File**: `app/(app)/(tabs)/(profile)/active-stream.tsx`

```
ActiveStreamScreen
├── SafeView
│   └── ScrollView
│       ├── Header: "Server Stream" + Back Button
│       ├── Stream Status (connection, quality)
│       ├── Stream Info (media, episode, progress)
│       └── Control Buttons
│           ├── Stop Stream (focusable)
│           └── Open in External Player (focusable)
```

### DPAD Flow
```
DPAD UP/DOWN    → Scroll content
DPAD LEFT/RIGHT → Navigate control buttons
DPAD OK         → Activate button (stop/open)
BACK            → Return to Profile
```

---

## Download Settings Screen

**File**: `app/(app)/(tabs)/(profile)/download-settings.tsx`

```
DownloadSettingsScreen
├── SafeView
│   └── ScrollView
│       ├── Header: "Download Settings" + Back Button
│       ├── Wi-Fi Only Toggle
│       ├── Download Quality Selector
│       ├── Concurrent Downloads Setting
│       └── Storage Location Setting
```

### DPAD Flow
```
DPAD UP/DOWN    → Scroll settings
DPAD LEFT/RIGHT → Toggle switches / Navigate options
DPAD OK         → Toggle / Open selector
BACK            → Return to Profile
```

---

## Logs Screen

**File**: `app/(app)/(tabs)/(profile)/logs.tsx`

```
LogsScreen
├── SafeView
│   └── ScrollView
│       ├── Header: "Logs" + Back Button
│       ├── Log Entries List
│       │   └── LogItem[] (focusable)
│       │       ├── Timestamp
│       │       ├── Log Level (info/warn/error)
│       │       └── Message
│       └── Clear Logs Button (focusable)
```

### DPAD Flow
```
DPAD UP/DOWN    → Scroll log entries
DPAD LEFT/RIGHT → Navigate between log entry parts
DPAD OK         → Expand log detail
BACK            → Return to Profile
```

---

## Server Downloads Screen

**File**: `app/(app)/(tabs)/(profile)/server-downloads.tsx`

```
ServerDownloadsScreen
├── SafeView
│   └── ScrollView
│       ├── Header: "Server Download Queue" + Back Button
│       ├── Active Downloads Section
│       │   └── DownloadItem[] (focusable)
│       │       ├── Progress Bar
│       │       ├── Download Speed
│       │       └── Cancel Button
│       ├── Completed Downloads Section
│       │   └── DownloadItem[] (focusable)
│       └── Failed Downloads Section
│           └── DownloadItem[] (focusable)
```

### DPAD Flow
```
DPAD UP/DOWN    → Scroll download sections
DPAD LEFT/RIGHT → Navigate download items
DPAD OK         → Cancel/Retry download
BACK            → Return to Profile
```

---

## Unmatched Screen

**File**: `app/(app)/(tabs)/(profile)/unmatched.tsx`

```
UnmatchedScreen
├── SafeView
│   └── ScrollView
│       ├── Header: "Resolve Unmatched" + Back Button
│       ├── Unmatched Files List
│       │   └── UnmatchedItem[] (focusable)
│       │       ├── File/Folder Name
│       │       ├── Match Button (focusable)
│       │       └── Ignore Button (focusable)
│       └── Match Dialog/Modal
│           └── Anime Search (focusable input + results)
```

### DPAD Flow
```
DPAD UP/DOWN    → Scroll unmatched items
DPAD LEFT/RIGHT → Navigate between Match/Ignore buttons
DPAD OK         → Open match dialog / Ignore
BACK            → Return to Profile
```