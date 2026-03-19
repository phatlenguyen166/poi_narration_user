import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { resolveQrTarget } from '../services/repository'
import { preferences } from '../services/preferences'

export const QrResolveScreen = () => {
  const navigate = useNavigate()
  const { isLoggedIn, setActiveTourId, setMode } = useApp()
  const { targetType, targetId } = useParams<{ targetType: 'stall' | 'poi'; targetId: string }>()
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

    const run = async () => {
      try {
        const result = await resolveQrTarget(targetType, targetId)
        setMode('explore')
        setActiveTourId(result.targetType === 'STALL' ? `stall-${result.targetId}` : null)

        if (result.targetType === 'POI') {
          navigate(`/poi/${result.targetId}`, { replace: true })
          return
        }

        navigate('/home', { replace: true })
      } catch {
        setErrorMessage('Unable to resolve this QR target.')
      }
    }

    void run()
  }, [isLoggedIn, navigate, setActiveTourId, setMode, targetId, targetType])

  if (errorMessage) {
    return <div className='app-screen'><p className='notice notice-error'>{errorMessage}</p></div>
  }

  return <div className='app-screen'><p className='helper-copy'>Resolving QR...</p></div>
}
