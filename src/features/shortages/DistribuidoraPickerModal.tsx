import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '../../components';
import { Distribuidora } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';

interface DistribuidoraPickerModalProps {
  open: boolean;
  distribuidoras: Distribuidora[];
  pecaNome?: string;
  distribuidoraAtualId?: string | null;
  /** Rotulo do botao de pular/limpar; controla o texto conforme o contexto (transicao vs. correcao). */
  skipLabel: string;
  onClose: () => void;
  onConfirm: (distribuidoraId: string | null) => Promise<void>;
}

/**
 * Seletor rapido: grade de botoes (1 clique) em vez de um <select> — cotacoes
 * sao resolvidas em segundos e o comprador nao pode perder tempo abrindo e
 * rolando uma lista. Busca só aparece se a lista crescer muito.
 */
export function DistribuidoraPickerModal({
  open,
  distribuidoras,
  pecaNome,
  distribuidoraAtualId,
  skipLabel,
  onClose,
  onConfirm,
}: DistribuidoraPickerModalProps) {
  const [busca, setBusca] = useState('');
  const [loadingId, setLoadingId] = useState<string | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBusca('');
      setError(null);
      setLoadingId(null);
    }
  }, [open]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return distribuidoras;
    return distribuidoras.filter((d) => d.nome.toLowerCase().includes(termo));
  }, [distribuidoras, busca]);

  async function escolher(distribuidoraId: string | null) {
    setError(null);
    setLoadingId(distribuidoraId ?? 'skip');
    try {
      await onConfirm(distribuidoraId);
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoadingId(null);
    }
  }

  return (
    <Modal
      open={open}
      title={pecaNome ? `Quem venceu a cotação de "${pecaNome}"?` : 'Escolher distribuidora'}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        {distribuidoras.length > 8 && (
          <input
            autoFocus
            placeholder="Filtrar distribuidora..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        )}

        {distribuidoras.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            Nenhuma distribuidora ativa cadastrada. Peça a um administrador para cadastrar em
            "Distribuidoras".
          </p>
        ) : (
          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
            {filtradas.map((distribuidora) => {
              const selecionada = distribuidora.id === distribuidoraAtualId;
              const carregando = loadingId === distribuidora.id;
              return (
                <button
                  key={distribuidora.id}
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => escolher(distribuidora.id)}
                  className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    selecionada
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {carregando ? 'Salvando...' : distribuidora.nome}
                </button>
              );
            })}
            {filtradas.length === 0 && (
              <p className="col-span-2 py-4 text-center text-sm text-slate-400">
                Nenhuma distribuidora encontrada.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loadingId !== null}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => escolher(null)}
            disabled={loadingId !== null}
          >
            {loadingId === 'skip' ? 'Salvando...' : skipLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
