import { useMemo, useState } from 'react';
import { Button, Input, Select } from '../../components';
import {
  COBRANCA_STATUS_LABEL,
  CobrancaClientView,
  CobrancaStatus,
  isPaidCobrancaStatus,
} from '../../domain';
import { brl, chargeMessage, isFilledPhone, whatsAppUrl } from './cobranca-phone';

type ViewMode = 'prioridade' | 'vencimento' | 'valor_desc' | 'valor_asc' | 'vendedor';

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'prioridade', label: 'Prioridade' },
  { id: 'vencimento', label: 'Vencimento' },
  { id: 'valor_desc', label: 'Maior valor' },
  { id: 'valor_asc', label: 'Menor valor' },
  { id: 'vendedor', label: 'Vendedor' },
];

const MODE_HINT: Record<ViewMode, string> = {
  prioridade:
    'Quem precisa de atenção vem primeiro: sem resposta, promessa que já passou, e quem está a cobrar há muito tempo.',
  vencimento: 'Da dívida mais antiga para a mais recente.',
  valor_desc: 'Do maior saldo vencido para o menor.',
  valor_asc: 'Do menor saldo vencido para o maior.',
  vendedor: 'Agrupado pelo vendedor da maior parte da carteira vencida.',
};

const STATUSES = Object.values(CobrancaStatus);

type Ranked = {
  client: CobrancaClientView;
  attention: string | null;
};

