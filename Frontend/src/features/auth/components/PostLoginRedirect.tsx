import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWorkspace } from '../../../context/WorkspaceContext';

export const PostLoginRedirect: React.FC = () => {
  const { workspaces, loading } = useWorkspace();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-neutral-400">Loading workspaces…</span>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/workspace-select" replace />;
};

export default PostLoginRedirect;
