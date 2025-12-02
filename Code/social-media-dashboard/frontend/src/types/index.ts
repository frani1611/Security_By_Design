export interface User {
  id: string;
  email: string;
  password: string;
  role: 'Admin' | 'User';
}

export interface Upload {
  id: string;
  userId: string;
  url: string;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}