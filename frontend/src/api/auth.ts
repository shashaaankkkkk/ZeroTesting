import client from './client';
import type { LoginRequest, RegisterRequest, LoginResponse, RegisterResponse, User, ChangePasswordRequest } from '../types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/login/', data).then(r => r.data),

  register: (data: RegisterRequest) =>
    client.post<RegisterResponse>('/auth/register/', data).then(r => r.data),

  logout: (refresh: string) =>
    client.post('/auth/logout/', { refresh }),

  refreshToken: (refresh: string) =>
    client.post<{ access: string }>('/auth/token/refresh/', { refresh }).then(r => r.data),

  getProfile: () =>
    client.get<User>('/auth/profile/').then(r => r.data),

  updateProfile: (data: Partial<User>) =>
    client.put<User>('/auth/profile/', data).then(r => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    client.post('/auth/change-password/', data),

  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password/', { email }),
};
