import { createContext } from 'react'
import type { AppLanguage, AppMode, UserProfile } from '../types'
import type { AuthErrorKey } from '../services/auth'

export interface RegisterPayload {
  name: string
  email: string
  password: string
  phone?: string
  dateOfBirth?: string
  gender?: string
}

export interface AppContextValue {
  language: AppLanguage
  mode: AppMode
  backgroundMode: boolean
  activeTourId: string | null
  firstLaunch: boolean
  deviceCheckCompleted: boolean
  currentUser: UserProfile | null
  isLoggedIn: boolean
  setLanguage: (language: AppLanguage) => void
  setMode: (mode: AppMode) => void
  setBackgroundMode: (enabled: boolean) => void
  setActiveTourId: (tourId: string | null) => void
  completeFirstLaunch: () => void
  completeDeviceCheck: () => void
  signInWithEmail: (email: string, password: string) => Promise<AuthErrorKey | null>
  signInWithGoogle: () => Promise<AuthErrorKey | null>
  registerUser: (payload: RegisterPayload) => Promise<AuthErrorKey | null>
  signOut: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)
