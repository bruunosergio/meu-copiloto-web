import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { STATUS_LABEL } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { isNetworkError } from '../../lib/network';
import { shortageOutbox } from '../../lib/offline-outbox';
import { shortagesService } from '../../services';
import { avisarPendentesOffline, useAuth } from '../auth/AuthContext';

const EMPTY_FORM = {
  codigoPeca: '',
  nomePeca: '',
  qtdRestante: '0',
  observacao: '',
  emprestada: false,
  emprestadaDe: '',
};

export function RegisterShortagePage() {
  const navigate = useNavigate();
  const { user, isOfflineSession, pendentesOffline } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [infoLocal, setInfoLocal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function atualizarForm(patch: Partial<typeof EMPTY_FORM>) {
    setAviso(null);
    setSuccess(false);
    setInfoLocal(null);
    setForm((atual) => ({ ...atual, ...patch }));
  }

  function payloadAtual() {
    return {
      codigoPeca: form.codigoPeca || undefined,
      nomePeca: form.nomePeca,
      qtdRestante: Number(form.qtdRestante),
      observacao: form.observacao || undefined,
      emprestada: form.emprestada || undefined,
      emprestadaDe: form.emprestada ? form.emprestadaDe || undefined : undefined,
    };
  }

  function gravarLocal(mensagem: string) {
    if (!user) throw new Error('Sessão inválida.');
    shortageOutbox.add(user.id, payloadAtual());
    avisarPendentesOffline();
    setForm(EMPTY_FORM);
    setAviso(null);
    setSuccess(true);
    setError(null);
    setInfoLocal(mensagem);
  }

  async function persistir() {
    await shortagesService.register(payloadAtual());
    setForm(EMPTY_FORM);
    setAviso(null);
    setInfoLocal(null);
    setSuccess(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      if (isOfflineSession || !navigator.onLine) {
        gravarLocal('Salva neste computador. Vai para a fila do comprador quando a internet voltar.');
        return;
      }
      if (!aviso) {
        try {
          const similares = await shortagesService.similares({
            nome: form.nomePeca,
            codigo: form.codigoPeca || undefined,
          });
          if (similares.length > 0) {
            const primeiro = similares[0];
            setAviso(
              `Já tem na fila: ${primeiro.nomePeca} (${STATUS_LABEL[primeiro.status]}, ${primeiro.registradoPorNome ?? '—'}). Registrar mesmo assim?`,
            );
            return;
          }
        } catch (err) {
          if (isNetworkError(err)) {
            gravarLocal('Sem internet. Falta salva neste computador para enviar depois.');
            return;
          }
          throw err;
        }
      }
      try {
        await persistir();
      } catch (err) {
        if (isNetworkError(err)) {
          gravarLocal('Sem internet. Falta salva neste computador para enviar depois.');
          return;
        }
        throw err;
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
          onChange={(e) => atualizarForm({ codigoPeca: e.target.value.toUpperCase() })}
          placeholder="Ex.: FR-5548"
          className="uppercase"
        />
        <Input
          label="Nome da peça"
          value={form.nomePeca}
          onChange={(e) => atualizarForm({ nomePeca: e.target.value.toUpperCase() })}
          placeholder="Ex.: FILTRO DE ÓLEO FRAM PH5548"
          required
          className="uppercase"
        />
        <Input
          label="Quantidade que ficou no estoque"
          type="number"
          min={0}
          value={form.qtdRestante}
          onChange={(e) => atualizarForm({ qtdRestante: e.target.value })}
          required
        />
        <Input
          label="Observação (opcional)"
          value={form.observacao}
          onChange={(e) => atualizarForm({ observacao: e.target.value })}
          placeholder="Ex.: cliente encomendou 2 unidades"
        />

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-brand-500"
            checked={form.emprestada}
            onChange={(e) =>
              atualizarForm({
                emprestada: e.target.checked,
                emprestadaDe: e.target.checked ? form.emprestadaDe : '',
              })
            }
          />
          <span>
            Peça emprestada de loja parceira
            <span className="block text-xs font-normal text-slate-400">
              Entra na lista de empréstimos até ser devolvida. A falta continua na fila para compra.
            </span>
          </span>
        </label>

        {form.emprestada && (
          <Input
            label="Emprestada de (opcional)"
            value={form.emprestadaDe}
            onChange={(e) => atualizarForm({ emprestadaDe: e.target.value })}
            placeholder="Ex.: Loja do Zé"
          />
        )}

        {aviso && <p className="text-sm text-amber-700">{aviso}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {infoLocal && <p className="text-sm text-amber-700">{infoLocal}</p>}
        {success && !infoLocal && (
          <p className="text-sm text-green-700">Falta registrada! Ela já está na fila do comprador.</p>
        )}
        {pendentesOffline > 0 && (
          <p className="text-sm text-amber-800">
            {pendentesOffline} falta{pendentesOffline === 1 ? '' : 's'} neste computador, esperando
            internet.
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/faltas')}>
            Ver fila de faltas
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : aviso ? 'Registrar mesmo assim' : 'Registrar falta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
