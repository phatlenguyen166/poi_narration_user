import { DEFAULT_LANGUAGE, DEFAULT_MODE, STORAGE_KEYS } from '../constants'
import type { AppLanguage, AppMode } from '../types'

const get = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const set = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore storage write errors
  }
}

const remove = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore storage remove errors
  }
}

const getBool = (key: string, defaultValue: boolean): boolean => {
  const raw = get(key)
  if (raw === null) {
    return defaultValue
  }
  return raw === 'true'
}

export const preferences = {
  getFirstLaunch(): boolean {
    return getBool(STORAGE_KEYS.firstLaunch, true)
  },
  setFirstLaunchCompleted(): void {
    set(STORAGE_KEYS.firstLaunch, 'false')
  },
  getAppMode(): AppMode {
    const value = get(STORAGE_KEYS.appMode)
    if (value === 'travel' || value === 'explore') {
      return value
    }
    return DEFAULT_MODE
  },
  setAppMode(mode: AppMode): void {
    set(STORAGE_KEYS.appMode, mode)
  },
  getBackgroundMode(): boolean {
    return getBool(STORAGE_KEYS.backgroundMode, false)
  },
  setBackgroundMode(enabled: boolean): void {
    set(STORAGE_KEYS.backgroundMode, String(enabled))
  },
  getLanguage(): AppLanguage {
    const value = get(STORAGE_KEYS.appLanguage)
    if (
      value === 'vi-VN' ||
      value === 'en-US' ||
      value === 'zh-CN' ||
      value === 'ja-JP' ||
      value === 'fr-FR' ||
      value === 'ko-KR'
    ) {
      return value
    }
    return DEFAULT_LANGUAGE
  },
  setLanguage(language: AppLanguage): void {
    set(STORAGE_KEYS.appLanguage, language)
  },
  getActiveTourId(): string | null {
    return get(STORAGE_KEYS.activeTourId)
  },
  setActiveTourId(tourId: string | null): void {
    if (tourId === null) {
      remove(STORAGE_KEYS.activeTourId)
      return
    }
    set(STORAGE_KEYS.activeTourId, tourId)
  },
  isLoggedIn(): boolean {
    return getBool(STORAGE_KEYS.isLoggedIn, false)
  },
  setLoggedIn(value: boolean): void {
    set(STORAGE_KEYS.isLoggedIn, String(value))
  },
  getUserJson(): string | null {
    return get(STORAGE_KEYS.userJson)
  },
  setUserJson(json: string | null): void {
    if (json === null) {
      remove(STORAGE_KEYS.userJson)
      return
    }
    set(STORAGE_KEYS.userJson, json)
  },
  getUserAccountsJson(): string | null {
    return get(STORAGE_KEYS.userAccounts)
  },
  setUserAccountsJson(json: string): void {
    set(STORAGE_KEYS.userAccounts, json)
  }
}
