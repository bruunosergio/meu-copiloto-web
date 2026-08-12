import { ShortageStatus, STATUS_LABEL } from '../domain';

const STATUS_CLASSES: Record<ShortageStatus, string> = {
  [ShortageStatus.REGISTRADA]: 'bg-amber-100 text-amber-800',
  [ShortageStatus.EM_COTACAO]: 'bg-blue-100 text-blue-800',
  [ShortageStatus.COMPRADA]: 'bg-purple-100 text-purple-800',
  [ShortageStatus.RECEBIDA]: 'bg-green-100 text-green-800',
  [ShortageStatus.CANCELADA]: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }: { status: ShortageStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
