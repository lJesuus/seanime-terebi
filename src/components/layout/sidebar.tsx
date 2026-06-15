import { Status } from "@/api/generated/types"
import { TVFocusContext } from "@/contexts/tv-focus-context"
import { FocusableView, FocusableViewHandle } from "@/components/layout/focusable-view"
import { TabBarIcon } from "@/components/navigation/tab-bar-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { COLORS } from "@/constants/colors"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import { __sidebar_menuOpenAtom } from "@/atoms/sidebar.atoms"
import { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs"
import { useAtom } from "jotai"
import * as React from "react"
import { ComponentProps } from "react"
import { findNodeHandle, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { router, useSegments } from "expo-router"

export type AppTabConfig = {
    show: boolean
    name: string
    displayName: string
    icon: ComponentProps<typeof Ionicons>["name"]
    options?: BottomTabNavigationOptions
}

export function SidebarShell({
    tabs,
    user,
}: {
    tabs: AppTabConfig[]
    user: Status["user"] | undefined
}) {
    const segments = useSegments()
    const currentTabName = segments?.[1]
    const currentIndex = Math.max(0, tabs.findIndex(t => t.name === currentTabName))

    const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
    const isExpanded = focusedIndex !== null

    const [menuOpen, setMenuOpen] = useAtom(__sidebar_menuOpenAtom)
    const isProgrammaticRef = React.useRef(false)
    const prevMenuOpenRef = React.useRef(menuOpen)

    const { setSidebarTag } = React.useContext(TVFocusContext)
    const sidebarZoneRef = React.useRef<FocusableViewHandle>(null)

    React.useLayoutEffect(() => {
        if (sidebarZoneRef.current) {
            setSidebarTag(sidebarZoneRef.current.nativeTag as number)
        }
    }, [setSidebarTag])

    const pressableRefs = React.useRef<(React.RefObject<React.ElementRef<typeof Pressable>> | null)[]>([])

    React.useEffect(() => {
        const wasOpen = prevMenuOpenRef.current
        prevMenuOpenRef.current = menuOpen

        if (menuOpen) {
            isProgrammaticRef.current = true
            if (focusedIndex === null) {
                setFocusedIndex(currentIndex)
            }
        } else if (wasOpen) {
            isProgrammaticRef.current = false
            setFocusedIndex(null)
        }
    }, [menuOpen, currentIndex])

    React.useLayoutEffect(() => {
        if (menuOpen && focusedIndex !== null) {
            pressableRefs.current[focusedIndex]?.current?.focus()
        }
    }, [menuOpen, focusedIndex])

    React.useEffect(() => {
        if (focusedIndex === null && isProgrammaticRef.current) {
            const timer = setTimeout(() => {
                if (isProgrammaticRef.current) {
                    isProgrammaticRef.current = false
                    setMenuOpen(false)
                }
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [focusedIndex, setMenuOpen])

    const sidebarWidth = useSharedValue(80)
    const labelOpacity = useSharedValue(0)

    React.useEffect(() => {
        sidebarWidth.value = withTiming(isExpanded ? 240 : 80, { duration: 220 })
        labelOpacity.value = withTiming(isExpanded ? 1 : 0, { duration: 180 })
    }, [isExpanded])

    const animatedSidebarStyle = useAnimatedStyle(() => ({
        width: sidebarWidth.value,
    }))

    const animatedLabelStyle = useAnimatedStyle(() => ({
        opacity: labelOpacity.value,
        transform: [{ translateX: interpolate(labelOpacity.value, [0, 1], [-10, 0]) }],
    }))

    if (pressableRefs.current.length !== tabs.length) {
        pressableRefs.current = tabs.map((_, i) => pressableRefs.current[i] ?? React.createRef<React.ElementRef<typeof Pressable>>()) as (React.RefObject<React.ElementRef<typeof Pressable>> | null)[]
    }

    const [focusChain, setFocusChain] = React.useState<{ down: (number | null)[]; up: (number | null)[] } | null>(null)
    React.useLayoutEffect(() => {
        const down: (number | null)[] = []
        const up: (number | null)[] = []
        for (let i = 0; i < tabs.length; i++) {
            const nextRef = i < tabs.length - 1 ? pressableRefs.current[i + 1] : null
            const prevRef = i > 0 ? pressableRefs.current[i - 1] : null
            down.push(nextRef?.current ? (findNodeHandle(nextRef.current) as number) : null)
            up.push(prevRef?.current ? (findNodeHandle(prevRef.current) as number) : null)
        }
        setFocusChain({ down, up })
    }, [tabs.length])

    return (
        <>
            {menuOpen && (
                <View
                    style={styles.menuBackdrop}
                    pointerEvents="none"
                />
            )}

            <FocusableView
                ref={sidebarZoneRef}
                style={[styles.sidebar, animatedSidebarStyle]}
            >
                <View className="h-20 justify-center px-4 mt-6">
                    <View className="flex-row items-center gap-3">
                        <View className="w-8 h-8 rounded-xl bg-brand-500 items-center justify-center">
                            <Ionicons name="play-sharp" size={16} color="white" />
                        </View>
                        <Animated.Text
                            style={[animatedLabelStyle]}
                            className="text-lg font-bold text-white shrink"
                            numberOfLines={1}
                        >
                            SEANIME
                        </Animated.Text>
                    </View>
                </View>

                <View className="flex-1 justify-center px-3 gap-2">
                    {tabs.filter(t => t.show).map((tab, index) => {
                        const isActive = tab.name === currentTabName
                        const isBtnFocused = focusedIndex === index

                        const onPress = () => {
                            router.navigate(`/(tabs)/${tab.name}` as any)
                        }

                        const nextFocusDown = focusChain ? focusChain.down[index] : undefined
                        const nextFocusUp = focusChain ? focusChain.up[index] : undefined

                        return (
                            <SidebarButton
                                key={tab.name}
                                focused={isActive}
                                btnFocused={isBtnFocused}
                                onPress={onPress}
                                onFocus={() => setFocusedIndex(index)}
                                onBlur={() => setFocusedIndex(curr => curr === index ? null : curr)}
                                tab={tab}
                                animatedLabelStyle={animatedLabelStyle}
                                viewer={user}
                                pressableRef={pressableRefs.current[index]!}
                                nextFocusDown={nextFocusDown}
                                nextFocusUp={nextFocusUp}
                            />
                        )
                    })}
                </View>

                <View className="h-24 justify-center px-6 mb-6">
                    <Animated.Text
                        style={animatedLabelStyle}
                        className="text-xs text-muted-foreground/60 shrink font-medium"
                        numberOfLines={1}
                    >
                        Terebi Edition
                    </Animated.Text>
                </View>
            </FocusableView>
        </>
    )
}

function SidebarButton({
    focused,
    btnFocused,
    onPress,
    onFocus,
    onBlur,
    tab,
    animatedLabelStyle,
    viewer,
    pressableRef,
    nextFocusDown,
    nextFocusUp,
}: {
    focused: boolean
    btnFocused: boolean
    onPress: () => void
    onFocus: () => void
    onBlur: () => void
    tab: AppTabConfig
    animatedLabelStyle: any
    viewer: Status["user"] | undefined
    pressableRef: React.RefObject<React.ElementRef<typeof Pressable>>
    nextFocusDown?: number | null
    nextFocusUp?: number | null
}) {
    return (
        <Pressable
            ref={pressableRef}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            focusable={true}
            onFocus={onFocus}
            onBlur={onBlur}
            {...(nextFocusDown ? { nextFocusDown } as any : {})}
            {...(nextFocusUp ? { nextFocusUp } as any : {})}
            className={cn(
                "flex-row items-center h-14 rounded-2xl gap-4 px-3.5 w-full border border-transparent",
                focused && "bg-brand-500/10",
                btnFocused && "border-brand-400 bg-brand-500/20 shadow-lg"
            )}
        >
            <View className="w-8 h-8 items-center justify-center">
                {tab.name !== "(profile)" ? (
                    <TabBarIcon
                        name={tab.icon as ComponentProps<typeof Ionicons>["name"]}
                        size={24}
                        className={cn(
                            "text-gray",
                            { "text-brand-300": focused || btnFocused }
                        )}
                    />
                ) : (
                    <Avatar alt="Profile picture" className="w-7 h-7">
                        <AvatarImage source={{ uri: viewer?.viewer?.avatar?.large || "" }} />
                        <AvatarFallback>
                            <Text className="text-white text-xs font-semibold">S</Text>
                        </AvatarFallback>
                    </Avatar>
                )}
            </View>

            <Animated.Text
                className={cn(
                    "text-sm font-semibold text-gray shrink",
                    { "text-brand-300": focused || btnFocused }
                )}
                style={[animatedLabelStyle, { includeFontPadding: false }]}
                numberOfLines={1}
            >
                {tab.displayName}
            </Animated.Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    sidebar: {
        backgroundColor: COLORS.background,
        borderRightWidth: 1,
        borderRightColor: "rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
    },
    menuBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
})
