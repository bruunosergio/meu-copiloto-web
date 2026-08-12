import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { User } from '../../domain';
import { authService } from '../../services';
import { authStorage } from '../../lib/storage';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser<User>());

  const login = useCallback(async (email: string, senha: string) => {
    const { token, user: loggedUser } = await authService.login(email, senha);
    authStorage.setToken(token);
    authStorage.setUser(loggedUser);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
