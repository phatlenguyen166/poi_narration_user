import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useTranslation } from '../hooks/useTranslation'
import { audioService } from '../services/audio'
import { preferences } from '../services/preferences'

type LocationStatus = 'checking' | 'ready' | 'prompt' | 'blocked' | 'unsupported' | 'error'
type AudioStatus = 'idle' | 'ready' | 'error'

type DeviceCardProps = {
  title: string
  icon: string
  statusClassName: string
  description: string
  action?: React.ReactNode
}

type WindowWithWebkitAudioContext = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

const DeviceCard = ({ title, icon, statusClassName, description, action }: DeviceCardProps) => (
  <div className='device-check-card'>
    <div className='device-check-card__header'>
      <span className='device-check-card__icon'>{icon}</span>
      <div className='device-check-card__copy'>
        <h2 className='device-check-card__title'>{title}</h2>
        <p className={`device-check-card__status ${statusClassName}`}>{description}</p>
      </div>
    </div>
    {action ? <div className='device-check-card__action'>{action}</div> : null}
  </div>
)

export const DeviceCheckScreen = () => {
  const navigate = useNavigate()
  const t = useTranslation()
  const { mode, completeDeviceCheck } = useApp()

  const [locationStatus, setLocationStatus] = useState<LocationStatus>('checking')
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle')
  const [online, setOnline] = useState<boolean>(() => navigator.onLine)
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop')
  const [busyAudio, setBusyAudio] = useState(false)

  const locationMessage = useMemo(() => {
    switch (locationStatus) {
      case 'ready':
        return t('device_check_location_ready')
      case 'blocked':
        return t('device_check_location_blocked')
      case 'unsupported':
        return t('device_check_location_unsupported')
      case 'error':
        return t('device_check_location_unavailable')
      case 'prompt':
        return t('device_check_location_prompt')
      default:
        return `${t('device_check_refresh')}...`
    }
  }, [locationStatus, t])

  const audioMessage = useMemo(() => {
    if (audioStatus === 'ready') {
      return t('device_check_audio_ready')
    }
    if (audioStatus === 'error') {
      return t('device_check_audio_failed')
    }
    return t('device_check_audio_idle')
  }, [audioStatus, t])

  useEffect(() => {
    const nextDeviceType = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
      ? 'mobile'
      : 'desktop'
    setDeviceType(nextDeviceType)

    const syncOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', syncOnline)
    window.addEventListener('offline', syncOnline)

    void refreshLocationStatus()

    return () => {
      window.removeEventListener('online', syncOnline)
      window.removeEventListener('offline', syncOnline)
    }
  }, [])

  const refreshLocationStatus = async (): Promise<void> => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported')
      return
    }

    setLocationStatus('checking')

    try {
      if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        if (permission.state === 'denied') {
          setLocationStatus('blocked')
          return
        }
        if (permission.state === 'prompt') {
          setLocationStatus('prompt')
          return
        }
      }
    } catch {
      // Ignore and fall back to a live position check below.
    }

    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus('ready'),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('blocked')
          return
        }
        setLocationStatus('error')
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    )
  }

  const testAudio = async (): Promise<void> => {
    setBusyAudio(true)

    try {
      await audioService.unlock()

      const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkitAudioContext).webkitAudioContext
      if (!AudioContextCtor) {
        throw new Error('AudioContext unavailable')
      }

      const context = new AudioContextCtor()
      await context.resume()

      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(660, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.3)

      await new Promise((resolve) => window.setTimeout(resolve, 340))
      await context.close()

      setAudioStatus('ready')
    } catch {
      setAudioStatus('error')
    } finally {
      setBusyAudio(false)
    }
  }

  const continueToApp = (): void => {
    completeDeviceCheck()
    navigate(preferences.consumePendingRoute() ?? '/', { replace: true })
  }

  return (
    <div className='app-screen app-screen-auth'>
      <div className='app-screen__narrow'>
        <div className='screen-header screen-header--device-check'>
          <span className='screen-header__eyebrow'>Quick setup</span>
          <h1 className='screen-header__title'>{t('device_check_title')}</h1>
          <p className='screen-header__copy'>
            {t('device_check_desc')} {mode === 'travel' ? t('travel_mode_desc') : t('explore_mode_desc')}
          </p>
        </div>

        <div className='device-check-grid'>
          <DeviceCard
            icon='📍'
            title={t('device_check_location')}
            statusClassName={`device-check-card__status--${locationStatus === 'ready' ? 'success' : locationStatus === 'checking' ? 'muted' : 'warning'}`}
            description={locationMessage}
            action={
              <button type='button' onClick={() => void refreshLocationStatus()} className='button button-secondary'>
                {t('device_check_refresh')}
              </button>
            }
          />

          <DeviceCard
            icon='🔊'
            title={t('device_check_audio')}
            statusClassName={`device-check-card__status--${audioStatus === 'ready' ? 'success' : audioStatus === 'error' ? 'warning' : 'muted'}`}
            description={audioMessage}
            action={
              <button type='button' onClick={() => void testAudio()} disabled={busyAudio} className='button button-secondary'>
                {busyAudio ? `${t('device_check_refresh')}...` : t('device_check_test_audio')}
              </button>
            }
          />

          <DeviceCard
            icon='📶'
            title={t('device_check_connection')}
            statusClassName={`device-check-card__status--${online ? 'success' : 'warning'}`}
            description={online ? t('device_check_connection_online') : t('device_check_connection_offline')}
          />

          <DeviceCard
            icon='📱'
            title={t('device_check_device')}
            statusClassName='device-check-card__status--muted'
            description={deviceType === 'mobile' ? t('device_check_device_mobile') : t('device_check_device_desktop')}
          />
        </div>

        {(locationStatus === 'blocked' || !online) && (
          <div className='notice notice-error device-check-note'>
            {locationStatus === 'blocked'
              ? t('permission_description')
              : t('device_check_connection_offline')}
          </div>
        )}

        <div className='device-check-actions'>
          <button type='button' onClick={continueToApp} className='button button-primary'>
            {t('device_check_continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
