import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ListingsPage } from './pages/ListingsPage'
import { AuthPage } from './pages/AuthPage'
import { DashboardUser } from './pages/DashboardUser'
import { DashboardAdmin } from './pages/DashboardAdmin'
import { SellListingPage } from './pages/SellListingPage'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children, requireAdmin }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="page-message"><p>Ładowanie…</p></div>
  if (!user) return <Navigate to="/" replace />
  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/ogloszenia" element={<ListingsPage />} />
        <Route path="/sprzedaj" element={<ProtectedRoute><SellListingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardUser /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><DashboardAdmin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
