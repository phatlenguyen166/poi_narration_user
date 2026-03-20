import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_MODES } from '../constants'
import { useApp } from '../context/useApp'
import { useAvailableLanguages } from '../hooks/useAvailableLanguages'
import { useTranslation } from '../hooks/useTranslation'
import type { AppLanguage, AppMode } from '../types'

export const WelcomeScreen = () => {
  const navigate = useNavigate()
  const t = useTranslation()
  const { mode, language, setMode, setLanguage, completeFirstLaunch } = useApp()
  const availableLanguages = useAvailableLanguages()

  const [step, setStep] = useState(0)
  const [selectedMode, setSelectedMode] = useState<AppMode | null>(mode)
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage | null>(language)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const nextStep = (): void => {
    if (!selectedMode) {
      setErrorMessage(t('please_select_mode'))
      return
    }
    setErrorMessage(null)
    setStep(1)
  }

  const finish = (): void => {
    if (!selectedMode) {
      setErrorMessage(t('please_select_mode'))
      return
    }
    if (!selectedLanguage) {
      setErrorMessage(t('please_select_language'))
      return
    }

    setMode(selectedMode)
    setLanguage(selectedLanguage)
    completeFirstLaunch()

    if (selectedMode === 'travel') {
      navigate('/tour-selection', { replace: true })
      return
    }
    navigate('/home', { replace: true })
  }

  return (
    <div className='app-screen app-screen-auth'>
      <div className='auth-panel'>
        <div className='auth-hero'>
          <div className='auth-hero__badge'>🗺️</div>
          <p className='auth-hero__eyebrow'>{t('welcome_title')}</p>
          <h1 className='auth-hero__title' data-testid='welcome-title'>
            {t('app_title_alt')}
          </h1>
          <p className='auth-hero__copy'>{step === 0 ? t('select_mode_desc') : t('select_language_desc')}</p>
        </div>

        {step === 0 ? (
          <div className='choice-grid' data-testid='welcome-mode-step'>
            {APP_MODES.map((item) => {
              const active = selectedMode === item.mode
              return (
                <button
                  key={item.mode}
                  type='button'
                  onClick={() => setSelectedMode(item.mode)}
                  data-testid={`mode-${item.mode}`}
                  className={`choice-card ${active ? 'choice-card--selected' : ''}`}
                >
                  <div className='choice-card__row'>
                    <span className='choice-card__icon'>{item.icon}</span>
                    <span className='flex-1'>
                      <span className='choice-card__title'>
                        {item.mode === 'travel' ? t('travel_mode') : t('explore_mode')}
                      </span>
                      <span className='choice-card__copy'>
                        {item.mode === 'travel' ? t('travel_mode_desc') : t('explore_mode_desc')}
                      </span>
                    </span>
                  </div>
                </button>
              )
            })}
            <button
              type='button'
              onClick={nextStep}
              data-testid='welcome-next'
              className='button button-primary'
            >
              {t('next')}
            </button>
          </div>
        ) : (
          <div className='choice-grid' data-testid='welcome-language-step'>
            {availableLanguages.map((item) => {
              const active = selectedLanguage === item.code
              return (
                <button
                  key={item.code}
                  type='button'
                  onClick={() => setSelectedLanguage(item.code)}
                  data-testid={`language-${item.code}`}
                  className={`choice-card ${active ? 'choice-card--selected' : ''}`}
                >
                  <div className='choice-card__row'>
                    <span className='choice-card__icon'>{item.flag}</span>
                    <span className='choice-card__title'>{item.displayName}</span>
                  </div>
                </button>
              )
            })}

            <div className='grid grid-cols-2 gap-3 pt-2'>
              <button
                type='button'
                onClick={() => setStep(0)}
                className='button button-secondary'
              >
                {t('go_back')}
              </button>
              <button
                type='button'
                onClick={finish}
                data-testid='welcome-finish'
                className='button button-primary'
              >
                {t('get_started')}
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className='notice notice-error' data-testid='welcome-error'>
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
