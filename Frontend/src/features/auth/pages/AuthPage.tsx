import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandPanel from '../components/BrandPanel';
import SignInForm from '../components/SignInForm';
import SignUpForm from '../components/SignUpForm';
import OtpVerificationForm from '../components/OtpVerificationForm';
import useAuth from '../../../hooks/useAuth';

interface AuthPageProps {
  mode: 'signin' | 'signup' | 'verify-otp';
}

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const isSignIn = mode === 'signin';
  const isVerifyOtp = mode === 'verify-otp';

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
    <div className="w-full min-h-screen md:h-screen md:overflow-hidden bg-white grid grid-cols-1 md:grid-cols-[1.05fr_1fr] select-none">
      {/* LEFT SIDE: BRAND PANEL */}
      <div className="hidden md:block h-full overflow-hidden">
        <BrandPanel />
      </div>

      {/* RIGHT SIDE: AUTHENTICATION FORM */}
      <div className="h-full overflow-y-auto flex flex-col justify-start items-center px-6 pt-12 pb-12 md:px-16 md:pt-16 md:pb-16 bg-white [scrollbar-gutter:stable]">
        <div className="w-[380px] max-w-full mx-auto shrink-0">
          {/* Navigation Tabs with Smooth Sliding Indicator */}
          {!isVerifyOtp ? (
            <div className="relative w-[380px] max-w-full h-[48px] p-1 mb-[34px] bg-paper-dim rounded-xl flex items-center select-none shrink-0 box-border">
              {/* Sliding Active Indicator Pill */}
              <div
                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-[0_4px_14px_-6px_rgba(190,60,20,0.28)] transition-transform duration-300 ease-in-out pointer-events-none ${
                  isSignIn ? 'translate-x-0' : 'translate-x-full'
                }`}
                aria-hidden="true"
              />

              <button
                onClick={handleNavigateLogin}
                type="button"
                className={`relative z-10 flex-1 h-full py-2.5 px-4 font-display font-semibold text-sm rounded-lg border-0 bg-transparent cursor-pointer transition-colors duration-300 ease-in-out flex items-center justify-center select-none box-border outline-none ${
                  isSignIn ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={handleNavigateRegister}
                type="button"
                className={`relative z-10 flex-1 h-full py-2.5 px-4 font-display font-semibold text-sm rounded-lg border-0 bg-transparent cursor-pointer transition-colors duration-300 ease-in-out flex items-center justify-center select-none box-border outline-none ${
                  !isSignIn ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Create account
              </button>
            </div>
          ) : (
            <div className="w-[380px] max-w-full h-[48px] p-1 mb-[34px] bg-paper-dim rounded-xl flex items-center justify-center select-none shrink-0 box-border">
              <span className="font-display font-bold text-sm text-flame-2 tracking-wide uppercase">
                Verification Required
              </span>
            </div>
          )}

          {/* Form container wrapper */}
          <div className="w-full flex flex-col justify-start">
            {isVerifyOtp ? (
              <OtpVerificationForm />
            ) : isSignIn ? (
              <SignInForm />
            ) : (
              <SignUpForm />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
