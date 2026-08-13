export interface User {
  _id: string;
  email: string;
  fullName?: string;
  isActive: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSuccessData {
  user?: User;
  tokens?: Tokens;
  message?: string;
  email?: string;
  isVerified?: boolean;
}

export interface VerifyOtpDTO {
  email: string;
  otp: string;
}

export interface ResendOtpDTO {
  email: string;
}

export interface RefreshSuccessData {
  accessToken: string;
  refreshToken: string;
}

export interface MeSuccessData {
  user: User;
}

export interface ApiResponse<T = any> {
  status: string;
  message: string;
  data: T;
}

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  newPassword: string;
}

export interface UpdatePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResult {
  requiresOtp: boolean;
  email?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
  login: (credentials: LoginDTO) => Promise<AuthResult>;
  register: (data: RegisterDTO) => Promise<AuthResult>;
  verifyOtp: (data: VerifyOtpDTO) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
