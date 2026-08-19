import { apiClient } from '../lib/api-client';
import { Role, User } from '../domain';

/** ADMIN/COMPRADOR usam email+senha; VENDEDOR usa usuario+pin (ver ADR-0007 do backend). */
export interface CreateUserPayload {
  nome: string;
  papel: Role;
  email?: string;
  senha?: string;
  usuario?: string;
  pin?: string;
  telefoneWhatsapp?: string;
}

export interface UpdateUserPayload {
  nome?: string;
  email?: string;
  senha?: string;
  usuario?: string;
  pin?: string;
  papel?: Role;
  telefoneWhatsapp?: string | null;
  ativo?: boolean;
}

export const usersService = {
  list: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },
  create: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await apiClient.post<User>('/users', payload);
    return data;
  },
  update: async (id: string, payload: UpdateUserPayload): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}`, payload);
    return data;
  },
  deactivate: async (id: string): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}/deactivate`);
    return data;
  },
};
