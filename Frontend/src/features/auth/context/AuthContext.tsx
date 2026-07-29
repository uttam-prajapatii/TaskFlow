import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { AuthContextType, LoginDTO, RegisterDTO, User } from '../types';
import authService from '../../../services/auth.service';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  const login = useCallback(async (credentials: LoginDTO) => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      localStorage.setItem('wasLoggedIn', 'true');
      setUser(res.data.user);
      toast.success(res.message || 'Logged in successfully', { id: 'login-success-toast' });
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterDTO) => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      localStorage.setItem('wasLoggedIn', 'true');
      setUser(res.data.user);
      toast.success(res.message || 'User registered successfully', { id: 'register-success-toast' });
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsLoading(false);
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
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // S6481: Memoize context value using useMemo to prevent unnecessary consumer re-renders
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      checkAuth,
    }),
    [user, isLoading, login, register, logout, checkAuth]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
