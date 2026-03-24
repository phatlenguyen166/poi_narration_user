import { api, resolveApiUrl } from './api'
import type { AppLanguage, GeoPoint, Poi, PoiContent, Tour, UserProfile } from '../types'

interface PublicPoiContentResponse {
  stallAudioGuideId?: number | null
  languageCode: string
  languageName: string
  scriptText: string
  audioUrl: string | null
}

interface PublicPoiResponse {
  id: number
  stallId: number
  stallName: string
  address: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  priority: number
  contents: PublicPoiContentResponse[]
}

interface PublicQrResolveResponse {
  code: string
  targetType: 'STALL' | 'TOUR'
  targetId: number
  targetName: string
  description: string | null
}

const sameText = (value: string): Record<AppLanguage, string> => ({
  'vi-VN': value,
  'en-US': value,
  'zh-CN': value,
  'fr-FR': value,
  'ko-KR': value
})

const mapBackendLanguage = (code: string): AppLanguage | null => {
  const normalized = code.trim().toLowerCase()
  if (normalized === 'vi' || normalized === 'vi-vn') return 'vi-VN'
  if (normalized === 'en' || normalized === 'en-us') return 'en-US'
  if (normalized === 'fr' || normalized === 'fr-fr') return 'fr-FR'
  if (normalized === 'zh' || normalized === 'zh-cn') return 'zh-CN'
  if (normalized === 'ko' || normalized === 'ko-kr') return 'ko-KR'
  return null
}

const toBackendLanguageCode = (language: AppLanguage): string => {
  switch (language) {
    case 'vi-VN':
      return 'vi'
    case 'fr-FR':
      return 'fr'
    case 'zh-CN':
      return 'zh'
    case 'ko-KR':
      return 'ko'
    default:
      return 'en'
  }
}

const toPoiContents = (contents: PublicPoiContentResponse[]): PoiContent[] =>
  contents.map((content) => ({
    stallAudioGuideId: content.stallAudioGuideId ? String(content.stallAudioGuideId) : undefined,
    languageCode: content.languageCode,
    languageName: content.languageName,
    scriptText: content.scriptText,
    audioUrl: resolveApiUrl(content.audioUrl)
  }))

const localizeDescription = (contents: PoiContent[], fallback: string): Record<AppLanguage, string> => {
  const result = sameText(fallback)

  for (const content of contents) {
    const language = mapBackendLanguage(content.languageCode)
    if (language) {
      result[language] = content.scriptText || fallback
    }
  }

  result['zh-CN'] = result['zh-CN'] || result['en-US']
  result['ko-KR'] = result['ko-KR'] || result['en-US']

  return result
}

const mapPoi = (item: PublicPoiResponse): Poi => {
  const contents = toPoiContents(item.contents)
  const fallbackImage = `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&sig=${item.id}`

  return {
    id: String(item.id),
    stallId: String(item.stallId),
    stallName: item.stallName,
    stallDescription: sameText(item.address || item.name),
    name: sameText(item.name),
    description: localizeDescription(contents, item.address || item.name),
    latitude: item.latitude,
    longitude: item.longitude,
    radius: item.radiusMeters,
    priority: item.priority,
    imageUrl: sameText(fallbackImage),
    category: 'stall',
    contents
  }
}

const getTourIcon = (stallName: string): string => {
  const normalized = stallName.trim().toLowerCase()
  if (normalized.includes('landmark')) return '🏙️'
  if (normalized.includes('market') || normalized.includes('chợ')) return '🛍️'
  if (normalized.includes('museum') || normalized.includes('bảo tàng')) return '🏛️'
  if (normalized.includes('food') || normalized.includes('quán')) return '🍜'
  return '🧭'
}

const findGuideForLanguage = (poi: Poi, language: AppLanguage): PoiContent | null => {
  const requested = mapBackendLanguage(language)
  const fallbacks: AppLanguage[] = requested ? [requested, 'en-US', 'vi-VN', 'fr-FR'] : ['en-US', 'vi-VN', 'fr-FR']

  for (const fallback of fallbacks) {
    const matched = (poi.contents || []).find((content) => mapBackendLanguage(content.languageCode) === fallback && content.audioUrl)
    if (matched) return matched
  }

  return (poi.contents || []).find((content) => !!content.audioUrl) ?? null
}

export const getPreferredAudioSource = (poi: Poi, language: AppLanguage): string | null =>
  findGuideForLanguage(poi, language)?.audioUrl ?? null

