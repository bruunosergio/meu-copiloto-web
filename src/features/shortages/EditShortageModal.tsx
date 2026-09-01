import { FormEvent, useEffect, useState } from 'react';
import { Button, Input, Modal } from '../../components';
import { Shortage, STATUS_LABEL } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { shortagesService } from '../../services';

interface EditShortageModalProps {
  open: boolean;
  shortage: Shortage | null;
  emprestada: boolean;
  emprestadaDe: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditShortageModal({
  open,
  shortage,
  emprestada,
  emprestadaDe,
  onClose,
  onSaved,
}: EditShortageModalProps) {
  const [codigoPeca, setCodigoPeca] = useState('');
  const [nomePeca, setNomePeca] = useState('');
  const [qtdRestante, setQtdRestante] = useState('0');
  const [observacao, setObservacao] = useState('');
  const [marcaEmprestada, setMarcaEmprestada] = useState(false);
  const [deQuem, setDeQuem] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !shortage) return;
    setCodigoPeca(shortage.codigoPeca ?? '');
    setNomePeca(shortage.nomePeca);
    setQtdRestante(String(shortage.qtdRestante));
    setObservacao(shortage.observacao ?? '');
    setMarcaEmprestada(emprestada);
    setDeQuem(emprestadaDe);
    setError(null);
    setAviso(null);
  }, [open, shortage, emprestada, emprestadaDe]);

  async function persistir() {
    if (!shortage) return;
    await shortagesService.update(shortage.id, {
      codigoPeca: codigoPeca || undefined,
      nomePeca,
      qtdRestante: Number(qtdRestante),
      observacao: observacao || undefined,
      emprestada: marcaEmprestada,
      emprestadaDe: marcaEmprestada ? deQuem || undefined : undefined,
    });
    onSaved();
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!shortage) return;
    setError(null);
    setLoading(true);
    try {
      if (!aviso) {
        const similares = await shortagesService.similares({
          nome: nomePeca,
          codigo: codigoPeca || undefined,
          ignorarId: shortage.id,
        });
        if (similares.length > 0) {
          const primeiro = similares[0];
          setAviso(
            `Já tem na fila: ${primeiro.nomePeca} (${STATUS_LABEL[primeiro.status]}, ${primeiro.registradoPorNome ?? '—'}). Salvar mesmo assim?`,
          );
          return;
        }
      }
      await persistir();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Editar falta" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Código da peça"
          value={codigoPeca}
          onChange={(e) => {
            setAviso(null);
            setCodigoPeca(e.target.value.toUpperCase());
          }}
          className="uppercase"
        />
        <Input
          label="Nome da peça"
          value={nomePeca}
          onChange={(e) => {
            setAviso(null);
            setNomePeca(e.target.value.toUpperCase());
          }}
          required
          className="uppercase"
        />
        <Input
          label="Quantidade que ficou no estoque"
          type="number"
          min={0}
          value={qtdRestante}
          onChange={(e) => setQtdRestante(e.target.value)}
          required
        />
        <Input
          label="Observação"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-brand-500"
            checked={marcaEmprestada}
            onChange={(e) => setMarcaEmprestada(e.target.checked)}
          />
          Peça emprestada de loja parceira
        </label>
        {marcaEmprestada && (
          <Input
            label="Emprestada de"
            value={deQuem}
            onChange={(e) => setDeQuem(e.target.value)}
          />
        )}
        {aviso && <p className="text-sm text-amber-700">{aviso}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : aviso ? 'Salvar mesmo assim' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
