import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { extractErrorMessage } from '../../lib/api-client';
import { useAuth } from './AuthContext';

/**
 * Passo 1 do fluxo do vendedor: abre a sessao do terminal compartilhado da
 * loja com o codigo+senha definidos pelo administrador (ver ADR-0007 do backend).
 * Fica aberta o turno todo - o vendedor se identifica por cima na tela seguinte.
 */
export function StoreLoginPage() {
  const { loginLoja, hasStoreSession } = useAuth();
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (hasStoreSession) {
    return <Navigate to="/loja/vendedores" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginLoja(codigo, senha);
      navigate('/loja/vendedores', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Meu Copiloto</h1>
        <p className="mb-6 text-sm text-slate-500">
          Abra o terminal desta loja para os vendedores registrarem faltas.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Código da loja"
            name="codigo"
            autoComplete="off"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
          <Input
            label="Senha da loja"
            type="password"
            name="senha"
            autoComplete="off"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? 'Abrindo...' : 'Abrir terminal'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          É administrador ou comprador?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Entrar com e-mail e senha
          </Link>
        </p>
      </div>
    </div>
  );
}
