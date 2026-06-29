import { Status } from "@/api/generated/types"
import { TVFocusContext } from "@/contexts/tv-focus-context"
import { FocusableView, FocusableViewHandle } from "@/components/layout/focusable-view"
import { TabBarIcon } from "@/components/navigation/tab-bar-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { COLORS } from "@/constants/colors"
import { IMAGES } from "@/constants/images"
import { cn } from "@/lib/utils"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Image } from "expo-image"
import { __sidebar_focusedAtom } from "@/atoms/sidebar.atoms"
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

/**
 * Sidebar — always visible left panel.
 *
 * Focus-driven expansion:
 *   - collapsed (80px, icons-only) when no button has focus
 *   - expanded  (240px, icons+labels) when any button has focus
 *
 * Focus enters the sidebar naturally via DPAD:
 *   - LEFT  from content → current tab button (nextFocusLeft on TabFadeView)
 *   - UP    from content → current tab button (nextFocusUp   on TabFadeView)
 *   - RIGHT from sidebar → content page        (nextFocusRight on each button)
 *   - LEFT  from sidebar → stays in sidebar    (no nextFocusLeft on buttons)
 *
 * OK on a tab navigates to that tab in the background (sidebar stays open).
 * The user "enters" the page with RIGHT (focus moves to content).
 */
