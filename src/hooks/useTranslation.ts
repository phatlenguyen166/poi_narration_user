import { useCallback } from 'react'
import { t, type TranslationKey } from '../i18n'
import { useApp } from '../context/useApp'

export const useTranslation = (): ((key: TranslationKey) => string) => {
  const { language } = useApp()
  return useCallback((key: TranslationKey) => t(language, key), [language])
}
