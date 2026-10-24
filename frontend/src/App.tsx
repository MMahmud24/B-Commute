import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './lib/auth'
import { DEFAULT_TAB } from './lib/tabs'
import BusDetails from './pages/BusDetails'
import BusHome from './pages/BusHome'
import CarHome from './pages/CarHome'
import Login from './pages/Login'
import Residence from './pages/Residence'
import Schedule from './pages/Schedule'
import Signup from './pages/Signup'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to={DEFAULT_TAB} replace />} />
            <Route path="bus" element={<BusHome />} />
            <Route path="bus/details" element={<BusDetails />} />
            <Route path="car" element={<CarHome />} />
            <Route path="schedule" element={<Schedule />} />
          </Route>
          <Route path="/residence" element={<ProtectedRoute requireResidence={false}><Residence /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
