import { FormEvent, useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '../../components';
import { Role, ROLE_LABEL, User } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';

/**
 * ADMIN/COMPRADOR usam email+senha; VENDEDOR usa usuario+PIN — nunca os dois
 * conjuntos ao mesmo tempo (ver ADR-0007 do backend).
 */
export interface UserFormValues {
  nome: string;
  papel: Role;
  email: string;
  senha: string;
  usuario: string;
  pin: string;
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
  papel: Role.VENDEDOR,
  email: '',
  senha: '',
  usuario: '',
  pin: '',
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
            papel: editingUser.papel,
            email: editingUser.email ?? '',
            senha: '',
            usuario: editingUser.usuario ?? '',
            pin: '',
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

  const isVendedor = values.papel === Role.VENDEDOR;

  return (
    <Modal open={open} title={editingUser ? 'Editar usuário' : 'Novo usuário'} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nome"
          value={values.nome}
          onChange={(e) => setValues((v) => ({ ...v, nome: e.target.value }))}
          required
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

        {isVendedor ? (
          <>
            <Input
              label="Usuário (nome curto exibido no terminal da loja)"
              placeholder="Ex.: joao"
              value={values.usuario}
              onChange={(e) => setValues((v) => ({ ...v, usuario: e.target.value }))}
              required
              minLength={3}
              maxLength={20}
            />
            <Input
              label={editingUser ? 'Novo PIN (deixe em branco para manter)' : 'PIN (4 a 6 dígitos)'}
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              value={values.pin}
              onChange={(e) => setValues((v) => ({ ...v, pin: e.target.value }))}
              required={!editingUser}
              minLength={4}
              maxLength={6}
            />
            <p className="text-xs text-slate-400">
              O vendedor abre o terminal da loja e escolhe o próprio nome + esse PIN — não usa
              e-mail nem senha.
            </p>
          </>
        ) : (
          <>
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
          </>
        )}

        <Input
          label="Telefone WhatsApp (opcional)"
          placeholder="5511999990000"
          value={values.telefoneWhatsapp}
          onChange={(e) => setValues((v) => ({ ...v, telefoneWhatsapp: e.target.value }))}
        />

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
