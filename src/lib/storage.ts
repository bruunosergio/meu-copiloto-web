const TOKEN_KEY = 'meu-copiloto:token';
const USER_KEY = 'meu-copiloto:user';
const STORE_TOKEN_KEY = 'meu-copiloto:store-token';
const STORE_INFO_KEY = 'meu-copiloto:store-info';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getUser: <T>(): T | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  setUser: (user: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  /** Limpa so a sessao do usuario/vendedor logado - mantem a sessao do terminal. */
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STORE_TOKEN_KEY);
    localStorage.removeItem(STORE_INFO_KEY);
  },

  // Sessao do terminal da loja (Store.codigo+senha) - dura o turno inteiro,
  // independente de qual vendedor esta usando o terminal no momento (ver ADR-0007).
  getStoreToken: () => localStorage.getItem(STORE_TOKEN_KEY),
  setStoreToken: (token: string) => localStorage.setItem(STORE_TOKEN_KEY, token),
  getStoreInfo: <T>(): T | null => {
    const raw = localStorage.getItem(STORE_INFO_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  setStoreInfo: (store: unknown) => localStorage.setItem(STORE_INFO_KEY, JSON.stringify(store)),
  clearStoreSession: () => {
    localStorage.removeItem(STORE_TOKEN_KEY);
    localStorage.removeItem(STORE_INFO_KEY);
  },
};
