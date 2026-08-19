import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import ProtectedRoute from '../../features/auth/components/ProtectedRoute';
import PostLoginRedirect from '../../features/auth/components/PostLoginRedirect';

import WorkspaceDetailPage from '../../features/workspace/pages/WorkspaceDetailPage';

// Route-level code splitting
const AuthPage = lazy(() => import('../../features/auth/pages/AuthPage'));
const ResetPasswordPage = lazy(() => import('../../features/auth/pages/ResetPasswordPage'));
const SecuritySettingsPage = lazy(() => import('../../features/auth/pages/SecuritySettingsPage'));
const OAuthCallbackPage = lazy(() => import('../../features/auth/pages/OAuthCallbackPage'));

const OnboardingPage = lazy(() => import('../../features/workspace/pages/OnboardingPage'));
const WorkspaceSelectorPage = lazy(() => import('../../features/workspace/pages/WorkspaceSelectorPage'));
const WorkspacesPage = lazy(() => import('../../features/workspace/pages/WorkspacesPage'));
const AcceptInvitePage = lazy(() => import('../../features/workspace/pages/AcceptInvitePage'));
const BoardsPage = lazy(() => import('../../features/board/pages/BoardsPage'));
const BoardKanbanPage = lazy(() => import('../../features/board/pages/BoardKanbanPage'));
const AssignedTasksPage = lazy(() => import('../../features/board/pages/AssignedTasksPage'));
const CreatedTasksPage = lazy(() => import('../../features/board/pages/CreatedTasksPage'));

const NotificationsPage = lazy(() => import('../../features/workspace/pages/NotificationsPage'));
const AnalyticsPage = lazy(() => import('../../features/workspace/pages/AnalyticsPage'));
const MembersPage = lazy(() => import('../../features/workspace/pages/MembersPage'));

// Lightweight page loading shell to avoid blank flashes or heavy loaders
const RouteFallback: React.FC = () => (
  <div className="w-full min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
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
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/workspaces/invite/:token" element={<AcceptInvitePage />} />
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
    </Suspense>
  );
};

export default AppRoutes;
