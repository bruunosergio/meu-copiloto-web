import { apiClient } from '../lib/api-client';
import { StoreInfo, User, VendedorSummary } from '../domain';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface StoreLoginResponse {
  storeToken: string;
  store: StoreInfo;
}

export const authService = {
  /** ADMIN/COMPRADOR: e-mail+senha. */
  login: async (email: string, senha: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, senha });
    return data;
  },

  /** Vendedor, passo 1: abre a sessao do terminal da loja. */
  loginLoja: async (codigo: string, senha: string): Promise<StoreLoginResponse> => {
    const { data } = await apiClient.post<StoreLoginResponse>('/auth/loja/login', { codigo, senha });
    return data;
  },

  /** Vendedor, passo 2: lista os vendedores ativos para a grade de selecao. */
  listVendedoresLoja: async (): Promise<VendedorSummary[]> => {
    const { data } = await apiClient.get<VendedorSummary[]>('/auth/loja/vendedores');
    return data;
  },

  /** Vendedor, passo 3: confirma o PIN e recebe o token de uso normal. */
  loginVendedor: async (userId: string, pin: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/loja/vendedor-login', { userId, pin });
    return data;
  },
};
