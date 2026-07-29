import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandPanel from '../components/BrandPanel';
import SignInForm from '../components/SignInForm';
import SignUpForm from '../components/SignUpForm';
import useAuth from '../../../hooks/useAuth';

interface AuthPageProps {
  mode: 'signin' | 'signup';
}

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const isSignIn = mode === 'signin';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleNavigateLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleNavigateRegister = useCallback(() => {
    navigate('/register');
  }, [navigate]);

  return (
    <div className="w-full min-h-screen bg-white grid grid-cols-1 md:grid-cols-[1.05fr_1fr] select-none">
      {/* LEFT SIDE: BRAND PANEL */}
      <div className="hidden md:block">
        <BrandPanel />
      </div>

      {/* RIGHT SIDE: AUTHENTICATION FORM */}
      <div className="flex flex-col justify-center px-6 py-12 md:px-16 md:py-14 bg-white">
        <div className="w-full max-w-[380px] mx-auto">
          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-paper-dim rounded-xl p-1 mb-[34px] select-none">
            <button
              onClick={handleNavigateLogin}
              type="button"
              className={`flex-1 text-center py-2.5 font-display font-semibold text-sm border-none bg-transparent rounded-lg cursor-pointer transition-all duration-200 ${
                isSignIn
                  ? 'bg-white text-ink shadow-[0_4px_14px_-6px_rgba(190,60,20,0.28)]'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={handleNavigateRegister}
              type="button"
              className={`flex-1 text-center py-2.5 font-display font-semibold text-sm border-none bg-transparent rounded-lg cursor-pointer transition-all duration-200 ${
                !isSignIn
                  ? 'bg-white text-ink shadow-[0_4px_14px_-6px_rgba(190,60,20,0.28)]'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Create account
            </button>
          </div>

          {/* Form component based on mode */}
          {isSignIn ? <SignInForm /> : <SignUpForm />}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
