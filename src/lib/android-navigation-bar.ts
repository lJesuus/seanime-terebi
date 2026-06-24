// expo-navigation-bar exposes a default-export `NavigationBar` namespace.
// The platform prune keeps this exported because ThemeToggle.tsx still
// imports it; on tvOS + Android TV the calls are no-ops, but the import
// graph must typecheck. Without this file, ThemeToggle.tsx fails to
// resolve `@/lib/android-navigation-bar` and the project stops building.
import * as NavigationBar from "expo-navigation-bar"

export async function setAndroidNavigationBar(theme: "light" | "dark") {
    try {
        await NavigationBar.setBackgroundColorAsync(theme === "dark" ? "#000000" : "#FFFFFF")
    } catch {
        // expo-navigation-bar may not be available on tvOS/Android TV.
    }
}
