import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { AuthContextType, AuthResult, LoginDTO, RegisterDTO, User, VerifyOtpDTO } from '../types';
import authService from '../../../services/auth.service';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingEmail, setPendingEmailState] = useState<string | null>(() => {
    return sessionStorage.getItem('pending_verify_email');
  });

  const setPendingEmail = useCallback((email: string | null) => {
    setPendingEmailState(email);
    if (email) {
      sessionStorage.setItem('pending_verify_email', email);
    } else {
      sessionStorage.removeItem('pending_verify_email');
    }
  }, []);

  // Check authentication on initial application load only if user was previously logged in
  const checkAuth = useCallback(async () => {
    const wasLoggedIn = localStorage.getItem('wasLoggedIn') === 'true';

    if (!wasLoggedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.getCurrentUser();
      if (response.data?.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
        localStorage.removeItem('wasLoggedIn');
      }
    } catch {
      try {
        await authService.refreshTokens();
        const userRes = await authService.getCurrentUser();
        setUser(userRes.data?.user || null);
      } catch {
        setUser(null);
        localStorage.removeItem('wasLoggedIn');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleSessionExpired = () => {
      setUser(null);
      localStorage.removeItem('wasLoggedIn');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [checkAuth]);

  // S6481: Wrap callbacks in useCallback to prevent object reference changes
  const login = useCallback(async (credentials: LoginDTO): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      if (res.data?.user && res.data?.tokens) {
        localStorage.setItem('wasLoggedIn', 'true');
        setPendingEmail(null);
        setUser(res.data.user);
        toast.success(res.message || 'Logged in successfully', { id: 'login-success-toast' });
        return { requiresOtp: false };
      } else {
        const email = res.data?.email || credentials.email;
        setPendingEmail(email);
        toast.success(res.message || 'Verification OTP sent to your email', { id: 'login-otp-toast' });
        return { requiresOtp: true, email };
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setPendingEmail]);

  const register = useCallback(async (data: RegisterDTO): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      if (res.data?.user && res.data?.tokens) {
        localStorage.setItem('wasLoggedIn', 'true');
        setPendingEmail(null);
        setUser(res.data.user);
        toast.success(res.message || 'User registered successfully', { id: 'register-success-toast' });
        return { requiresOtp: false };
      } else {
        const email = res.data?.email || data.email;
        setPendingEmail(email);
        toast.success(res.message || 'Verification OTP sent to your email', { id: 'register-otp-toast' });
        return { requiresOtp: true, email };
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setPendingEmail]);

  const verifyOtp = useCallback(async (data: VerifyOtpDTO) => {
    setIsLoading(true);
    try {
      const res = await authService.verifyOtp(data);
      if (res.data?.user) {
        localStorage.setItem('wasLoggedIn', 'true');
        setPendingEmail(null);
        setUser(res.data.user);
        toast.success(res.message || 'Email verified successfully', { id: 'verify-otp-success-toast' });
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setPendingEmail]);

  const resendOtp = useCallback(async (email: string) => {
    try {
      const res = await authService.resendOtp({ email });
      toast.success(res.message || 'Verification OTP sent successfully', { id: 'resend-otp-toast' });
    } catch (err: unknown) {
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      toast.success('Logged out successfully', { id: 'logout-success-toast' });
    } catch {
      toast.error('Logout completed locally', { id: 'logout-local-toast' });
    } finally {
      localStorage.removeItem('wasLoggedIn');
      setPendingEmail(null);
      setUser(null);
      setIsLoading(false);
    }
  }, [setPendingEmail]);

  const updateUser = useCallback((updatedUser: Partial<User> | User) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : (updatedUser as User)));
  }, []);

  const updateProfile = useCallback(async (fullName: string): Promise<User> => {
    const res = await authService.updateMe({ fullName });
    const resData = res.data as (User & { user?: User });
    const updatedUser = resData?.user || resData;
    if (updatedUser && (updatedUser._id || updatedUser.email)) {
      setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
      return updatedUser;
    }
    throw new Error(res.message || 'Failed to update profile');
  }, []);

  // S6481: Memoize context value using useMemo to prevent unnecessary consumer re-renders
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      pendingEmail,
      setPendingEmail,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      checkAuth,
      updateUser,
      updateProfile,
    }),
    [user, isLoading, pendingEmail, setPendingEmail, login, register, verifyOtp, resendOtp, logout, checkAuth, updateUser, updateProfile]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
