import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useAvailableLanguages } from '../hooks/useAvailableLanguages'
import { useTranslation } from '../hooks/useTranslation'
import { endTravelSession } from '../services/repository'

export const SettingsScreen = () => {
  const navigate = useNavigate()
  const t = useTranslation()
  const { mode, language, backgroundMode, activeTourId, setMode, setLanguage, setBackgroundMode, setActiveTourId, signOut } = useApp()
  const availableLanguages = useAvailableLanguages()

  const [selectedMode, setSelectedMode] = useState(mode)
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [selectedBackgroundMode, setSelectedBackgroundMode] = useState(backgroundMode)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const save = async (): Promise<void> => {
    if (mode === 'travel' && selectedMode !== 'travel' && activeTourId) {
      await endTravelSession()
      setActiveTourId(null)
    }
    setMode(selectedMode)
    setLanguage(selectedLanguage)
    setBackgroundMode(selectedBackgroundMode)
    setMessage(t('settings_saved'))
    setErrorMessage(null)
    window.setTimeout(() => navigate(-1), 500)
  }

  const toggleBackgroundMode = async (enabled: boolean): Promise<void> => {
    if (!enabled) {
      setSelectedBackgroundMode(false)
      setErrorMessage(null)
      return
    }

    if (!('permissions' in navigator) || !navigator.permissions?.query) {
      setSelectedBackgroundMode(true)
      setErrorMessage(null)
      return
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      if (status.state === 'denied') {
        setErrorMessage(t('permission_description'))
        return
      }
      setSelectedBackgroundMode(true)
      setErrorMessage(null)
    } catch {
      setSelectedBackgroundMode(true)
      setErrorMessage(null)
    }
  }

  return (
    <div className='app-screen'>
      <div className='app-screen__narrow'>
        <div className='screen-header'>
          <span className='screen-header__eyebrow'>Preferences</span>
          <div className='topbar__row'>
            <div className='topbar__cluster topbar__cluster--left'>
              <button
                type='button'
                onClick={() => navigate(-1)}
                className='icon-button'
                aria-label={t('go_back')}
                title={t('go_back')}
              >
                ←
              </button>
              <h1 className='screen-header__title' data-testid='settings-title'>
                {t('settings_title')}
              </h1>
            </div>
            <div className='topbar__cluster topbar__cluster--right'>
              <button
                type='button'
                onClick={() => navigate('/')}
                className='icon-button'
                aria-label='Go to home page'
                title='Home'
              >
                ⌂
              </button>
              <button
                type='button'
                onClick={() => {
                  signOut()
                  navigate('/login', { replace: true })
                }}
                data-testid='settings-signout'
                className='button button-secondary'
                style={{ width: 'auto', minHeight: '46px', paddingInline: '18px' }}
              >
                {t('sign_out')}
              </button>
            </div>
          </div>
        </div>

        <div className='settings-list'>
        <section className='page-card settings-section'>
          <h2 className='choice-card__title'>{t('language')}</h2>
          <div className='settings-grid' style={{ marginTop: '12px' }}>
            {availableLanguages.map((item) => (
              <button
                key={item.code}
                type='button'
                onClick={() => setSelectedLanguage(item.code)}
                data-testid={`settings-language-${item.code}`}
                className={`choice-card ${selectedLanguage === item.code ? 'choice-card--selected' : ''}`}
              >
                <div className='choice-card__row'>
                  <span className='choice-card__icon'>{item.flag}</span>
                  <span className='choice-card__title'>{item.displayName}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className='page-card settings-section'>
          <h2 className='choice-card__title'>{t('app_mode')}</h2>
          <div className='settings-grid' style={{ marginTop: '12px' }}>
            <button
              type='button'
              onClick={() => setSelectedMode('travel')}
              data-testid='settings-mode-travel'
              className={`choice-card ${selectedMode === 'travel' ? 'choice-card--selected' : ''}`}
            >
              <div className='choice-card__row'>
                <span className='choice-card__icon'>🧭</span>
                <span>
                  <span className='choice-card__title'>{t('travel_mode')}</span>
                  <span className='choice-card__copy'>{t('travel_mode_desc')}</span>
                </span>
              </div>
            </button>
            <button
              type='button'
              onClick={() => setSelectedMode('explore')}
              data-testid='settings-mode-explore'
              className={`choice-card ${selectedMode === 'explore' ? 'choice-card--selected' : ''}`}
            >
              <div className='choice-card__row'>
                <span className='choice-card__icon'>🗺️</span>
                <span>
                  <span className='choice-card__title'>{t('explore_mode')}</span>
                  <span className='choice-card__copy'>{t('explore_mode_desc')}</span>
                </span>
              </div>
            </button>
          </div>
        </section>

        <section className='page-card settings-section'>
          <h2 className='choice-card__title'>{t('advanced_settings')}</h2>
          <label className='settings-row' style={{ marginTop: '12px' }}>
            <span className='choice-card__copy' style={{ margin: 0 }}>
              {t('background_tracking')}
            </span>
            <input
              checked={selectedBackgroundMode}
              onChange={(event) => {
                void toggleBackgroundMode(event.target.checked)
              }}
              type='checkbox'
              data-testid='settings-background-mode'
              className='h-4 w-4 accent-orange-500'
            />
          </label>
          <p className='settings-note'>{t('background_tracking_warning')}</p>
        </section>

        {errorMessage && (
          <div className='notice notice-error' data-testid='settings-error'>
            {errorMessage}
          </div>
        )}

        {message && (
          <div className='notice notice-success' data-testid='settings-message'>
            {message}
          </div>
        )}

        <button
          type='button'
          onClick={() => void save()}
          data-testid='settings-save'
          className='button button-primary'
        >
          {t('save_settings')}
        </button>
        </div>
      </div>
    </div>
  )
}
