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
    // nextFocusLeft / nextFocusUp on the content wrapper.
    React.useLayoutEffect(() => {
        const count = tabs.length + 1
        if (pressableRefs.current.length < count) return
        const idx = Math.max(0, currentIndex)
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
        const itemCount = tabs.length + 1
        const down: (number | null)[] = []
        const up: (number | null)[] = []
        for (let i = 0; i < itemCount; i++) {
            if (i < tabs.length) {
                const nextRef = i < tabs.length - 1 ? pressableRefs.current[i + 1] : pressableRefs.current[tabs.length]
                const prevRef = i > 0 ? pressableRefs.current[i - 1] : null
                down.push(nextRef?.current ? (findNodeHandle(nextRef.current) as number) : null)
                up.push(prevRef?.current ? (findNodeHandle(prevRef.current) as number) : null)
            } else {
                down.push(null)
                const prevRef = pressableRefs.current[tabs.length - 1]
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

                <SidebarButton
                    key={"search"}
                    focused={false}
                    btnFocused={focusedIndex === tabs.length}
                    onPress={() => {
                        router.push("/(app)/(tabs)/discover/search")
                    }}
                    onFocus={() => setFocusedIndex(tabs.length)}
                    onBlur={() => setFocusedIndex(curr => curr === tabs.length ? null : curr)}
                    tab={{ show: true, name: "search", displayName: "Search", icon: "search-outline" }}
                    animatedLabelStyle={animatedLabelStyle}
                    viewer={user}
                    pressableRef={pressableRefs.current[tabs.length]!}                        nextFocusDown={focusChain ? focusChain.down[tabs.length] : undefined}
                        nextFocusUp={focusChain ? focusChain.up[tabs.length] : undefined}
                    />
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
