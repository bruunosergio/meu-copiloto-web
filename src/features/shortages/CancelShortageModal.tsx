import { FormEvent, useState } from 'react';
import { Button, Modal } from '../../components';
import { extractErrorMessage } from '../../lib/api-client';

interface CancelShortageModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

export function CancelShortageModal({ open, onClose, onConfirm }: CancelShortageModalProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setMotivo('');
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onConfirm(motivo);
      handleClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Cancelar falta" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-slate-700">
          Motivo do cancelamento
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
            placeholder="Ex.: registrada por engano, duplicada, decidiu-se não repor"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Voltar
          </Button>
          <Button type="submit" variant="danger" disabled={loading}>
            {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
