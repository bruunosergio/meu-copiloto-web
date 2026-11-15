import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CobrancaAtencao,
  CobrancaStatus,
  UpdateCobrancaClientePayload,
} from '../../domain';
import { extractErrorMessage } from '../../lib/api-client';
import { cobrancasService } from '../../services';
import { brl, cameWithoutPhone, isFilledPhone } from './cobranca-phone';
import { CobrancaClientModal } from './CobrancaClientModal';
import { CobrancaPhoneBoard } from './CobrancaPhoneBoard';
import { CobrancaQueue } from './CobrancaQueue';
import { CobrancaExceptions, CobrancaOverview, PrintablePhoneList } from './CobrancaSideViews';

type Tab = 'fones' | 'fila' | 'excecoes' | 'resumo';

export function CobrancasPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('fones');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: painel, isLoading } = useQuery({
    queryKey: ['cobrancas'],
    queryFn: cobrancasService.getPainel,
  });

  const patchCliente = useMutation({
    mutationFn: ({ codigo, payload }: { codigo: string; payload: UpdateCobrancaClientePayload }) =>
      cobrancasService.atualizarCliente(codigo, payload),
    onSuccess: (next) => {
      queryClient.setQueryData(['cobrancas'], next);
      setError(null);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const setPhone = useCallback(
    (code: string, phone: string) => {
      patchCliente.mutate({ codigo: code, payload: { telefone: phone } });
    },
    [patchCliente],
  );
  const setStatus = useCallback(
    (code: string, status: CobrancaStatus) => {
      patchCliente.mutate({ codigo: code, payload: { status } });
    },
    [patchCliente],
  );
  const setPromise = useCallback(
    (code: string, date: string) => {
      patchCliente.mutate({ codigo: code, payload: { promessa: date } });
    },
    [patchCliente],
  );
  const setNote = useCallback(
    (code: string, note: string) => {
      patchCliente.mutate({ codigo: code, payload: { anotacao: note } });
    },
    [patchCliente],
  );

  const addRegra = useMutation({
    mutationFn: ({ tipo, codigoCliente, nomeContem }: { tipo: CobrancaAtencao; codigoCliente: string; nomeContem: string }) =>
      cobrancasService.criarRegra({
        tipo,
        codigoCliente: codigoCliente || null,
        nomeContem: nomeContem || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cobrancas'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteRegra = useMutation({
    mutationFn: cobrancasService.excluirRegra,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cobrancas'] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const saveDdd = useMutation({
    mutationFn: cobrancasService.atualizarConfig,
    onSuccess: (next) => queryClient.setQueryData(['cobrancas'], next),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const clients = painel?.clientes ?? [];
  const stats = painel?.stats;
  const missing = clients.filter(cameWithoutPhone);
  const filled = missing.filter((client) => isFilledPhone(client.telefone)).length;
  const readyToCharge = clients.filter(
    (client) => !client.attention && client.carteiraVencida > 0 && isFilledPhone(client.telefone),
  ).length;
  const selected = clients.find((client) => client.code === openCode) ?? null;
  const lojaSlug = (painel?.lojaNome ?? 'loja')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  async function handlePdf(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const { extractReport } = await import('./extract-pdf');
      const parsed = await extractReport(await file.arrayBuffer());
      const next = await cobrancasService.importar({
        referencia: parsed.referencia,
        clientes: parsed.clients,
      });
      queryClient.setQueryData(['cobrancas'], next);
      if (next.reabertos.length) {
        const preview = next.reabertos.slice(0, 4).join(', ');
        const extra = next.reabertos.length > 4 ? ` e mais ${next.reabertos.length - 4}` : '';
        setNotice(`Voltei para a fila quem estava pago e ainda aparece em aberto: ${preview}${extra}.`);
      } else {
        setNotice(`Relatório de ${next.relatorio?.referenciaLabel} importado. ${next.stats.clientes} clientes.`);
      }
    } catch (err) {
      setError(extractErrorMessage(err) || (err instanceof Error ? err.message : 'Não consegui ler esse PDF.'));
    } finally {
      setImporting(false);
    }
  }

  const empty = !isLoading && !painel?.relatorio;

  return (
    <div className="grid gap-6">
      <header className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Cobrança da carteira</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{painel?.lojaNome ?? 'Cobranças'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {painel?.relatorio
              ? `${painel.relatorio.fonte} · ${painel.relatorio.referenciaLabel} · ${stats?.clientes ?? 0} clientes · ${brl(stats?.total ?? 0)} em aberto`
              : 'Importe o PDF Recebíveis em Aberto por Cliente do Shop Control.'}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center">
          <span className="inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
            {importing ? 'Lendo PDF…' : painel?.relatorio ? 'Atualizar PDF' : 'Importar PDF'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={importing}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void handlePdf(file);
            }}
          />
        </label>
      </header>

      {notice ? <p className="no-print rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p> : null}
      {error ? <p className="no-print rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {isLoading ? <p className="text-sm text-slate-500">Carregando cobranças…</p> : null}

      {empty ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Ainda não há relatório nesta loja. No Shop Control, gere Recebíveis em Aberto por Cliente e
          salve como PDF.
        </p>
      ) : null}

      {painel?.relatorio && stats ? (
        <>
          <section className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Carteira vencida"
              value={brl(stats.carteiraVencida)}
              detail="Fiado que já passou do vencimento"
              onClick={() => setTab('resumo')}
            />
            <Stat
              label="Sem telefone"
              value={`${Math.max(stats.semTelefone - filled, 0)} clientes`}
              detail={`${filled} de ${stats.semTelefone} já preenchidos`}
              onClick={() => setTab('fones')}
            />
            <Stat
              label="Prontos para cobrar"
              value={`${readyToCharge} clientes`}
              detail="Com telefone e carteira vencida"
              onClick={() => setTab('fila')}
            />
            <Stat
              label="Cartão"
              value={brl(stats.cartao)}
              detail="Não cobrar o cliente por estas notas"
              onClick={() => setTab('excecoes')}
            />
          </section>

          <div className="no-print overflow-x-auto">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  ['fones', `Sem telefone (${Math.max(stats.semTelefone - filled, 0)})`],
                  ['fila', `Fila (${readyToCharge})`],
                  ['excecoes', 'Cartão'],
                  ['resumo', 'Resumo'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="no-print">
            {tab === 'fones' ? (
              <CobrancaPhoneBoard clients={clients} lojaSlug={lojaSlug} onPhone={setPhone} onOpen={setOpenCode} />
            ) : null}
            {tab === 'fila' ? (
              <CobrancaQueue
                clients={clients}
                lojaNome={painel.lojaNome}
                dddPadrao={painel.dddPadrao}
                onOpen={setOpenCode}
                onStatus={setStatus}
              />
            ) : null}
            {tab === 'excecoes' ? (
              <CobrancaExceptions
                clients={clients}
                stats={stats}
                regras={painel.regras}
                dddPadrao={painel.dddPadrao}
                onOpen={setOpenCode}
                onAddRegra={(tipo, codigoCliente, nomeContem) =>
                  addRegra.mutate({ tipo, codigoCliente, nomeContem })
                }
                onDeleteRegra={(id) => deleteRegra.mutate(id)}
                onDdd={(ddd) => saveDdd.mutate(ddd)}
              />
            ) : null}
            {tab === 'resumo' ? <CobrancaOverview clients={clients} stats={stats} onOpen={setOpenCode} /> : null}
          </div>

          <PrintablePhoneList
            clients={clients}
            lojaNome={painel.lojaNome}
            referenciaLabel={painel.relatorio.referenciaLabel}
          />
          <CobrancaClientModal
            client={selected}
            lojaNome={painel.lojaNome}
            dddPadrao={painel.dddPadrao}
            onClose={() => setOpenCode(null)}
            onPhone={setPhone}
            onStatus={setStatus}
            onPromise={setPromise}
            onNote={setNote}
          />
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:border-brand-300"
      onClick={onClick}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
    </button>
  );
}
