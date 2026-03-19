import type { AppLanguage, AppMode } from '../types'

export const getLocalized = <T extends string>(values: Record<AppLanguage, T>, language: AppLanguage): T => {
  return values[language] ?? values['en-US'] ?? values['vi-VN']
}

export const modeIcon = (mode: AppMode): string => (mode === 'travel' ? '🧭' : '🗺️')
