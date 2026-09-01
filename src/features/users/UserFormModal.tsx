import { FormEvent, useEffect, useState } from 'react';
import { Button, Input, Modal, PinPad, Select } from '../../components';
import { Role, ROLE_LABEL, User } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';

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
  const [mostrarEmergencia, setMostrarEmergencia] = useState(false);

  const precisaPinNovo = !editingUser || !editingUser.usuario;

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
    setMostrarEmergencia(!!editingUser?.email);
    setError(null);
  }, [open, editingUser]);

  function handleClose() {
    setValues(EMPTY_VALUES);
    setError(null);
    setMostrarEmergencia(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(values.usuario)) {
      setError('Usuário deve ter 3-20 caracteres: letras, números, ".", "_" ou "-".');
      return;
    }
    if (precisaPinNovo && !/^\d{4,6}$/.test(values.pin)) {
      setError('Defina um PIN de 4 a 6 dígitos (teclado ou pad).');
      return;
    }
    if (values.pin && !/^\d{4,6}$/.test(values.pin)) {
      setError('PIN deve ter de 4 a 6 dígitos numéricos.');
      return;
    }

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
    <Modal
      open={open}
      title={editingUser ? 'Editar usuário' : 'Novo usuário'}
      onClose={handleClose}
      wide
    >
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

        <Input
          label="Usuário (nome curto na grade da loja)"
          placeholder="Ex.: joao"
          value={values.usuario}
          onChange={(e) => setValues((v) => ({ ...v, usuario: e.target.value }))}
          required
          minLength={3}
          maxLength={20}
        />

        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
          <PinPad
            label={
              editingUser
                ? precisaPinNovo
                  ? 'PIN obrigatório (ainda não tem — 4 a 6 dígitos)'
                  : 'Novo PIN (deixe em branco para manter)'
                : `PIN de ${ROLE_LABEL[values.papel]} (4 a 6 dígitos)`
            }
            value={values.pin}
            onChange={(pin) => setValues((v) => ({ ...v, pin }))}
            autoFocus={open && precisaPinNovo}
          />
          <p className="mt-2 text-xs text-slate-600">
            Admin, gerente, comprador e vendedor entram iguais: escolhem o nome na loja e digitam
            este PIN.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMostrarEmergencia((atual) => !atual)}
          className="text-left text-xs text-slate-500 underline decoration-dotted hover:text-slate-700"
        >
          {mostrarEmergencia
            ? 'Ocultar e-mail e senha de emergência'
            : 'E-mail e senha de emergência (opcional)'}
        </button>

        {mostrarEmergencia && (
          <>
            <Input
              label="E-mail (opcional — só acesso de emergência em /login)"
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            <Input
              label={
                editingUser
                  ? 'Nova senha de emergência (deixe em branco para manter)'
                  : 'Senha de emergência (opcional)'
              }
              type="password"
              value={values.senha}
              onChange={(e) => setValues((v) => ({ ...v, senha: e.target.value }))}
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
