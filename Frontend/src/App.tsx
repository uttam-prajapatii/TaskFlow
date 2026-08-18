import { Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from 'sonner';
import { AuthProvider } from './features/auth/context/AuthContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import PostLoginRedirect from './features/auth/components/PostLoginRedirect';
import AuthPage from './features/auth/pages/AuthPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import SecuritySettingsPage from './features/auth/pages/SecuritySettingsPage';
import OAuthCallbackPage from './features/auth/pages/OAuthCallbackPage';

import OnboardingPage from './features/workspace/pages/OnboardingPage';
import WorkspaceSelectorPage from './features/workspace/pages/WorkspaceSelectorPage';
import WorkspacesPage from './features/workspace/pages/WorkspacesPage';
import WorkspaceDetailPage from './features/workspace/pages/WorkspaceDetailPage';
import AcceptInvitePage from './features/workspace/pages/AcceptInvitePage';
import BoardsPage from './features/board/pages/BoardsPage';
import BoardKanbanPage from './features/board/pages/BoardKanbanPage';
import AssignedTasksPage from './features/board/pages/AssignedTasksPage';
import CreatedTasksPage from './features/board/pages/CreatedTasksPage';

import NotificationsPage from './features/workspace/pages/NotificationsPage';
import AnalyticsPage from './features/workspace/pages/AnalyticsPage';
import MembersPage from './features/workspace/pages/MembersPage';

import { WorkspaceProvider } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/login" element={<AuthPage mode="signin" />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            <Route path="/register" element={<AuthPage mode="signup" />} />
            <Route path="/verify-otp" element={<AuthPage mode="verify-otp" />} />
            <Route path="/forgot-password" element={<AuthPage mode="signin" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/settings/password"
              element={
                <ProtectedRoute>
                  <SecuritySettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace-select"
              element={
                <ProtectedRoute>
                  <WorkspaceSelectorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invite/:token"
              element={<AcceptInvitePage />}
            />
            <Route
              path="/workspaces/invite/:token"
              element={<AcceptInvitePage />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PostLoginRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces/manage"
              element={
                <ProtectedRoute>
                  <WorkspacesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces"
              element={
                <ProtectedRoute>
                  <PostLoginRedirect />
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
            <Route
              path="/tasks/assigned"
              element={
                <ProtectedRoute>
                  <AssignedTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/me"
              element={
                <ProtectedRoute>
                  <AssignedTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/created"
              element={
                <ProtectedRoute>
                  <CreatedTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <MembersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <PostLoginRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <PostLoginRedirect />
                </ProtectedRoute>
              }
            />
          </Routes>
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
}

export default App;
