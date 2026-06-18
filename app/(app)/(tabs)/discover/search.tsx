import { useInfiniteAnimeSearch, useInfiniteMangaSearch } from "@/api/hooks/search.hooks"
import { HorizontalMediaCardList } from "@/components/features/media/horizontal-media-card-list"
import { SafeView } from "@/components/layout/layout-view"
import { LibrarySearchBar } from "@/components/shared/library-search-bar"
import { TvFocusablePressable } from "@/components/ui/tv-focusable"
import { useIOSScrollRefreshRateWorkaround } from "@/hooks/use-ios-scroll-refresh-rate-workaround"
import { isSearchActive, searchParamsAtom } from "@/lib/search/search-atoms"
import Ionicons from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useAtom } from "jotai"
import * as React from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

function EmptyState({ query }: { query: string }) {
    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            className="flex-1 items-center justify-center pt-20 gap-3"
        >
            <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.12)" />
            <Text className="text-center text-sm text-white/30">
                {query.trim() ? `No results for "${query}"` : "Use the search bar above"}
            </Text>
        </Animated.View>
    )
}

export default function SearchScreen() {
    const insets = useSafeAreaInsets()
    const { type: initialType } = useLocalSearchParams<{ type?: string }>()

    useIOSScrollRefreshRateWorkaround()

    const [params, setParams] = useAtom(searchParamsAtom)

    React.useEffect(() => {
        if (initialType === "anime" || initialType === "manga") {
            setParams(p => ({ ...p, type: initialType }))
        }
    }, [initialType])

    const [titleInput, setTitleInput] = React.useState(params.title ?? "")
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    function handleTitleChange(text: string) {
        setTitleInput(text)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            setParams(p => ({ ...p, title: text.trim() || null }))
        }, 350)
    }

    React.useEffect(() => {
        if (params.title === null && titleInput !== "") {
            setTitleInput("")
        }
    }, [params.title])

    const shouldQuery = isSearchActive(params)

    const animeParams = React.useMemo(() => ({ ...params, type: "anime" as const }), [params])
    const mangaParams = React.useMemo(() => ({ ...params, type: "manga" as const }), [params])

    const animeQuery = useInfiniteAnimeSearch(animeParams, shouldQuery)
    const mangaQuery = useInfiniteMangaSearch(mangaParams, shouldQuery)

    const animeItems = React.useMemo(() => {
        return animeQuery.data?.pages
            .filter(Boolean)
            .flatMap(page => page?.Page?.media)
            .filter(Boolean) ?? []
    }, [animeQuery.data])

    const mangaItems = React.useMemo(() => {
        return mangaQuery.data?.pages
            .filter(Boolean)
            .flatMap(page => page?.Page?.media)
            .filter(Boolean) ?? []
    }, [mangaQuery.data])

    const handleAnimeLoadMore = React.useCallback(() => {
        if (animeQuery.hasNextPage && !animeQuery.isFetchingNextPage) {
            animeQuery.fetchNextPage()
        }
    }, [animeQuery])

    const handleMangaLoadMore = React.useCallback(() => {
        if (mangaQuery.hasNextPage && !mangaQuery.isFetchingNextPage) {
            mangaQuery.fetchNextPage()
        }
    }, [mangaQuery])

    const lastFocusedSection = React.useRef(0)
    const handleAnimeFocus = React.useCallback(() => {
        lastFocusedSection.current = 0
    }, [])
    const handleMangaFocus = React.useCallback(() => {
        lastFocusedSection.current = 1
    }, [])

    const hasAnimeResults = animeItems.length > 0
    const hasMangaResults = mangaItems.length > 0
    const isInitialLoading = shouldQuery && (animeQuery.isLoading || mangaQuery.isLoading) && !hasAnimeResults && !hasMangaResults
    const showEmptyState = shouldQuery && !animeQuery.isLoading && !mangaQuery.isLoading && !hasAnimeResults && !hasMangaResults

    return (
        <SafeView className="flex-1 bg-background">
            <View className="gap-2.5 border-b border-white/5 bg-background px-3.5 py-2">
                <View className="flex-row items-center gap-2">
                    <TvFocusablePressable
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full items-center justify-center bg-white/[0.06]"
                        focusedClassName="border-2 border-brand-400/80 bg-white/10"
                    >
                        <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.8)" />
                    </TvFocusablePressable>
                    <View className="flex-1">
                        <LibrarySearchBar
                            value={titleInput}
                            onChangeText={handleTitleChange}
                            placeholder="Search anime & manga\u2026"
                        />
                    </View>
                </View>
            </View>

            {isInitialLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="rgba(255,255,255,0.3)" />
                </View>
            ) : showEmptyState ? (
                <EmptyState query={titleInput} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <HorizontalMediaCardList
                        title="Anime"
                        type="anime"
                        media={animeItems}
                        onEndReached={handleAnimeLoadMore}
                        showAudienceScore
                        onCardFocus={handleAnimeFocus}
                        sectionIndex={0}
                        compact
                        hideCount
                    />
                    <HorizontalMediaCardList
                        title="Manga"
                        type="manga"
                        media={mangaItems}
                        onEndReached={handleMangaLoadMore}
                        showAudienceScore
                        onCardFocus={handleMangaFocus}
                        sectionIndex={1}
                        compact
                        hideCount
                    />
                    {(animeQuery.isFetchingNextPage || mangaQuery.isFetchingNextPage) && (
                        <View className="py-2 items-center">
                            <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeView>
    )
}
