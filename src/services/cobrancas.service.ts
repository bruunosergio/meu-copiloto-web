import {
  CobrancaAtencao,
  CobrancaPainel,
  CobrancaRegra,
  UpdateCobrancaClientePayload,
} from '../domain';
import { apiClient } from '../lib/api-client';
import type { RawClient } from '../features/cobrancas/parse-report';

export const cobrancasService = {
  getPainel: async (): Promise<CobrancaPainel> => {
    const { data } = await apiClient.get<CobrancaPainel>('/cobrancas');
    return data;
  },
  importar: async (payload: { referencia: string; fonte?: string; clientes: RawClient[] }): Promise<CobrancaPainel> => {
    const { data } = await apiClient.post<CobrancaPainel>('/cobrancas/importar', payload);
    return data;
  },
  atualizarCliente: async (codigo: string, payload: UpdateCobrancaClientePayload): Promise<CobrancaPainel> => {
    const { data } = await apiClient.patch<CobrancaPainel>(
      `/cobrancas/clientes/${encodeURIComponent(codigo)}`,
      payload,
    );
    return data;
  },
  atualizarConfig: async (dddPadrao: string): Promise<CobrancaPainel> => {
    const { data } = await apiClient.patch<CobrancaPainel>('/cobrancas/config', { dddPadrao });
    return data;
  },
  criarRegra: async (payload: {
    tipo: CobrancaAtencao;
    codigoCliente?: string | null;
    nomeContem?: string | null;
  }): Promise<CobrancaRegra> => {
    const { data } = await apiClient.post<CobrancaRegra>('/cobrancas/regras', payload);
    return data;
  },
  excluirRegra: async (id: string): Promise<void> => {
    await apiClient.delete(`/cobrancas/regras/${id}`);
  },
};
