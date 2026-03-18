import { preferences } from './preferences'
import { signInWithGooglePopup } from './googleAuth'
import type { StoredAccount, UserProfile } from '../types'

export type AuthErrorKey =
  | 'email_not_registered'
  | 'invalid_credentials'
  | 'email_already_registered'
  | 'google_not_configured'
  | 'google_sign_in_failed'
  | 'cancelled'
  | 'error_occurred'

export interface AuthResult {
  user: UserProfile | null
  error: AuthErrorKey | null
}

type AccountsMap = Record<string, StoredAccount>

const TEST_ACCOUNT: StoredAccount = {
  user: {
    id: 'local_test_account',
    name: 'Tai khoan Test',
    email: 'demo@example.com',
    createdAt: '2026-03-16T00:00:00.000Z'
  },
  password: 'secret123'
}

class AuthService {
  private currentUser: UserProfile | null = null

  initialize(): UserProfile | null {
    const isLoggedIn = preferences.isLoggedIn()
    const userJson = preferences.getUserJson()

    if (!isLoggedIn || userJson === null) {
      this.currentUser = null
      return null
    }

    try {
      this.currentUser = JSON.parse(userJson) as UserProfile
      return this.currentUser
    } catch {
      this.currentUser = null
      preferences.setLoggedIn(false)
      preferences.setUserJson(null)
      return null
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const key = email.trim().toLowerCase()
      const accounts = this.loadAccounts()
      const account = accounts[key]

      if (!account) {
        return { user: null, error: 'email_not_registered' }
      }
      if (account.password !== password) {
        return { user: null, error: 'invalid_credentials' }
      }

      this.saveSession(account.user)
      return { user: account.user, error: null }
    } catch {
      return { user: null, error: 'error_occurred' }
    }
  }

  async registerUser(params: {
    name: string
    email: string
    password: string
    phone?: string
    dateOfBirth?: string
    gender?: string
    photoUrl?: string
  }): Promise<AuthResult> {
    try {
      const accounts = this.loadAccounts()
      const key = params.email.trim().toLowerCase()

      if (accounts[key]) {
        return { user: null, error: 'email_already_registered' }
      }

      const user: UserProfile = {
        id: `local_${Date.now()}`,
        name: params.name.trim(),
        email: key,
        phone: params.phone?.trim() || undefined,
        dateOfBirth: params.dateOfBirth,
        gender: params.gender,
        photoUrl: params.photoUrl,
        createdAt: new Date().toISOString()
      }

      accounts[key] = {
        user,
        password: params.password
      }
      this.saveAccounts(accounts)
      this.saveSession(user)

      return { user, error: null }
    } catch {
      return { user: null, error: 'error_occurred' }
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const googleUser = await signInWithGooglePopup()
      const accounts = this.loadAccounts()
      const key = googleUser.email.trim().toLowerCase()

      let account = accounts[key]
      if (!account) {
        account = {
          user: {
            id: `google_${googleUser.sub}`,
            name: googleUser.name || googleUser.email.split('@')[0] || 'Google User',
            email: key,
            photoUrl: googleUser.picture || undefined,
            createdAt: new Date().toISOString()
          },
          password: ''
        }
        accounts[key] = account
        this.saveAccounts(accounts)
      }

      this.saveSession(account.user)
      return { user: account.user, error: null }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'google_not_configured') {
          return { user: null, error: 'google_not_configured' }
        }
        if (error.message === 'cancelled') {
          return { user: null, error: 'cancelled' }
        }
      }
      return { user: null, error: 'google_sign_in_failed' }
    }
  }

  signOut(): void {
    this.currentUser = null
    preferences.setLoggedIn(false)
    preferences.setUserJson(null)
  }

  private saveSession(user: UserProfile): void {
    this.currentUser = user
    preferences.setLoggedIn(true)
    preferences.setUserJson(JSON.stringify(user))
  }

  private loadAccounts(): AccountsMap {
    const raw = preferences.getUserAccountsJson()
    if (!raw) {
      return this.ensureTestAccount({})
    }
    try {
      return this.ensureTestAccount(JSON.parse(raw) as AccountsMap)
    } catch {
      return this.ensureTestAccount({})
    }
  }

  private saveAccounts(accounts: AccountsMap): void {
    preferences.setUserAccountsJson(JSON.stringify(accounts))
  }

  private ensureTestAccount(accounts: AccountsMap): AccountsMap {
    const key = TEST_ACCOUNT.user.email.toLowerCase()
    if (accounts[key]) {
      return accounts
    }

    const nextAccounts = {
      ...accounts,
      [key]: TEST_ACCOUNT
    }
    this.saveAccounts(nextAccounts)
    return nextAccounts
  }
}

export const authService = new AuthService()
