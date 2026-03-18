import type { AppLanguage, AppMode } from '../types'

export const getLocalized = <T extends string>(values: Record<AppLanguage, T>, language: AppLanguage): T => {
  return values[language] ?? values['en-US'] ?? values['vi-VN']
}

export const buildAudioCandidates = (poiId: string, language: AppLanguage): string[] => {
  return [`/audio/${poiId}_${language}.mp3`, `/audio/${poiId}.mp3`]
}

export const modeIcon = (mode: AppMode): string => (mode === 'travel' ? '🧭' : '🗺️')
