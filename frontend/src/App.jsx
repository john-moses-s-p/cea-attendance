import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import Meetings from './pages/Meetings'
import MeetingDetail from './pages/MeetingDetail'
import AttendanceAnalytics from './pages/AttendanceAnalytics'
import StudentAttendance from './pages/StudentAttendance'
import Profile from './pages/Profile'

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/meetings"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <Meetings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/meetings/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <MeetingDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AttendanceAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/meetings"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Meetings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/meetings/:id"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <MeetingDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/attendance"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'student']}>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <Navigate to={user ? (user.role === 'student' ? '/student' : '/admin') : '/login'} replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
