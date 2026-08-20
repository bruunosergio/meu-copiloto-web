import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Select } from '../../components';
import { Sprint, Tarefa, TarefaStatus, TAREFA_STATUS_LABEL } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { formatDateTime } from '../../lib/format';
import { tarefasService } from '../../services';

const COLUNAS: TarefaStatus[] = [
  TarefaStatus.A_FAZER,
  TarefaStatus.EM_ANDAMENTO,
  TarefaStatus.CONCLUIDA,
];

const COLUNA_CLASSES: Record<TarefaStatus, string> = {
  [TarefaStatus.A_FAZER]: 'border-slate-200',
  [TarefaStatus.EM_ANDAMENTO]: 'border-amber-200',
  [TarefaStatus.CONCLUIDA]: 'border-green-200',
};

export function TarefasPage() {
  const queryClient = useQueryClient();
  const [sprintFiltro, setSprintFiltro] = useState<string>('todas');
  const [criarSprintAberto, setCriarSprintAberto] = useState(false);
  const [novaSprintNome, setNovaSprintNome] = useState('');
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: sprints } = useQuery({
    queryKey: ['tarefas', 'sprints'],
    queryFn: tarefasService.listSprints,
  });

  const { data: tarefas, isLoading } = useQuery({
    queryKey: ['tarefas', 'lista', sprintFiltro],
    queryFn: () =>
      sprintFiltro === 'todas'
        ? tarefasService.listTarefas()
        : tarefasService.listTarefas(sprintFiltro === 'backlog' ? 'backlog' : sprintFiltro),
  });

  const createSprintMutation = useMutation({
    mutationFn: () => tarefasService.createSprint({ nome: novaSprintNome }),
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      setCriarSprintAberto(false);
      setNovaSprintNome('');
      setSprintFiltro(sprint.id);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const createTarefaMutation = useMutation({
    mutationFn: (titulo: string) =>
      tarefasService.createTarefa({
        titulo,
        sprintId:
          sprintFiltro === 'todas' || sprintFiltro === 'backlog' ? null : sprintFiltro,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      setNovaTarefaTitulo('');
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const updateTarefaMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TarefaStatus }) =>
      tarefasService.updateTarefa(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteTarefaMutation = useMutation({
    mutationFn: (id: string) => tarefasService.deleteTarefa(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const encerrarSprintMutation = useMutation({
    mutationFn: (id: string) => tarefasService.encerrarSprint(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarefas'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const porStatus = useMemo(() => {
    const grupos = new Map<TarefaStatus, Tarefa[]>();
    for (const status of COLUNAS) grupos.set(status, []);
    for (const tarefa of tarefas ?? []) {
      grupos.get(tarefa.status)?.push(tarefa);
    }
    return grupos;
  }, [tarefas]);

  const sprintAtiva = (sprints ?? []).find((s) => s.id === sprintFiltro);

  async function handleNovaTarefa(event: FormEvent) {
    event.preventDefault();
    if (!novaTarefaTitulo.trim()) return;
    setError(null);
    await createTarefaMutation.mutateAsync(novaTarefaTitulo.trim());
  }

  async function handleNovaSprint(event: FormEvent) {
    event.preventDefault();
    if (!novaSprintNome.trim()) return;
    setError(null);
    await createSprintMutation.mutateAsync();
  }

  function proximoStatus(status: TarefaStatus): TarefaStatus | null {
    if (status === TarefaStatus.A_FAZER) return TarefaStatus.EM_ANDAMENTO;
    if (status === TarefaStatus.EM_ANDAMENTO) return TarefaStatus.CONCLUIDA;
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tarefas</h1>
          <p className="text-sm text-slate-500">
            Quadro da loja — sprints são períodos nomeados (ex.: “Semana 19/08”).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sprintFiltro}
            onChange={(e) => setSprintFiltro(e.target.value)}
            className="w-56"
          >
            <option value="todas">Todas as tarefas</option>
            <option value="backlog">Backlog (sem sprint)</option>
            {(sprints ?? []).map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.nome}
                {sprint.encerrada ? ' (encerrada)' : ''}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => setCriarSprintAberto(true)}>
            Nova sprint
          </Button>
          {sprintAtiva && !sprintAtiva.encerrada && (
            <Button
              variant="ghost"
              onClick={() => encerrarSprintMutation.mutate(sprintAtiva.id)}
              disabled={encerrarSprintMutation.isPending}
            >
              Encerrar sprint
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleNovaTarefa} className="mb-4 flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            placeholder="Nova tarefa..."
            value={novaTarefaTitulo}
            onChange={(e) => setNovaTarefaTitulo(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={createTarefaMutation.isPending || !novaTarefaTitulo.trim()}>
          Adicionar
        </Button>
      </form>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {isLoading && <p className="text-sm text-slate-500">Carregando tarefas...</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUNAS.map((status) => {
          const itens = porStatus.get(status) ?? [];
          return (
            <div
              key={status}
              className={`rounded-lg border bg-white ${COLUNA_CLASSES[status]}`}
            >
              <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                {TAREFA_STATUS_LABEL[status]}{' '}
                <span className="font-normal text-slate-400">({itens.length})</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {itens.map((tarefa) => (
                  <TarefaCard
                    key={tarefa.id}
                    tarefa={tarefa}
                    sprints={sprints ?? []}
                    onAvancar={
                      proximoStatus(tarefa.status)
                        ? () =>
                            updateTarefaMutation.mutate({
                              id: tarefa.id,
                              status: proximoStatus(tarefa.status)!,
                            })
                        : undefined
                    }
                    onExcluir={() => deleteTarefaMutation.mutate(tarefa.id)}
                  />
                ))}
                {itens.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">Nenhuma tarefa.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={criarSprintAberto} title="Nova sprint" onClose={() => setCriarSprintAberto(false)}>
        <form onSubmit={handleNovaSprint} className="flex flex-col gap-3">
          <Input
            label="Nome"
            value={novaSprintNome}
            onChange={(e) => setNovaSprintNome(e.target.value)}
            placeholder="Ex.: Semana 19/08"
            required
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCriarSprintAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createSprintMutation.isPending}>
              Criar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TarefaCard({
  tarefa,
  sprints,
  onAvancar,
  onExcluir,
}: {
  tarefa: Tarefa;
  sprints: Sprint[];
  onAvancar?: () => void;
  onExcluir: () => void;
}) {
  const sprintNome = tarefa.sprintId
    ? sprints.find((s) => s.id === tarefa.sprintId)?.nome
    : 'Backlog';

  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-sm font-medium text-slate-900">{tarefa.titulo}</p>
      {tarefa.descricao && <p className="mt-1 text-xs text-slate-500">{tarefa.descricao}</p>}
      <p className="mt-1 text-xs text-slate-400">
        {sprintNome}
        {tarefa.prazo ? ` · prazo ${formatDateTime(tarefa.prazo)}` : ''}
      </p>
      <div className="mt-2 flex gap-2">
        {onAvancar && (
          <Button variant="secondary" onClick={onAvancar}>
            Avançar
          </Button>
        )}
        <Button variant="ghost" onClick={onExcluir}>
          Excluir
        </Button>
      </div>
    </div>
  );
}
