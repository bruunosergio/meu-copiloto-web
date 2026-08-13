import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input } from '../../components';
import { extractErrorMessage } from '../../lib/api-client';
import { distribuidorasService } from '../../services';

export function DistribuidorasPage() {
  const queryClient = useQueryClient();
  const { data: distribuidoras, isLoading, error } = useQuery({
    queryKey: ['distribuidoras'],
    queryFn: distribuidorasService.list,
  });

  const [nome, setNome] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: distribuidorasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribuidoras'] });
      setNome('');
      setFormError(null);
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: distribuidorasService.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['distribuidoras'] }),
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const reactivateMutation = useMutation({
    mutationFn: distribuidorasService.reactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['distribuidoras'] }),
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      setFormError('Informe o nome da distribuidora.');
      return;
    }
    createMutation.mutate({ nome: nome.trim() });
  }

  const ordenadas = [...(distribuidoras ?? [])].sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Distribuidoras</h1>
        <p className="text-sm text-slate-500">
          Fornecedores disponíveis para o comprador escolher ao marcar uma falta como comprada.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
        <Input
          label="Nova distribuidora"
          placeholder="Ex.: LIGPECAS"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-64"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar'}
        </Button>
      </form>

      {formError && <p className="mb-3 text-sm text-red-600">{formError}</p>}
      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={3}>
                  Carregando...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td className="px-4 py-4 text-red-600" colSpan={3}>
                  {extractErrorMessage(error)}
                </td>
              </tr>
            )}
            {ordenadas.map((distribuidora) => (
              <tr key={distribuidora.id}>
                <td className="px-4 py-2">{distribuidora.nome}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      distribuidora.ativa
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {distribuidora.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {distribuidora.ativa ? (
                    <Button
                      variant="ghost"
                      onClick={() => deactivateMutation.mutate(distribuidora.id)}
                      disabled={deactivateMutation.isPending}
                    >
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => reactivateMutation.mutate(distribuidora.id)}
                      disabled={reactivateMutation.isPending}
                    >
                      Reativar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {ordenadas.length === 0 && !isLoading && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={3}>
                  Nenhuma distribuidora cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
