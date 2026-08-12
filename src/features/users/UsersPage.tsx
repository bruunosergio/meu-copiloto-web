import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components';
import { ROLE_LABEL, User } from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { UpdateUserPayload, usersService } from '../../services';
import { UserFormModal, UserFormValues } from './UserFormModal';

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.list,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersService.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  function openCreateModal() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setModalOpen(true);
  }

  async function handleSubmit(values: UserFormValues) {
    if (editingUser) {
      await updateMutation.mutateAsync({
        id: editingUser.id,
        payload: {
          nome: values.nome,
          email: values.email,
          papel: values.papel,
          telefoneWhatsapp: values.telefoneWhatsapp || null,
          ...(values.senha ? { senha: values.senha } : {}),
        },
      });
    } else {
      await createMutation.mutateAsync({
        nome: values.nome,
        email: values.email,
        senha: values.senha,
        papel: values.papel,
        telefoneWhatsapp: values.telefoneWhatsapp || undefined,
      });
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Usuários</h1>
        <Button onClick={openCreateModal}>Novo usuário</Button>
      </div>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Papel</th>
              <th className="px-4 py-2 font-medium">WhatsApp</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  Carregando...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td className="px-4 py-4 text-red-600" colSpan={6}>
                  {extractErrorMessage(error)}
                </td>
              </tr>
            )}
            {users?.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-2">{user.nome}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{ROLE_LABEL[user.papel]}</td>
                <td className="px-4 py-2">{user.telefoneWhatsapp ?? '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      user.ativo ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {user.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => openEditModal(user)}>
                      Editar
                    </Button>
                    {user.ativo && (
                      <Button
                        variant="ghost"
                        onClick={() => deactivateMutation.mutate(user.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        Desativar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={modalOpen}
        editingUser={editingUser}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
