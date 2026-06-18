# Root Layout - Navigation Entry Point

**File**: `app/_layout.tsx`
**Component**: `RootLayout` (default export)

---

## Component Tree

```
RootLayout
├── GestureHandlerRootView
├── View (flex-1, bg-background)
│   ├── ThemeProvider (Dark/Light)
│   │   ├── StatusBar
│   │   ├── JotaiProvider (store)
│   │   │   ├── QueryClientProvider (queryClient)
│   │   │   │   ├── WebsocketProvider
│   │   │   │   │   ├── ServerUrlWrapper
│   │   │   │   │   │   ├── OtaUpdatePrompt
│   │   │   │   │   │   ├── AppReleaseUpdatePrompt
│   │   │   │   │   │   ├── Slot (Expo Router)
│   │   │   │   │   │   └── PortalHost (rn-primitives)
│   │   │   │   │   └── Toast (react-native-toast-message)
```

---

## Navigation Role

- **No direct DPAD navigation** - This is the app shell
- Providers initialize before any navigation occurs
- `Slot` renders the Expo Router navigation tree
- `PortalHost` enables modal/modals, sheets, dropdowns
- Handles offline/connection state monitoring

---

## Key Providers for TV Navigation

| Provider | Purpose |
|----------|---------|
| `TVFocusContext` | Created in TabLayout, not here |
| `WebsocketProvider` | Real-time updates (downloads, scans) |
| `ServerUrlWrapper` | Server connection management |
| `QueryClientProvider` | TanStack Query caching |

---

## Focus Implications

- No focusable elements at this level
- All TV focus management starts at `TabLayout` level
- `PortalHost` allows modals/sheets to capture focus when open

---

## Navigation Transitions From Here

```
RootLayout → Slot → (app)/_layout.tsx (TabLayout)
                  └── (out)/set-server-url (if no server configured)
```