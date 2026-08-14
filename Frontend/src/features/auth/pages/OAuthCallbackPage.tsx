import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import useAuth from '../../../hooks/useAuth';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { checkAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      localStorage.setItem('wasLoggedIn', 'true');
      checkAuth().catch((err) => {
        console.error('Auth verification failed:', err);
        setStatus('error');
        toast.error('Failed to verify session. Please sign in again.');
        navigate('/login');
      });
    } else if (error) {
      setStatus('error');
      toast.error(decodeURIComponent(error));
      navigate('/login');
    } else {
      navigate('/login');
    }
  }, [searchParams, checkAuth, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3.5 select-none">
      {status === 'loading' ? (
        <>
          <div className="w-8 h-8 border-[3px] border-flame-2 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-ink-soft font-display">Completing sign in...</span>
        </>
      ) : (
        <span className="text-sm font-semibold text-red-500 font-display">Sign in failed. Redirecting...</span>
      )}
    </div>
  );
};

export default OAuthCallbackPage;
