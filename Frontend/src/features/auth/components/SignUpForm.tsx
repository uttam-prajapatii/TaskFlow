import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import OAuthButtons from './OAuthButtons.tsx';
import FormInput from './FormInput.tsx';

const SignUpForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    console.log('Submitting Sign Up:', { name, email, password, agreeTerms });
  };

  return (
    <div className="w-full max-w-[380px] mx-auto animate-[fadeUp_0.35s_ease]">
      <div className="mb-7">
        <h2 className="font-display text-[26px] font-bold text-ink tracking-tight mb-1.5">
          Create your account
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          Start mapping your team's work in minutes — free for up to 5 members.
        </p>
      </div>

      <OAuthButtons />

      <div className="flex items-center gap-3.5 my-5 text-[#B8A79C] text-xs font-semibold uppercase tracking-wider select-none">
        <div className="flex-1 h-[1px] bg-line" />
        <span>or sign up with email</span>
        <div className="flex-1 h-[1px] bg-line" />
      </div>

      <form onSubmit={handleSubmit}>
        <FormInput
          label="Full name"
          id="su-name"
          type="text"
          placeholder="Alex Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />

        <FormInput
          label="Work email"
          id="su-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <FormInput
          label="Password"
          id="su-pass"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <div className="flex items-start gap-2 mt-0.5 mb-5 text-[12.5px] leading-relaxed select-none">
          <input
            type="checkbox"
            id="su-terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            required
            className="w-3.5 h-3.5 accent-flame-2 rounded border-line text-flame-2 focus:ring-flame-2 mt-1 shrink-0 cursor-pointer"
          />
          <label htmlFor="su-terms" className="text-ink-soft cursor-pointer">
            By creating an account, you agree to TaskFlow's{' '}
            <button
              type="button"
              className="text-flame-2 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer inline align-baseline"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              className="text-flame-2 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer inline align-baseline"
              onClick={(e) => e.stopPropagation()}
            >Privacy Policy 
            </button>{''}
            .
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl border-0 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] tracking-wide cursor-pointer shadow-[0_14px_28px_-12px_rgba(255,80,30,0.55)] hover:shadow-[0_18px_32px_-12px_rgba(255,80,30,0.62)] hover:-translate-y-[1px] active:translate-y-0 hover:brightness-105 transition-all duration-200"
        >
          Create account
        </button>
      </form>

      <div className="text-center mt-5 text-[13.5px] text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="text-flame-2 font-bold hover:underline bg-transparent border-none cursor-pointer">
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default SignUpForm;
