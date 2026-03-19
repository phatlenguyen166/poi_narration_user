import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { usePoisQuery, useToursQuery } from '../hooks/useRepository'
import { useTranslation } from '../hooks/useTranslation'
import { audioService } from '../services/audio'
import { createMovementLog, createPlaybackLog, filterPoisByActiveTour, getAudioSources, poiHasAudioSource } from '../services/repository'
import type { GeoPoint, Poi } from '../types'
import { findNearbyPoi, getDistanceToNearestPoi, shouldTriggerCooldown } from '../utils/distance'
import { getLocalized, modeIcon } from '../utils/localization'
import { PoiMap } from '../components/PoiMap'

const noGeolocationSupport = typeof navigator !== 'undefined' && !navigator.geolocation

export const HomeScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const t = useTranslation()
  const { language, mode, activeTourId, backgroundMode } = useApp()
  const { data: pois = [] } = usePoisQuery()
  const { data: tours = [], isLoading: isToursLoading } = useToursQuery()
  const { state: audioState, pause, play, stop, seek, formatTime } = useAudioPlayer()

  const [searchText, setSearchText] = useState('')
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [trackingMode, setTrackingMode] = useState<'high' | 'normal' | 'low'>('normal')

  const watchIdRef = useRef<number | null>(null)
  const lastTriggerPoiIdRef = useRef<string | null>(null)
  const lastTriggerTimeRef = useRef<number | null>(null)
  const qrStallId = searchParams.get('stallId')
  const qrPoiId = searchParams.get('poiId')

  const activeTour = useMemo(() => tours.find((tour) => tour.id === activeTourId) ?? null, [activeTourId, tours])

  const scopedPois = useMemo(() => {
    if (mode === 'travel' && activeTour) {
      return filterPoisByActiveTour(pois, activeTour.id)
    }
    if (mode === 'travel') {
      return []
    }
    const filteredByQr = qrStallId ? pois.filter((poi) => poi.stallId === qrStallId) : pois
    return qrPoiId ? filteredByQr.filter((poi) => poi.id === qrPoiId) : filteredByQr
  }, [activeTour, mode, pois, qrPoiId, qrStallId])

  const filteredPois = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (!query) {
      return scopedPois
    }
    return scopedPois.filter((poi) => {
      const name = getLocalized(poi.name, language).toLowerCase()
      const description = getLocalized(poi.description, language).toLowerCase()
      return name.includes(query) || description.includes(query) || poi.category.toLowerCase().includes(query)
    })
  }, [language, scopedPois, searchText])

  const searchResults = useMemo(() => filteredPois.slice(0, 4), [filteredPois])

  const selectedPoi = useMemo(() => scopedPois.find((poi) => poi.id === selectedPoiId) ?? null, [scopedPois, selectedPoiId])

  const focusPoint = useMemo(() => {
    if (selectedPoi) {
      return { latitude: selectedPoi.latitude, longitude: selectedPoi.longitude }
    }
    return userLocation
  }, [selectedPoi, userLocation])

  const nearestDistance = useMemo(() => {
    if (!userLocation) {
      return null
    }
    return Math.round(getDistanceToNearestPoi(userLocation, scopedPois))
  }, [scopedPois, userLocation])

  const desiredTrackingMode = useMemo(() => {
    if (nearestDistance === null || !Number.isFinite(nearestDistance)) {
      return 'normal' as const
    }
    if (nearestDistance < 20) {
      return 'high' as const
    }
    if (nearestDistance < 100) {
      return 'normal' as const
    }
    return 'low' as const
  }, [nearestDistance])

  const currentPoiName = useMemo(() => {
    if (!audioState.currentSrc) {
      return null
    }
    const currentPoi = scopedPois.find((poi) => poiHasAudioSource(poi, audioState.currentSrc))
    return currentPoi ? getLocalized(currentPoi.name, language) : null
  }, [audioState.currentSrc, language, scopedPois])

  useEffect(() => {
    if (mode === 'travel' && !isToursLoading && (!activeTourId || !activeTour)) {
      navigate('/tour-selection', { replace: true })
    }
  }, [activeTour, activeTourId, isToursLoading, mode, navigate])

  useEffect(() => {
    if (!qrPoiId) {
      return
    }
    setSelectedPoiId(qrPoiId)
  }, [qrPoiId])

  useEffect(() => {
    setTrackingMode(desiredTrackingMode)
  }, [desiredTrackingMode])

  useEffect(() => {
    if (!navigator.geolocation || mode !== 'travel' || !activeTour) {
      return
    }

    const clearWatch = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }

    const startWatch = () => {
      if (watchIdRef.current !== null) {
        return
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const nextLocation: GeoPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
          setUserLocation(nextLocation)
          setLocationError(null)

          const nearby = findNearbyPoi(nextLocation, scopedPois)
          const movementTarget = nearby ?? scopedPois[0] ?? null
          if (movementTarget?.stallId) {
            void createMovementLog({
              stallId: movementTarget.stallId,
              poiId: nearby?.id,
              position: nextLocation,
              accuracyMeters: Math.round(position.coords.accuracy || 0),
              source: 'travel_watch'
            })
          }
          if (!nearby) {
            return
          }

          const differentPoi = lastTriggerPoiIdRef.current !== nearby.id
          const allowCooldown = shouldTriggerCooldown(lastTriggerTimeRef.current)
          if (!differentPoi && !allowCooldown) {
            return
          }

          lastTriggerPoiIdRef.current = nearby.id
          lastTriggerTimeRef.current = Date.now()
          if (nearby.stallId) {
            void createPlaybackLog({
              stallId: nearby.stallId,
              poiId: nearby.id,
              language,
              listenDurationSeconds: 0
            })
          }
          const playback = await audioService.playSources(getAudioSources(nearby, language))
          if (playback.status === 'missing') {
            setMessage(t('no_audio_for_language'))
          } else {
            setMessage(null)
          }
        },
        (error) => {
          setLocationError(error.message || t('location_unavailable'))
        },
        {
          enableHighAccuracy: trackingMode !== 'low',
          timeout: trackingMode === 'high' ? 10000 : 15000,
          maximumAge: trackingMode === 'high' ? 0 : trackingMode === 'normal' ? 5000 : 15000
        }
      )
    }

    const syncTrackingWithVisibility = () => {
      if (document.hidden && !backgroundMode) {
        clearWatch()
        return
      }
      startWatch()
    }

    syncTrackingWithVisibility()
    document.addEventListener('visibilitychange', syncTrackingWithVisibility)

    return () => {
      document.removeEventListener('visibilitychange', syncTrackingWithVisibility)
      clearWatch()
    }
  }, [activeTour, backgroundMode, language, mode, scopedPois, t, trackingMode])

  const playPoi = async (poi: Poi): Promise<void> => {
    await audioService.unlock()
    if (poi.stallId) {
      void createPlaybackLog({
        stallId: poi.stallId,
        poiId: poi.id,
        language,
        listenDurationSeconds: 0
      })
    }
    const playback = await audioService.playSources(getAudioSources(poi, language))
    if (playback.status === 'missing') {
      setMessage(t('no_audio_for_language'))
      return
    }
    setMessage(null)
  }

  const locationBanner =
    mode === 'travel' ? (noGeolocationSupport ? t('location_unavailable') : locationError) : null
  const backgroundTrackingNote =
    mode === 'travel' && backgroundMode
      ? t('background_tracking_desc')
      : null

  return (
    <div data-testid='home-screen'>
      <header className='topbar'>
        <div className='topbar__row'>
          <span className='pill' data-testid='mode-pill'>
            {modeIcon(mode)} {mode === 'travel' ? t('travel_mode') : t('explore_mode')}
          </span>
          <div className='topbar__row' style={{ gap: '8px' }}>
            {mode === 'travel' && (
              <button
                type='button'
                onClick={() => navigate('/tour-selection')}
                data-testid='change-tour'
                className='icon-button'
                aria-label={t('change_tour')}
              >
                ⇄
              </button>
            )}
            <button
              type='button'
              onClick={() => navigate('/settings')}
              data-testid='open-settings'
              className='icon-button'
              aria-label={t('settings')}
            >
              ⚙
            </button>
          </div>
        </div>

        <div className='search-panel' style={{ marginTop: '12px' }}>
          {activeTour && mode === 'travel' && (
            <div className='pill' data-testid='active-tour-name'>
              {activeTour.icon} {getLocalized(activeTour.name, language)}
            </div>
          )}
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            aria-label={t('search_poi')}
            data-testid='poi-search'
            className='field__input'
          />
          {searchText.trim() && (
            <div className='search-results' data-testid='search-results'>
              {searchResults.map((poi) => (
                <button
                  key={poi.id}
                  type='button'
                  onClick={() => setSelectedPoiId(poi.id)}
                  className='search-result'
                  data-testid={`search-result-${poi.id}`}
                >
                  <div className='choice-card__title'>{getLocalized(poi.name, language)}</div>
                  <div className='choice-card__copy'>
                    {poi.category} • {Math.round(poi.radius)}m
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className='home-map' data-testid='home-map'>
        <PoiMap
          pois={scopedPois}
          userLocation={userLocation}
          focusPoint={focusPoint}
          onPoiSelect={(poi) => setSelectedPoiId(poi.id)}
        />
      </section>

      <section className='home-sheet'>
        <div className='sheet-handle' />
        <div className='sheet-header'>
          <div className='sheet-header__row'>
            <div className='detail-stats'>
              <span className='pill'>{mode === 'travel' ? t('travel_mode') : t('explore_mode')}</span>
              <span className='pill' data-testid='poi-count'>
                {scopedPois.length} {t('poi_in_tour')}
              </span>
              <span className='pill' data-testid='tracking-mode'>
                tracking {trackingMode}
              </span>
            </div>
            {nearestDistance !== null && Number.isFinite(nearestDistance) && (
              <span className='meta-tag'>{nearestDistance}m nearest</span>
            )}
          </div>
          {locationBanner && <div className='notice notice-error'>{locationBanner}</div>}
          {backgroundTrackingNote && <div className='notice notice-success'>{backgroundTrackingNote}</div>}
          {message && <div className='notice notice-error'>{message}</div>}
        </div>

        {filteredPois.length === 0 ? (
          <p className='helper-copy'>{t('no_poi_found')}</p>
        ) : (
          <div className='poi-list'>
            {filteredPois.map((poi) => (
              <article key={poi.id} className='poi-card' data-testid={`poi-card-${poi.id}`}>
                <div className='poi-card__body'>
                  <button
                    type='button'
                    className='poi-card__media'
                    onClick={() => setSelectedPoiId(poi.id)}
                    aria-label={getLocalized(poi.name, language)}
                  >
                    <img src={getLocalized(poi.imageUrl, language)} alt={getLocalized(poi.name, language)} />
                  </button>
                  <div className='poi-card__content'>
                    <div className='sheet-header__row'>
                      <h2 className='poi-card__title'>{getLocalized(poi.name, language)}</h2>
                      <span className='meta-tag'>★ {poi.priority}</span>
                    </div>
                    <div className='poi-meta'>
                      <span className='meta-tag'>{poi.category}</span>
                      <span className='meta-tag'>{Math.round(poi.radius)}m</span>
                    </div>
                    <p className='poi-card__copy'>{getLocalized(poi.description, language)}</p>
                    <div className='poi-card__actions'>
                      <Link to={`/poi/${poi.id}`} data-testid={`poi-detail-${poi.id}`} className='button button-secondary'>
                        Detail
                      </Link>
                      <button
                        type='button'
                        onClick={() => {
                          void playPoi(poi)
                        }}
                        data-testid={`poi-play-${poi.id}`}
                        className='button button-primary'
                      >
                        {t('play')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {audioState.currentSrc && (
        <footer className='player-bar' data-testid='audio-player'>
          <div className='player-bar__row' style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>{formatTime(audioState.currentTime)}</span>
            <span>{formatTime(audioState.duration)}</span>
          </div>
          <input
            type='range'
            min={0}
            max={1}
            step={0.001}
            value={audioState.duration > 0 ? audioState.currentTime / audioState.duration : 0}
            onChange={(event) => seek(Number(event.target.value) * audioState.duration)}
            data-testid='audio-progress'
          />
          <div className='player-bar__row' style={{ marginTop: '10px' }}>
            <div>
              <div className='choice-card__title'>{currentPoiName ?? t('playing')}</div>
              <div className='choice-card__copy'>{audioState.isPlaying ? t('playing') : t('paused')}</div>
            </div>
            <div className='poi-card__actions'>
              <button
                type='button'
                onClick={() => {
                  if (audioState.isPlaying) {
                    pause()
                  } else {
                    void play()
                  }
                }}
                data-testid='audio-toggle'
                className='button button-secondary'
              >
                {audioState.isPlaying ? t('paused') : t('play')}
              </button>
              <button type='button' onClick={() => stop()} data-testid='audio-stop' className='button button-tertiary'>
                {t('stop')}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
