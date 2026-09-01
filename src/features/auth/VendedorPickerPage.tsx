import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components';
import { Role, ROLE_LABEL } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { useAuth } from './AuthContext';

const TECLAS_PIN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar'];
const PIN_MAX = 6;

/**
 * Depois da senha da loja: escolhe o nome e confirma o PIN (mouse ou teclado).
 */
export function VendedorPickerPage() {
  const { hasStoreSession, storeInfo, listVendedoresLoja, loginVendedor, logout } = useAuth();
  const navigate = useNavigate();

  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: vendedores, isLoading, error: listError } = useQuery({
    queryKey: ['vendedores-loja'],
    queryFn: listVendedoresLoja,
    enabled: hasStoreSession,
  });

  const vendedorSelecionado = vendedores?.find((v) => v.id === vendedorId) ?? null;

  useEffect(() => {
    if (!vendedorSelecionado) return;

    function onKeyDown(event: KeyboardEvent) {
      if (loading) return;
      if (event.key === 'Backspace') {
        event.preventDefault();
        setError(null);
        setPin((atual) => atual.slice(0, -1));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void confirmarPin();
        return;
      }
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setError(null);
        setPin((atual) => (atual.length >= PIN_MAX ? atual : atual + event.key));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [vendedorSelecionado, pin, loading, vendedorId]);

  if (!hasStoreSession) {
    return <Navigate to="/loja" replace />;
  }

  function selecionarVendedor(id: string) {
    setVendedorId(id);
    setPin('');
    setError(null);
  }

  function voltarParaLista() {
    setVendedorId(null);
    setPin('');
    setError(null);
  }

  function digitar(tecla: string) {
    if (loading) return;
    setError(null);
    if (tecla === 'apagar') {
      setPin((atual) => atual.slice(0, -1));
      return;
    }
    if (tecla === '') return;
    setPin((atual) => (atual.length >= PIN_MAX ? atual : atual + tecla));
  }

  async function confirmarPin() {
    if (!vendedorId || pin.length < 4) return;
    setError(null);
    setLoading(true);
    try {
      const user = await loginVendedor(vendedorId, pin);
      const destino = user.papel === Role.VENDEDOR ? '/faltas/registrar' : '/faltas';
      navigate(destino, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{storeInfo?.nome}</h1>
        <p className="text-sm text-slate-500">
          {vendedorSelecionado ? 'Digite seu PIN (teclado ou mouse)' : 'Quem é você?'}
        </p>
      </div>

      {!vendedorSelecionado ? (
        <div className="w-full max-w-2xl">
          {isLoading && <p className="text-center text-sm text-slate-500">Carregando...</p>}
          {listError && (
            <p className="text-center text-sm text-red-600">{extractErrorMessage(listError)}</p>
          )}
          {vendedores && vendedores.length === 0 && (
            <p className="rounded-md bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
              Ninguém com PIN cadastrado ainda. Entre pelo acesso de emergência em /login e cadastre
              o PIN em Usuários.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {vendedores?.map((vendedor) => (
              <button
                key={vendedor.id}
                type="button"
                onClick={() => selecionarVendedor(vendedor.id)}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-6 text-center shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="text-base font-medium text-slate-700">{vendedor.nome}</span>
                <span className="mt-1 text-xs text-slate-400">{ROLE_LABEL[vendedor.papel]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xs">
          <p className="mb-1 text-center text-lg font-medium text-slate-900">
            {vendedorSelecionado.nome}
          </p>
          <p className="mb-4 text-center text-xs text-slate-400">
            {ROLE_LABEL[vendedorSelecionado.papel]}
          </p>

          <div className="mb-4 flex justify-center gap-2">
            {Array.from({ length: Math.max(pin.length, 4) }).map((_, index) => (
              <span
                key={index}
                className={`h-3 w-3 rounded-full border border-slate-400 ${
                  index < pin.length ? 'bg-slate-700' : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {error && <p className="mb-3 text-center text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-3 gap-2">
            {TECLAS_PIN.map((tecla, index) =>
              tecla === '' ? (
                <div key={`vazio-${index}`} />
              ) : (
                <button
                  key={tecla}
                  type="button"
                  disabled={loading}
                  onClick={() => digitar(tecla)}
                  className="rounded-lg border border-slate-200 bg-white py-4 text-lg font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                  {tecla === 'apagar' ? '⌫' : tecla}
                </button>
              ),
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={confirmarPin} disabled={loading || pin.length < 4} className="w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <Button variant="ghost" onClick={voltarParaLista} disabled={loading} className="w-full">
              Não sou eu
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={logout}
        className="mt-10 text-sm text-slate-400 hover:text-slate-600 hover:underline"
      >
        Trocar de loja / sair do terminal
      </button>
    </div>
  );
}
