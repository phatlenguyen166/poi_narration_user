import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { preferences } from '../services/preferences'
import { HomeScreen } from './HomeScreen'

export const PoiEntryScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, mode, setMode } = useApp()

  useEffect(() => {
    if (!isLoggedIn) {
      preferences.setPendingRoute(`/poi${location.search}`)
      navigate('/login', { replace: true })
      return
    }

    if (mode !== 'explore') {
      setMode('explore')
    }
  }, [isLoggedIn, location.search, mode, navigate, setMode])

  if (isLoggedIn && mode === 'explore') {
    return <HomeScreen />
  }

  return (
    <div className='app-screen'>
      <p className='helper-copy'>Opening location...</p>
    </div>
  )
}
