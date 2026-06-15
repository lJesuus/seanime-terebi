import { __sidebar_menuOpenAtom } from "@/atoms/sidebar.atoms"
import { useCurrentUser } from "@/atoms/server.atoms"
import { TabBar } from "@/components/layout/tabs"
import { AppTabConfig, SidebarShell } from "@/components/layout/sidebar"
import { TVFocusContext } from "@/contexts/tv-focus-context"
import { useShowSidebar } from "@/hooks/use-device"
import { router, Tabs } from "expo-router"
import { useAtom } from "jotai"
import * as React from "react"
import { BackHandler, Platform, ToastAndroid, View } from "react-native"

const EXIT_TOAST_DURATION = 3000 // ms

export default function TabLayout() {
    const user = useCurrentUser()
    const showSidebar = useShowSidebar()
    const [menuOpen, setMenuOpen] = useAtom(__sidebar_menuOpenAtom)

    const showSidebarRef = React.useRef(showSidebar)
    showSidebarRef.current = showSidebar
    const menuOpenRef = React.useRef(menuOpen)
    menuOpenRef.current = menuOpen

    // ---------- Hardware back button handler (Android / TV) ----------
    const exitReadyRef = React.useRef(false)
    const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    React.useEffect(() => {
        if (Platform.OS !== "android") return

        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            // 1. If there's a page to go back to (subpage / entry / detail), navigate back
            if (router.canGoBack()) {
                router.back()
                return true
            }

            // At root level (no page to go back to)

            // 2. On TV / landscape (sidebar visible): toggle sidebar menu or exit
            if (showSidebarRef.current) {
                if (menuOpenRef.current) {
                    // Menu is open → close it and arm exit
                    setMenuOpen(false)
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

                // Menu is closed → open sidebar menu
                setMenuOpen(true)
                // Reset exit state when opening menu
                exitReadyRef.current = false
                if (exitTimerRef.current) {
                    clearTimeout(exitTimerRef.current)
                    exitTimerRef.current = null
                }
                return true
            }

            // 3. Phone portrait (no sidebar): original double-back-to-exit behavior
            if (exitReadyRef.current) {
                if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
                BackHandler.exitApp()
                return true
            }

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
        })

        return () => {
            subscription.remove()
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
        }
    }, [])
    // ----------------------------------------------------------------

    const [sidebarTag, setSidebarTag] = React.useState<number | null>(null)
    const [contentWrapperTag, setContentWrapperTag] = React.useState<number | null>(null)

    const tabs: AppTabConfig[] = [
        {
            show: true,
            name: "(library)",
            displayName: "Anime",
            icon: "tv",
        },
        {
            show: true,
            name: "(manga)",
            displayName: "Manga",
            icon: "book",
        },
        {
            show: true,
            name: "schedule",
            displayName: "Schedule",
            icon: "calendar",
        },
        {
            show: true,
            name: "discover",
            displayName: "Discover",
            icon: "compass",
        },
        {
            show: true,
            name: "(profile)",
            displayName: "Profile",
            icon: "cog-outline",
        },
    ]

    const tabBar = React.useCallback(
        (props: any) => <TabBar user={user} tabs={tabs} {...props} />,
        [user, tabs],
    )

    const tabsContent = (
        <Tabs
            initialRouteName="(library)"
            screenOptions={{ headerShown: false, freezeOnBlur: true }}
            tabBar={tabBar}
        >
            {tabs.map(tab => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        ...tab.options,
                        headerTitle: tab.displayName,
                    }}
                />
            ))}
        </Tabs>
    )

    return (
        <TVFocusContext.Provider value={{ sidebarTag, setSidebarTag, contentWrapperTag, setContentWrapperTag }}>
            {showSidebar ? (
                <View style={{ flex: 1, flexDirection: "row" }}>
                    <SidebarShell tabs={tabs} user={user} />
                    <View style={{ flex: 1 }}>
                        {tabsContent}
                    </View>
                </View>
            ) : (
                tabsContent
            )}
        </TVFocusContext.Provider>
    )
}
