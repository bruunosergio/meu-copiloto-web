import axios from 'axios';
import { authStorage } from './storage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

/** Rotas do fluxo do terminal da loja usam o storeToken, nao o token do usuario (ver ADR-0007). */
const ROTAS_SESSAO_LOJA = ['/auth/loja/vendedores', '/auth/loja/vendedor-login'];

function ehRotaDeSessaoDaLoja(url?: string): boolean {
  if (!url) return false;
  return ROTAS_SESSAO_LOJA.some((rota) => url.startsWith(rota));
}

apiClient.interceptors.request.use((config) => {
  if (ehRotaDeSessaoDaLoja(config.url)) {
    const storeToken = authStorage.getStoreToken();
    if (storeToken) {
      config.headers.Authorization = `Bearer ${storeToken}`;
    }
    return config;
  }

  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (ehRotaDeSessaoDaLoja(error.config?.url)) {
        authStorage.clearStoreSession();
        if (window.location.pathname !== '/loja') {
          window.location.href = '/loja';
        }
      } else {
        authStorage.clearSession();
        // Vendedor com sessao de terminal ainda valida volta ao seletor de
        // nomes, nao ao login pessoal (que nem se aplica a ele).
        const destino = authStorage.getStoreToken() ? '/loja/vendedores' : '/login';
        if (window.location.pathname !== destino) {
          window.location.href = destino;
        }
      }
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(' ');
    if (typeof data?.message === 'string') return data.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
