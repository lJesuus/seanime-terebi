import { useIsTV } from "@/hooks/use-device"
import { NAV_THEME } from "@/lib/constants"
import { Portal } from "@rn-primitives/portal"
import * as React from "react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { BackHandler, findNodeHandle, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type SeaSideDrawerProps = {
    title?: string
    open: boolean
    onOpenChange: (open: boolean) => void
    children?: React.ReactNode
    footer?: React.ReactNode
    /**
     * Optional element rendered on the right side of the header (e.g. an
     * action icon). Replaces the space previously occupied by the close X.
     */
    headerAction?: React.ReactNode
    /**
     * Called when the header action element mounts, providing its native tag
     * so parent components can reference it via nextFocusUp/Down.
     */
    onHeaderActionLayout?: (tag: number) => void
    /**
     * Width of the drawer as a fraction of the screen width. Defaults to 0.85
     * so on a 360px phone portrait there's a ~54px peek of the underlying
     * content that makes the drawer feel like a side panel (not a takeover).
     */
    widthFraction?: number
    /**
     * Optional upper cap on the drawer width regardless of the fraction.
     * `undefined` (default) means no cap — the drawer takes widthFraction %
     * of the screen at any size. Pass a number to clamp on tablet/TV.
     */
    maxWidth?: number
}

const OPEN_DURATION = 250
const CLOSE_DURATION = 200

export function SeaSideDrawer({
    title,
    open,
    onOpenChange,
    children,
    footer,
    headerAction,
    onHeaderActionLayout,
    widthFraction = 0.85,
    maxWidth = Number.MAX_SAFE_INTEGER,
}: SeaSideDrawerProps) {
    const id = useId()
    const insets = useSafeAreaInsets()
    const isTV = useIsTV()
    const { width: screenWidth } = useWindowDimensions()

    // Mount persistence — stays mounted during the slide-out animation so the
    // user can see the panel leave the screen.
    const [mounted, setMounted] = useState(open)

    // Tracks the latest `open` value so the slide-out timing callback can
    // safely defer its `setMounted(false)` until after any rapid
    // open→closed→open transition has settled.
    const openRef = useRef(open)

    const translateX = useSharedValue(screenWidth)
    const backdropOpacity = useSharedValue(0)

    useEffect(() => {
        openRef.current = open
        if (open) {
            setMounted(true)
            translateX.value = withTiming(0, {
                duration: OPEN_DURATION,
                easing: Easing.out(Easing.cubic),
            })
            backdropOpacity.value = withTiming(0.55, { duration: OPEN_DURATION })
        } else if (mounted) {
            translateX.value = withTiming(
                screenWidth,
                {
                    duration: CLOSE_DURATION,
                    easing: Easing.in(Easing.cubic),
                },
                (finished) => {
                    if (finished) {
                        // Only unmount if `open` is still false. If the user
                        // re-opened during/after the slide-out, leave the
                        // panel mounted.
                        runOnJS(maybeUnmount)()
                    }
                },
            )
            backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION })
        }
    }, [open, mounted, screenWidth, translateX, backdropOpacity])

    const maybeUnmount = useCallback(() => {
        if (!openRef.current) {
            setMounted(false)
        }
    }, [])

    // TV focus trap — when focus lands on the backdrop or the bottom
    // guard, defer the focus call so the native TV focus engine finishes
    // its transition before we move focus to the title Pressable (trap
    // target). Without this delay the engine drops the programmatic
    // `.focus()` and focus leaks to the underlying page.
    const trapRef = useRef<React.ComponentRef<typeof Pressable>>(null)
    const focusTrapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const headerActionRef = useRef<React.ComponentRef<typeof View>>(null)

    const handleHeaderActionLayout = useCallback(() => {
        if (!onHeaderActionLayout) return
        const node = headerActionRef.current
        if (node) {
            const tag = findNodeHandle(node)
            if (tag !== null && tag !== undefined) {
                onHeaderActionLayout(tag)
            }
        }
    }, [onHeaderActionLayout])

    const trapFocusToTitle = useCallback(() => {
        if (!isTV) return
        if (focusTrapTimerRef.current) clearTimeout(focusTrapTimerRef.current)
        focusTrapTimerRef.current = setTimeout(() => {
            focusTrapTimerRef.current = null
            trapRef.current?.focus()
        }, 16)
    }, [isTV])

    // Clear any pending focus trap timer when the drawer closes.
    React.useEffect(() => {
        if (!open && focusTrapTimerRef.current) {
            clearTimeout(focusTrapTimerRef.current)
            focusTrapTimerRef.current = null
        }
    }, [open])

    // TV remote back button closes the drawer.
    useEffect(() => {
        if (!open) return
        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            onOpenChange(false)
            return true
        })
        return () => subscription.remove()
    }, [open, onOpenChange])

    const handleBackdropPress = useCallback(() => {
        onOpenChange(false)
    }, [onOpenChange])

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }))

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }))

    if (!mounted) return null

    const drawerWidth = Math.min(screenWidth * widthFraction, maxWidth)
    const topPadding = insets.top + 8

    return (
        <Portal name={`side-drawer-${id}`}>
            <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
                <Animated.View
                    style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, backdropStyle]}
                    pointerEvents={open ? "auto" : "none"}
                >
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={handleBackdropPress}
                        focusable={isTV}
                        onFocus={trapFocusToTitle}
                        accessibilityLabel="Close drawer"
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            right: 0,
                            width: drawerWidth,
                            backgroundColor: NAV_THEME.dark.card,
                            paddingTop: topPadding,
                        },
                        drawerStyle,
                    ]}
                    accessible={isTV ? true : undefined}
                    accessibilityViewIsModal={isTV ? true : undefined}
                >
                    <View className="flex-row items-center justify-between px-4 mb-3">
                        {title ? (
                            <Pressable
                                ref={trapRef}
                                focusable={isTV}
                                onPress={handleBackdropPress}
                                className="flex-1"
                            >
                                <Text
                                    className="text-xl font-semibold text-foreground"
                                    numberOfLines={1}
                                >
                                    {title}
                                </Text>
                            </Pressable>
                        ) : (
                            <View className="flex-1" />
                        )}
                        {headerAction && (
                            <View
                                className="ml-2"
                                ref={headerActionRef}
                                onLayout={handleHeaderActionLayout}
                            >
                                {headerAction}
                            </View>
                        )}
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: Math.max(16, insets.bottom + 8) }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            focusable={false}
                        >
                            <View style={{ flex: 1, justifyContent: 'space-between' }}>
                                <View>
                                    {children}
                                </View>
                                <View>
                                    {footer && (
                                        <View
                                            style={{
                                                marginTop: 8,
                                                paddingVertical: 12,
                                                borderTopWidth: 1,
                                                borderTopColor: "rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            {footer}
                                        </View>
                                    )}
                                    {isTV && (
                                        <View
                                            focusable
                                            onFocus={trapFocusToTitle}
                                            style={{ height: 1, opacity: 0 }}
                                            pointerEvents="none"
                                        />
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </Animated.View>

            </View>
        </Portal>
    )
}
