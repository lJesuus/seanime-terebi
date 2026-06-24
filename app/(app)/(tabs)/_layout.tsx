import { useCurrentUser } from "@/atoms/server.atoms"
import { __sidebar_focusedAtom } from "@/atoms/sidebar.atoms"
import { SidebarShell } from "@/components/layout/sidebar"
import { TVFocusContext } from "@/contexts/tv-focus-context"
import { router, Tabs } from "expo-router"
import { useAtomValue } from "jotai"
import * as React from "react"
import { BackHandler, Platform, ToastAndroid, View } from "react-native"

const EXIT_TOAST_DURATION = 3000 // ms

export default function TabLayout() {
    const user = useCurrentUser()
    const sidebarFocused = useAtomValue(__sidebar_focusedAtom)
    const sidebarFocusedRef = React.useRef(sidebarFocused)
    sidebarFocusedRef.current = sidebarFocused

    // ---------- Hardware back button handler (Android / TV) ----------
    const exitReadyRef = React.useRef(false)
    const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    React.useEffect(() => {
        if (Platform.OS !== "android") return

        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            // A. Sub-page active → pop it
            if (router.canGoBack()) {
                router.back()
                return true
            }

            // B. Exit toast shown within timeout → let Android exit
            if (exitReadyRef.current) {
                return false
            }

            // C. Tab root — if sidebar has focus, show exit toast.
            //    Otherwise (content has focus), do nothing — the user
            //    reaches the sidebar via LEFT or UP.
            if (sidebarFocusedRef.current) {
                exitReadyRef.current = true
                ToastAndroid.showWithGravity(
                    "Presiona atrás de nuevo para salir",
                    ToastAndroid.SHORT,
                    ToastAndroid.BOTTOM,
                )
                exitTimerRef.current = setTimeout(() => {
                    exitReadyRef.current = false
                    exitTimerRef.current = null
                }, EXIT_TOAST_DURATION)
                return true
            }

            // Content has focus — try to move focus to the sidebar.
            // (Programmatic focus is unreliable on Android TV.
            //  LEFT / UP from content are the reliable alternatives.)
            return true
        })

        return () => {
            subscription.remove()
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
        }
    }, [])
    // ----------------------------------------------------------------

    const [sidebarTag, setSidebarTag] = React.useState<number | null>(null)
    const [contentWrapperTag, setContentWrapperTag] = React.useState<number | null>(null)
    const [currentTabButtonTag, setCurrentTabButtonTag] = React.useState<number | null>(null)

    const tabs = [
        { show: true, name: "(library)", displayName: "Anime",   icon: "tv" as const },
        { show: true, name: "(manga)",   displayName: "Manga",   icon: "book" as const },
        { show: true, name: "schedule",  displayName: "Schedule", icon: "calendar" as const },
        { show: true, name: "discover",  displayName: "Discover", icon: "compass" as const },
        { show: true, name: "(profile)", displayName: "Profile",  icon: "cog-outline" as const },
    ]

    return (
        <TVFocusContext.Provider value={{ sidebarTag, setSidebarTag, contentWrapperTag, setContentWrapperTag, currentTabButtonTag, setCurrentTabButtonTag }}>
            <View style={{ flex: 1, flexDirection: "row" }}>
                <SidebarShell tabs={tabs} user={user} />
                <View style={{ flex: 1 }}>
                    <Tabs
                        initialRouteName="(library)"
                        backBehavior="none"
                        screenOptions={{ headerShown: false, freezeOnBlur: true }}
                        tabBar={() => null}
                    >
                        {tabs.map(tab => (
                            <Tabs.Screen
                                key={tab.name}
                                name={tab.name}
                                options={{ headerTitle: tab.displayName }}
                            />
                        ))}
                    </Tabs>
                </View>
            </View>
        </TVFocusContext.Provider>
    )
}
