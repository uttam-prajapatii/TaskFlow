import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-flame-2 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-soft font-medium font-display tracking-wide">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
