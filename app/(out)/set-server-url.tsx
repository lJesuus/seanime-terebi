import { buildSeaQuery } from "@/api/client/requests"
import { hashServerPassword } from "@/api/client/server-auth"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { useSetServerUrl } from "@/atoms/server.atoms"
import { useServerUrl, useSetServerAuthToken, useSetServerStatus } from "@/atoms/server.atoms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IMAGES } from "@/constants/images"
import { logger } from "@/lib/utils/logger"
import { toast } from "@/lib/utils/toast"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import * as React from "react"
import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"

export default function Screen() {
    const currentServerUrl = useServerUrl()
    const setServerStatus = useSetServerStatus()
    const setServerAuthToken = useSetServerAuthToken()

    const [inputValue, setInputValue] = React.useState(currentServerUrl ?? "")
    const [passwordValue, setPasswordValue] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const setServerUrl = useSetServerUrl()

    const urlInputRef = React.useRef<any>(null)
    const passwordInputRef = React.useRef<any>(null)

    const showErrorToast = React.useCallback((message: string) => {
        toast.error(message, {
            position: "bottom",
            visibilityTime: 1000,
        })
    }, [])

    const handleOnContinue = React.useCallback(() => {
        let sanitizedUrl = inputValue.trim()
        if (!sanitizedUrl) {
            showErrorToast("Please enter a valid server URL")
            return
        }

        if (!sanitizedUrl.startsWith("http://") && !sanitizedUrl.startsWith("https://")) {
            showErrorToast("URL must start with http:// or https://")
            return
        }
        void (async () => {
            if (sanitizedUrl.endsWith("/")) {
                sanitizedUrl = sanitizedUrl.slice(0, -1)
            }

            const trimmedPassword = passwordValue.trim()
            const hashedPassword = trimmedPassword ? hashServerPassword(trimmedPassword) : null

            setIsSubmitting(true)

            logger("set-server-url").info("Setting server url:", sanitizedUrl)

            try {
                await buildSeaQuery({
                    serverUrl: sanitizedUrl,
                    endpoint: API_ENDPOINTS.SETTINGS.GetSettings.endpoint,
                    method: API_ENDPOINTS.SETTINGS.GetSettings.methods[0],
                    authToken: hashedPassword,
                    muteError: true,
                })

                await setServerStatus(null)
                await setServerAuthToken(hashedPassword)
                await setServerUrl(sanitizedUrl)

                toast.success(`Server connection saved\n${sanitizedUrl}`, {
                    position: "bottom",
                    visibilityTime: 1000,
                })

                router.replace("/(app)/(tabs)/(library)")
            }
            catch (error) {
                const message = error instanceof Error
                    ? error.message
                    : (typeof error === "object" && error !== null && "error" in error && typeof error.error === "string"
                        ? error.error
                        : "Unable to connect to the server")

                if (message === "UNAUTHENTICATED") {
                    showErrorToast(trimmedPassword ? "Server password is incorrect" : "This server requires a password")
                } else if (message.includes("Network request failed") || message.includes("Failed to fetch")) {
                    showErrorToast("Could not reach the server")
                } else {
                    showErrorToast(message)
                }
            }
            finally {
                setIsSubmitting(false)
            }
        })()
    }, [inputValue, passwordValue, setServerAuthToken, setServerStatus, setServerUrl, showErrorToast])

    return (
        <View className="flex-1 bg-background">
            <LinearGradient
                colors={["#141527", "#0c0c0c"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1 }} edges={["top", "right", "bottom", "left"]}>
                <View className="flex-1 flex-row items-center px-12 lg:px-20 gap-8">
                    {/* Left Side: Brand and Instructions */}
                    <View className="flex-[0.45] justify-center pr-8 border-r border-white/5">
                        <View className="mb-6 items-start">
                            <Image
                                className="w-24 h-24"
                                source={IMAGES.logo2}
                                contentFit="contain"
                            />
                        </View>
                        <Text className="text-3xl font-bold text-white mb-3 tracking-tight">
                            Connect to Seanime
                        </Text>
                        <Text className="text-sm text-white/60 leading-relaxed mb-6">
                            Enter your Seanime server URL and password. Make sure the server is running on your local network.
                        </Text>
                        <View className="gap-3 bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                            <View className="flex-row items-start gap-2.5">
                                <Text className="text-xs font-semibold bg-brand-500/20 text-brand-300 w-5 h-5 rounded-full text-center leading-5">1</Text>
                                <Text className="text-xs text-white/50 leading-5">Run the Seanime Desktop server on your PC.</Text>
                            </View>
                            <View className="flex-row items-start gap-2.5">
                                <Text className="text-xs font-semibold bg-brand-500/20 text-brand-300 w-5 h-5 rounded-full text-center leading-5">2</Text>
                                <Text className="text-xs text-white/50 leading-5">Verify that both devices are on the same Wi-Fi network.</Text>
                            </View>
                        </View>
                    </View>

                    {/* Right Side: Form */}
                    <View className="flex-[0.55] justify-center pl-8">
                        <View className="gap-6 w-full max-w-md">
                            <View className="gap-2">
                                <Label htmlFor="server-url-input" nativeID="server-url-label" className="text-sm font-semibold text-white/80">
                                    Server URL
                                </Label>
                                <Input
                                    ref={urlInputRef}
                                    hasTVPreferredFocus={true}
                                    nativeID="server-url-input"
                                    className="w-full text-sm"
                                    placeholder="http://192.168.1.1:43211"
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                                />
                            </View>

                            <View className="gap-2">
                                <Label htmlFor="server-password-input" nativeID="server-password-label" className="text-sm font-semibold text-white/80">
                                    Server Password
                                </Label>
                                <Input
                                    ref={passwordInputRef}
                                    nativeID="server-password-input"
                                    className="w-full text-sm"
                                    placeholder="Optional"
                                    value={passwordValue}
                                    onChangeText={setPasswordValue}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    secureTextEntry
                                    textContentType="password"
                                    returnKeyType="done"
                                    onSubmitEditing={handleOnContinue}
                                />
                                <Text className="text-xs text-white/35">
                                    Leave this blank if the server does not require a password.
                                </Text>
                            </View>

                            <View className="mt-4">
                                <Button
                                    variant="default"
                                    className="w-full h-12 rounded-xl justify-center items-center"
                                    onPress={handleOnContinue}
                                    disabled={isSubmitting}
                                >
                                    <Text>{isSubmitting ? "Connecting..." : "Continue"}</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    )
}
