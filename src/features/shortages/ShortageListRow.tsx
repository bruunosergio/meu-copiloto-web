import { Button, StatusBadge } from '../../components';
import { Role, Shortage, ShortageStatus, podeGerenciarFilaCompleta } from '../../domain';
import { formatDateTime } from '../../lib/format';

interface ShortageListRowProps {
  shortage: Shortage;
  currentUserId: string;
  currentUserRole: Role;
  distribuidoraNome?: string;
  emprestada?: boolean;
  podeEditarDistribuidora: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (shortage: Shortage) => void;
  onAdvance: (shortage: Shortage, novoStatus: ShortageStatus) => void;
  onCancel: (shortage: Shortage) => void;
  onEditDistribuidora: (shortage: Shortage) => void;
  isMutating: boolean;
}

const STATUS_COM_DISTRIBUIDORA: ShortageStatus[] = [
  ShortageStatus.CONCLUIDA,
  ShortageStatus.RECEBIDA,
];

const NEXT_STATUS: Partial<Record<ShortageStatus, { status: ShortageStatus; label: string }>> = {
  [ShortageStatus.REGISTRADA]: { status: ShortageStatus.CONCLUIDA, label: 'Marcar como concluída' },
  [ShortageStatus.CONCLUIDA]: { status: ShortageStatus.RECEBIDA, label: 'Marcar como recebida' },
};

export function ShortageListRow({
  shortage,
  currentUserId,
  currentUserRole,
  distribuidoraNome,
  emprestada = false,
  podeEditarDistribuidora,
  selectable = false,
  selected = false,
  onToggleSelect,
  onAdvance,
  onCancel,
  onEditDistribuidora,
  isMutating,
}: ShortageListRowProps) {
  const podeGerenciar = podeGerenciarFilaCompleta(currentUserRole);
  const proximo = NEXT_STATUS[shortage.status];
  const mostrarDistribuidora = STATUS_COM_DISTRIBUIDORA.includes(shortage.status);

  const podeCancelar =
    podeGerenciar ||
    (currentUserRole === Role.VENDEDOR &&
      shortage.registradoPorId === currentUserId &&
      shortage.status === ShortageStatus.REGISTRADA);

  const podeCancelarEsteStatus = shortage.status === ShortageStatus.REGISTRADA;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      {selectable && (
        <input
          type="checkbox"
          className="h-4 w-4 flex-shrink-0 accent-brand-500"
          checked={selected}
          onChange={() => onToggleSelect?.(shortage)}
          aria-label={`Selecionar ${shortage.nomePeca}`}
        />
      )}

      <div className="min-w-0 sm:w-56 sm:flex-none">
        <p className="truncate font-medium text-slate-900">{shortage.nomePeca}</p>
        {shortage.codigoPeca && (
          <p className="truncate text-xs text-slate-500">Código: {shortage.codigoPeca}</p>
        )}
        <p className="truncate text-xs text-slate-400" title={formatDateTime(shortage.criadaEm)}>
          {shortage.registradoPorNome ?? '—'} · {formatDateTime(shortage.criadaEm)}
        </p>
        {emprestada && (
          <span className="mt-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-800">
            Emprestada
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 sm:w-32 sm:flex-none">
        <span className="font-semibold">{shortage.qtdRestante}</span> un. no estoque
      </p>

      <p
        className="min-w-0 flex-1 truncate text-sm italic text-slate-500 sm:min-h-[1.25rem]"
        title={shortage.observacao ?? undefined}
      >
        {shortage.observacao ? `\u201c${shortage.observacao}\u201d` : ''}
      </p>

      {mostrarDistribuidora && (
        <div className="flex flex-shrink-0 items-center gap-1 text-xs sm:w-40">
          {distribuidoraNome ? (
            <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
              {distribuidoraNome}
            </span>
          ) : (
            <span className="italic text-slate-400">Sem distribuidora</span>
          )}
          {podeEditarDistribuidora && (
            <button
              type="button"
              onClick={() => onEditDistribuidora(shortage)}
              className="text-slate-400 underline decoration-dotted hover:text-brand-600"
            >
              {distribuidoraNome ? 'trocar' : 'definir'}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <StatusBadge status={shortage.status} />
        {podeGerenciar && proximo && (
          <Button onClick={() => onAdvance(shortage, proximo.status)} disabled={isMutating}>
            {proximo.label}
          </Button>
        )}
        {podeCancelar && podeCancelarEsteStatus && (
          <Button variant="danger" onClick={() => onCancel(shortage)} disabled={isMutating}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
