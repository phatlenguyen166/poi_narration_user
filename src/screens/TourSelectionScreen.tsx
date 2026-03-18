import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { useToursQuery } from '../hooks/useRepository'
import { useTranslation } from '../hooks/useTranslation'
import { getLocalized } from '../utils/localization'

export const TourSelectionScreen = () => {
  const navigate = useNavigate()
  const t = useTranslation()
  const { language, setActiveTourId } = useApp()
  const { data: tours = [], isLoading } = useToursQuery()

  const [selectedTourId, setSelectedTourId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const filteredTours = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (!query) {
      return tours
    }
    return tours.filter((tour) => {
      const name = getLocalized(tour.name, language).toLowerCase()
      const description = getLocalized(tour.description, language).toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [language, searchText, tours])

  const startTour = (): void => {
    if (!selectedTourId) {
      setErrorMessage(t('please_select_tour'))
      return
    }
    setActiveTourId(selectedTourId)
    navigate('/home', { replace: true })
  }

  return (
    <div className='app-screen'>
      <div className='screen-header'>
        <span className='screen-header__eyebrow'>Travel setup</span>
        <h1 className='screen-header__title' data-testid='tour-selection-title'>
          {t('select_tour')}
        </h1>
        <p className='screen-header__copy'>{t('select_tour_desc')}</p>
      </div>

        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          aria-label={t('search_tour')}
          data-testid='tour-search'
          className='field__input'
        />

        <div className='choice-grid' style={{ marginTop: '16px' }}>
          {isLoading && <p className='helper-copy'>Loading...</p>}
          {!isLoading && filteredTours.length === 0 && <p className='helper-copy'>{t('no_tour_found')}</p>}

          {filteredTours.map((tour) => {
            const selected = selectedTourId === tour.id
            return (
              <button
                key={tour.id}
                type='button'
                onClick={() => setSelectedTourId(tour.id)}
                data-testid={`tour-card-${tour.id}`}
                className={`choice-card ${selected ? 'choice-card--selected' : ''}`}
              >
                <div className='choice-card__row'>
                  <div className='choice-card__icon'>{tour.icon}</div>
                  <div className='min-w-0 flex-1'>
                    <div className='choice-card__title'>{getLocalized(tour.name, language)}</div>
                    <div className='choice-card__copy'>{getLocalized(tour.description, language)}</div>
                    <div className='poi-meta' style={{ marginTop: '10px' }}>
                      <span className='meta-tag'>
                        {tour.poiIds.length} {t('poi_in_tour')}
                      </span>
                      <span className='meta-tag'>
                        {tour.estimatedMinutes} {t('est_duration')}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {errorMessage && (
          <p className='notice notice-error' data-testid='tour-selection-error' style={{ marginTop: '14px' }}>
            {errorMessage}
          </p>
        )}

        <button
          type='button'
          onClick={startTour}
          data-testid='tour-start'
          className='button button-primary'
          style={{ marginTop: '16px' }}
        >
          {t('start_tour')}
        </button>
    </div>
  )
}
