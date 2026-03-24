export type AppMode = 'travel' | 'explore'

export type AppLanguage = 'vi-VN' | 'en-US' | 'zh-CN' | 'fr-FR' | 'ko-KR'

export interface AppLanguageOption {
  code: AppLanguage
  displayName: string
  flag: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  photoUrl?: string
  dateOfBirth?: string
  gender?: string
  createdAt: string
}

export interface PoiContent {
  stallAudioGuideId?: string
  languageCode: string
  languageName: string
  scriptText: string
  audioUrl: string | null
}

export interface Poi {
  id: string
  stallId?: string
  stallName?: string
  stallDescription?: Record<AppLanguage, string>
  name: Record<AppLanguage, string>
  description: Record<AppLanguage, string>
  latitude: number
  longitude: number
  radius: number
  priority: number
  imageUrl: Record<AppLanguage, string>
  category: string
  contents?: PoiContent[]
}

export interface Tour {
  id: string
  icon: string
  estimatedMinutes: number
  poiIds: string[]
  name: Record<AppLanguage, string>
  description: Record<AppLanguage, string>
}

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface AudioState {
  currentSrc: string | null
  isPlaying: boolean
  duration: number
  currentTime: number
}

export type AudioPlaybackStatus = 'playing' | 'blocked' | 'missing'

export interface AudioPlaybackResult {
  status: AudioPlaybackStatus
  source: string | null
}
