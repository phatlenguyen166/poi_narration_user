import type { AppLanguage, AppMode } from './types'

export const STORAGE_KEYS = {
  appMode: 'app_mode',
  firstLaunch: 'first_launch',
  backgroundMode: 'background_mode',
  appLanguage: 'app_language',
  activeTourId: 'active_tour_id',
  isLoggedIn: 'is_logged_in',
  userJson: 'user_json',
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  pendingRoute: 'pending_route'
} as const

export const APP_CONSTANTS = {
  cooldownSeconds: 30,
  defaultPoiRadius: 50,
  highAccuracyDistance: 20,
  normalAccuracyDistance: 100,
  defaultMapZoom: 16,
  focusedMapZoom: 18
} as const

export const DEFAULT_CENTER = {
  latitude: 10.7769,
  longitude: 106.7009
} as const

export const DEFAULT_MODE: AppMode = 'explore'
export const DEFAULT_LANGUAGE: AppLanguage = 'en-US'

export const APP_LANGUAGES: Array<{
  code: AppLanguage
  displayName: string
  flag: string
}> = [
  { code: 'vi-VN', displayName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en-US', displayName: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', displayName: '中文', flag: '🇨🇳' },
  { code: 'ja-JP', displayName: '日本語', flag: '🇯🇵' },
  { code: 'fr-FR', displayName: 'Français', flag: '🇫🇷' },
  { code: 'ko-KR', displayName: '한국어', flag: '🇰🇷' }
]

export const APP_MODES: Array<{
  mode: AppMode
  icon: string
}> = [
  { mode: 'travel', icon: '🧭' },
  { mode: 'explore', icon: '🗺️' }
]
