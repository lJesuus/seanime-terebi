import "../global.css"
import { ServerUrlWrapper } from "@/api/components/server-data-wrapper"
import { WebsocketProvider } from "@/api/components/websocket-provider"
import { getStoredTheme } from "@/atoms/storage"
import { AppReleaseUpdatePrompt } from "@/lib/app-release-updates"
import { useConnectionStateMonitor } from "@/lib/connection-state"
import { NAV_THEME } from "@/lib/constants"
import { OtaUpdatePrompt } from "@/lib/ota/updates"
import { hydrateQueryClient, OFFLINE_QUERY_KEYS, setupQueryPersistence } from "@/lib/query-persistence"
import { useColorScheme } from "@/lib/useColorScheme"
import { useServerUrl, useServerAuthToken } from "@/atoms/server.atoms"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { Ionicons } from "@expo/vector-icons"
import { DefaultTheme, Theme, ThemeProvider } from "@react-navigation/native"
import { PortalHost } from "@rn-primitives/portal"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Slot, SplashScreen } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { createStore, Provider as JotaiProvider } from "jotai"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import Toast from "react-native-toast-message"
import type { BaseToastProps } from "react-native-toast-message"
import "react-native-reanimated"

const DARK_THEME: Theme = {
    ...DefaultTheme,
    dark: true,
    colors: NAV_THEME.dark,
}

const LIGHT_THEME: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: NAV_THEME.light,
}

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from "expo-router"

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 0,
            staleTime: 0,
        },
    },
})

// Restore cached query data from MMKV for instant offline-ready UI
hydrateQueryClient(queryClient, OFFLINE_QUERY_KEYS)
// Auto-persist successful query results to MMKV
setupQueryPersistence(queryClient)

function CompactToast({ icon, iconColor, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; iconColor: string; text: string }) {
    return (
        <View
            className="max-w-80 self-center flex-row items-center gap-2 rounded-xl bg-gray-800/95 px-3.5 py-2.5"
            style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
        >
            <Ionicons name={icon} size={16} color={iconColor} />
            <Text className="shrink text-sm font-medium text-white/95" numberOfLines={2}>
                {text}
            </Text>
        </View>
    )
}

const toastConfig = {
    success: (props: BaseToastProps) => (
        <CompactToast icon="checkmark-circle" iconColor="#4ade80" text={props.text2 || ""} />
    ),
    error: (props: BaseToastProps) => (
        <CompactToast icon="close-circle" iconColor="#f87171" text={props.text2 || ""} />
    ),
    info: (props: BaseToastProps) => (
        <CompactToast icon="information-circle" iconColor="rgba(97,82,223,0.9)" text={props.text2 || ""} />
    ),
    warning: (props: BaseToastProps) => (
        <CompactToast icon="warning" iconColor="#fbbf24" text={props.text2 || ""} />
    ),
}

// Prevent the splash screen from auto-hiding before getting the color scheme.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
    const { setColorScheme, isDarkColorScheme } = useColorScheme()
    const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false)

    const [store] = React.useState(createStore())

    useConnectionStateMonitor()

    const serverUrl = useServerUrl()
    const serverAuthToken = useServerAuthToken()
    const previousServerIdentityRef = React.useRef<string | null>(null)
    const hasSeenRealIdentityRef = React.useRef(false)

    React.useEffect(() => {
        (async () => {
            const storedTheme = getStoredTheme() ?? "dark"
            setColorScheme(storedTheme)
            setIsColorSchemeLoaded(true)
        })().finally(() => {
            SplashScreen.hideAsync()
        })
    }, [])

    // Clear cross-server poisoned caches for queries whose queryKey
    // does not include serverUrl / authToken. The discover list
    // endpoints (AnilistListAnime, AnilistListManga,
    // AnilistListMissedSequels) are keyed by queryKey shape only,
    // so without this wipe a user who switches Seanime servers
    // would see the previous server's trending / seasonal / missed
    // lists until each hook's staleTime expires.
    //
    // Lifecycle (three phases, see effect body):
    //   * Phase 1 (skip): EITHER atom is null. Covers jotai's
    //     pre-hydration state at cold start as well as any
    //     asymmetric hydration arc where either atom resolves a
    //     tick before the other. We skip BEFORE constructing any
    //     identity here, so partial states during hydration never
    //     trigger the wipe that would otherwise clobber the MMKV
    //     cache that hydrateQueryClient rehydrated at module init.
    //   * Phase 2 (record): First effect run where BOTH atoms are
    //     non-null. Record the identity, flip hasSeenRealIdentityRef,
    //     and return without wiping. Sets the baseline identity used
    //     by Phase 3 to detect user-intended changes.
    //   * Phase 3 (wipe): Any subsequent run where BOTH atoms are
    //     non-null AND the (url, token) tuple differs from the
    //     recorded one \u2014 i.e. a server switch or a token refresh.
    //     Wipe the three discover queryKey prefixes; identical
    //     re-renders don't churn the cache.
    React.useEffect(() => {
        // Skip whenever EITHER atom is null. Three legitimate causes:
        //   * Cold start, jotai hasn't hydrated from MMKV yet (both null).
        //   * Asymmetric hydration arc: one atom resolves a tick before
        //     the other (e.g. token first, URL a tick later). Treating
        //     partial identities as "still hydrating" prevents the
        //     later-arriving atom from triggering a wipe that nukes
        //     the MMKV cache that `hydrateQueryClient` rehydrated at
        //     module init.
        //   * Logout transition, where jotai writes null to one or both
        //     atoms. Skipping here means we don't wipe on logout; the
        //     wipe fires on the next non-null identity.
        if (serverUrl == null || serverAuthToken == null) return

        const currentIdentity = `${serverUrl}|${serverAuthToken}`

        // First real hydration after app launch: just record the
        // identity. We must NOT wipe here, because `hydrateQueryClient`
        // already rehydrated the MMKV cache at module init and we
        // would clobber it, defeating the `staleTime: 5min` + MMKV +
        // Library prefetch chain.
        if (!hasSeenRealIdentityRef.current) {
            hasSeenRealIdentityRef.current = true
            previousServerIdentityRef.current = currentIdentity
            return
        }

        const previousIdentity = previousServerIdentityRef.current
        if (previousIdentity === currentIdentity) return

        queryClient.removeQueries({ queryKey: [API_ENDPOINTS.ANILIST.AnilistListAnime.key] })
        queryClient.removeQueries({ queryKey: [API_ENDPOINTS.MANGA.AnilistListManga.key] })
        queryClient.removeQueries({ queryKey: [API_ENDPOINTS.ANILIST.AnilistListMissedSequels.key] })

        previousServerIdentityRef.current = currentIdentity
    }, [serverUrl, serverAuthToken])

    if (!isColorSchemeLoaded) {
        return null
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <View className="flex-1 bg-background">
                <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                    <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
                    <JotaiProvider store={store}>
                        <QueryClientProvider client={queryClient}>
                            <WebsocketProvider>
                                <ServerUrlWrapper>
                                    <OtaUpdatePrompt />
                                    <AppReleaseUpdatePrompt />
                                    <Slot />
                                    <PortalHost />
                                </ServerUrlWrapper>
                            </WebsocketProvider>
                        </QueryClientProvider>
                    </JotaiProvider>
                    <Toast config={toastConfig} />
                </ThemeProvider>
            </View>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
})
