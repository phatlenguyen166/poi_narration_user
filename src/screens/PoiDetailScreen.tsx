import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { usePoisQuery } from '../hooks/useRepository'
import { useTranslation } from '../hooks/useTranslation'
import { audioService } from '../services/audio'
import { createPlaybackLog, getAudioSources, poiHasAudioSource } from '../services/repository'
import { getLocalized } from '../utils/localization'

export const PoiDetailScreen = () => {
  const navigate = useNavigate()
  const { poiId } = useParams<{ poiId: string }>()
  const { language, currentUser } = useApp()
  const t = useTranslation()
  const { data: pois = [] } = usePoisQuery()
  const { state, play, pause, stop, seek, formatTime } = useAudioPlayer()
  const [message, setMessage] = useState<string | null>(null)

  const poi = useMemo(() => pois.find((item) => item.id === poiId), [poiId, pois])
  const isCurrentPoiAudio = Boolean(poi && poiHasAudioSource(poi, state.currentSrc))

  if (!poi) {
    return (
      <div className='app-screen'>
        <p className='helper-copy'>{t('no_poi_found')}</p>
        <Link to='/home' className='button button-primary' style={{ marginTop: '16px' }}>
          Back to Home
        </Link>
      </div>
    )
  }

  const playNarration = async (): Promise<void> => {
    setMessage(null)
    await audioService.unlock()
    if (poi.stallId) {
      void createPlaybackLog({
        tourist: currentUser,
        stallId: poi.stallId,
        poi,
        language,
        listenDurationSeconds: 0,
        triggerMode: 'MANUAL',
        playbackStatus: 'STARTED'
      })
    }
    const playback = await audioService.playSources(getAudioSources(poi, language))
    if (playback.status === 'missing') {
      setMessage(t('no_audio_for_language'))
      return
    }
  }

  const openDirections = (): void => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const sharePoi = async (): Promise<void> => {
    const sharePayload = {
      title: getLocalized(poi.name, language),
      text: getLocalized(poi.description, language),
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(sharePayload)
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${sharePayload.title}\n${sharePayload.url}`)
        setMessage(`${t('share')}: copied link`)
      } else {
        setMessage(window.location.href)
      }
    } catch {
      setMessage(t('error_occurred'))
    }
  }

  const sliderValue = state.duration > 0 && isCurrentPoiAudio ? Math.min(1, state.currentTime / state.duration) : 0

  return (
    <div data-testid='poi-detail-screen'>
      <section className='detail-hero'>
        <img src={getLocalized(poi.imageUrl, language)} alt={getLocalized(poi.name, language)} />
        <div className='detail-hero__overlay' />
        <div className='detail-hero__content'>
          <div>
            <button type='button' onClick={() => navigate(-1)} className='icon-button' data-testid='detail-back'>
              ←
            </button>
          </div>
          <div>
            <div className='detail-stats'>
              <span className='pill'>{poi.stallName ?? 'Địa điểm'}</span>
              <span className='pill'>{Math.round(poi.radius)}m</span>
            </div>
            <h1 style={{ margin: '14px 0 6px', fontSize: '1.95rem', lineHeight: '1.05', fontWeight: 800 }}>
              {getLocalized(poi.name, language)}
            </h1>
            <p style={{ margin: 0, maxWidth: '28ch', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
              {getLocalized(poi.description, language)}
            </p>
          </div>
        </div>
      </section>

      <section className='detail-body'>
        <div className='screen-header'>
          <span className='screen-header__eyebrow'>{t('introduction')}</span>
          <h2 className='screen-header__title' style={{ fontSize: '1.4rem' }}>
            {getLocalized(poi.name, language)}
          </h2>
        </div>

        <div className='page-card' style={{ padding: '16px' }}>
          <p className='screen-header__copy' style={{ marginBottom: '14px' }}>
            {getLocalized(poi.description, language)}
          </p>
          <div className='poi-card__actions'>
            <button type='button' onClick={() => void playNarration()} data-testid='detail-play' className='button button-primary'>
              {t('play')}
            </button>
            <button type='button' onClick={() => pause()} data-testid='detail-pause' className='button button-secondary'>
              {t('paused')}
            </button>
            <button type='button' onClick={() => stop()} data-testid='detail-stop' className='button button-tertiary'>
              {t('stop')}
            </button>
          </div>
        </div>

        <div className='stack' style={{ marginTop: '16px' }}>
          <div className='stat-card'>
            <div className='choice-card__copy'>{t('radius')}</div>
            <div className='choice-card__title'>{Math.round(poi.radius)}m</div>
          </div>
          <div className='stat-card'>
            <div className='choice-card__copy'>{t('priority')}</div>
            <div className='choice-card__title'>{poi.priority}/5</div>
          </div>
          <div className='stat-card' data-testid='detail-coordinates'>
            <div className='choice-card__copy'>{t('coordinates')}</div>
            <div className='choice-card__title'>
              {poi.latitude.toFixed(6)}, {poi.longitude.toFixed(6)}
            </div>
          </div>
        </div>

        {isCurrentPoiAudio && (
          <section className='page-card' style={{ marginTop: '16px', padding: '16px' }}>
            <div className='player-bar__row' style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>
            <input
              type='range'
              min={0}
              max={1}
              step={0.001}
              value={sliderValue}
              onChange={(event) => seek(Number(event.target.value) * state.duration)}
              data-testid='detail-audio-progress'
            />
            <div className='poi-card__actions' style={{ marginTop: '12px' }}>
              <button
                type='button'
                onClick={() => {
                  if (state.isPlaying) {
                    pause()
                  } else {
                    void play()
                  }
                }}
                data-testid='detail-audio-toggle'
                className='button button-secondary'
              >
                {state.isPlaying ? t('paused') : t('play')}
              </button>
              <button type='button' onClick={() => stop()} className='button button-tertiary'>
                {t('stop')}
              </button>
            </div>
          </section>
        )}

        {message && (
          <div className='notice notice-success' style={{ marginTop: '16px' }} data-testid='detail-message'>
            {message}
          </div>
        )}

        <div className='poi-card__actions' style={{ marginTop: '16px' }}>
          <button type='button' onClick={openDirections} data-testid='detail-directions' className='button button-primary'>
            {t('direction')}
          </button>
          <button type='button' onClick={() => void sharePoi()} data-testid='detail-share' className='button button-secondary'>
            {t('share')}
          </button>
        </div>
      </section>
    </div>
  )
}
