import { ConfigContext, ExpoConfig } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: "Seanime",
    slug: "seanime-app",
    version: "0.1.20",
    orientation: "default",
    icon: "./src/assets/images/icon.png",
    scheme: "seanime",
    userInterfaceStyle: "automatic",
    jsEngine: "hermes",
    runtimeVersion: {
        policy: "appVersion",
    },
    updates: {
        enabled: true,
        url: "https://seanime.app/api/ota/manifest",
        checkAutomatically: "NEVER",
        fallbackToCacheTimeout: 0,
        requestHeaders: {
            "expo-channel-name": "stable",
        },
    },
    // tvOS is shipped from this `ios` config under the dedicated
    // `appleTV` EAS build profile. iPhone / iPad handset targets are
    // dropped — `supportsTablet` is removed and Info.plist phone-only
    // keys (LSApplicationQueriesSchemes, withPiPSupport plugin) are
    // removed.
    ios: {
        buildNumber: "20",
        appleTeamId: process.env.EXPO_APPLE_TEAM_ID || "",
        bundleIdentifier: "app.seanime.tenji",
        infoPlist: {
            NSLocalNetworkUsageDescription: "Seanime needs local network access to connect to your server on your home network.",
            UIBackgroundModes: [
                "audio",
            ],
            UISupportedInterfaceOrientations: [
                "UIInterfaceOrientationLandscapeLeft",
                "UIInterfaceOrientationLandscapeRight",
            ],
            // tvOS apps that talk to a LAN server need the local-networking
            // ATS exception. Without this, http://192.168.x.x requests are
            // silently blocked.
            NSAppTransportSecurity: {
                NSAllowsLocalNetworking: true,
            },
        },
    },
    // Android: TV-only build. `supportsTV: true` enables the Android TV
    // launcher / banner / Leanback resources. Phone and tablet form-factors
    // are no longer supported.
    android: {
        jsEngine: "hermes",
        versionCode: 20,
        usesCleartextTraffic: true,
        adaptiveIcon: {
            foregroundImage: "./src/assets/images/adaptive-icon.png",
            backgroundColor: "#171140",
        },
        package: "app.seanime.tenji",
        supportsTV: true,
        tvBanner: "./src/assets/images/tv-banner.png",
    } as any,
    plugins: [
        "expo-router",
        [
            "expo-splash-screen",
            {
                image: "./src/assets/images/splash-logo.png",
                resizeMode: "contain",
                backgroundColor: "#070707",
                android: {
                    imageWidth: 200,
                    resizeMode: "contain",
                },
                ios: {
                    imageWidth: 100,
                    resizeMode: "contain",
                },
            },
        ],
        "./plugins/withAndroidExternalPlayerQueries",
        "./plugins/withAndroidLanCleartext",
        "./plugins/withAndroidReactNativeArchitectures",
        "./plugins/withLibcppPickFirst",
        "./plugins/withMPVKitiOS",
        "expo-updates",
        "expo-image",
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
})
