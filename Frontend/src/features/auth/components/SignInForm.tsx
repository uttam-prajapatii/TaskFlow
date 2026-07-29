import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OAuthButtons from './OAuthButtons';
import FormInput from './FormInput';
import useAuth from '../../../hooks/useAuth';

const SignInForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleRememberMeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  }, []);

  const handleForgotPassword = useCallback(() => {
    // Action handler for forgot password feature
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        await login({ email, password });
        navigate('/dashboard');
      } catch (error) {
        // SonarQube S108: Explicitly handling catch block.
        // Toast notifications are dispatched centrally by API interceptors and AuthContext.
        console.debug('Sign in submission failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, isSubmitting, login, navigate, password]
  );

  return (
    <div className="w-full max-w-[380px] mx-auto animate-[fadeUp_0.35s_ease]">
      <div className="mb-7">
        <h2 className="font-display text-[26px] font-bold text-ink tracking-tight mb-1.5">
          Welcome back
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          Sign in to pick up your threads where you left them.
        </p>
      </div>

      <OAuthButtons />

      <div className="flex items-center gap-3.5 my-5 text-[#B8A79C] text-xs font-semibold uppercase tracking-wider select-none">
        <div className="flex-1 h-[1px] bg-line" />
        <span>or continue with email</span>
        <div className="flex-1 h-[1px] bg-line" />
      </div>

      <form onSubmit={handleSubmit}>
        <FormInput
          label="Email"
          id="si-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={handleEmailChange}
          required
          autoComplete="email"
        />

        <FormInput
          label="Password"
          id="si-pass"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={handlePasswordChange}
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between mt-0.5 mb-5.5 text-[13px]">
          <label className="flex items-center gap-2 text-ink-soft cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={handleRememberMeChange}
              className="w-3.5 h-3.5 accent-flame-2 rounded border-line text-flame-2 focus:ring-flame-2"
            />
            Remember me
          </label>
          {/* S6844: Replace anchor tag used as action button with <button type="button"> */}
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-flame-2 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer text-left"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl border-0 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] tracking-wide cursor-pointer shadow-[0_14px_28px_-12px_rgba(255,80,30,0.55)] hover:shadow-[0_18px_32px_-12px_rgba(255,80,30,0.62)] hover:-translate-y-[1px] active:translate-y-0 hover:brightness-105 transition-all duration-200 ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="text-center mt-5 text-[13.5px] text-ink-soft">
        New to TaskFlow?{' '}
        <Link to="/register" className="text-flame-2 font-bold hover:underline bg-transparent border-none cursor-pointer">
          Create an account
        </Link>
      </div>
    </div>
  );
};

export default SignInForm;
