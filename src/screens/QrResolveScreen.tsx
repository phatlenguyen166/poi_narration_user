import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { endTravelSession, resolveQrCode, resolveQrTarget, selectTravelTour } from '../services/repository'
import { preferences } from '../services/preferences'

export const QrResolveScreen = () => {
  const navigate = useNavigate()
  const { isLoggedIn, firstLaunch, deviceCheckCompleted, setActiveTourId, setMode } = useApp()
  const { targetType, targetId, qrCode } = useParams<{ targetType: 'stall' | 'tour'; targetId: string; qrCode: string }>()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pendingRoute = qrCode ? `/qr/code/${qrCode}` : `/qr/${targetType}/${targetId}`

  useEffect(() => {
    if (!qrCode && (!targetType || !targetId)) {
      setErrorMessage('QR target is invalid.')
      return
    }

    if (!isLoggedIn) {
      preferences.setPendingRoute(pendingRoute)
      navigate('/login', { replace: true })
      return
    }

    if (firstLaunch) {
      preferences.setPendingRoute(pendingRoute)
      navigate('/welcome', { replace: true })
      return
    }

    if (!deviceCheckCompleted) {
      preferences.setPendingRoute(pendingRoute)
      navigate('/device-check', { replace: true })
      return
    }

    const run = async () => {
      try {
        const result = qrCode
          ? await resolveQrCode(qrCode)
          : await resolveQrTarget(targetType!, targetId!)
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
  }, [deviceCheckCompleted, firstLaunch, isLoggedIn, navigate, pendingRoute, qrCode, setActiveTourId, setMode, targetId, targetType])

  if (errorMessage) {
    return <div className='app-screen'><p className='notice notice-error'>{errorMessage}</p></div>
  }

  return <div className='app-screen'><p className='helper-copy'>Resolving QR...</p></div>
}
