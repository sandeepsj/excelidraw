import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import NewDiagramPage from '@/pages/NewDiagramPage'
import EditDiagramPage from '@/pages/EditDiagramPage'
import ViewDiagramPage from '@/pages/ViewDiagramPage'

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/diagram/new" element={<ProtectedRoute><NewDiagramPage /></ProtectedRoute>} />
          <Route path="/diagram/:id/edit" element={<ProtectedRoute><EditDiagramPage /></ProtectedRoute>} />
          <Route path="/diagram/:id/view" element={<ProtectedRoute><ViewDiagramPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
