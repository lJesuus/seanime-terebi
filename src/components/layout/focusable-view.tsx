import React from "react"
import { findNodeHandle, ViewProps } from "react-native"
import Animated from "react-native-reanimated"

export type FocusableViewHandle = {
    nativeTag: number | null
}

type FocusableViewProps = ViewProps & {
    children?: React.ReactNode
    style?: any
    className?: string
    animatedProps?: object
}

export const FocusableView = React.forwardRef<FocusableViewHandle, FocusableViewProps>(
    (props, ref) => {
        const innerRef = React.useRef<React.ComponentRef<typeof Animated.View>>(null)

        React.useImperativeHandle(ref, () => ({
            get nativeTag() {
                return findNodeHandle(innerRef.current) ?? null
            },
        }))

        return (
            <Animated.View ref={innerRef} {...props} />
        )
    }
)
