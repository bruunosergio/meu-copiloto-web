import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CollapsibleSection, Input } from '../../components';
import { Shortage, ShortageStatus, STATUS_LABEL } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { shortagesService } from '../../services';
import { useAuth } from '../auth/AuthContext';
import { CancelShortageModal } from './CancelShortageModal';
import { ShortageListRow } from './ShortageListRow';

const COLUNAS_ABERTAS: ShortageStatus[] = [
  ShortageStatus.REGISTRADA,
  ShortageStatus.EM_COTACAO,
  ShortageStatus.COMPRADA,
];
const STATUS_CONCLUIDOS: ShortageStatus[] = [ShortageStatus.RECEBIDA, ShortageStatus.CANCELADA];

export function ShortagesQueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState('');
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [cancelando, setCancelando] = useState<Shortage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: shortages, isLoading, error } = useQuery({
    queryKey: ['shortages'],
    queryFn: () => shortagesService.list(),
    refetchInterval: 15000,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, novoStatus }: { id: string; novoStatus: ShortageStatus }) =>
      shortagesService.transition(id, { novoStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortages'] }),
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      shortagesService.cancel(id, motivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortages'] }),
  });

  const filtradas = useMemo(() => {
    if (!shortages) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return shortages;
    return shortages.filter(
      (s) =>
        s.nomePeca.toLowerCase().includes(termo) ||
        (s.codigoPeca ?? '').toLowerCase().includes(termo),
    );
  }, [shortages, busca]);

  const porStatus = useMemo(() => {
    const grupos = new Map<ShortageStatus, Shortage[]>();
    for (const status of [...COLUNAS_ABERTAS, ...STATUS_CONCLUIDOS]) {
      grupos.set(status, []);
    }
    for (const shortage of filtradas) {
      grupos.get(shortage.status)?.push(shortage);
    }
    return grupos;
  }, [filtradas]);

  if (!user) return null;

  function renderSecao(status: ShortageStatus, podeAgir: boolean) {
    const itens = porStatus.get(status) ?? [];
    return (
      <CollapsibleSection key={status} title={STATUS_LABEL[status]} count={itens.length}>
        <div className="divide-y divide-slate-100">
          {itens.map((shortage) => (
            <ShortageListRow
              key={shortage.id}
              shortage={shortage}
              currentUserId={user!.id}
              currentUserRole={user!.papel}
              isMutating={podeAgir && transitionMutation.isPending}
              onAdvance={
                podeAgir
                  ? (s, novoStatus) => transitionMutation.mutate({ id: s.id, novoStatus })
                  : () => {}
              }
              onCancel={podeAgir ? (s) => setCancelando(s) : () => {}}
            />
          ))}
          {itens.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Nenhuma falta aqui.</p>
          )}
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Fila de Faltas</h1>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por código ou nome da peça..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-64"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mostrarConcluidas}
              onChange={(e) => setMostrarConcluidas(e.target.checked)}
            />
            Mostrar concluídas/canceladas
          </label>
        </div>
      </div>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{extractErrorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-slate-500">Carregando faltas...</p>}

      <div className="flex flex-col gap-4">
        {COLUNAS_ABERTAS.map((status) => renderSecao(status, true))}
      </div>

      {mostrarConcluidas && (
        <div className="mt-6 flex flex-col gap-4">
          {STATUS_CONCLUIDOS.map((status) => renderSecao(status, false))}
        </div>
      )}

      <CancelShortageModal
        open={!!cancelando}
        onClose={() => setCancelando(null)}
        onConfirm={async (motivo) => {
          if (!cancelando) return;
          await cancelMutation.mutateAsync({ id: cancelando.id, motivo });
        }}
      />
    </div>
  );
}
