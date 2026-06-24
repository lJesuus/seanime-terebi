import { TVFocusContext } from "@/contexts/tv-focus-context"
import { FocusableView, FocusableViewHandle } from "@/components/layout/focusable-view"
import { useFocusEffect } from "expo-router"
import * as React from "react"
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

export function TabFadeView({ children, style }: { children: React.ReactNode; style?: object }) {
    const opacity = useSharedValue(0)
    const { setContentWrapperTag, currentTabButtonTag } = React.useContext(TVFocusContext)
    const rootRef = React.useRef<FocusableViewHandle>(null)

    React.useLayoutEffect(() => {
        if (rootRef.current) {
            setContentWrapperTag(rootRef.current.nativeTag as number)
        }
    }, [setContentWrapperTag])

    useFocusEffect(
        React.useCallback(() => {
            opacity.set(withTiming(1, { duration: 180 }))
            return () => {
                opacity.set(0)
            }
        }, [opacity]),
    )

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

    return (
        <FocusableView
            ref={rootRef}
            style={[{ flex: 1 }, animStyle, style]}
            {...(currentTabButtonTag ? { nextFocusLeft: currentTabButtonTag } as any : {})}
        >
            {children}
        </FocusableView>
    )
}
