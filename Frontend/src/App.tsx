import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './features/auth/context/AuthContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import AuthPage from './features/auth/pages/AuthPage';
import DashboardPage from './features/dashboard/DashboardPage';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<AuthPage mode="signin" />} />
        <Route path="/register" element={<AuthPage mode="signup" />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
