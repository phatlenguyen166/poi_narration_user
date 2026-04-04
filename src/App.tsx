import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { MobileFrame } from './components/MobileFrame'
import { useApp } from './context/useApp'
import { DeviceCheckScreen } from './screens/DeviceCheckScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LoginScreen } from './screens/LoginScreen'
import { PoiEntryScreen } from './screens/PoiEntryScreen'
import { QrResolveScreen } from './screens/QrResolveScreen'
import { RegisterScreen } from './screens/RegisterScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TourSelectionScreen } from './screens/TourSelectionScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'

const RootRedirect = () => {
  const { isLoggedIn, firstLaunch, deviceCheckCompleted, mode, activeTourId } = useApp()

  if (!isLoggedIn) {
    return <Navigate to='/login' replace />
  }
  if (firstLaunch) {
    return <Navigate to='/welcome' replace />
  }
  if (!deviceCheckCompleted) {
    return <Navigate to='/device-check' replace />
  }
  if (mode === 'travel' && !activeTourId) {
    return <Navigate to='/tour-selection' replace />
  }
  return <Navigate to='/home' replace />
}

const PublicOnly = () => {
  const { isLoggedIn } = useApp()
  if (isLoggedIn) {
    return <Navigate to='/' replace />
  }
  return <Outlet />
}

const RequireAuth = () => {
  const { isLoggedIn } = useApp()
  if (!isLoggedIn) {
    return <Navigate to='/login' replace />
  }
  return <Outlet />
}

const RequireAppReady = () => {
  const { firstLaunch, deviceCheckCompleted, mode, activeTourId } = useApp()
  if (firstLaunch) {
    return <Navigate to='/welcome' replace />
  }
  if (!deviceCheckCompleted) {
    return <Navigate to='/device-check' replace />
  }
  if (mode === 'travel' && !activeTourId) {
    return <Navigate to='/tour-selection' replace />
  }
  return <Outlet />
}

const RequireFirstLaunch = () => {
  const { firstLaunch } = useApp()
  if (!firstLaunch) {
    return <Navigate to='/' replace />
  }
  return <Outlet />
}

const RequirePendingDeviceCheck = () => {
  const { firstLaunch, deviceCheckCompleted } = useApp()
  if (firstLaunch) {
    return <Navigate to='/welcome' replace />
  }
  if (deviceCheckCompleted) {
    return <Navigate to='/' replace />
  }
  return <Outlet />
}

const RequireSetupComplete = () => {
  const { firstLaunch, deviceCheckCompleted } = useApp()
  if (firstLaunch) {
    return <Navigate to='/welcome' replace />
  }
  if (!deviceCheckCompleted) {
    return <Navigate to='/device-check' replace />
  }
  return <Outlet />
}

function App() {
  return (
    <MobileFrame>
      <Routes>
        <Route path='/' element={<RootRedirect />} />

        <Route element={<PublicOnly />}>
          <Route path='/login' element={<LoginScreen />} />
          <Route path='/register' element={<RegisterScreen />} />
        </Route>

        <Route path='/poi' element={<PoiEntryScreen />} />
        <Route path='/qr/:targetType/:targetId' element={<QrResolveScreen />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequireFirstLaunch />}>
            <Route path='/welcome' element={<WelcomeScreen />} />
          </Route>

          <Route element={<RequirePendingDeviceCheck />}>
            <Route path='/device-check' element={<DeviceCheckScreen />} />
          </Route>

          <Route element={<RequireSetupComplete />}>
            <Route path='/tour-selection' element={<TourSelectionScreen />} />

            <Route element={<RequireAppReady />}>
              <Route path='/home' element={<HomeScreen />} />
              <Route path='/settings' element={<SettingsScreen />} />
            </Route>
          </Route>
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </MobileFrame>
  )
}

export default App
