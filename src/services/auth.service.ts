import { apiClient } from '../lib/api-client';
import { User } from '../domain';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (email: string, senha: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, senha });
    return data;
  },
};
