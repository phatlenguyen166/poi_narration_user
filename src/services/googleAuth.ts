type GoogleTokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
}

type GoogleProfile = {
  sub: string
  email: string
  name?: string
  picture?: string
}

type GoogleAccountsOAuth2 = {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: () => void
  }) => {
    requestAccessToken: (options?: { prompt?: string }) => void
  }
}

type GoogleAccounts = {
  oauth2: GoogleAccountsOAuth2
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts
    }
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || ''

const loadGoogleScript = async (): Promise<void> => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('google_not_configured')
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('google_not_configured')
  }

  if (window.google?.accounts?.oauth2) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('google_sign_in_failed')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('google_sign_in_failed'))
    document.head.appendChild(script)
  })

  if (!window.google?.accounts?.oauth2) {
    throw new Error('google_sign_in_failed')
  }
}

const fetchGoogleProfile = async (accessToken: string): Promise<GoogleProfile> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('google_sign_in_failed')
  }

  const profile = (await response.json()) as GoogleProfile
  if (!profile.email || !profile.sub) {
    throw new Error('google_sign_in_failed')
  }

  return profile
}

export const isGoogleAuthConfigured = (): boolean => Boolean(GOOGLE_CLIENT_ID)

export const signInWithGooglePopup = async (): Promise<GoogleProfile> => {
  await loadGoogleScript()

  const token = await new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error) {
          if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
            reject(new Error('cancelled'))
            return
          }
          reject(new Error('google_sign_in_failed'))
          return
        }
        if (!response.access_token) {
          reject(new Error('google_sign_in_failed'))
          return
        }
        resolve(response.access_token)
      },
      error_callback: () => reject(new Error('cancelled'))
    })

    if (!tokenClient) {
      reject(new Error('google_sign_in_failed'))
      return
    }

    tokenClient.requestAccessToken({ prompt: 'select_account' })
  })

  return fetchGoogleProfile(token)
}
