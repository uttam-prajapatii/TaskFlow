import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './features/auth/context/AuthContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import AuthPage from './features/auth/pages/AuthPage';
import DashboardPage from './features/dashboard/DashboardPage';

import WorkspacesPage from './features/workspace/pages/WorkspacesPage';
import WorkspaceDetailPage from './features/workspace/pages/WorkspaceDetailPage';
import BoardsPage from './features/board/pages/BoardsPage';
import BoardKanbanPage from './features/board/pages/BoardKanbanPage';

import { WorkspaceProvider } from './context/WorkspaceContext';

function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
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
          <Route
            path="/workspaces"
            element={
              <ProtectedRoute>
                <WorkspacesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces/:workspaceId"
            element={
              <ProtectedRoute>
                <WorkspaceDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boards"
            element={
              <ProtectedRoute>
                <BoardsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boards/:boardId"
            element={
              <ProtectedRoute>
                <BoardKanbanPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="*" element={<Navigate to="/workspaces" replace />} />
        </Routes>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
