import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { StoreInfo, User, VendedorSummary } from '../../domain';
import { authService } from '../../services';
import { authStorage } from '../../lib/storage';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  storeInfo: StoreInfo | null;
  hasStoreSession: boolean;
  /** ADMIN/COMPRADOR: e-mail+senha. */
  login: (email: string, senha: string) => Promise<User>;
  /** Vendedor, passo 1: abre a sessao do terminal da loja. */
  loginLoja: (codigo: string, senha: string) => Promise<StoreInfo>;
  /** Vendedor, passo 2: lista os vendedores ativos para a grade de selecao. */
  listVendedoresLoja: () => Promise<VendedorSummary[]>;
  /** Vendedor, passo 3: confirma o PIN e entra. */
  loginVendedor: (userId: string, pin: string) => Promise<User>;
  /** Devolve o terminal ao seletor de vendedor, mantendo a sessao da loja aberta. */
  trocarVendedor: () => void;
  /** Sai completamente: usuario/vendedor logado + sessao do terminal (se houver). */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser<User>());
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(() =>
    authStorage.getStoreInfo<StoreInfo>(),
  );

  const login = useCallback(async (email: string, senha: string) => {
    const { token, user: loggedUser } = await authService.login(email, senha);
    authStorage.setToken(token);
    authStorage.setUser(loggedUser);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const loginLoja = useCallback(async (codigo: string, senha: string) => {
    const { storeToken, store } = await authService.loginLoja(codigo, senha);
    authStorage.setStoreToken(storeToken);
    authStorage.setStoreInfo(store);
    setStoreInfo(store);
    return store;
  }, []);

  const listVendedoresLoja = useCallback(async () => {
    return authService.listVendedoresLoja();
  }, []);

  const loginVendedor = useCallback(async (userId: string, pin: string) => {
    const { token, user: loggedUser } = await authService.loginVendedor(userId, pin);
    authStorage.setToken(token);
    authStorage.setUser(loggedUser);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const trocarVendedor = useCallback(() => {
    authStorage.clearSession();
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setUser(null);
    setStoreInfo(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        storeInfo,
        hasStoreSession: !!storeInfo,
        login,
        loginLoja,
        listVendedoresLoja,
        loginVendedor,
        trocarVendedor,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider.');
  }
  return context;
}
