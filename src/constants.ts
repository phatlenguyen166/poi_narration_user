import type { AppLanguage, AppMode } from './types'

export const STORAGE_KEYS = {
  appMode: 'app_mode',
  firstLaunch: 'first_launch',
  deviceCheckCompleted: 'device_check_completed',
  backgroundMode: 'background_mode',
  appLanguage: 'app_language',
  activeTourId: 'active_tour_id',
  activeTouristTourId: 'active_tourist_tour_id',
  activeTourSessionId: 'active_tour_session_id',
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

export const APP_MODES: Array<{
  mode: AppMode
  icon: string
}> = [
  { mode: 'travel', icon: '🧭' },
  { mode: 'explore', icon: '🗺️' }
]
