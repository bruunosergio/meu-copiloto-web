import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, CollapsibleSection, Input } from '../../components';
import {
  EmprestimoStatus,
  Shortage,
  ShortageStatus,
  STATUS_LABEL,
  podeGerenciarFilaCompleta,
} from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { distribuidorasService, emprestimosService, shortagesService } from '../../services';
import { useAuth } from '../auth/AuthContext';
import { CancelShortageModal } from './CancelShortageModal';
import { DistribuidoraPickerModal } from './DistribuidoraPickerModal';
import { ShortageListRow } from './ShortageListRow';

type EscolhaDistribuidora =
  | { modo: 'transicao'; shortages: Shortage[] }
  | { modo: 'correcao'; shortage: Shortage };

const COLUNAS_ABERTAS: ShortageStatus[] = [ShortageStatus.REGISTRADA, ShortageStatus.CONCLUIDA];
const STATUS_ARQUIVO: ShortageStatus[] = [ShortageStatus.RECEBIDA, ShortageStatus.CANCELADA];

export function ShortagesQueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState('');
  const [mostrarArquivo, setMostrarArquivo] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [cancelando, setCancelando] = useState<Shortage | null>(null);
  const [escolhendoDistribuidora, setEscolhendoDistribuidora] =
    useState<EscolhaDistribuidora | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: shortages, isLoading, error } = useQuery({
    queryKey: ['shortages'],
    queryFn: () => shortagesService.list(),
    refetchInterval: 15000,
  });

  const { data: distribuidoras } = useQuery({
    queryKey: ['distribuidoras'],
    queryFn: distribuidorasService.list,
  });

  const { data: emprestimosPendentes } = useQuery({
    queryKey: ['emprestimos', EmprestimoStatus.PENDENTE],
    queryFn: () => emprestimosService.list(EmprestimoStatus.PENDENTE),
    refetchInterval: 15000,
  });

  const emprestadaPorShortageId = useMemo(() => {
    const ids = new Set<string>();
    for (const emprestimo of emprestimosPendentes ?? []) {
      ids.add(emprestimo.shortageId);
    }
    return ids;
  }, [emprestimosPendentes]);

  const distribuidoraNomePorId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const distribuidora of distribuidoras ?? []) {
      mapa.set(distribuidora.id, distribuidora.nome);
    }
    return mapa;
  }, [distribuidoras]);

  const distribuidorasAtivas = useMemo(
    () => (distribuidoras ?? []).filter((d) => d.ativa),
    [distribuidoras],
  );

  const transitionMutation = useMutation({
    mutationFn: ({
      id,
      novoStatus,
      distribuidoraId,
    }: {
      id: string;
      novoStatus: ShortageStatus;
      distribuidoraId?: string;
    }) => shortagesService.transition(id, { novoStatus, distribuidoraId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortages'] }),
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const batchMutation = useMutation({
    mutationFn: (payload: {
      ids: string[];
      novoStatus: ShortageStatus;
      distribuidoraId?: string;
    }) => shortagesService.transitionMany(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortages'] });
      setSelecionadas(new Set());
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const setDistribuidoraMutation = useMutation({
    mutationFn: ({ id, distribuidoraId }: { id: string; distribuidoraId: string | null }) =>
      shortagesService.setDistribuidora(id, distribuidoraId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortages'] }),
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      shortagesService.cancel(id, motivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortages'] }),
  });

  const souGerenciador = !!user && podeGerenciarFilaCompleta(user.papel);

  const filtradas = useMemo(() => {
    if (!shortages) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return shortages;
    return shortages.filter(
      (s) =>
        s.nomePeca.toLowerCase().includes(termo) ||
        (s.codigoPeca ?? '').toLowerCase().includes(termo) ||
        (s.registradoPorNome ?? '').toLowerCase().includes(termo),
    );
  }, [shortages, busca]);

  const porStatus = useMemo(() => {
    const grupos = new Map<ShortageStatus, Shortage[]>();
    for (const status of [...COLUNAS_ABERTAS, ...STATUS_ARQUIVO]) {
      grupos.set(status, []);
    }
    for (const shortage of filtradas) {
      grupos.get(shortage.status)?.push(shortage);
    }
    return grupos;
  }, [filtradas]);

  const selecionadasRegistradas = filtradas.filter(
    (s) => selecionadas.has(s.id) && s.status === ShortageStatus.REGISTRADA,
  );
  const selecionadasConcluidas = filtradas.filter(
    (s) => selecionadas.has(s.id) && s.status === ShortageStatus.CONCLUIDA,
  );

  function toggleSelect(shortage: Shortage) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(shortage.id)) proximo.delete(shortage.id);
      else proximo.add(shortage.id);
      return proximo;
    });
  }

  function toggleTodasDoStatus(status: ShortageStatus) {
    const itens = porStatus.get(status) ?? [];
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      const todasMarcadas = itens.length > 0 && itens.every((s) => proximo.has(s.id));
      for (const item of itens) {
        if (todasMarcadas) proximo.delete(item.id);
        else proximo.add(item.id);
      }
      return proximo;
    });
  }

  if (!user) return null;

  const isMutating =
    transitionMutation.isPending || batchMutation.isPending || setDistribuidoraMutation.isPending;

  function renderSecao(status: ShortageStatus, podeAgir: boolean) {
    const itens = porStatus.get(status) ?? [];
    const podeSelecionar =
      souGerenciador &&
      podeAgir &&
      (status === ShortageStatus.REGISTRADA || status === ShortageStatus.CONCLUIDA);
    const todasSelecionadas = itens.length > 0 && itens.every((s) => selecionadas.has(s.id));

    return (
      <CollapsibleSection key={status} title={STATUS_LABEL[status]} count={itens.length}>
        {podeSelecionar && itens.length > 0 && (
          <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={todasSelecionadas}
              onChange={() => toggleTodasDoStatus(status)}
            />
            Selecionar todas
          </label>
        )}
        <div className="divide-y divide-slate-100">
          {itens.map((shortage) => (
            <ShortageListRow
              key={shortage.id}
              shortage={shortage}
              currentUserId={user!.id}
              currentUserRole={user!.papel}
              distribuidoraNome={
                shortage.distribuidoraId
                  ? distribuidoraNomePorId.get(shortage.distribuidoraId)
                  : undefined
              }
              emprestada={emprestadaPorShortageId.has(shortage.id)}
              podeEditarDistribuidora={souGerenciador}
              selectable={podeSelecionar}
              selected={selecionadas.has(shortage.id)}
              onToggleSelect={toggleSelect}
              isMutating={isMutating}
              onAdvance={
                podeAgir
                  ? (s, novoStatus) => {
                      if (novoStatus === ShortageStatus.CONCLUIDA) {
                        setEscolhendoDistribuidora({ modo: 'transicao', shortages: [s] });
                      } else {
                        transitionMutation.mutate({ id: s.id, novoStatus });
                      }
                    }
                  : () => {}
              }
              onCancel={podeAgir ? (s) => setCancelando(s) : () => {}}
              onEditDistribuidora={(s) => setEscolhendoDistribuidora({ modo: 'correcao', shortage: s })}
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
            placeholder="Buscar por código, nome ou vendedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-64"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mostrarArquivo}
              onChange={(e) => setMostrarArquivo(e.target.checked)}
            />
            Mostrar recebidas/canceladas
          </label>
        </div>
      </div>

      {souGerenciador && selecionadas.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2">
          <span className="text-sm text-slate-700">
            {selecionadas.size} selecionada{selecionadas.size === 1 ? '' : 's'}
          </span>
          <Button
            disabled={selecionadasRegistradas.length === 0 || isMutating}
            onClick={() =>
              setEscolhendoDistribuidora({
                modo: 'transicao',
                shortages: selecionadasRegistradas,
              })
            }
          >
            Marcar como concluídas ({selecionadasRegistradas.length})
          </Button>
          <Button
            disabled={selecionadasConcluidas.length === 0 || isMutating}
            onClick={() =>
              batchMutation.mutate({
                ids: selecionadasConcluidas.map((s) => s.id),
                novoStatus: ShortageStatus.RECEBIDA,
              })
            }
          >
            Marcar como recebidas ({selecionadasConcluidas.length})
          </Button>
          <Button variant="ghost" onClick={() => setSelecionadas(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{extractErrorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-slate-500">Carregando faltas...</p>}

      <div className="flex flex-col gap-4">
        {COLUNAS_ABERTAS.map((status) => renderSecao(status, true))}
      </div>

      {mostrarArquivo && (
        <div className="mt-6 flex flex-col gap-4">
          {STATUS_ARQUIVO.map((status) => renderSecao(status, false))}
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

      <DistribuidoraPickerModal
        open={!!escolhendoDistribuidora}
        distribuidoras={distribuidorasAtivas}
        pecaNome={
          escolhendoDistribuidora?.modo === 'correcao'
            ? escolhendoDistribuidora.shortage.nomePeca
            : escolhendoDistribuidora?.shortages.length === 1
              ? escolhendoDistribuidora.shortages[0].nomePeca
              : undefined
        }
        title={
          escolhendoDistribuidora?.modo === 'transicao' &&
          escolhendoDistribuidora.shortages.length > 1
            ? `Quem venceu a cotação destas ${escolhendoDistribuidora.shortages.length} peças?`
            : undefined
        }
        distribuidoraAtualId={
          escolhendoDistribuidora?.modo === 'correcao'
            ? escolhendoDistribuidora.shortage.distribuidoraId
            : escolhendoDistribuidora?.shortages[0]?.distribuidoraId
        }
        skipLabel={
          escolhendoDistribuidora?.modo === 'correcao' ? 'Remover distribuidora' : 'Decidir depois'
        }
        onClose={() => setEscolhendoDistribuidora(null)}
        onConfirm={async (distribuidoraId) => {
          if (!escolhendoDistribuidora) return;
          if (escolhendoDistribuidora.modo === 'transicao') {
            const ids = escolhendoDistribuidora.shortages.map((s) => s.id);
            if (ids.length === 1) {
              await transitionMutation.mutateAsync({
                id: ids[0],
                novoStatus: ShortageStatus.CONCLUIDA,
                distribuidoraId: distribuidoraId ?? undefined,
              });
            } else {
              await batchMutation.mutateAsync({
                ids,
                novoStatus: ShortageStatus.CONCLUIDA,
                distribuidoraId: distribuidoraId ?? undefined,
              });
            }
          } else {
            await setDistribuidoraMutation.mutateAsync({
              id: escolhendoDistribuidora.shortage.id,
              distribuidoraId,
            });
          }
          setEscolhendoDistribuidora(null);
        }}
      />
    </div>
  );
}
