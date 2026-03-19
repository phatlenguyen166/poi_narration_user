import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useTranslation } from '../hooks/useTranslation'
import { preferences } from '../services/preferences'

export const RegisterScreen = () => {
  const t = useTranslation()
  const navigate = useNavigate()
  const { registerUser } = useApp()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return !!name.trim() && !!email.trim() && !!password.trim() && !!confirmPassword.trim()
  }, [confirmPassword, email, name, password])

  const submit = async (): Promise<void> => {
    if (!canSubmit) {
      setErrorMessage(t('required_field'))
      return
    }
    if (!/^[\w.-]+@[\w-]+\.\w{2,}$/i.test(email.trim())) {
      setErrorMessage(t('invalid_email'))
      return
    }
    if (password.length < 6) {
      setErrorMessage(t('password_too_short'))
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('passwords_not_match'))
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const error = await registerUser({
      name,
      email,
      password,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined
    })
    setIsSubmitting(false)

    if (error) {
      setErrorMessage(t(error))
      return
    }

    navigate(preferences.consumePendingRoute() ?? '/', { replace: true })
  }

  return (
    <div className='app-screen app-screen-auth'>
      <div className='auth-panel'>
        <div className='auth-hero auth-hero--compact'>
          <p className='auth-hero__eyebrow'>POI Auto Narration</p>
          <h1 className='auth-hero__title' data-testid='register-title'>
            {t('register_title')}
          </h1>
          <p className='auth-hero__copy'>{t('register_subtitle')}</p>
        </div>

        <div className='auth-form'>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={t('full_name')}
            data-testid='register-name'
            className='field__input'
          />

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type='email'
            aria-label={t('email')}
            data-testid='register-email'
            className='field__input'
          />

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type='password'
            aria-label={t('password')}
            data-testid='register-password'
            className='field__input'
          />

          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type='password'
            aria-label={t('confirm_password')}
            data-testid='register-confirm-password'
            className='field__input'
          />

          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-label={t('phone')}
            className='field__input'
          />

          <input
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            type='date'
            aria-label={t('date_of_birth')}
            className='field__input'
          />

          <select
            value={gender}
            onChange={(event) => setGender(event.target.value)}
            aria-label={t('gender')}
            className='field__input'
          >
            <option value=''>{`${t('gender')} (${t('optional')})`}</option>
            <option value='male'>{t('male')}</option>
            <option value='female'>{t('female')}</option>
            <option value='other'>{t('other_gender')}</option>
          </select>

          {errorMessage && (
            <div className='notice notice-error' data-testid='register-error'>
              {errorMessage}
            </div>
          )}

          <button
            type='button'
            onClick={submit}
            disabled={isSubmitting}
            data-testid='register-submit'
            className='button button-primary'
          >
            {isSubmitting ? t('signing_in') : t('register_btn')}
          </button>

          <p className='auth-form__footer'>
            {t('already_have_account')}{' '}
            <Link to='/login' className='inline-link'>
              {t('sign_in')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
