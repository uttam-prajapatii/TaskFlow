export interface User {
  _id: string;
  email: string;
  fullName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSuccessData {
  user: User;
  tokens: Tokens;
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

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
