import axios from 'axios'
import { api } from './api'
import { preferences } from './preferences'
import type { UserProfile } from '../types'

export type AuthErrorKey =
  | 'email_not_registered'
  | 'invalid_credentials'
  | 'account_locked'
  | 'email_already_registered'
  | 'google_not_configured'
  | 'google_sign_in_failed'
  | 'cancelled'
  | 'error_occurred'

export interface AuthResult {
  user: UserProfile | null
  error: AuthErrorKey | null
}

interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: number
    name: string
    email: string
    phoneNumber?: string | null
    role?: string | null
  }
}

interface MeResponse {
  id: number
  name: string
  email: string
  phoneNumber?: string | null
  role?: string | null
}

class AuthService {
  private currentUser: UserProfile | null = null

  initialize(): UserProfile | null {
    const isLoggedIn = preferences.isLoggedIn()
    const userJson = preferences.getUserJson()
    const accessToken = preferences.getAccessToken()

    if (!isLoggedIn || userJson === null || !accessToken) {
      this.clearSession()
      return null
    }

    try {
      this.currentUser = JSON.parse(userJson) as UserProfile
      return this.currentUser
    } catch {
      this.clearSession()
      return null
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser
  }

  async validateSession(): Promise<UserProfile | null> {
    const accessToken = preferences.getAccessToken()
    if (!accessToken) {
      this.clearSession()
      return null
    }

    try {
      const { data } = await api.get<MeResponse>('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      const user: UserProfile = {
        id: String(data.id),
        name: data.name,
        email: data.email,
        phone: data.phoneNumber || undefined,
        createdAt: this.currentUser?.createdAt ?? new Date().toISOString()
      }
      this.currentUser = user
      preferences.setUserJson(JSON.stringify(user))
      return user
    } catch {
      this.clearSession()
      return null
    }
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const { data } = await api.post<AuthResponse>('/api/v1/auth/login', {
        email: email.trim().toLowerCase(),
        password
      })
      const user = this.saveSession(data)
      return { user, error: null }
    } catch (error) {
      return { user: null, error: this.mapAuthError(error) }
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
      const { data } = await api.post<AuthResponse>('/api/v1/auth/tourist/register', {
        name: params.name.trim(),
        email: params.email.trim().toLowerCase(),
        phoneNumber: params.phone?.trim() || null,
        dateOfBirth: params.dateOfBirth || null,
        gender: params.gender || null,
        photoUrl: params.photoUrl || null,
        password: params.password
      })
      const user = this.saveSession(data)
      return { user, error: null }
    } catch (error) {
      return { user: null, error: this.mapAuthError(error) }
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {
    return { user: null, error: 'google_not_configured' }
  }

  signOut(): void {
    this.clearSession()
  }

  private saveSession(response: AuthResponse): UserProfile {
    const user: UserProfile = {
      id: String(response.user.id),
      name: response.user.name,
      email: response.user.email,
      phone: response.user.phoneNumber || undefined,
      createdAt: new Date().toISOString()
    }

    this.currentUser = user
    preferences.setLoggedIn(true)
    preferences.setAccessToken(response.accessToken)
    preferences.setRefreshToken(response.refreshToken)
    preferences.setUserJson(JSON.stringify(user))
    return user
  }

  private clearSession(): void {
    this.currentUser = null
    preferences.setLoggedIn(false)
    preferences.setAccessToken(null)
    preferences.setRefreshToken(null)
    preferences.setUserJson(null)
  }

  private mapAuthError(error: unknown): AuthErrorKey {
    if (!axios.isAxiosError(error)) {
      return 'error_occurred'
    }

    const message = String(error.response?.data?.message || '').toLowerCase()
    const status = error.response?.status

    if (status === 409 || message.includes('đã tồn tại') || message.includes('already')) {
      return 'email_already_registered'
    }
    if (status === 403 || message.includes('bị khóa') || message.includes('inactive') || message.includes('locked')) {
      return 'account_locked'
    }
    if (status === 401 || status === 403 || message.includes('mật khẩu') || message.includes('password')) {
      return 'invalid_credentials'
    }
    if (status === 404 || message.includes('không tìm thấy') || message.includes('not found')) {
      return 'email_not_registered'
    }

    return 'error_occurred'
  }
}

export const authService = new AuthService()
