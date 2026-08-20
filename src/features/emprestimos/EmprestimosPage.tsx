import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, CollapsibleSection, Input, Modal } from '../../components';
import { Emprestimo, EmprestimoStatus } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { formatDateTime } from '../../lib/format';
import { emprestimosService } from '../../services';

export function EmprestimosPage() {
  const queryClient = useQueryClient();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [devolverAberto, setDevolverAberto] = useState(false);
  const [devolvidoPara, setDevolvidoPara] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: pendentes, isLoading } = useQuery({
    queryKey: ['emprestimos', EmprestimoStatus.PENDENTE],
    queryFn: () => emprestimosService.list(EmprestimoStatus.PENDENTE),
    refetchInterval: 15000,
  });

  const { data: devolvidas } = useQuery({
    queryKey: ['emprestimos', EmprestimoStatus.DEVOLVIDA],
    queryFn: () => emprestimosService.list(EmprestimoStatus.DEVOLVIDA),
  });

  const devolverMutation = useMutation({
    mutationFn: ({ ids, para }: { ids: string[]; para: string }) =>
      emprestimosService.devolver(ids, para),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] });
      setSelecionadas(new Set());
      setDevolverAberto(false);
      setDevolvidoPara('');
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const todasPendentesMarcadas =
    (pendentes?.length ?? 0) > 0 && pendentes!.every((e) => selecionadas.has(e.id));

  function toggle(id: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function toggleTodas() {
    if (!pendentes) return;
    setSelecionadas((atual) => {
      if (pendentes.every((e) => atual.has(e.id))) return new Set();
      return new Set(pendentes.map((e) => e.id));
    });
  }

  async function handleDevolver(event: FormEvent) {
    event.preventDefault();
    setError(null);
    await devolverMutation.mutateAsync({
      ids: [...selecionadas],
      para: devolvidoPara.trim(),
    });
  }

  const selecionadasLista = useMemo(
    () => (pendentes ?? []).filter((e) => selecionadas.has(e.id)),
    [pendentes, selecionadas],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Empréstimos</h1>
          <p className="text-sm text-slate-500">
            Peças pegadas emprestadas de loja parceira. Marque a devolução quando a peça voltar.
          </p>
        </div>
        <Button
          disabled={selecionadas.size === 0 || devolverMutation.isPending}
          onClick={() => {
            setError(null);
            setDevolverAberto(true);
            const unico = selecionadasLista[0]?.emprestadaDe ?? '';
            setDevolvidoPara(unico);
          }}
        >
          Marcar como devolvidas ({selecionadas.size})
        </Button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Carregando empréstimos...</p>}

      <CollapsibleSection title="Pendentes" count={pendentes?.length ?? 0}>
        {(pendentes?.length ?? 0) > 0 && (
          <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={todasPendentesMarcadas}
              onChange={toggleTodas}
            />
            Selecionar todas
          </label>
        )}
        <div className="divide-y divide-slate-100">
          {(pendentes ?? []).map((emprestimo) => (
            <EmprestimoRow
              key={emprestimo.id}
              emprestimo={emprestimo}
              selectable
              selected={selecionadas.has(emprestimo.id)}
              onToggle={() => toggle(emprestimo.id)}
            />
          ))}
          {(pendentes?.length ?? 0) === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Nenhum empréstimo pendente.</p>
          )}
        </div>
      </CollapsibleSection>

      <div className="mt-6">
        <CollapsibleSection title="Devolvidas" count={devolvidas?.length ?? 0} defaultOpen={false}>
          <div className="divide-y divide-slate-100">
            {(devolvidas ?? []).map((emprestimo) => (
              <EmprestimoRow key={emprestimo.id} emprestimo={emprestimo} />
            ))}
            {(devolvidas?.length ?? 0) === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">Nenhuma devolução registrada ainda.</p>
            )}
          </div>
        </CollapsibleSection>
      </div>

      <Modal
        open={devolverAberto}
        title="Marcar como devolvida"
        onClose={() => setDevolverAberto(false)}
      >
        <form onSubmit={handleDevolver} className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            {selecionadas.size} peça{selecionadas.size === 1 ? '' : 's'} será
            {selecionadas.size === 1 ? '' : 'ão'} marcada{selecionadas.size === 1 ? '' : 's'} como
            devolvida{selecionadas.size === 1 ? '' : 's'}.
          </p>
          <Input
            label="Devolvido para"
            value={devolvidoPara}
            onChange={(e) => setDevolvidoPara(e.target.value)}
            placeholder="Nome da pessoa ou da loja parceira"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDevolverAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={devolverMutation.isPending}>
              {devolverMutation.isPending ? 'Salvando...' : 'Confirmar devolução'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function EmprestimoRow({
  emprestimo,
  selectable = false,
  selected = false,
  onToggle,
}: {
  emprestimo: Emprestimo;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      {selectable && (
        <input
          type="checkbox"
          className="h-4 w-4 flex-shrink-0 accent-brand-500"
          checked={selected}
          onChange={onToggle}
          aria-label={`Selecionar ${emprestimo.pecaNome ?? emprestimo.id}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{emprestimo.pecaNome ?? 'Peça'}</p>
        {emprestimo.pecaCodigo && (
          <p className="text-xs text-slate-500">Código: {emprestimo.pecaCodigo}</p>
        )}
        <p className="text-xs text-slate-400">
          {emprestimo.registradoPorNome ?? '—'} · {formatDateTime(emprestimo.criadoEm)}
          {emprestimo.emprestadaDe ? ` · de ${emprestimo.emprestadaDe}` : ''}
        </p>
        {emprestimo.status === EmprestimoStatus.DEVOLVIDA && (
          <p className="text-xs text-slate-400">
            Devolvida por {emprestimo.devolvidoPorNome ?? '—'} para{' '}
            {emprestimo.devolvidoPara ?? '—'}
            {emprestimo.devolvidoEm ? ` · ${formatDateTime(emprestimo.devolvidoEm)}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
