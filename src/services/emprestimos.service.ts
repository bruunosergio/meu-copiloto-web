import { apiClient } from '../lib/api-client';
import { Emprestimo, EmprestimoStatus } from '../domain';

export const emprestimosService = {
  list: async (status?: EmprestimoStatus): Promise<Emprestimo[]> => {
    const { data } = await apiClient.get<Emprestimo[]>('/emprestimos', {
      params: status ? { status } : undefined,
    });
    return data;
  },
  devolver: async (ids: string[], devolvidoPara: string): Promise<Emprestimo[]> => {
    const { data } = await apiClient.patch<Emprestimo[]>('/emprestimos/devolver', {
      ids,
      devolvidoPara,
    });
    return data;
  },
};
