import { Platform } from "react-native"

/**
 * `RefreshControl` on iOS races with the scroll engine's 60→120 Hz
 * promotion and stops listening for the drag-end. The workaround nudges
 * the ScrollView's `contentInset` once when `enableNativeRefreshRate`
 * is set, which restores the natural-rate refresh.
 *
 * Now that the app ships only for tvOS + Android TV (iOS is out of
 * scope) the hook is still called from feature files that haven't been
 * swept yet. The function is a no-op on every remaining platform and is
 * kept exported so the call-sites continue to typecheck.
 */
export function useIOSScrollRefreshRateWorkaround() {
    if (Platform.OS !== "ios") return
}
