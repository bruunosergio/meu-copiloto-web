import { apiClient } from '../lib/api-client';
import { Sprint, Tarefa, TarefaStatus } from '../domain';

export interface CreateSprintPayload {
  nome: string;
  inicio?: string;
  fim?: string;
}

export interface CreateTarefaPayload {
  titulo: string;
  descricao?: string;
  prazo?: string;
  sprintId?: string | null;
}

export interface UpdateTarefaPayload {
  titulo?: string;
  descricao?: string | null;
  status?: TarefaStatus;
  prazo?: string | null;
  sprintId?: string | null;
}

export const tarefasService = {
  listSprints: async (): Promise<Sprint[]> => {
    const { data } = await apiClient.get<Sprint[]>('/tarefas/sprints');
    return data;
  },
  createSprint: async (payload: CreateSprintPayload): Promise<Sprint> => {
    const { data } = await apiClient.post<Sprint>('/tarefas/sprints', payload);
    return data;
  },
  encerrarSprint: async (id: string): Promise<Sprint> => {
    const { data } = await apiClient.patch<Sprint>(`/tarefas/sprints/${id}/encerrar`);
    return data;
  },
  listTarefas: async (sprintId?: string | 'backlog'): Promise<Tarefa[]> => {
    const { data } = await apiClient.get<Tarefa[]>('/tarefas', {
      params: sprintId !== undefined ? { sprintId } : undefined,
    });
    return data;
  },
  createTarefa: async (payload: CreateTarefaPayload): Promise<Tarefa> => {
    const { data } = await apiClient.post<Tarefa>('/tarefas', payload);
    return data;
  },
  updateTarefa: async (id: string, payload: UpdateTarefaPayload): Promise<Tarefa> => {
    const { data } = await apiClient.patch<Tarefa>(`/tarefas/${id}`, payload);
    return data;
  },
  deleteTarefa: async (id: string): Promise<void> => {
    await apiClient.delete(`/tarefas/${id}`);
  },
};
