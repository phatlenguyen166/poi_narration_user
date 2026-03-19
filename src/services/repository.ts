import { api, resolveApiUrl } from './api'
import type { AppLanguage, GeoPoint, Poi, PoiContent, Tour } from '../types'

interface PublicPoiContentResponse {
  languageCode: string
  languageName: string
  scriptText: string
  audioUrl: string | null
}

interface PublicPoiResponse {
  id: number
  stallId: number
  stallName: string
  stallDescription: string
  stallThumbnailUrl: string | null
  category: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  priority: number
  contents: PublicPoiContentResponse[]
}

interface PublicQrResolveResponse {
  code: string
  targetType: 'STALL' | 'POI'
  targetId: number
  targetName: string
  description: string | null
}

const sameText = (value: string): Record<AppLanguage, string> => ({
  'vi-VN': value,
  'en-US': value,
  'zh-CN': value,
  'ja-JP': value,
  'fr-FR': value,
  'ko-KR': value
})

const mapBackendLanguage = (code: string): AppLanguage | null => {
  const normalized = code.trim().toLowerCase()
  if (normalized === 'vi' || normalized === 'vi-vn') {
    return 'vi-VN'
  }
  if (normalized === 'en' || normalized === 'en-us') {
    return 'en-US'
  }
  if (normalized === 'fr' || normalized === 'fr-fr') {
    return 'fr-FR'
  }
  if (normalized === 'zh' || normalized === 'zh-cn') {
    return 'zh-CN'
  }
  if (normalized === 'ja' || normalized === 'ja-jp') {
    return 'ja-JP'
  }
  if (normalized === 'ko' || normalized === 'ko-kr') {
    return 'ko-KR'
  }
  return null
}

const toBackendLanguageCode = (language: AppLanguage): string => {
  if (language === 'vi-VN') {
    return 'vi'
  }
  if (language === 'fr-FR') {
    return 'fr'
  }
  return 'en'
}

const toPoiContents = (contents: PublicPoiContentResponse[]): PoiContent[] =>
  contents.map((content) => ({
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
  result['ja-JP'] = result['ja-JP'] || result['en-US']
  result['ko-KR'] = result['ko-KR'] || result['en-US']

  return result
}

const mapPoi = (item: PublicPoiResponse): Poi => {
  const contents = toPoiContents(item.contents)

  return {
    id: String(item.id),
    stallId: String(item.stallId),
    stallName: item.stallName,
    stallDescription: sameText(item.stallDescription),
    name: sameText(item.name),
    description: localizeDescription(contents, item.stallDescription || item.name),
    latitude: item.latitude,
    longitude: item.longitude,
    radius: item.radiusMeters,
    priority: item.priority,
    imageUrl: sameText(resolveApiUrl(item.stallThumbnailUrl) || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'),
    category: item.category,
    contents
  }
}

const getTourIcon = (category: string): string => {
  const normalized = category.trim().toLowerCase()
  if (normalized.includes('food')) {
    return '🍜'
  }
  if (normalized.includes('market')) {
    return '🛍️'
  }
  if (normalized.includes('history')) {
    return '🏛️'
  }
  return '🧭'
}

export const fetchPois = async (): Promise<Poi[]> => {
  const { data } = await api.get<PublicPoiResponse[]>('/api/v1/public/pois')
  return data.map(mapPoi)
}

export const fetchTours = async (): Promise<Tour[]> => {
  const pois = await fetchPois()
  const grouped = new Map<string, Poi[]>()

  for (const poi of pois) {
    if (!poi.stallId) {
      continue
    }
    const existing = grouped.get(poi.stallId) || []
    existing.push(poi)
    grouped.set(poi.stallId, existing)
  }

  return Array.from(grouped.entries()).map(([stallId, stallPois]) => {
    const firstPoi = stallPois[0]
    const fallbackDescription = firstPoi?.stallDescription?.['en-US'] || ''

    return {
      id: `stall-${stallId}`,
      icon: getTourIcon(firstPoi?.category || ''),
      estimatedMinutes: Math.max(15, stallPois.length * 12),
      poiIds: stallPois.map((poi) => poi.id),
      name: sameText(firstPoi?.stallName || `Stall ${stallId}`),
      description: sameText(fallbackDescription)
    }
  })
}

export const createPlaybackLog = async (params: {
  stallId: string
  poiId?: string
  language: AppLanguage
  listenDurationSeconds: number
}): Promise<void> => {
  await api.post('/api/v1/public/playback-logs', {
    stallId: Number(params.stallId),
    poiId: params.poiId ? Number(params.poiId) : null,
    languageCode: toBackendLanguageCode(params.language),
    listenDurationSeconds: params.listenDurationSeconds
  })
}

export const createMovementLog = async (params: {
  stallId: string
  poiId?: string
  position: GeoPoint
  accuracyMeters?: number
  source: string
}): Promise<void> => {
  await api.post('/api/v1/public/movement-logs', {
    stallId: Number(params.stallId),
    poiId: params.poiId ? Number(params.poiId) : null,
    latitude: params.position.latitude,
    longitude: params.position.longitude,
    accuracyMeters: params.accuracyMeters ?? 0,
    source: params.source
  })
}

export const resolveQrTarget = async (targetType: 'stall' | 'poi', targetId: string): Promise<PublicQrResolveResponse> => {
  const { data } = await api.get<PublicQrResolveResponse>(`/api/v1/public/qr/${targetType}/${targetId}`)
  return data
}

export const filterPoisByActiveTour = (pois: Poi[], activeTourId: string | null): Poi[] => {
  if (!activeTourId?.startsWith('stall-')) {
    return pois
  }
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
    if (content.audioUrl) {
      prioritized.set(content.audioUrl, content.audioUrl)
    }
  }

  return Array.from(prioritized.values())
}

export const poiHasAudioSource = (poi: Poi, currentSrc: string | null): boolean => {
  if (!currentSrc) {
    return false
  }
  return (poi.contents || []).some((content) => content.audioUrl === currentSrc)
}
