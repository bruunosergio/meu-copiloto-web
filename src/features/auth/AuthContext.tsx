import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import bcrypt from 'bcryptjs';
import { StoreInfo, User, VendedorSummary } from '../../domain';
import { isNetworkError } from '../../lib/network';
import { shortageOutbox } from '../../lib/offline-outbox';
import { offlineSession } from '../../lib/offline-session';
import { offlineVault } from '../../lib/offline-vault';
import { authStorage } from '../../lib/storage';
import { authService, shortagesService } from '../../services';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isOfflineSession: boolean;
  storeInfo: StoreInfo | null;
  hasStoreSession: boolean;
  pendentesOffline: number;
  login: (email: string, senha: string) => Promise<User>;
  loginLoja: (codigo: string, senha: string) => Promise<StoreInfo>;
  listVendedoresLoja: () => Promise<VendedorSummary[]>;
  loginVendedor: (userId: string, pin: string) => Promise<User>;
  trocarVendedor: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SEM_COFRE =
  'Sem internet e este computador ainda não tem a loja salva. Conecte uma vez (código e senha da loja) para poder entrar offline.';

function userInicial(): User | null {
  const user = authStorage.getUser<User>();
  const token = authStorage.getToken();
  if (offlineSession.ehUsuarioOffline() && user) return user;
  if (!token || !user) {
    if (user && !token) authStorage.clearSession();
    return null;
  }
  return user;
}

function storeInicial(): StoreInfo | null {
  const store = authStorage.getStoreInfo<StoreInfo>();
  const token = authStorage.getStoreToken();
  if (offlineSession.temLojaOffline() && store) return store;
  if (!token || !store) {
    if (store && !token) authStorage.clearStoreSession();
    return null;
  }
  return store;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => userInicial());
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(() => storeInicial());
  const [offlineUser, setOfflineUser] = useState(() => offlineSession.ehUsuarioOffline());
  const [pendentesOffline, setPendentesOffline] = useState(() => shortageOutbox.count());

  const login = useCallback(async (email: string, senha: string) => {
    const { token, user: loggedUser } = await authService.login(email, senha);
    authStorage.setToken(token);
    authStorage.setUser(loggedUser);
    setUser(loggedUser);
    setOfflineUser(false);
    offlineSession.limparUsuarioOffline();
    return loggedUser;
  }, []);

  const loginLoja = useCallback(async (codigo: string, senha: string) => {
    try {
      const { storeToken, store } = await authService.loginLoja(codigo, senha);
      authStorage.setStoreToken(storeToken);
      authStorage.setStoreInfo(store);
      setStoreInfo(store);
      offlineSession.patchCreds({ storeCodigo: codigo, storeSenha: senha });
      try {
        const bundle = await authService.getOfflineBundle();
        await offlineVault.save(codigo, senha, { store: bundle.store, users: bundle.users });
        offlineSession.saveUnlocked({ store: bundle.store, users: bundle.users });
      } catch {
        // Cofre e opcional: o turno online segue mesmo se o pacote falhar.
      }
      return store;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const unlocked = await offlineVault.unlock(codigo, senha);
      if (!unlocked) {
        throw new Error(SEM_COFRE);
      }
      authStorage.setStoreInfo(unlocked.store);
      offlineSession.saveUnlocked(unlocked);
      offlineSession.patchCreds({ storeCodigo: codigo, storeSenha: senha });
      setStoreInfo(unlocked.store);
      return unlocked.store;
    }
  }, []);

  const listVendedoresLoja = useCallback(async () => {
    try {
      return await authService.listVendedoresLoja();
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const unlocked = offlineSession.getUnlocked();
      if (!unlocked) throw new Error(SEM_COFRE);
      return offlineVault.paraGrade(unlocked.users);
    }
  }, []);

  const loginVendedor = useCallback(async (userId: string, pin: string) => {
    try {
      const { token, user: loggedUser } = await authService.loginVendedor(userId, pin);
      authStorage.setToken(token);
      authStorage.setUser(loggedUser);
      setUser(loggedUser);
      setOfflineUser(false);
      offlineSession.limparUsuarioOffline();
      offlineSession.patchCreds({ userId, pin });
      return loggedUser;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      const unlocked = offlineSession.getUnlocked();
      const vaultUser = unlocked?.users.find((u) => u.id === userId);
      if (!unlocked || !vaultUser) {
        throw new Error(SEM_COFRE);
      }
      const pinOk = await bcrypt.compare(pin, vaultUser.pinHash);
      if (!pinOk) {
        throw new Error('PIN inválido.');
      }
      const loggedUser = offlineSession.userFromVault(unlocked.store, vaultUser);
      authStorage.setUser(loggedUser);
      offlineSession.marcarUsuarioOffline();
      offlineSession.patchCreds({ userId, pin });
      setUser(loggedUser);
      setOfflineUser(true);
      return loggedUser;
    }
  }, []);

  const trocarVendedor = useCallback(() => {
    authStorage.clearSession();
    offlineSession.limparUsuarioOffline();
    setUser(null);
    setOfflineUser(false);
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    offlineSession.limparTudo();
    setUser(null);
    setStoreInfo(null);
    setOfflineUser(false);
  }, []);

  useEffect(() => {
    async function sincronizar() {
      if (!navigator.onLine) return;
      const fila = shortageOutbox.list();
      if (fila.length === 0) return;

      try {
        if (!authStorage.getToken()) {
          const creds = offlineSession.getCreds();
          if (!creds?.storeCodigo || !creds.storeSenha || !creds.userId || !creds.pin) return;
          const { storeToken, store } = await authService.loginLoja(creds.storeCodigo, creds.storeSenha);
          authStorage.setStoreToken(storeToken);
          authStorage.setStoreInfo(store);
          setStoreInfo(store);
          const { token, user: loggedUser } = await authService.loginVendedor(creds.userId, creds.pin);
          authStorage.setToken(token);
          authStorage.setUser(loggedUser);
          setUser(loggedUser);
          setOfflineUser(false);
          offlineSession.limparUsuarioOffline();
        }

        for (const item of shortageOutbox.list()) {
          await shortagesService.register(item.payload);
          shortageOutbox.remove(item.id);
        }
        setPendentesOffline(shortageOutbox.count());
      } catch {
        setPendentesOffline(shortageOutbox.count());
      }
    }

    function atualizarContagem() {
      setPendentesOffline(shortageOutbox.count());
    }

    void sincronizar();
    window.addEventListener('online', sincronizar);
    window.addEventListener('offline', atualizarContagem);
    window.addEventListener('meu-copiloto:outbox', atualizarContagem);
    const timer = window.setInterval(() => void sincronizar(), 15000);
    return () => {
      window.removeEventListener('online', sincronizar);
      window.removeEventListener('offline', atualizarContagem);
      window.removeEventListener('meu-copiloto:outbox', atualizarContagem);
      window.clearInterval(timer);
    };
  }, []);

  const temLoja =
    !!storeInfo && (!!authStorage.getStoreToken() || offlineSession.temLojaOffline());

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && (!!authStorage.getToken() || offlineUser),
        isOfflineSession: offlineUser,
        storeInfo,
        hasStoreSession: temLoja,
        pendentesOffline,
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

export function avisarPendentesOffline() {
  window.dispatchEvent(new Event('meu-copiloto:outbox'));
}
