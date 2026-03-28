import { useEffect, useState, type PropsWithChildren } from 'react'
import { DEFAULT_LANGUAGE, DEFAULT_MODE } from '../constants'
import { authService, type AuthErrorKey } from '../services/auth'
import { preferences } from '../services/preferences'
import { endTravelSession } from '../services/repository'
import type { AppLanguage, AppMode, UserProfile } from '../types'
import { AppContext, type AppContextValue, type RegisterPayload } from './appContextStore'

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => preferences.getLanguage() ?? DEFAULT_LANGUAGE)
  const [mode, setModeState] = useState<AppMode>(() => preferences.getAppMode() ?? DEFAULT_MODE)
  const [backgroundMode, setBackgroundModeState] = useState<boolean>(() => preferences.getBackgroundMode())
  const [activeTourId, setActiveTourIdState] = useState<string | null>(() => preferences.getActiveTourId())
  const [firstLaunch, setFirstLaunch] = useState<boolean>(() => preferences.getFirstLaunch())
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.initialize())

  useEffect(() => {
    void authService.validateSession().then((user) => {
      setCurrentUser(user)
    })
  }, [])

  const setLanguage = (nextLanguage: AppLanguage): void => {
    setLanguageState(nextLanguage)
    preferences.setLanguage(nextLanguage)
  }

  const setMode = (nextMode: AppMode): void => {
    setModeState(nextMode)
    preferences.setAppMode(nextMode)
  }

  const setBackgroundMode = (enabled: boolean): void => {
    setBackgroundModeState(enabled)
    preferences.setBackgroundMode(enabled)
  }

  const setActiveTourId = (tourId: string | null): void => {
    setActiveTourIdState(tourId)
    preferences.setActiveTourId(tourId)
  }

  const completeFirstLaunch = (): void => {
    setFirstLaunch(false)
    preferences.setFirstLaunchCompleted()
  }

  const signInWithEmail = async (email: string, password: string): Promise<AuthErrorKey | null> => {
    const result = await authService.signInWithEmail(email, password)
    if (result.user) {
      setCurrentUser(result.user)
    }
    return result.error
  }

  const signInWithGoogle = async (): Promise<AuthErrorKey | null> => {
    const result = await authService.signInWithGoogle()
    if (result.user) {
      setCurrentUser(result.user)
    }
    return result.error
  }

  const registerUser = async (payload: RegisterPayload): Promise<AuthErrorKey | null> => {
    const result = await authService.registerUser(payload)
    if (result.user) {
      setCurrentUser(result.user)
    }
    return result.error
  }

  const signOut = (): void => {
    void endTravelSession()
    authService.signOut()
    preferences.clearActiveTravelState()
    setActiveTourIdState(null)
    setCurrentUser(null)
  }

  const value: AppContextValue = {
    language,
    mode,
    backgroundMode,
    activeTourId,
    firstLaunch,
    currentUser,
    isLoggedIn: currentUser !== null,
    setLanguage,
    setMode,
    setBackgroundMode,
    setActiveTourId,
    completeFirstLaunch,
    signInWithEmail,
    signInWithGoogle,
    registerUser,
    signOut
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
