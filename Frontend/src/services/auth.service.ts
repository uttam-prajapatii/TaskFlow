import api from './api';
import type {
  ApiResponse,
  AuthSuccessData,
  LoginDTO,
  MeSuccessData,
  RefreshSuccessData,
  RegisterDTO,
  ResendOtpDTO,
  VerifyOtpDTO,
} from '../features/auth/types';

export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<ApiResponse<AuthSuccessData>> {
    const response = await api.post<ApiResponse<AuthSuccessData>>('/api/v1/auth/register', data);
    return response.data;
  },

  /**
   * Login an existing user
   */
  async login(data: LoginDTO): Promise<ApiResponse<AuthSuccessData>> {
    const response = await api.post<ApiResponse<AuthSuccessData>>('/api/v1/auth/login', data);
    return response.data;
  },

  /**
   * Verify email via 6-digit OTP code
   */
  async verifyOtp(data: VerifyOtpDTO): Promise<ApiResponse<AuthSuccessData>> {
    const response = await api.post<ApiResponse<AuthSuccessData>>('/api/v1/auth/verify-otp', data);
    return response.data;
  },

  /**
   * Resend verification OTP code
   */
  async resendOtp(data: ResendOtpDTO): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/api/v1/auth/resend-otp', data);
    return response.data;
  },

  /**
   * Refresh access and refresh tokens via HttpOnly cookie
   */
  async refreshTokens(): Promise<ApiResponse<RefreshSuccessData>> {
    const response = await api.post<ApiResponse<RefreshSuccessData>>('/api/v1/auth/refresh', {});
    return response.data;
  },

  /**
   * Get authenticated user details
   */
  async getCurrentUser(): Promise<ApiResponse<MeSuccessData>> {
    const response = await api.get<ApiResponse<MeSuccessData>>('/api/v1/auth/me');
    return response.data;
  },

  /**
   * Logout user and revoke tokens via HttpOnly cookie
   */
  async logout(): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/api/v1/auth/logout', {});
    return response.data;
  },
};

export default authService;
