import { api } from './api'
import type { AppLanguage, AppLanguageOption } from '../types'

interface BackendLanguageResponse {
  id: number
  code: string
  name: string
}

const SUPPORTED_LANGUAGE_META: Record<AppLanguage, AppLanguageOption> = {
  'vi-VN': { code: 'vi-VN', displayName: 'Tiếng Việt', flag: '🇻🇳' },
  'en-US': { code: 'en-US', displayName: 'English', flag: '🇺🇸' },
  'zh-CN': { code: 'zh-CN', displayName: '中文', flag: '🇨🇳' },
  'ja-JP': { code: 'ja-JP', displayName: '日本語', flag: '🇯🇵' },
  'fr-FR': { code: 'fr-FR', displayName: 'Français', flag: '🇫🇷' },
  'ko-KR': { code: 'ko-KR', displayName: '한국어', flag: '🇰🇷' }
}

const BACKEND_LANGUAGE_MAP: Record<string, AppLanguage> = {
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  fr: 'fr-FR',
  ko: 'ko-KR'
}

export const FALLBACK_APP_LANGUAGES: AppLanguageOption[] = [
  SUPPORTED_LANGUAGE_META['vi-VN'],
  SUPPORTED_LANGUAGE_META['en-US'],
  SUPPORTED_LANGUAGE_META['zh-CN'],
  SUPPORTED_LANGUAGE_META['ja-JP'],
  SUPPORTED_LANGUAGE_META['fr-FR'],
  SUPPORTED_LANGUAGE_META['ko-KR']
]

export const isSupportedAppLanguage = (value: string | null | undefined): value is AppLanguage =>
  Boolean(value && value in SUPPORTED_LANGUAGE_META)

export const mapBackendLanguageCode = (code: string): AppLanguage | null =>
  BACKEND_LANGUAGE_MAP[code.toLowerCase()] ?? null

export const listAvailableLanguages = async (): Promise<AppLanguageOption[]> => {
  try {
    const response = await api.get<BackendLanguageResponse[]>('/api/v1/languages')
    const available = response.data
      .map((item) => mapBackendLanguageCode(item.code))
      .filter((item): item is AppLanguage => item !== null)
      .map((code) => SUPPORTED_LANGUAGE_META[code])

    if (available.length > 0) {
      return available
    }
  } catch {
    // fallback to locally supported languages when backend is unavailable
  }

  return FALLBACK_APP_LANGUAGES
}
