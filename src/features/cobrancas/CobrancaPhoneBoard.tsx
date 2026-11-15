import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input } from '../../components';
import { COBRANCA_ATENCAO_LABEL, CobrancaClientView } from '../../domain';
import {
  brl,
  cameWithoutPhone,
  downloadText,
  isFilledPhone,
  missingPhoneCsv,
  missingPhoneText,
} from './cobranca-phone';

type Filter = 'todos' | 'faltando' | 'preenchidos';

export function CobrancaPhoneBoard({
  clients,
  lojaSlug,
  onPhone,
  onOpen,
}: {
  clients: CobrancaClientView[];
  lojaSlug: string;
  onPhone: (code: string, phone: string) => void;
  onOpen: (code: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [copied, setCopied] = useState(false);
  const missing = useMemo(() => clients.filter(cameWithoutPhone), [clients]);
  const filled = missing.filter((client) => isFilledPhone(client.telefone)).length;
  const needle = query.trim().toLowerCase();

  const visible = missing.filter((client) => {
    const done = isFilledPhone(client.telefone);
    if (filter === 'faltando' && done) return false;
    if (filter === 'preenchidos' && !done) return false;
    if (!needle) return true;
    return [client.name, client.code, client.city, client.primarySellerName].join(' ').toLowerCase().includes(needle);
  });

  const withPhone = clients.filter((client) => !cameWithoutPhone(client));

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Telefones que faltam no cadastro</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {missing.length} clientes saíram do relatório sem telefone. Digite o número na linha. Enter
            pula para o próximo. O fone fica na loja e a planilha serve para lançar no Shop Control.
          </p>
        </div>
        <p className="text-sm font-medium tabular-nums text-slate-700">
          {filled} de {missing.length} preenchidos
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width]"
          style={{ width: `${missing.length ? (filled / missing.length) * 100 : 0}%` }}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, código ou cidade"
          aria-label="Buscar cliente sem telefone"
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['todos', 'Lista completa'],
              ['faltando', 'Ainda sem fone'],
              ['preenchidos', 'Já preenchidos'],
            ] as const
          ).map(([id, label]) => (
            <Button key={id} variant={filter === id ? 'primary' : 'secondary'} onClick={() => setFilter(id)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            downloadText(
              `telefones-faltando-${lojaSlug}.csv`,
              missingPhoneCsv(clients),
              'text/csv;charset=utf-8',
            )
          }
        >
          Baixar planilha
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(missingPhoneText(clients));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? 'Nomes copiados' : 'Copiar nomes'}
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimir lista
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          {filled === missing.length
            ? 'Todos os telefones desta lista foram preenchidos. Baixe a planilha e lance no Shop Control.'
            : 'Nenhum cliente encontrado com essa busca.'}
        </p>
      ) : (
        <ol className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {visible.map((client, index) => (
            <PhoneRow
              key={client.code}
              client={client}
              index={index + 1}
              nextCode={visible[index + 1]?.code}
              onPhone={onPhone}
              onOpen={onOpen}
            />
          ))}
        </ol>
      )}

      <details className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">
          {withPhone.length} clientes já vieram com telefone no relatório
        </summary>
        <ul className="mt-3 divide-y divide-slate-100">
          {withPhone.map((client) => (
            <li key={client.code} className="grid gap-2 py-3 sm:grid-cols-[1fr_16rem] sm:items-center">
              <button className="text-left" onClick={() => onOpen(client.code)}>
                <span className="font-medium text-slate-900">{client.name}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Cód. {client.code} · carteira vencida {brl(client.carteiraVencida)}
                </span>
              </button>
              <Input
                aria-label={`Telefone de ${client.name}`}
                defaultValue={client.telefone}
                key={client.telefone}
                onBlur={(event) => onPhone(client.code, event.target.value)}
              />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function PhoneRow({
  client,
  index,
  nextCode,
  onPhone,
  onOpen,
}: {
  client: CobrancaClientView;
  index: number;
  nextCode?: string;
  onPhone: (code: string, phone: string) => void;
  onOpen: (code: string) => void;
}) {
  const [value, setValue] = useState(client.telefone);
  const dirty = useRef(false);
  const valueRef = useRef(client.telefone);
  const ok = isFilledPhone(value);

  useEffect(() => {
    if (dirty.current) return;
    setValue(client.telefone);
    valueRef.current = client.telefone;
  }, [client.telefone]);

  useEffect(() => {
    if (!dirty.current) return;
    const timeout = window.setTimeout(() => onPhone(client.code, value), 350);
    return () => window.clearTimeout(timeout);
  }, [value, client.code, onPhone]);

  useEffect(() => {
    return () => {
      if (dirty.current) onPhone(client.code, valueRef.current);
    };
  }, [client.code, onPhone]);

  return (
    <li className="grid gap-3 px-3 py-3 sm:grid-cols-[1fr_minmax(14rem,18rem)] sm:items-center sm:px-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-8 text-xs tabular-nums text-slate-400">{index}</span>
          <button className="text-left font-medium text-slate-900 hover:underline" onClick={() => onOpen(client.code)}>
            {client.name}
          </button>
          {client.attention ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {COBRANCA_ATENCAO_LABEL[client.attention]}
            </span>
          ) : client.carteiraVencida === 0 && client.cartao > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Só cartão</span>
          ) : client.carteiraVencida === 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Em dia</span>
          ) : null}
          {ok ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Fone salvo</span>
          ) : null}
        </div>
        <p className="mt-1 pl-8 text-xs text-slate-500 sm:pl-10">
          Cód. {client.code} · {brl(client.carteiraVencida)} vencido · {client.notasVencidas}{' '}
          {client.notasVencidas === 1 ? 'nota' : 'notas'}
          {client.oldestVenc ? ` · desde ${client.oldestVenc}` : ''} · {client.city}
          {client.primarySellerName ? ` · ${client.primarySellerName}` : ''}
        </p>
      </div>
      <Input
        id={`fone-${client.code}`}
        value={value}
        inputMode="tel"
        autoComplete="off"
        placeholder="82999998888"
        aria-label={`Telefone de ${client.name}`}
        aria-invalid={value.length > 0 && !ok}
        onChange={(event) => {
          dirty.current = true;
          valueRef.current = event.target.value;
          setValue(event.target.value);
        }}
        onBlur={() => {
          if (dirty.current) onPhone(client.code, value);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          dirty.current = true;
          onPhone(client.code, value);
          if (!nextCode) return;
          document.getElementById(`fone-${nextCode}`)?.focus();
        }}
      />
    </li>
  );
}
