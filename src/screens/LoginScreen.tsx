import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useTranslation } from '../hooks/useTranslation'

const DEFAULT_TEST_EMAIL = 'demo@example.com'
const DEFAULT_TEST_PASSWORD = 'secret123'

export const LoginScreen = () => {
  const navigate = useNavigate()
  const t = useTranslation()
  const { signInWithEmail, signInWithGoogle } = useApp()

  const [email, setEmail] = useState(DEFAULT_TEST_EMAIL)
  const [password, setPassword] = useState(DEFAULT_TEST_PASSWORD)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const signIn = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage(t('required_field'))
      return
    }
    setIsLoading(true)
    setErrorMessage(null)
    const error = await signInWithEmail(email, password)
    setIsLoading(false)

    if (error) {
      setErrorMessage(t(error))
      return
    }
    navigate('/', { replace: true })
  }

  const signInGoogle = async (): Promise<void> => {
    setIsLoading(true)
    setErrorMessage(null)
    const error = await signInWithGoogle()
    setIsLoading(false)

    if (error) {
      setErrorMessage(t(error))
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className='app-screen app-screen-auth'>
      <div className='auth-panel'>
        <div className='auth-hero'>
          <div className='auth-hero__badge'>
            🧭
          </div>
          <p className='auth-hero__eyebrow'>POI Auto Narration</p>
          <h1 className='auth-hero__title' data-testid='login-title'>
            {t('login_title')}
          </h1>
          <p className='auth-hero__copy'>{t('login_subtitle')}</p>
        </div>

        <div className='auth-form'>
          <label className='field'>
            <span className='field__label'>{t('email')}</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type='email'
              autoComplete='email'
              aria-label={t('email')}
              data-testid='login-email'
              className='field__input'
            />
          </label>

          <label className='field'>
            <span className='field__label'>{t('password')}</span>
            <div className='field__password'>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                aria-label={t('password')}
                data-testid='login-password'
                className='field__input'
              />
              <button
                type='button'
                onClick={() => setShowPassword((value) => !value)}
                className='field__toggle'
              >
                {showPassword ? t('hide_password') : t('show_password')}
              </button>
            </div>
          </label>

          {errorMessage && (
            <div className='notice notice-error' data-testid='login-error'>
              {errorMessage}
            </div>
          )}

          <button
            type='button'
            onClick={signIn}
            disabled={isLoading}
            data-testid='login-submit'
            className='button button-primary'
          >
            {isLoading ? t('signing_in') : t('sign_in')}
          </button>

          <button
            type='button'
            onClick={() => {
              void signInGoogle()
            }}
            disabled={isLoading}
            data-testid='login-google'
            className='button button-secondary'
          >
            {t('sign_in_with_google')}
          </button>

          <p className='auth-form__footer'>
            {t('no_account_yet')}{' '}
            <Link to='/register' className='inline-link'>
              {t('create_account')}
            </Link>
          </p>

          <p className='helper-copy'>
            Tai khoan test: {DEFAULT_TEST_EMAIL} / {DEFAULT_TEST_PASSWORD}
          </p>
        </div>
      </div>
    </div>
  )
}