export function CobrancaQueue({
  clients,
  lojaNome,
  dddPadrao,
  onOpen,
  onStatus,
}: {
  clients: CobrancaClientView[];
  lojaNome: string;
  dddPadrao: string;
  onOpen: (code: string) => void;
  onStatus: (code: string, status: CobrancaStatus) => void;
}) {
  const [mode, setMode] = useState<ViewMode>('prioridade');
  const [seller, setSeller] = useState('todos');
  const [query, setQuery] = useState('');
  const [hideDone, setHideDone] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const ready = useMemo(
    () =>
      clients.filter(
        (client) => !client.attention && client.carteiraVencida > 0 && isFilledPhone(client.telefone),
      ),
    [clients],
  );

  const median = useMemo(() => {
    const values = ready.map((client) => client.carteiraVencida).sort((a, b) => a - b);
    if (!values.length) return 0;
    return values[Math.floor(values.length / 2)];
  }, [ready]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of ready) map.set(client.primarySellerId, client.primarySellerName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [ready]);

  const queue = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ready
      .filter((client) => (seller === 'todos' || mode !== 'vendedor' ? true : client.primarySellerId === seller))
      .filter((client) => !hideDone || !isPaidCobrancaStatus(client.status))
      .filter((client) =>
        needle
          ? [client.name, client.code, client.city, client.primarySellerName].join(' ').toLowerCase().includes(needle)
          : true,
      )
      .map((client) => ({
        client,
        attention: attentionLabel(client, today, median),
      }))
      .sort(sorter(mode));
  }, [ready, seller, mode, hideDone, query, today, median]);

  const groups = groupQueue(queue, mode);

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Fila de cobrança</h2>
        <p className="mt-1 text-sm text-slate-500">{MODE_HINT[mode]}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((item) => (
          <Button key={item.id} variant={mode === item.id ? 'primary' : 'secondary'} onClick={() => setMode(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar na fila"
          aria-label="Buscar na fila de cobrança"
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {mode === 'vendedor' ? (
            <>
              <Button variant={seller === 'todos' ? 'primary' : 'secondary'} onClick={() => setSeller('todos')}>
                Todos
              </Button>
              {sellers.map((item) => (
                <Button
                  key={item.id}
                  variant={seller === item.id ? 'primary' : 'secondary'}
                  onClick={() => setSeller(item.id)}
                >
                  {item.name}
                </Button>
              ))}
            </>
          ) : null}
          <Button variant={hideDone ? 'primary' : 'secondary'} onClick={() => setHideDone((value) => !value)}>
            Esconder já cobrados
          </Button>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Ninguém com telefone nesta fila. Preencha os fones na aba Sem telefone, começando pelos maiores valores.
        </p>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.id} className="grid gap-2">
              {group.title ? (
                <h3 className="text-sm font-medium text-slate-500">
                  {group.title}
                  {group.total != null ? ` · ${brl(group.total)}` : ''}
                </h3>
              ) : null}
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {group.clients.map((item) => (
                  <QueueRow
                    key={item.client.code}
                    client={item.client}
                    attention={item.attention}
                    showSeller={mode !== 'vendedor'}
                    lojaNome={lojaNome}
                    dddPadrao={dddPadrao}
                    onOpen={onOpen}
                    onStatus={onStatus}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function groupQueue(queue: Ranked[], mode: ViewMode) {
  if (mode === 'vendedor') {
    const map = new Map<string, Ranked[]>();
    for (const item of queue) {
      const key = item.client.primarySellerId;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()]
      .map(([id, clients]) => ({
        id,
        title: clients[0]?.client.primarySellerName ?? id,
        total: clients.reduce((sum, item) => sum + item.client.carteiraVencida, 0),
        clients,
      }))
      .sort((a, b) => b.total - a.total);
  }
  if (mode !== 'prioridade') {
    return [{ id: 'lista', title: '', total: null as number | null, clients: queue }];
  }
  const first = queue.filter((item) => item.attention);
  const rest = queue.filter((item) => !item.attention);
  const groups = [];
  if (first.length) {
    groups.push({ id: 'atencao', title: 'Cobrar primeiro', total: null as number | null, clients: first });
  }
  if (rest.length) {
    groups.push({
      id: 'resto',
      title: first.length ? 'Depois' : '',
      total: null as number | null,
      clients: rest,
    });
  }
  return groups;
}

function sorter(mode: ViewMode) {
  if (mode === 'valor_desc') return (a: Ranked, b: Ranked) => byValue(a, b, 'desc');
  if (mode === 'valor_asc') return (a: Ranked, b: Ranked) => byValue(a, b, 'asc');
  if (mode === 'vencimento' || mode === 'vendedor') return byAge;
  return byPriority;
}

function byPriority(a: Ranked, b: Ranked) {
  const attention = Number(Boolean(b.attention)) - Number(Boolean(a.attention));
  if (attention) return attention;
  if (a.attention && b.attention) return byAge(a, b);
  const rank = statusRank(a.client.status) - statusRank(b.client.status);
  if (rank) return rank;
  return byAge(a, b);
}

function byAge(a: Ranked, b: Ranked) {
  const days = (b.client.oldestDays ?? -1) - (a.client.oldestDays ?? -1);
  if (days) return days;
  const value = b.client.carteiraVencida - a.client.carteiraVencida;
  if (value) return value;
  return a.client.name.localeCompare(b.client.name, 'pt-BR');
}

function byValue(a: Ranked, b: Ranked, direction: 'asc' | 'desc') {
  const sign = direction === 'asc' ? 1 : -1;
  const value = (a.client.carteiraVencida - b.client.carteiraVencida) * sign;
  if (value) return value;
  return byAge(a, b);
}

function statusRank(status: CobrancaStatus) {
  if (status === CobrancaStatus.A_COBRAR || status === CobrancaStatus.SEM_RESPOSTA) return 0;
  if (status === CobrancaStatus.PROMETEU) return 1;
  if (status === CobrancaStatus.MENSAGEM) return 2;
  return 3;
}

function attentionLabel(client: CobrancaClientView, today: string, median: number) {
  if (isPaidCobrancaStatus(client.status) || client.status === CobrancaStatus.NAO_COBRAR) return null;
  const days = client.oldestDays ?? 0;
  if (client.status === CobrancaStatus.PROMETEU && client.promessa && client.promessa < today) {
    return 'Promessa vencida';
  }
  if (client.status === CobrancaStatus.SEM_RESPOSTA) return 'Sem resposta';
  if (client.status === CobrancaStatus.A_COBRAR && days >= 365) return 'Mais de um ano';
  if (client.status === CobrancaStatus.A_COBRAR && days >= 90 && client.carteiraVencida >= median && median > 0) {
    return 'Atraso e valor';
  }
  return null;
}

function lateLabel(days: number | null) {
  if (days == null || days <= 0) return '';
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

function QueueRow({
  client,
  attention,
  showSeller,
  lojaNome,
  dddPadrao,
  onOpen,
  onStatus,
}: {
  client: CobrancaClientView;
  attention: string | null;
  showSeller: boolean;
  lojaNome: string;
  dddPadrao: string;
  onOpen: (code: string) => void;
  onStatus: (code: string, status: CobrancaStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = chargeMessage(client, lojaNome);
  const link = whatsAppUrl(client.telefone, message, dddPadrao);
  const late = lateLabel(client.oldestDays);

  return (
    <li className={`grid gap-3 px-4 py-3 ${attention ? 'bg-amber-50' : ''}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button className="text-left" onClick={() => onOpen(client.code)}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{client.name}</span>
            {attention ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">{attention}</span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Cód. {client.code} · {client.notasVencidas} {client.notasVencidas === 1 ? 'nota' : 'notas'}
            {client.oldestVenc ? ` · venceu em ${client.oldestVenc}` : ''}
            {late ? ` · ${late}` : ''}
            {showSeller ? ` · ${client.primarySellerName}` : ''} · {client.telefone}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{brl(client.carteiraVencida)}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {COBRANCA_STATUS_LABEL[client.status]}
          </span>
          <Select
            aria-label={`Andamento de ${client.name}`}
            value={client.status}
            onChange={(event) => onStatus(client.code, event.target.value as CobrancaStatus)}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {COBRANCA_STATUS_LABEL[item]}
              </option>
            ))}
          </Select>
          {link ? (
            <a
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
              href={link}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (client.status === CobrancaStatus.A_COBRAR) onStatus(client.code, CobrancaStatus.MENSAGEM);
              }}
            >
              WhatsApp
            </a>
          ) : (
            <Button variant="secondary" disabled>
              Fixo
            </Button>
          )}
          <Button variant="secondary" onClick={() => setOpen((value) => !value)}>
            {open ? 'Fechar mensagem' : 'Mensagem'}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="grid gap-2 rounded-lg bg-slate-50 p-3">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{message}</p>
          <Button
            variant="secondary"
            className="w-fit"
            onClick={async () => {
              await navigator.clipboard.writeText(message);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? 'Copiada' : 'Copiar mensagem'}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
