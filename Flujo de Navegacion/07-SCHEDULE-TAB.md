# Schedule Tab - Anime Calendar

**File**: `app/(app)/(tabs)/schedule/index.tsx`
**Component**: `ScheduleScreen` (default export)

---

## Component Tree

```
ScheduleScreen
├── View (flex-1, bg-background)
│   ├── OfflineBanner
│   ├── TabFadeView
│   │   ├── Header Bar
│   │   │   ├── TvFocusablePressable (Today button - icon)
│   │   │   ├── TvFocusablePressable (Previous Week - chevron-back)
│   │   │   ├── TvFocusablePressable (Month Year Label - opens picker)
│   │   │   ├── TvFocusablePressable (Next Week - chevron-forward)
│   │   │   └── TvFocusablePressable (Settings - options-outline)
│   │   ├── WeekDaySelector
│   │   │   └── WeekDayItem[] (Mon-Sun, focusable)
│   │   ├── ScheduleGrid (FlatList, numColumns=3/5)
│   │   │   └── ScheduleCardWrapper[]
│   │   │       └── MediaEntryCard (focusable, with overlay)
│   │   ├── ScheduleSettingsSheet (Bottom Sheet)
│   │   │   └── SettingsStatusItem[] (toggle list status filters)
│   │   └── MonthYearPicker (Bottom Sheet)
│   │       └── MonthItem[] (Jan-Dec, focusable)
```

---

## DPAD Navigation Flow

```
┌────────────────────────────────────────────────────────────┐
│  ScheduleScreen                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅 [◀]  ◄── 2025 January ──►  [▶]              ⚙️  │   │
│  │  ◄── DPAD LEFT/RIGHT between controls ──►           │   │
│  │  OK to navigate weeks/months                        │   │
│  │  ⚙️ OK to open Settings Sheet                       │   │
│  │  📅 OK to go to Today                               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Mon  Tue  Wed  Thu  Fri  Sat  Sun                  │   │
│  │  ◄── DPAD LEFT/RIGHT between days ──►               │   │
│  │  OK to select day                                   │   │
│  │  (shows event count below each day)                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                       │   │
│  │  │ Card │  │ Card │  │ Card │  ← Row 1              │   │
│  │  │ 14:30│  │ 15:00│  │ 16:00│                       │   │
│  │  └──────┘  └──────┘  └──────┘                       │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                       │   │
│  │  │ Card │  │ Card │  │ Card │  ← Row 2              │   │
│  │  │ 17:30│  │ 18:00│  │ 19:00│                       │   │
│  │  └──────┘  └──────┘  └──────┘                       │   │
│  │  ◄── DPAD LEFT/RIGHT: navigate cards in row ──►     │   │
│  │  ◄── DPAD UP/DOWN: navigate between rows ──►        │   │
│  │  OK to open anime entry                             │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## Focusable Components

### 1. Header Bar Controls
```tsx
TvFocusablePressable:
  - Today Button (icon): OK → goToToday()
  - Previous Week: OK → goToPreviousWeek()
  - Month/Year Label: OK → setMonthPickerOpen(true)
  - Next Week: OK → goToNextWeek()
  - Settings Button: OK → setSettingsOpen(true)
```

### 2. WeekDayItem (7 items)
```tsx
Pressable focusable={isTV}:
  - Focus: Scale 1.12x, bg-white/5
  - DPAD LEFT/RIGHT: Navigate between days
  - OK: Select day (updates selectedDayEvents)
```

### 3. ScheduleCardWrapper → MediaEntryCard
```tsx
Pressable focusable={isTV}:
  - Focus: Scale animation
  - DPAD LEFT/RIGHT: Navigate cards in row
  - DPAD UP/DOWN: Navigate between rows
  - OK: router.push(/(app)/entry/anime/${mediaId})
  - Overlay shows: time, episode number, watched indicator
```

### 4. ScheduleSettingsSheet (Bottom Sheet)
```tsx
SeaBottomSheet:
  - SettingsStatusItem[]: Toggle status filters (Watching, Planning, etc.)
  - Focusable toggle rows with checkmark indicator
  - DPAD UP/DOWN: Navigate status options
  - OK: Toggle filter on/off
```

### 5. MonthYearPicker (Bottom Sheet)
```tsx
SeaBottomSheet:
  - Year navigation: DPAD LEFT/RIGHT for ◀ ▶
  - MonthItem[]: Grid of months (4x3)
  - Focus: Scale 1.08x, active month highlighted
  - DPAD navigation between months
  - OK: Select month, close sheet
```

---

## Schedule Grid Layout

```typescript
// Platform-aware columns
const NUM_COLUMNS = isTV ? 5 : 3
const GRID_SPACING = isTV ? 16 : 10
const GRID_PADDING = isTV ? 28 : 14
const CARD_WIDTH = (SCREEN_WIDTH - (NUM_COLUMNS-1) * GRID_SPACING - 2 * GRID_PADDING) / NUM_COLUMNS
```

---

## Navigation Transitions

```
ScheduleScreen
│
├── MediaEntryCard OK
│   └── → /(app)/entry/anime/${mediaId} (AnimeEntryScreen)
│
├── Settings Button OK
│   └── → ScheduleSettingsSheet (Bottom Sheet)
│       └── Status filter toggle
│
├── Month/Year Label OK
│   └── → MonthYearPicker (Bottom Sheet)
│       └── Month selection
│
└── WeekDayItem OK
    └── → Updates selectedDayEvents (no navigation)
```
