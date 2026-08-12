import { NavLink, Outlet } from 'react-router-dom';
import { Role, ROLE_LABEL } from '../domain';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from './Button';

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export function Layout() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold text-brand-700">Meu Copiloto</span>
            <nav className="flex gap-1">
              <NavLink to="/faltas" className={linkClasses}>
                Fila de Faltas
              </NavLink>
              <NavLink to="/faltas/registrar" className={linkClasses}>
                Registrar Falta
              </NavLink>
              {user.papel === Role.ADMIN && (
                <NavLink to="/usuarios" className={linkClasses}>
                  Usuários
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {user.nome} <span className="text-slate-400">· {ROLE_LABEL[user.papel]}</span>
            </span>
            <Button variant="secondary" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
