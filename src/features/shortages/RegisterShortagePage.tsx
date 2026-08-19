import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { Role } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { shortagesService } from '../../services';
import { useAuth } from '../auth/AuthContext';

const EMPTY_FORM = { codigoPeca: '', nomePeca: '', qtdRestante: '0', observacao: '' };
/** Tempo para o vendedor ler a confirmação antes de voltar ao seletor de nomes. */
const VOLTA_AO_SELETOR_MS = 1500;

export function RegisterShortagePage() {
  const navigate = useNavigate();
  const { user, trocarVendedor } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await shortagesService.register({
        codigoPeca: form.codigoPeca || undefined,
        nomePeca: form.nomePeca,
        qtdRestante: Number(form.qtdRestante),
        observacao: form.observacao || undefined,
      });
      setForm(EMPTY_FORM);
      setSuccess(true);

      // Terminal compartilhado: cada falta registrada devolve o vendedor ao
      // seletor de nomes, para o proximo vendedor nao herdar a sessao dele
      // (ver ADR-0007 do backend).
      if (user?.papel === Role.VENDEDOR) {
        setTimeout(() => {
          trocarVendedor();
          navigate('/loja/vendedores', { replace: true });
        }, VOLTA_AO_SELETOR_MS);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Registrar falta</h1>
      <p className="mb-6 text-sm text-slate-500">
        Percebeu que uma peça acabou ou está acabando? Registre aqui — isso substitui o
        caderno de faltas.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-sm">
        <Input
          label="Código da peça (se souber)"
          value={form.codigoPeca}
          onChange={(e) => setForm((f) => ({ ...f, codigoPeca: e.target.value }))}
          placeholder="Ex.: FR-5548"
        />
        <Input
          label="Nome da peça"
          value={form.nomePeca}
          onChange={(e) => setForm((f) => ({ ...f, nomePeca: e.target.value }))}
          placeholder="Ex.: Filtro de óleo Fram PH5548"
          required
        />
        <Input
          label="Quantidade que ficou no estoque"
          type="number"
          min={0}
          value={form.qtdRestante}
          onChange={(e) => setForm((f) => ({ ...f, qtdRestante: e.target.value }))}
          required
        />
        <Input
          label="Observação (opcional)"
          value={form.observacao}
          onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
          placeholder="Ex.: cliente encomendou 2 unidades"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-green-700">
            Falta registrada! Ela já está na fila do comprador.
            {user?.papel === Role.VENDEDOR && ' Voltando para a tela de seleção...'}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/faltas')}>
            Ver fila de faltas
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar falta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
