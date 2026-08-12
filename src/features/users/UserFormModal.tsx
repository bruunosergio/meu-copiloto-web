import { FormEvent, useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '../../components';
import { Role, ROLE_LABEL, User } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';

export interface UserFormValues {
  nome: string;
  email: string;
  senha: string;
  papel: Role;
  telefoneWhatsapp: string;
}

interface UserFormModalProps {
  open: boolean;
  editingUser: User | null;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}

const EMPTY_VALUES: UserFormValues = {
  nome: '',
  email: '',
  senha: '',
  papel: Role.VENDEDOR,
  telefoneWhatsapp: '',
};

export function UserFormModal({ open, editingUser, onClose, onSubmit }: UserFormModalProps) {
  const [values, setValues] = useState<UserFormValues>(EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(
      editingUser
        ? {
            nome: editingUser.nome,
            email: editingUser.email,
            senha: '',
            papel: editingUser.papel,
            telefoneWhatsapp: editingUser.telefoneWhatsapp ?? '',
          }
        : EMPTY_VALUES,
    );
    setError(null);
  }, [open, editingUser]);

  function handleClose() {
    setValues(EMPTY_VALUES);
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
      handleClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title={editingUser ? 'Editar usuário' : 'Novo usuário'} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nome"
          value={values.nome}
          onChange={(e) => setValues((v) => ({ ...v, nome: e.target.value }))}
          required
        />
        <Input
          label="E-mail"
          type="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          required
        />
        <Input
          label={editingUser ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
          type="password"
          value={values.senha}
          onChange={(e) => setValues((v) => ({ ...v, senha: e.target.value }))}
          required={!editingUser}
          minLength={8}
        />
        <Input
          label="Telefone WhatsApp (opcional)"
          placeholder="5511999990000"
          value={values.telefoneWhatsapp}
          onChange={(e) => setValues((v) => ({ ...v, telefoneWhatsapp: e.target.value }))}
        />
        <Select
          label="Papel"
          value={values.papel}
          onChange={(e) => setValues((v) => ({ ...v, papel: e.target.value as Role }))}
        >
          {Object.values(Role).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </Select>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
