import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { workspaceService } from '../../../services/workspace.service';
import { toast } from 'sonner';

export const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid invitation token link.');
      setLoading(false);
      return;
    }

    const processInvite = async () => {
      try {
        setLoading(true);
        const res = await workspaceService.acceptInvite(token);
        setStatus('success');
        setWorkspaceId(res.workspaceId);
        toast.success(res.message || 'Successfully joined workspace!');
        setTimeout(() => {
          if (res.workspaceId) {
            navigate(`/workspaces/${res.workspaceId}`);
          } else {
            navigate('/workspaces');
          }
        }, 1500);
      } catch (err: unknown) {
        setStatus('error');
        const errData = err as { response?: { data?: { message?: string } } };
        const msg = errData?.response?.data?.message || 'Failed to accept workspace invitation or token expired.';
        setErrorMessage(msg);
      } finally {
        setLoading(false);
      }
    };

    processInvite();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-xl">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-white">Workspace Invitation</h2>

        {loading && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-sm">Processing invitation request...</p>
          </div>
        )}

        {!loading && status === 'success' && (
          <div className="py-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm mb-6">
              🎉 Invitation accepted! Redirecting you to your workspace...
            </div>
            {workspaceId && (
              <Link
                to={`/workspaces/${workspaceId}`}
                className="inline-block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition"
              >
                Go to Workspace Now
              </Link>
            )}
          </div>
        )}

        {!loading && status === 'error' && (
          <div className="py-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm mb-6">
              {errorMessage}
            </div>
            <Link
              to="/workspaces"
              className="inline-block w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition"
            >
              Back to Workspaces Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
