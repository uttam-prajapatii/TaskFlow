import React, { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OAuthButtons from './OAuthButtons';
import FormInput from './FormInput';
import useAuth from '../../../hooks/useAuth';
import PolicyModal from './PolicyModal';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  terms?: string;
}

interface FormTouched {
  name?: boolean;
  email?: boolean;
  password?: boolean;
  terms?: boolean;
}

interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Minimum 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'uppercase', label: 'At least 1 uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'At least 1 lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'At least 1 number', test: (pw) => /[0-9]/.test(pw) },
  {
    id: 'special',
    label: 'At least 1 special character',
    test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
  },
];

const SignUpForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [policyType, setPolicyType] = useState<'terms' | 'privacy' | null>(null);

  const [touched, setTouched] = useState<FormTouched>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const termsInputRef = useRef<HTMLInputElement>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Evaluate password rules
  const satisfiedCount = PASSWORD_RULES.filter((rule) => rule.test(password)).length;

  let strengthLabel = '';
  let strengthPercentage = 0;
  let strengthColorClass = '';
  let strengthTextColorClass = '';

  if (password.length > 0) {
    if (satisfiedCount <= 2) {
      strengthLabel = 'Weak';
      strengthPercentage = 33;
      strengthColorClass = 'bg-flame-3';
      strengthTextColorClass = 'text-flame-3';
    } else if (satisfiedCount <= 4) {
      strengthLabel = 'Medium';
      strengthPercentage = 66;
      strengthColorClass = 'bg-flame-2';
      strengthTextColorClass = 'text-flame-2';
    } else {
      strengthLabel = 'Strong';
      strengthPercentage = 100;
      strengthColorClass = 'bg-emerald-500';
      strengthTextColorClass = 'text-emerald-600';
    }
  }

  // Helper function to calculate field validation errors
  const validate = useCallback(
    (
      values: { name: string; email: string; password: string; agreeTerms: boolean },
      touchedState: FormTouched
    ) => {
      const newErrors: FormErrors = {};

      if (touchedState.name) {
        const trimmedName = values.name.trim();
        if (!trimmedName) {
          newErrors.name = 'Full name is required.';
        } else {
          const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
          if (!nameRegex.test(trimmedName)) {
            newErrors.name = 'Full name can only contain letters, spaces, hyphens, and apostrophes.';
          }
        }
      }

      if (touchedState.email) {
        const trimmedEmail = values.email.trim();
        if (!trimmedEmail) {
          newErrors.email = 'Work email is required.';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
          if (!emailRegex.test(trimmedEmail)) {
            newErrors.email = 'Please enter a valid email address.';
          }
        }
      }

      if (touchedState.password || values.password.length > 0) {
        if (!values.password) {
          newErrors.password = 'Password is required.';
        } else if (values.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters long.';
        }
      }

      if (touchedState.terms) {
        if (!values.agreeTerms) {
          newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy.';
        }
      }

      return newErrors;
    },
    []
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setName(val);
      setTouched((prev) => {
        const nextTouched = { ...prev, name: true };
        setErrors(validate({ name: val, email, password, agreeTerms }, nextTouched));
        return nextTouched;
      });
    },
    [agreeTerms, email, password, validate]
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setEmail(val);
      setTouched((prev) => {
        const nextTouched = { ...prev, email: true };
        setErrors(validate({ name, email: val, password, agreeTerms }, nextTouched));
        return nextTouched;
      });
    },
    [agreeTerms, name, password, validate]
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setPassword(val);
      setTouched((prev) => {
        const nextTouched = { ...prev, password: true };
        setErrors(validate({ name, email, password: val, agreeTerms }, nextTouched));
        return nextTouched;
      });
    },
    [agreeTerms, email, name, validate]
  );

  const handleAgreeTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setAgreeTerms(checked);
      setTouched((prev) => {
        const nextTouched = { ...prev, terms: true };
        setErrors(validate({ name, email, password, agreeTerms: checked }, nextTouched));
        return nextTouched;
      });
    },
    [email, name, password, validate]
  );

  const handleBlur = useCallback(
    (field: keyof FormTouched) => {
      if (field === 'password') {
        setIsPasswordFocused(false);
      }
      setTouched((prev) => {
        const nextTouched = { ...prev, [field]: true };
        setErrors(validate({ name, email, password, agreeTerms }, nextTouched));
        return nextTouched;
      });
    },
    [agreeTerms, email, name, password, validate]
  );

  const handlePasswordFocus = useCallback(() => {
    setIsPasswordFocused(true);
  }, []);

  const handleTermsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setPolicyType('terms');
  }, []);

  const handlePrivacyClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setPolicyType('privacy');
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitting) return;

      // Mark all fields touched for validation display
      const allTouched: FormTouched = { name: true, email: true, password: true, terms: true };
      setTouched(allTouched);

      // Perform full validation for submission
      const submitErrors: FormErrors = {};

      const trimmedName = name.trim();
      if (!trimmedName) {
        submitErrors.name = 'Full name is required.';
      } else {
        const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
        if (!nameRegex.test(trimmedName)) {
          submitErrors.name = 'Full name can only contain letters, spaces, hyphens, and apostrophes.';
        }
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        submitErrors.email = 'Work email is required.';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
        if (!emailRegex.test(trimmedEmail)) {
          submitErrors.email = 'Please enter a valid email address.';
        }
      }

      if (!password) {
        submitErrors.password = 'Password is required.';
      } else if (password.length < 8) {
        submitErrors.password = 'Password must be at least 8 characters long.';
      }

      if (!agreeTerms) {
        submitErrors.terms = 'You must agree to the Terms of Service and Privacy Policy.';
      }

      setErrors(submitErrors);

      // Focus first invalid field and abort submission if errors exist
      if (submitErrors.name) {
        nameInputRef.current?.focus();
        return;
      }
      if (submitErrors.email) {
        emailInputRef.current?.focus();
        return;
      }
      if (submitErrors.password) {
        passwordInputRef.current?.focus();
        return;
      }
      if (submitErrors.terms) {
        termsInputRef.current?.focus();
        return;
      }

      setIsSubmitting(true);
      try {
        await register({ fullName: name, email, password });
        navigate('/dashboard');
      } catch (error) {
        console.debug('Registration submission failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [agreeTerms, email, isSubmitting, name, navigate, password, register]
  );

  const isPasswordTooShort = password.length > 0 && password.length < 8;
  const showPasswordRequirements = isPasswordFocused || touched.password || password.length > 0;

  return (
    <div className="w-full animate-[fadeUp_0.35s_ease]">
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

      <form onSubmit={handleSubmit} noValidate>
        <FormInput
          ref={nameInputRef}
          label="Full name"
          id="su-name"
          type="text"
          placeholder="Alex Rivera"
          value={name}
          onChange={handleNameChange}
          onBlur={() => handleBlur('name')}
          error={touched.name ? errors.name : undefined}
          autoComplete="name"
        />

        <FormInput
          ref={emailInputRef}
          label="Work email"
          id="su-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur('email')}
          error={touched.email ? errors.email : undefined}
          autoComplete="email"
        />

        <FormInput
          ref={passwordInputRef}
          label="Password"
          id="su-pass"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => handleBlur('password')}
          onFocus={handlePasswordFocus}
          error={(touched.password || password.length > 0) ? errors.password : undefined}
          autoComplete="new-password"
        />

        {/* Live Password Strength Meter & Requirements Checklist */}
        {showPasswordRequirements && (
          <div className="mt-[-8px] mb-4 p-3 bg-paper-dim/75 rounded-xl border border-line animate-[fadeUp_0.2s_ease]">
            {/* Strength Header */}
            <div className="flex items-center justify-between text-xs mb-1.5 font-sans">
              <span className="font-semibold text-ink-soft">Password Strength:</span>
              <span className={`font-bold ${strengthTextColorClass || 'text-ink-soft'}`}>
                {strengthLabel || 'Not evaluated'}
              </span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full h-1.5 bg-line/80 rounded-full overflow-hidden mb-2.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  strengthColorClass || 'bg-line'
                }`}
                style={{ width: `${strengthPercentage}%` }}
              />
            </div>

            {/* Live Requirements Checklist */}
            <div className="space-y-1 select-none font-sans">
              {PASSWORD_RULES.map((rule) => {
                const isPassed = rule.test(password);
                return (
                  <div key={rule.id} className="flex items-center gap-2 text-[12px] transition-colors duration-200">
                    {isPassed ? (
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-[#C4B4A9] shrink-0 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-[#C4B4A9]" />
                      </div>
                    )}
                    <span className={isPassed ? 'text-ink font-semibold' : 'text-ink-soft/80'}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-5 select-none">
          <div className="flex items-start gap-2 text-[12.5px] leading-relaxed">
            <input
              ref={termsInputRef}
              type="checkbox"
              id="su-terms"
              checked={agreeTerms}
              onChange={handleAgreeTermsChange}
              onBlur={() => handleBlur('terms')}
              className={`w-3.5 h-3.5 accent-flame-2 rounded border-line text-flame-2 focus:ring-flame-2 mt-1 shrink-0 cursor-pointer ${
                touched.terms && errors.terms ? 'outline-2 outline-red-500' : ''
              }`}
            />
            <label htmlFor="su-terms" className="text-ink-soft cursor-pointer">
              By creating an account, you agree to TaskFlow's{' '}
              <button
                type="button"
                onClick={handleTermsClick}
                className="text-flame-2 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer inline align-baseline"
              >
                Terms of Service
              </button>
              {' '}and{' '}
              <button
                type="button"
                onClick={handlePrivacyClick}
                className="text-flame-2 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer inline align-baseline"
              >
                Privacy Policy
              </button>
              .
            </label>
          </div>
          {touched.terms && errors.terms && (
            <p id="su-terms-error" role="alert" className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1.5 animate-[fadeUp_0.15s_ease]">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errors.terms}</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isPasswordTooShort}
          className={`w-full py-3 rounded-xl border-0 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] tracking-wide cursor-pointer shadow-[0_14px_28px_-12px_rgba(255,80,30,0.55)] hover:shadow-[0_18px_32px_-12px_rgba(255,80,30,0.62)] hover:-translate-y-[1px] active:translate-y-0 hover:brightness-105 transition-all duration-200 ${
            isSubmitting || isPasswordTooShort ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="text-center mt-5 text-[13.5px] text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="text-flame-2 font-bold hover:underline bg-transparent border-none cursor-pointer">
          Sign in
        </Link>
      </div>

      {/* Terms of Service & Privacy Policy Modal */}
      <PolicyModal
        open={!!policyType}
        type={policyType}
        onClose={() => setPolicyType(null)}
      />
    </div>
  );
};

export default SignUpForm;
