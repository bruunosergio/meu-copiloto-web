import { apiClient } from '../lib/api-client';
import { Shortage, ShortageStatus } from '../domain';

export interface CreateShortagePayload {
  nomePeca: string;
  qtdRestante: number;
  codigoPeca?: string;
  observacao?: string;
}

export interface TransitionPayload {
  novoStatus: ShortageStatus;
  motivo?: string;
}

export const shortagesService = {
  list: async (status?: ShortageStatus[]): Promise<Shortage[]> => {
    const { data } = await apiClient.get<Shortage[]>('/shortages', {
      params: status && status.length > 0 ? { status: status.join(',') } : undefined,
    });
    return data;
  },
  register: async (payload: CreateShortagePayload): Promise<Shortage> => {
    const { data } = await apiClient.post<Shortage>('/shortages', payload);
    return data;
  },
  transition: async (id: string, payload: TransitionPayload): Promise<Shortage> => {
    const { data } = await apiClient.patch<Shortage>(`/shortages/${id}/status`, payload);
    return data;
  },
  cancel: async (id: string, motivo: string): Promise<Shortage> => {
    const { data } = await apiClient.patch<Shortage>(`/shortages/${id}/cancel`, { motivo });
    return data;
  },
};
