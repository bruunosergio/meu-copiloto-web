import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Role, ROLE_LABEL, podeGerenciarTarefas } from '../domain';
import { useAuth } from '../features/auth/AuthContext';
import { useOnline } from '../lib/network';
import { useVendedorInactivityTimeout } from '../features/auth/useVendedorInactivityTimeout';
import { Button } from './Button';

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export function Layout() {
  const { user, logout, trocarVendedor, hasStoreSession, isOfflineSession, pendentesOffline } =
    useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  useVendedorInactivityTimeout(user);

  if (!user) return null;

  function handleSair() {
    if (hasStoreSession) {
      trocarVendedor();
      navigate('/loja/vendedores', { replace: true });
      return;
    }
    logout();
    navigate('/loja', { replace: true });
  }

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
              <NavLink to="/emprestimos" className={linkClasses}>
                Empréstimos
              </NavLink>
              {podeGerenciarTarefas(user.papel) && (
                <NavLink to="/tarefas" className={linkClasses}>
                  Tarefas
                </NavLink>
              )}
              {user.papel === Role.ADMIN && (
                <>
                  <NavLink to="/usuarios" className={linkClasses}>
                    Usuários
                  </NavLink>
                  <NavLink to="/distribuidoras" className={linkClasses}>
                    Distribuidoras
                  </NavLink>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {user.nome} <span className="text-slate-400">· {ROLE_LABEL[user.papel]}</span>
            </span>
            <Button variant="secondary" onClick={handleSair}>
              {hasStoreSession ? 'Trocar usuário' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {(isOfflineSession || !online || pendentesOffline > 0) && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {!online || isOfflineSession
              ? 'Sem internet. Você pode registrar falta; o envio acontece quando a rede voltar.'
              : `${pendentesOffline} falta${pendentesOffline === 1 ? '' : 's'} ainda neste computador, enviando…`}
          </p>
        )}
        <Outlet />
      </main>
    </div>
  );
}
