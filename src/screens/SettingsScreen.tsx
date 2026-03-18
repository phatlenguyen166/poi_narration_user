import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_LANGUAGES } from '../constants'
import { useApp } from '../context/useApp'
import { useTranslation } from '../hooks/useTranslation'

export const SettingsScreen = () => {
  const navigate = useNavigate()
  const t = useTranslation()
  const { mode, language, backgroundMode, setMode, setLanguage, setBackgroundMode, signOut } = useApp()

  const [selectedMode, setSelectedMode] = useState(mode)
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [selectedBackgroundMode, setSelectedBackgroundMode] = useState(backgroundMode)
  const [message, setMessage] = useState<string | null>(null)

  const save = (): void => {
    setMode(selectedMode)
    setLanguage(selectedLanguage)
    setBackgroundMode(selectedBackgroundMode)
    setMessage(t('settings_saved'))
    window.setTimeout(() => navigate(-1), 500)
  }

  return (
    <div className='app-screen'>
      <div className='screen-header'>
        <span className='screen-header__eyebrow'>Preferences</span>
        <div className='topbar__row'>
          <h1 className='screen-header__title' data-testid='settings-title'>
            {t('settings_title')}
          </h1>
          <button
            type='button'
            onClick={() => {
              signOut()
              navigate('/login', { replace: true })
            }}
            data-testid='settings-signout'
            className='icon-button'
          >
            {t('sign_out')}
          </button>
        </div>
      </div>

      <div className='settings-list'>
        <section className='page-card settings-section'>
          <h2 className='choice-card__title'>{t('language')}</h2>
          <div className='settings-grid' style={{ marginTop: '12px' }}>
            {APP_LANGUAGES.map((item) => (
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
              onChange={(event) => setSelectedBackgroundMode(event.target.checked)}
              type='checkbox'
              data-testid='settings-background-mode'
              className='h-4 w-4 accent-orange-500'
            />
          </label>
          <p className='settings-note'>{t('background_tracking_warning')}</p>
        </section>

        {message && (
          <div className='notice notice-success' data-testid='settings-message'>
            {message}
          </div>
        )}

        <button
          type='button'
          onClick={save}
          data-testid='settings-save'
          className='button button-primary'
        >
          {t('save_settings')}
        </button>
      </div>
    </div>
  )
}
