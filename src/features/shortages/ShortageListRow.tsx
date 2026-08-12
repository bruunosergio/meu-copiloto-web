import { Button, StatusBadge } from '../../components';
import { Role, Shortage, ShortageStatus } from '../../domain';
import { formatDateTime, formatRelativeAge } from '../../lib/format';

interface ShortageListRowProps {
  shortage: Shortage;
  currentUserId: string;
  currentUserRole: Role;
  onAdvance: (shortage: Shortage, novoStatus: ShortageStatus) => void;
  onCancel: (shortage: Shortage) => void;
  isMutating: boolean;
}

const NEXT_STATUS: Partial<Record<ShortageStatus, { status: ShortageStatus; label: string }>> = {
  [ShortageStatus.REGISTRADA]: { status: ShortageStatus.EM_COTACAO, label: 'Iniciar cotação' },
  [ShortageStatus.EM_COTACAO]: { status: ShortageStatus.COMPRADA, label: 'Marcar como comprada' },
  [ShortageStatus.COMPRADA]: { status: ShortageStatus.RECEBIDA, label: 'Marcar como recebida' },
};

export function ShortageListRow({
  shortage,
  currentUserId,
  currentUserRole,
  onAdvance,
  onCancel,
  isMutating,
}: ShortageListRowProps) {
  const podeGerenciarFilaCompleta = currentUserRole === Role.ADMIN || currentUserRole === Role.COMPRADOR;
  const proximo = NEXT_STATUS[shortage.status];

  const podeCancelar =
    podeGerenciarFilaCompleta ||
    (currentUserRole === Role.VENDEDOR &&
      shortage.registradoPorId === currentUserId &&
      shortage.status === ShortageStatus.REGISTRADA);

  const podeCancelarEsteStatus =
    shortage.status === ShortageStatus.REGISTRADA || shortage.status === ShortageStatus.EM_COTACAO;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 sm:w-56 sm:flex-none">
        <p className="truncate font-medium text-slate-900">{shortage.nomePeca}</p>
        {shortage.codigoPeca && (
          <p className="truncate text-xs text-slate-500">Código: {shortage.codigoPeca}</p>
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

      <p
        className="text-xs text-slate-400 sm:w-28 sm:flex-none sm:text-right"
        title={formatDateTime(shortage.criadaEm)}
      >
        há {formatRelativeAge(shortage.criadaEm)}
      </p>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <StatusBadge status={shortage.status} />
        {podeGerenciarFilaCompleta && proximo && (
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
