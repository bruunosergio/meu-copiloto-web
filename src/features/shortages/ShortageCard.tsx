import { Button, StatusBadge } from '../../components';
import { Role, Shortage, ShortageStatus } from '../../domain';
import { formatDateTime, formatRelativeAge } from '../../lib/format';

interface ShortageCardProps {
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

export function ShortageCard({
  shortage,
  currentUserId,
  currentUserRole,
  onAdvance,
  onCancel,
  isMutating,
}: ShortageCardProps) {
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{shortage.nomePeca}</p>
          {shortage.codigoPeca && (
            <p className="text-xs text-slate-500">Código: {shortage.codigoPeca}</p>
          )}
        </div>
        <StatusBadge status={shortage.status} />
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Ficou <span className="font-semibold">{shortage.qtdRestante}</span> unidade(s) no estoque
      </p>

      {shortage.observacao && (
        <p className="mt-1 text-sm italic text-slate-500">&ldquo;{shortage.observacao}&rdquo;</p>
      )}

      <p className="mt-2 text-xs text-slate-400" title={formatDateTime(shortage.criadaEm)}>
        Registrada há {formatRelativeAge(shortage.criadaEm)}
      </p>

      {(proximo || (podeCancelar && podeCancelarEsteStatus)) && (
        <div className="mt-3 flex flex-wrap gap-2">
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
      )}
    </div>
  );
}
