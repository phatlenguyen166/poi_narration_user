import { useEffect, useState } from 'react'
import { FALLBACK_APP_LANGUAGES, listAvailableLanguages } from '../services/languages'
import type { AppLanguageOption } from '../types'

export const useAvailableLanguages = () => {
  const [languages, setLanguages] = useState<AppLanguageOption[]>(FALLBACK_APP_LANGUAGES)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const next = await listAvailableLanguages()
      if (mounted) {
        setLanguages(next)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  return languages
}
