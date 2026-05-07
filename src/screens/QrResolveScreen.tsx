import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { endTravelSession, resolveQrTarget, selectTravelTour } from '../services/repository'
import { preferences } from '../services/preferences'

export const QrResolveScreen = () => {
  const navigate = useNavigate()
  const { isLoggedIn, firstLaunch, deviceCheckCompleted, setActiveTourId, setMode } = useApp()
  const { targetType, targetId } = useParams<{ targetType: 'stall' | 'tour'; targetId: string }>()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!targetType || !targetId) {
      setErrorMessage('QR target is invalid.')
      return
    }

    if (!isLoggedIn) {
      preferences.setPendingRoute(`/qr/${targetType}/${targetId}`)
      navigate('/login', { replace: true })
      return
    }

    if (firstLaunch) {
      preferences.setPendingRoute(`/qr/${targetType}/${targetId}`)
      navigate('/welcome', { replace: true })
      return
    }

    if (!deviceCheckCompleted) {
      preferences.setPendingRoute(`/qr/${targetType}/${targetId}`)
      navigate('/device-check', { replace: true })
      return
    }

    const run = async () => {
      try {
        const result = await resolveQrTarget(targetType, targetId)
        if (result.targetType === 'TOUR') {
          setMode('travel')
          await selectTravelTour(String(result.targetId))
          setActiveTourId(String(result.targetId))
        } else {
          await endTravelSession()
          setMode('explore')
          setActiveTourId(`stall-${result.targetId}`)
        }

        navigate('/home', { replace: true })
      } catch {
        setErrorMessage('Unable to resolve this QR target.')
      }
    }

    void run()
  }, [deviceCheckCompleted, firstLaunch, isLoggedIn, navigate, setActiveTourId, setMode, targetId, targetType])

  if (errorMessage) {
    return <div className='app-screen'><p className='notice notice-error'>{errorMessage}</p></div>
  }

  return <div className='app-screen'><p className='helper-copy'>Resolving QR...</p></div>
}
