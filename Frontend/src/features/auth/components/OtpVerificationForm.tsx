import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import Icon from '../../../components/UI/Icon';
import { toast } from 'sonner';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export const OtpVerificationForm: React.FC = () => {
  const { pendingEmail, setPendingEmail, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input field on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // If no pending email is set (e.g. direct URL navigation), redirect to login
  useEffect(() => {
    if (!pendingEmail) {
      toast.error('No pending verification session found. Please sign in.', { id: 'no-pending-email' });
      navigate('/login', { replace: true });
    }
  }, [pendingEmail, navigate]);

  const handleChange = useCallback((index: number, value: string) => {
    setErrorMessage(null);
    const digitsOnly = value.replace(/\D/g, '');

    if (!digitsOnly) {
      setOtp((prev) => {
        const copy = [...prev];
        copy[index] = '';
        return copy;
      });
      return;
    }

    const lastDigit = digitsOnly.slice(-1);
    setOtp((prev) => {
      const copy = [...prev];
      copy[index] = lastDigit;
      return copy;
    });

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setOtp((prev) => {
          const copy = [...prev];
          copy[index - 1] = '';
          return copy;
        });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pastedText) return;

    const newOtp = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pastedText.length; i++) {
      newOtp[i] = pastedText[i];
    }
    setOtp(newOtp);

    const focusIndex = Math.min(pastedText.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const code = otp.join('');
      if (code.length < OTP_LENGTH || isSubmitting || !pendingEmail) return;

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        await verifyOtp({ email: pendingEmail, otp: code });
        navigate('/dashboard', { replace: true });
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = error.response?.data?.message || error.message || 'Invalid or expired verification code';
        setErrorMessage(msg);
        toast.error(msg, { id: 'verify-otp-error' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [otp, isSubmitting, pendingEmail, verifyOtp, navigate]
  );

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending || !pendingEmail) return;

    setIsResending(true);
    setErrorMessage(null);
    try {
      await resendOtp(pendingEmail);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = error.response?.data?.message || error.message || 'Failed to resend verification code';
      toast.error(msg, { id: 'resend-otp-error' });
    } finally {
      setIsResending(false);
    }
  }, [cooldown, isResending, pendingEmail, resendOtp]);

  const handleChangeEmail = useCallback(() => {
    setPendingEmail(null);
    navigate('/login');
  }, [setPendingEmail, navigate]);

  const isOtpComplete = otp.join('').length === OTP_LENGTH;

  return (
    <div className="w-full animate-[fadeUp_0.35s_ease]">
      {/* Header */}
      <div className="mb-7 text-left">
        <h2 className="font-display text-[26px] font-bold text-ink tracking-tight mb-2">
          Verify your email
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          We've sent a 6-digit verification code to
        </p>
        <p className="text-sm font-semibold text-flame-2 break-all mt-0.5">
          {pendingEmail || 'your email address'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 6-Digit Input Boxes */}
        <div className="flex justify-between items-center gap-2 sm:gap-2.5 my-6">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-display font-bold text-xl rounded-xl border bg-paper-dim/40 text-ink transition-all duration-200 outline-none select-all ${
                errorMessage
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-line focus:border-flame-2 focus:ring-2 focus:ring-flame-2/20'
              }`}
            />
          ))}
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-red-500 animate-[fadeIn_0.2s_ease]">
            <Icon name="alert-circle" size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isOtpComplete || isSubmitting}
          className={`w-full py-3.5 rounded-xl border-0 bg-gradient-to-r from-flame-1 via-flame-2 to-flame-3 text-white font-display font-bold text-[15px] tracking-wide cursor-pointer shadow-[0_14px_28px_-12px_rgba(255,80,30,0.55)] hover:shadow-[0_18px_32px_-12px_rgba(255,80,30,0.62)] hover:-translate-y-[1px] active:translate-y-0 hover:brightness-105 transition-all duration-200 flex items-center justify-center gap-2 ${
            !isOtpComplete || isSubmitting ? 'opacity-60 cursor-not-allowed hover:translate-y-0 shadow-none' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify OTP</span>
          )}
        </button>
      </form>

      {/* Action Links */}
      <div className="mt-7 flex flex-col gap-3 text-center text-xs text-ink-soft select-none font-sans">
        <div>
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className={`font-semibold bg-transparent border-none p-0 cursor-pointer ${
              cooldown > 0 || isResending
                ? 'text-ink-soft/60 cursor-not-allowed'
                : 'text-flame-2 hover:underline'
            }`}
          >
            {isResending
              ? 'Sending...'
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend OTP'}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleChangeEmail}
            className="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-ink transition-colors bg-transparent border-none p-0 cursor-pointer"
          >
            <Icon name="arrow-left" size={13} />
            <span>Change email</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationForm;
