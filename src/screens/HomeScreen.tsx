import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { usePoisQuery, useToursQuery } from '../hooks/useRepository'
import { useTranslation } from '../hooks/useTranslation'
import { audioService } from '../services/audio'
import {
  createMovementLog,
  createPlaybackLog,
  filterPoisByActiveTour,
  getAudioSources,
  getPreferredAudioSource,
  poiHasAudioSource
} from '../services/repository'
import type { GeoPoint, Poi } from '../types'
import { calculateDistanceMeters, findNearbyPoi, getDistanceToNearestPoi, shouldTriggerCooldown } from '../utils/distance'
import { getLocalized, modeIcon } from '../utils/localization'
import { PoiMap } from '../components/PoiMap'

const noGeolocationSupport = typeof navigator !== 'undefined' && !navigator.geolocation

export const HomeScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const t = useTranslation()
  const { language, mode, activeTourId, backgroundMode, currentUser } = useApp()
  const { data: pois = [] } = usePoisQuery()
  const { data: tours = [], isLoading: isToursLoading } = useToursQuery()
  const { state: audioState, pause, play, stop, seek, formatTime } = useAudioPlayer()

  const [searchText, setSearchText] = useState('')
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [trackingMode, setTrackingMode] = useState<'high' | 'normal' | 'low'>('normal')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(true)
  const [isFollowingUserLocation, setIsFollowingUserLocation] = useState(false)

  const watchIdRef = useRef<number | null>(null)
  const lastTriggerPoiIdRef = useRef<string | null>(null)
  const lastTriggerTimeRef = useRef<number | null>(null)
  const activeMovementPoiRef = useRef<{ poiId: string; stallId: string; enteredAt: number } | null>(null)
  const skipNextResetPlaybackLogRef = useRef(false)
  const previousAudioRef = useRef(audioState)
  const qrStallId = searchParams.get('stallId')
  const qrPoiId = searchParams.get('poiId')

  const activeTour = useMemo(() => tours.find((tour) => tour.id === activeTourId) ?? null, [activeTourId, tours])

  const scopedPois = useMemo(() => {
    if (mode === 'travel' && activeTour) {
      return filterPoisByActiveTour(pois, activeTour.id, tours)
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
      const stallName = poi.stallName?.toLowerCase() ?? ''
      return name.includes(query) || description.includes(query) || stallName.includes(query)
    })
  }, [language, scopedPois, searchText])

  const sortedFilteredPois = useMemo(() => {
    if (!userLocation) {
      return filteredPois
    }

    return [...filteredPois].sort((left, right) => {
      const leftDistance = calculateDistanceMeters(userLocation, {
        latitude: left.latitude,
        longitude: left.longitude
      })
      const rightDistance = calculateDistanceMeters(userLocation, {
        latitude: right.latitude,
        longitude: right.longitude
      })
      return leftDistance - rightDistance
    })
  }, [filteredPois, userLocation])

  const searchResults = useMemo(() => sortedFilteredPois.slice(0, 4), [sortedFilteredPois])

  const selectedPoi = useMemo(
    () => scopedPois.find((poi) => poi.id === selectedPoiId) ?? null,
    [scopedPois, selectedPoiId]
  )

  const formatDistanceLabel = (distanceMeters: number | null) => {
    if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
      return null
    }
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)}m nearest`
    }
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)}km nearest`
  }

  const focusPoint = useMemo(() => {
    if (isFollowingUserLocation && userLocation) {
      return userLocation
    }
    if (selectedPoi) {
      return { latitude: selectedPoi.latitude, longitude: selectedPoi.longitude }
    }
    return userLocation
  }, [isFollowingUserLocation, selectedPoi, userLocation])

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

  const activePoi = useMemo(
    () => {
      if (!isDetailOpen) {
        return null
      }
      return selectedPoi ?? scopedPois.find((poi) => poiHasAudioSource(poi, audioState.currentSrc)) ?? sortedFilteredPois[0] ?? null
    },
    [audioState.currentSrc, isDetailOpen, scopedPois, selectedPoi, sortedFilteredPois]
  )

  const logPlaybackOutcome = (
    playbackStatus: 'COMPLETED' | 'STOPPED',
    currentSrc: string | null,
    listenDurationSeconds: number,
    durationSeconds: number
  ) => {
    if (!currentUser || !currentSrc) {
      return
    }

    const poi = scopedPois.find((item) => poiHasAudioSource(item, currentSrc))
    if (!poi?.stallId) {
      return
    }

    const roundedDuration = Math.max(0, Math.round(listenDurationSeconds))
    if (roundedDuration <= 0) {
      return
    }

    const completionRate = durationSeconds > 0
      ? Math.min(100, Number(((roundedDuration / durationSeconds) * 100).toFixed(2)))
      : undefined

    void createPlaybackLog({
      tourist: currentUser,
      stallId: poi.stallId,
      poi,
      language,
      listenDurationSeconds: roundedDuration,
      triggerMode: qrStallId ? 'QR' : mode === 'explore' ? 'MANUAL' : 'GEOFENCE',
      playbackStatus,
      completionRate
    })
  }

  const handleSelectPoi = (poiId: string) => {
    const poi = pois.find((item) => item.id === poiId) ?? null
    const nextParams = new URLSearchParams()

    if (poi?.stallId) {
      nextParams.set('stallId', poi.stallId)
    }
    nextParams.set('poiId', poiId)

    setSelectedPoiId(poiId)
    setIsDetailOpen(true)
    setIsFollowingUserLocation(false)

    if (location.pathname !== '/home' || location.search !== `?${nextParams.toString()}`) {
      navigate(`/home?${nextParams.toString()}`, { replace: false })
    }
  }

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
    setIsDetailOpen(true)
  }, [qrPoiId])

  useEffect(() => {
    setTrackingMode(desiredTrackingMode)
  }, [desiredTrackingMode])

  useEffect(() => {
    if (mode !== 'travel' || !activeTourId) {
      activeMovementPoiRef.current = null
    }
  }, [activeTourId, mode])

  useEffect(() => {
    if (!audioState.currentSrc) {
      return
    }

    const currentPoi = scopedPois.find((poi) => poiHasAudioSource(poi, audioState.currentSrc))
    if (!currentPoi) {
      return
    }

    const nextSource = getPreferredAudioSource(currentPoi, language)
    if (!nextSource || nextSource === audioState.currentSrc) {
      return
    }

    void audioService.setSource(nextSource, audioState.isPlaying).then((loaded) => {
      if (!loaded) {
        setMessage(t('no_audio_for_language'))
      } else {
        setMessage(null)
      }
    })
  }, [audioState.currentSrc, audioState.isPlaying, language, scopedPois, t])

  useEffect(() => {
    const previous = previousAudioRef.current
    const sameSource = previous.currentSrc !== null && previous.currentSrc === audioState.currentSrc

    if (
      skipNextResetPlaybackLogRef.current &&
      sameSource &&
      previous.currentTime > 0 &&
      audioState.currentTime === 0
    ) {
      skipNextResetPlaybackLogRef.current = false
      previousAudioRef.current = audioState
      return
    }

    if (
      sameSource &&
      previous.isPlaying &&
      !audioState.isPlaying &&
      previous.currentTime > 0 &&
      audioState.currentTime === 0
    ) {
      logPlaybackOutcome(
        'COMPLETED',
        previous.currentSrc,
        previous.duration > 0 ? previous.duration : previous.currentTime,
        previous.duration
      )
    }

    previousAudioRef.current = audioState
  }, [audioState, currentUser, language, mode, qrStallId, scopedPois])

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    if (mode === 'travel' && !activeTour) {
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
          const currentMovement = activeMovementPoiRef.current
          const now = Date.now()

          if (mode === 'travel') {
            if (currentMovement && (!nearby || nearby.id !== currentMovement.poiId)) {
              const previousPoi = scopedPois.find((poi) => poi.id === currentMovement.poiId)
              const exitDistance = previousPoi
                ? Math.round(
                  calculateDistanceMeters(nextLocation, {
                    latitude: previousPoi.latitude,
                    longitude: previousPoi.longitude
                  })
                )
                : null

              void createMovementLog({
                tourist: currentUser,
                stallId: currentMovement.stallId,
                position: nextLocation,
                source: 'travel_watch',
                distanceToStallMeters: exitDistance,
                dwellDurationSeconds: Math.max(0, Math.round((now - currentMovement.enteredAt) / 1000)),
                eventType: 'EXIT'
              })
              activeMovementPoiRef.current = null
            }

            if (nearby?.stallId && (!currentMovement || currentMovement.poiId !== nearby.id)) {
              activeMovementPoiRef.current = {
                poiId: nearby.id,
                stallId: nearby.stallId,
                enteredAt: now
              }
              void createMovementLog({
                tourist: currentUser,
                stallId: nearby.stallId,
                position: nextLocation,
                source: 'travel_watch',
                distanceToStallMeters: Math.round(getDistanceToNearestPoi(nextLocation, [nearby])),
                eventType: 'ENTER'
              })
            }
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
          await audioService.unlock()
          const playback = await audioService.playSources(getAudioSources(nearby, language))
          if (playback.status === 'missing') {
            setMessage(t('no_audio_for_language'))
          } else if (playback.status === 'blocked') {
            setMessage('Trinh duyet dang chan tu dong phat audio')
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
  }, [activeTour, backgroundMode, currentUser, language, mode, qrStallId, scopedPois, t, trackingMode])

  const playPoi = async (poi: Poi): Promise<void> => {
    await audioService.unlock()
    const playback = await audioService.playSources(getAudioSources(poi, language))
    if (playback.status === 'missing') {
      setMessage(t('no_audio_for_language'))
      return
    }
    setMessage(null)
  }

  const locationBanner = mode === 'travel' ? (noGeolocationSupport ? t('location_unavailable') : locationError) : null
  const backgroundTrackingNote = mode === 'travel' && backgroundMode ? t('background_tracking_desc') : null
  const nearestDistanceLabel = formatDistanceLabel(nearestDistance)

  return (
    <div className='home-screen-root' data-testid='home-screen'>
      <header className='topbar'>
        <div className='topbar__row'>
          <div className='topbar__cluster topbar__cluster--left'>
            <button
              type='button'
              onClick={() => setIsSidebarOpen((current) => !current)}
              data-testid='toggle-poi-sidebar'
              className='icon-button'
              aria-label={isSidebarOpen ? 'Hide locations panel' : 'Show locations panel'}
            >
              {isSidebarOpen ? '☰' : '☷'}
            </button>
            <span className='pill' data-testid='mode-pill'>
              {modeIcon(mode)} {mode === 'travel' ? t('travel_mode') : t('explore_mode')}
            </span>
            {activeTour && mode === 'travel' && (
              <span className='pill' data-testid='active-tour-name'>
                {activeTour.icon} {getLocalized(activeTour.name, language)}
              </span>
            )}
            <div className='topbar__status'>
              <span className='meta-tag' data-testid='poi-count'>
                {scopedPois.length} {t('poi_in_tour')}
              </span>
              <span className='meta-tag' data-testid='tracking-mode'>
                tracking {trackingMode}
              </span>
              {nearestDistanceLabel && <span className='meta-tag'>{nearestDistanceLabel}</span>}
              <span className='meta-tag'>{audioState.isPlaying ? t('playing') : t('paused')}</span>
              <span className='meta-tag'>{language}</span>
            </div>
          </div>

          <div className='topbar__search'>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              aria-label={t('search_poi')}
              data-testid='poi-search'
              className='field__input'
              placeholder={t('search_poi')}
            />
            {searchText.trim() && (
              <button
                type='button'
                onClick={() => setSearchText('')}
                className='topbar__search-clear'
                aria-label='Clear search'
                title='Clear search'
              >
                ✕
              </button>
            )}
            {searchText.trim() && (
              <div className='search-results' data-testid='search-results'>
                {searchResults.map((poi) => (
                  <button
                    key={poi.id}
                    type='button'
                    onClick={() => handleSelectPoi(poi.id)}
                    className='search-result'
                    data-testid={`search-result-${poi.id}`}
                  >
                    <div className='choice-card__title'>{getLocalized(poi.name, language)}</div>
                    <div className='choice-card__copy'>
                      {poi.stallName ?? t('poi_category')} • {Math.round(poi.radius)}m
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='topbar__cluster topbar__cluster--right'>
            <button
              type='button'
              onClick={() => navigate('/')}
              data-testid='go-home'
              className='icon-button'
              aria-label='Go to home page'
              title='Home'
            >
              ⌂
            </button>
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
      </header>

      <div className='home-layout home-layout--map-shell'>
        <section className='home-stage'>
          <aside className={`home-sidebar${isSidebarOpen ? '' : ' home-sidebar--collapsed'}`}>
            <div className='sheet-header'>
              {locationBanner && <div className='notice notice-error'>{locationBanner}</div>}
              {backgroundTrackingNote && <div className='notice notice-success'>{backgroundTrackingNote}</div>}
              {message && <div className='notice notice-error'>{message}</div>}
            </div>

            <div className='page-card page-card--padded home-summary-card'>
              <div className='choice-card__copy'>Now playing</div>
              <div className='choice-card__title'>{currentPoiName ?? 'No audio selected'}</div>
              {audioState.currentSrc ? (
                <>
                  <div className='player-inline'>
                    <div className='player-bar__row player-inline__time'>
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
                      data-testid='audio-progress-inline'
                    />
                  </div>
                  <div className='poi-card__actions home-summary-card__actions'>
                    <button
                      type='button'
                      onClick={() => {
                        if (audioState.isPlaying) {
                          logPlaybackOutcome('STOPPED', audioState.currentSrc, audioState.currentTime, audioState.duration)
                          pause()
                        } else {
                          void play()
                        }
                      }}
                      data-testid='audio-toggle-inline'
                      className='button button-secondary button-icon'
                      aria-label={audioState.isPlaying ? t('paused') : t('play')}
                      title={audioState.isPlaying ? t('paused') : t('play')}
                    >
                      {audioState.isPlaying ? '❚❚' : '▶'}
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        skipNextResetPlaybackLogRef.current = true
                        logPlaybackOutcome('STOPPED', audioState.currentSrc, audioState.currentTime, audioState.duration)
                        stop()
                      }}
                      data-testid='audio-stop-inline'
                      className='button button-tertiary button-icon'
                      aria-label={t('stop')}
                      title={t('stop')}
                    >
                      ■
                    </button>
                  </div>
                </>
              ) : (
                <p className='poi-card__copy'>Select a location to preview narration.</p>
              )}
            </div>

            <div className='page-card page-card--padded home-results-card'>
              <div className='sheet-header__row'>
                <h2 className='poi-card__title'>Locations</h2>
                <span className='meta-tag'>{sortedFilteredPois.length} results</span>
              </div>
              {sortedFilteredPois.length === 0 ? (
                <p className='helper-copy'>{t('no_poi_found')}</p>
              ) : (
                <div className='poi-list poi-list--compact'>
                  {sortedFilteredPois.map((poi) => (
                    <article
                      key={poi.id}
                      className={`poi-card poi-card--compact${activePoi?.id === poi.id ? ' poi-card--active' : ''}`}
                      data-testid={`poi-card-${poi.id}`}
                    >
                      <div className='poi-card__rail'>
                        <button
                          type='button'
                          className='poi-card__media'
                          onClick={() => handleSelectPoi(poi.id)}
                          aria-label={getLocalized(poi.name, language)}
                        >
                          <img src={getLocalized(poi.imageUrl, language)} alt={getLocalized(poi.name, language)} />
                        </button>
                      </div>
                      <div className='poi-card__content'>
                        <div className='sheet-header__row poi-card__header-row'>
                          <h2 className='poi-card__title'>{getLocalized(poi.name, language)}</h2>
                          <span className='meta-tag meta-tag--rating' style={{ whiteSpace: 'nowrap' }}>
                            ★ {poi.priority}/5
                          </span>
                        </div>
                        <div className='poi-meta'>
                          <span className='meta-tag meta-tag--accent'>{poi.stallName ?? 'Địa điểm'}</span>
                          <span className='meta-tag'>◉ {Math.round(poi.radius)}m</span>
                        </div>
                        <p className='poi-card__copy'>{getLocalized(poi.description, language)}</p>
                        <div className='poi-card__actions poi-card__actions--compact'>
                          <button
                            type='button'
                            onClick={() => handleSelectPoi(poi.id)}
                            className='button button-secondary button-icon button-icon--soft'
                            aria-label='Preview location'
                            title='Preview'
                          >
                            👁
                          </button>
                          <button
                            type='button'
                            onClick={() => {
                              void playPoi(poi)
                            }}
                            data-testid={`poi-play-${poi.id}`}
                            className='button button-primary button-icon button-icon--large'
                            aria-label={t('play')}
                            title={t('play')}
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className='home-map page-card' data-testid='home-map'>
            <button
              type='button'
              className='home-map__recenter'
              onClick={() => setIsFollowingUserLocation(true)}
              disabled={!userLocation}
              aria-label='Quay về vị trí hiện tại'
              title={userLocation ? 'Quay về vị trí hiện tại' : 'Chưa có vị trí hiện tại'}
            >
              ◎
            </button>
            <PoiMap
              pois={scopedPois}
              userLocation={userLocation}
              focusPoint={focusPoint}
              onPoiSelect={(poi) => handleSelectPoi(poi.id)}
            />
          </section>
          {activePoi ? (
            <div className='page-card page-card--padded home-detail-card home-detail-card--floating'>
              <button
                type='button'
                className='home-detail-card__close'
                onClick={() => setIsDetailOpen(false)}
                aria-label='Close detail panel'
                title='Close'
              >
                ✕
              </button>
              <div className='home-detail-card__image'>
                <img src={getLocalized(activePoi.imageUrl, language)} alt={getLocalized(activePoi.name, language)} />
              </div>
              <h2 className='home-detail-card__title'>{getLocalized(activePoi.name, language)}</h2>
              <div className='screen-header' style={{ marginBottom: 0 }}>
                <p className='screen-header__copy'>{getLocalized(activePoi.description, language)}</p>
              </div>

              <div className='detail-stats'>
                <span className='meta-tag'>Priority {activePoi.priority}</span>
                <span className='meta-tag'>{Math.round(activePoi.radius)}m radius</span>
                <span className='meta-tag'>
                  {activePoi.contents?.filter((content) => Boolean(content.audioUrl)).length ?? 0} audio guides
                </span>
              </div>

              <div className='poi-card__actions'>
                <button
                  type='button'
                  onClick={() => {
                    void playPoi(activePoi)
                  }}
                  data-testid={`poi-preview-play-${activePoi.id}`}
                  className='button button-primary button-icon button-icon--large'
                  aria-label={t('play')}
                  title={t('play')}
                >
                  ▶
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
