import { AL_MediaSeason } from "@/api/generated/types"
import { buildSeaQuery } from "@/api/client/requests"
import { API_ENDPOINTS } from "@/api/generated/endpoints"
import { useAnilistListAnime, useAnilistListMissedSequels } from "@/api/hooks/anilist.hooks"
import { useAnilistListManga } from "@/api/hooks/manga.hooks"
import type { QueryClient } from "@tanstack/react-query"

/**
 * Returns the current AniList season and year based on the current month.
 */
function getCurrentSeason(): { season: AL_MediaSeason; year: number } {
    const month = new Date().getMonth() + 1
    const year = new Date().getFullYear()
    let season: AL_MediaSeason = "WINTER"
    if (month >= 4 && month <= 6) season = "SPRING"
    else if (month >= 7 && month <= 9) season = "SUMMER"
    else if (month >= 10 && month <= 12) season = "FALL"
    return { season, year }
}

/**
 * Returns the previous season and its corresponding year.
 */
function getPreviousSeason(): { season: AL_MediaSeason; year: number } {
    const { season, year } = getCurrentSeason()
    const map: Record<AL_MediaSeason, { season: AL_MediaSeason; yearOffset: number }> = {
        WINTER: { season: "FALL", yearOffset: -1 },
        SPRING: { season: "WINTER", yearOffset: 0 },
        SUMMER: { season: "SPRING", yearOffset: 0 },
        FALL: { season: "SUMMER", yearOffset: 0 },
    }
    const prev = map[season]
    return { season: prev.season, year: year + prev.yearOffset }
}

///////////////////////////////////////////////////////////////////////////////
// Discover queries
///////////////////////////////////////////////////////////////////////////////

export function useDiscoverTrendingAnime(enabled: boolean = true, genres?: string[]) {
    return useAnilistListAnime({
        page: 1,
        perPage: 20,
        sort: ["TRENDING_DESC"],
        genres: genres && genres.length > 0 ? genres : undefined,
    }, enabled)
}

export function useDiscoverCurrentSeasonAnime(enabled: boolean = true) {
    const { season, year } = getCurrentSeason()
    return useAnilistListAnime({
        page: 1,
        perPage: 20,
        sort: ["SCORE_DESC"],
        season,
        seasonYear: year,
    }, enabled)
}

export function useDiscoverPastSeasonAnime(enabled: boolean = true) {
    const { season, year } = getPreviousSeason()
    return useAnilistListAnime({
        page: 1,
        perPage: 20,
        sort: ["SCORE_DESC"],
        season,
        seasonYear: year,
    }, enabled)
}

export function useDiscoverUpcomingAnime(enabled: boolean = true) {
    return useAnilistListAnime({
        page: 1,
        perPage: 20,
        sort: ["TRENDING_DESC"],
        status: ["NOT_YET_RELEASED"],
    }, enabled)
}

export function useDiscoverTrendingMovies(enabled: boolean = true) {
    return useAnilistListAnime({
        page: 1,
        perPage: 20,
        format: "MOVIE",
        sort: ["TRENDING_DESC"],
        status: ["RELEASING", "FINISHED"],
    }, enabled)
}

export function useDiscoverMissedSequels(enabled: boolean = true) {
    return useAnilistListMissedSequels(enabled)
}

///////////////////////////////////////////////////////////////////////////////
// Manga queries, one per country of origin
///////////////////////////////////////////////////////////////////////////////

export function useDiscoverTrendingManga(country: string, enabled: boolean = true) {
    return useAnilistListManga({
        page: 1,
        perPage: 20,
        sort: ["TRENDING_DESC"],
        countryOfOrigin: country,
    }, enabled)
}

///////////////////////////////////////////////////////////////////////////////
// Season label helpers
///////////////////////////////////////////////////////////////////////////////

export function getCurrentSeasonLabel(): string {
    const { season, year } = getCurrentSeason()
    return `${season.charAt(0)}${season.slice(1).toLowerCase()} ${year}`
}

export function getPreviousSeasonLabel(): string {
    const { season, year } = getPreviousSeason()
    return `${season.charAt(0)}${season.slice(1).toLowerCase()} ${year}`
}

///////////////////////////////////////////////////////////////////////////////
// Background prefetch (called from the Library tab after data loads)
///////////////////////////////////////////////////////////////////////////////

const DISCOVER_PREFETCH_STALE_MS = 5 * 60 * 1000