export const fetchPois = async (): Promise<Poi[]> => {
  const { data } = await api.get<PublicPoiResponse[]>('/api/v1/public/pois')
  return data.map(mapPoi)
}

export const fetchTours = async (): Promise<Tour[]> => {
  const pois = await fetchPois()
  const grouped = new Map<string, Poi[]>()

  for (const poi of pois) {
    if (!poi.stallId) continue
    const existing = grouped.get(poi.stallId) || []
    existing.push(poi)
    grouped.set(poi.stallId, existing)
  }

  return Array.from(grouped.entries()).map(([stallId, stallPois]) => {
    const firstPoi = stallPois[0]
    const fallbackDescription = firstPoi?.stallDescription?.['en-US'] || ''

    return {
      id: `stall-${stallId}`,
      icon: getTourIcon(firstPoi?.stallName || ''),
      estimatedMinutes: Math.max(15, stallPois.length * 12),
      poiIds: stallPois.map((poi) => poi.id),
      name: sameText(firstPoi?.stallName || `Stall ${stallId}`),
      description: sameText(fallbackDescription)
    }
  })
}

export const createPlaybackLog = async (params: {
  tourist: UserProfile | null
  stallId: string
  poi: Poi
  language: AppLanguage
  listenDurationSeconds: number
  playbackStatus?: 'STARTED' | 'COMPLETED' | 'STOPPED'
  triggerMode?: 'GEOFENCE' | 'QR' | 'MANUAL'
  completionRate?: number
}): Promise<void> => {
  if (!params.tourist) return
  const guide = findGuideForLanguage(params.poi, params.language)

  await api.post('/api/v1/public/playback-logs', {
    touristId: Number(params.tourist.id),
    sessionId: null,
    stallId: Number(params.stallId),
    stallAudioGuideId: guide?.stallAudioGuideId ? Number(guide.stallAudioGuideId) : null,
    languageCode: toBackendLanguageCode(params.language),
    playbackStatus: params.playbackStatus ?? 'STARTED',
    listenDurationSeconds: params.listenDurationSeconds,
    completionRate: params.completionRate ?? null,
    triggerMode: params.triggerMode ?? 'MANUAL'
  })
}

export const createMovementLog = async (params: {
  tourist: UserProfile | null
  stallId?: string
  position: GeoPoint
  source: 'travel_watch' | 'explore_view'
  distanceToStallMeters?: number | null
  dwellDurationSeconds?: number | null
  eventType?: 'ENTER' | 'EXIT' | 'DWELL'
}): Promise<void> => {
  if (!params.tourist) return

  await api.post('/api/v1/public/movement-logs', {
    touristId: Number(params.tourist.id),
    sessionId: null,
    stallId: params.stallId ? Number(params.stallId) : null,
    eventType: params.eventType ?? 'DWELL',
    latitude: params.position.latitude,
    longitude: params.position.longitude,
    distanceToStallMeters: params.distanceToStallMeters ?? null,
    dwellDurationSeconds: params.dwellDurationSeconds ?? null
  })
}

export const resolveQrTarget = async (targetType: 'stall' | 'tour', targetId: string): Promise<PublicQrResolveResponse> => {
  const { data } = await api.get<PublicQrResolveResponse>(`/api/v1/public/qr/${targetType}/${targetId}`)
  return data
}

export const filterPoisByActiveTour = (pois: Poi[], activeTourId: string | null): Poi[] => {
  if (!activeTourId?.startsWith('stall-')) return pois
  const stallId = activeTourId.replace('stall-', '')
  return pois.filter((poi) => poi.stallId === stallId)
}

export const getAudioSources = (poi: Poi, language: AppLanguage): string[] => {
  const prioritized = new Map<string, string>()
  const requested = mapBackendLanguage(language) || 'en-US'
  const fallbacks: AppLanguage[] = [requested, 'en-US', 'vi-VN', 'fr-FR']
  const contents = poi.contents || []

  for (const lang of fallbacks) {
    for (const content of contents) {
      if (mapBackendLanguage(content.languageCode) === lang && content.audioUrl) {
        prioritized.set(content.audioUrl, content.audioUrl)
      }
    }
  }

  for (const content of contents) {
    if (content.audioUrl) prioritized.set(content.audioUrl, content.audioUrl)
  }

  return Array.from(prioritized.values())
}

export const poiHasAudioSource = (poi: Poi, currentSrc: string | null): boolean => {
  if (!currentSrc) return false
  return (poi.contents || []).some((content) => content.audioUrl === currentSrc)
}