export function SidebarShell({
    tabs,
    user,
}: {
    tabs: AppTabConfig[]
    user: Status["user"] | undefined
}) {
    const segments = useSegments()
    const currentTabName = segments?.find(s => tabs.some(t => t.name === s))
    const currentIndex = Math.max(0, tabs.findIndex(t => t.name === currentTabName))

    const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
    const isExpanded = focusedIndex !== null

    const [, setSidebarFocused] = useAtom(__sidebar_focusedAtom)

    // `contentWrapperTag` removed from the destructure on purpose: the
    // project's `FocusableView` exposes a native tag for `nextFocus*`
    // chains, but the underlying Animated.View is not itself a TV focus
    // target. `nextFocusRight` pointing at it used to trap DPAD RIGHT
    // from a sidebar button onto a dead node. RN TV's spatial engine
    // handles RIGHT navigation correctly on its own, so we do not wire
    // an explicit chain anymore.
    const { setSidebarTag, setCurrentTabButtonTag } = React.useContext(TVFocusContext)
    const sidebarZoneRef = React.useRef<FocusableViewHandle>(null)

    React.useLayoutEffect(() => {
        if (sidebarZoneRef.current) {
            setSidebarTag(sidebarZoneRef.current.nativeTag as number)
        }
    }, [setSidebarTag])

    const sidebarWidth = useSharedValue(80)
    const labelOpacity = useSharedValue(0)

    const pressableRefs = React.useRef<(React.RefObject<React.ElementRef<typeof Pressable>> | null)[]>([])

    // Publish current tab button's native tag so TabFadeView can set
    // nextFocusLeft / nextFocusUp on the content wrapper. `currentIndex`
    // is the index in the `tabs` array — with Search occupying
    // `pressableRefs[0]`, the corresponding tab button lives at
    // `pressableRefs[currentIndex + 1]`.
    React.useLayoutEffect(() => {
        const count = tabs.length + 1
        if (pressableRefs.current.length < count) return
        const idx = Math.max(0, currentIndex) + 1
        const ref = pressableRefs.current[idx]
        if (ref?.current) {
            setCurrentTabButtonTag(findNodeHandle(ref.current) as number)
        }
    }, [currentIndex, setCurrentTabButtonTag, tabs.length])

    // Publish focus state for consumers (e.g. hero carousel).
    React.useEffect(() => {
        setSidebarFocused(focusedIndex !== null)
    }, [focusedIndex, setSidebarFocused])

    // Width & label animation — expand on focus, collapse on blur.
    React.useEffect(() => {
        if (isExpanded) {
            sidebarWidth.value = 240
        } else {
            sidebarWidth.value = withTiming(80, { duration: 220 })
        }
        labelOpacity.value = withTiming(isExpanded ? 1 : 0, { duration: 180 })
    }, [isExpanded])

    const animatedSidebarStyle = useAnimatedStyle(() => ({
        width: sidebarWidth.value,
    }))

    const animatedLabelStyle = useAnimatedStyle(() => ({
        opacity: labelOpacity.value,
        transform: [{ translateX: interpolate(labelOpacity.value, [0, 1], [-10, 0]) }],
    }))

    const animatedLabelWidthStyle = useAnimatedStyle(() => ({
        width: labelOpacity.value * 110,
        overflow: "hidden",
    }))

    const itemCount = tabs.length + 1
    if (pressableRefs.current.length !== itemCount) {
        pressableRefs.current = Array.from({ length: itemCount }, (_, i) =>
            pressableRefs.current[i] ?? React.createRef<React.ElementRef<typeof Pressable>>()
        ) as (React.RefObject<React.ElementRef<typeof Pressable>> | null)[]
    }

    const [focusChain, setFocusChain] = React.useState<{ down: (number | null)[]; up: (number | null)[] } | null>(null)
    React.useLayoutEffect(() => {
        // Search sits at pressableRefs[0] (first sidebar position); tabs
        // follow at indices 1..tabs.length. DPAD-DOWN from Search walks
        // to the first tab; DPAD-UP from the first tab walks back to
        // Search. The last tab's `down` is `null` so the chain ends at
        // the bottom of the sidebar.
        const itemCount = tabs.length + 1
        const down: (number | null)[] = []
        const up: (number | null)[] = []
        for (let i = 0; i < itemCount; i++) {
            if (i === 0) {
                // Search — first position. Only one `down` (the first tab).
                const nextRef = pressableRefs.current[1]
                down.push(nextRef?.current ? (findNodeHandle(nextRef.current) as number) : null)
                up.push(null)
            } else {
                // Tab at pressableRefs index i (1..tabs.length). Vertical
                // chain within the tab range is the same as before, just
                // shifted by one because Search is now at index 0.
                const nextRef = i < tabs.length ? pressableRefs.current[i + 1] : null
                const prevRef = i > 1 ? pressableRefs.current[i - 1] : pressableRefs.current[0]
                down.push(nextRef?.current ? (findNodeHandle(nextRef.current) as number) : null)
                up.push(prevRef?.current ? (findNodeHandle(prevRef.current) as number) : null)
            }
        }
        setFocusChain({ down, up })
    }, [tabs.length])

    return (
        <FocusableView
            ref={sidebarZoneRef}
            style={[styles.sidebar, animatedSidebarStyle]}
        >
            <View className="h-20 justify-center mt-6">
                <View className="flex-row items-center justify-center">
                    <View className="w-8 h-8 items-center justify-center">
                        <Image
                            source={IMAGES.logo2}
                            style={{ width: 28, height: 28 }}
                            contentFit="contain"
                        />
                    </View>
                    <Animated.View style={[animatedLabelWidthStyle, animatedLabelStyle]}>
                        <Text className="ml-3 text-lg font-bold text-white" numberOfLines={1}>
                            SEANIME
                        </Text>
                    </Animated.View>
                </View>
            </View>

            <View className="flex-1 justify-center px-3 gap-2">
                <SidebarButton
                    key={"search"}
                    focused={false}
                    btnFocused={focusedIndex === 0}
                    onPress={() => {
                        router.push("/(app)/(tabs)/discover/search")
                    }}
                    onFocus={() => setFocusedIndex(0)}
                    onBlur={() => setFocusedIndex(curr => curr === 0 ? null : curr)}
                    tab={{ show: true, name: "search", displayName: "Search", icon: "search-outline" }}
                    animatedLabelStyle={animatedLabelStyle}
                    viewer={user}
                    pressableRef={pressableRefs.current[0]!}
                    nextFocusDown={focusChain ? focusChain.down[0] : undefined}
                    nextFocusUp={focusChain ? focusChain.up[0] : undefined}
                />

                {tabs.filter(t => t.show).map((tab, index) => {
                    // `index` is the position in the filtered tabs array
                    // (0..visibleTabs.length-1). With Search at the top
                    // of the sidebar, the tab lives at pressableRefs[index + 1]
                    // and the `focusedIndex` for it is `index + 1`.
                    const refIndex = index + 1
                    const isActive = tab.name === currentTabName
                    const isBtnFocused = focusedIndex === refIndex

                    const onPress = () => {
                        router.navigate(`/(tabs)/${tab.name}` as any)
                    }

                    const nextFocusDown = focusChain ? focusChain.down[refIndex] : undefined
                    const nextFocusUp = focusChain ? focusChain.up[refIndex] : undefined

                    return (
                        <SidebarButton
                            key={tab.name}
                            focused={isActive}
                            btnFocused={isBtnFocused}
                            onPress={onPress}
                            onFocus={() => setFocusedIndex(refIndex)}
                            onBlur={() => setFocusedIndex(curr => curr === refIndex ? null : curr)}
                            tab={tab}
                            animatedLabelStyle={animatedLabelStyle}
                            viewer={user}
                            pressableRef={pressableRefs.current[refIndex]!}
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
    nextFocusLeft,
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
    nextFocusLeft?: number | null
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
            {...(nextFocusLeft ? { nextFocusLeft } as any : {})}
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
})