/**
 * Kick off a low-priority background prefetch of every list query the
 * Discover tab may need. Called from the Library screen after its
 * `useAnimeLibraryCollection` resolves, so the user's bandwidth is
 * spent on the visible screen first — the Discover tab mounts to a
 * warm cache later.
 *
 * Each prefetch uses the same endpoint, method, and variable shape
 * (and `staleTime: 5 min`) as the live hooks above, so when Discover
 * mounts the cached data matches the query keys `useDiscover*Anime` /
 * `useDiscoverMissedSequels` / `useDiscoverTrendingManga` produce.
 * The discover tab's `primary content ready` metric flips
 * immediately on warm mount.
 *
 * Errors are silent (`muteError: true`) because this is best-effort
 * prefetching — if any individual query fails, the discover tab will
 * fall back to its normal network request on the user's first
 * interaction.
 */
export async function prefetchAllDiscoverQueries(
    queryClient: QueryClient,
    serverUrl: string | null,
    authToken: string | null,
): Promise<void> {
    const { season: curSeason, year: curYear } = getCurrentSeason()
    const { season: prevSeason, year: prevYear } = getPreviousSeason()

    const trendingVars = { page: 1, perPage: 20, sort: ["TRENDING_DESC"] as const }
    const currentSeasonVars = {
        page: 1,
        perPage: 20,
        sort: ["SCORE_DESC"] as const,
        season: curSeason,
        seasonYear: curYear,
    }
    const pastSeasonVars = {
        page: 1,
        perPage: 20,
        sort: ["SCORE_DESC"] as const,
        season: prevSeason,
        seasonYear: prevYear,
    }
    const upcomingVars = {
        page: 1,
        perPage: 20,
        sort: ["TRENDING_DESC"] as const,
        status: ["NOT_YET_RELEASED"] as const,
    }
    const moviesVars = {
        page: 1,
        perPage: 20,
        sort: ["TRENDING_DESC"] as const,
        format: "MOVIE" as const,
        status: ["RELEASING", "FINISHED"] as const,
    }

    const prefetchList = (variables: unknown) =>
        queryClient.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANILIST.AnilistListAnime.key, variables],
            queryFn: () =>
                buildSeaQuery({
                    serverUrl,
                    endpoint: API_ENDPOINTS.ANILIST.AnilistListAnime.endpoint,
                    method: API_ENDPOINTS.ANILIST.AnilistListAnime.methods[0],
                    data: variables,
                    authToken,
                    muteError: true,
                }),
            staleTime: DISCOVER_PREFETCH_STALE_MS,
        })

    const prefetchManga = (countryOfOrigin: "JP" | "KR" | "CN") =>
        queryClient.prefetchQuery({
            queryKey: [
                API_ENDPOINTS.MANGA.AnilistListManga.key,
                { page: 1, perPage: 20, sort: ["TRENDING_DESC"], countryOfOrigin },
            ],
            queryFn: () =>
                buildSeaQuery({
                    serverUrl,
                    endpoint: API_ENDPOINTS.MANGA.AnilistListManga.endpoint,
                    method: API_ENDPOINTS.MANGA.AnilistListManga.methods[0],
                    data: { page: 1, perPage: 20, sort: ["TRENDING_DESC"], countryOfOrigin },
                    authToken,
                    muteError: true,
                }),
            staleTime: DISCOVER_PREFETCH_STALE_MS,
        })

    const prefetchMissed = () =>
        queryClient.prefetchQuery({
            queryKey: [API_ENDPOINTS.ANILIST.AnilistListMissedSequels.key],
            queryFn: () =>
                buildSeaQuery({
                    serverUrl,
                    endpoint: API_ENDPOINTS.ANILIST.AnilistListMissedSequels.endpoint,
                    method: API_ENDPOINTS.ANILIST.AnilistListMissedSequels.methods[0],
                    authToken,
                    muteError: true,
                }),
            staleTime: DISCOVER_PREFETCH_STALE_MS,
        })

    await Promise.allSettled([
        prefetchList(trendingVars),
        prefetchList(currentSeasonVars),
        prefetchList(pastSeasonVars),
        prefetchList(upcomingVars),
        prefetchList(moviesVars),
        prefetchMissed(),
        prefetchManga("JP"),
        prefetchManga("KR"),
        prefetchManga("CN"),
    ])
}
