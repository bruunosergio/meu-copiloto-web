import { apiClient } from '../lib/api-client';
import { Distribuidora } from '../domain';

export interface CreateDistribuidoraPayload {
  nome: string;
}

export const distribuidorasService = {
  list: async (): Promise<Distribuidora[]> => {
    const { data } = await apiClient.get<Distribuidora[]>('/distribuidoras');
    return data;
  },
  create: async (payload: CreateDistribuidoraPayload): Promise<Distribuidora> => {
    const { data } = await apiClient.post<Distribuidora>('/distribuidoras', payload);
    return data;
  },
  deactivate: async (id: string): Promise<Distribuidora> => {
    const { data } = await apiClient.patch<Distribuidora>(`/distribuidoras/${id}/deactivate`);
    return data;
  },
  reactivate: async (id: string): Promise<Distribuidora> => {
    const { data } = await apiClient.patch<Distribuidora>(`/distribuidoras/${id}/reactivate`);
    return data;
  },
};
