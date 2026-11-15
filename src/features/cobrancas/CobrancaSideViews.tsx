import { FormEvent, useState } from 'react';
import { Button, Input, Select } from '../../components';
import {
  COBRANCA_ATENCAO_LABEL,
  CobrancaAtencao,
  CobrancaClientView,
  CobrancaPainel,
  CobrancaRegra,
} from '../../domain';
import { brl, cameWithoutPhone, isFilledPhone } from './cobranca-phone';

export function CobrancaOverview({
  clients,
  stats,
  onOpen,
}: {
  clients: CobrancaClientView[];
  stats: CobrancaPainel['stats'];
  onOpen: (code: string) => void;
}) {
  const maxAging = Math.max(...stats.aging.map((item) => item.valor), 1);
  const top = clients.filter((client) => client.carteiraVencida > 0).slice(0, 10);

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Resumo da carteira</h2>
        <p className="mt-1 text-sm text-slate-500">
          Valores na data do relatório, {stats.clientes} clientes e {stats.notas} notas. O relatório não
          aplicou juros nem multa.
        </p>
      </div>
      <div className="grid gap-3">
        {stats.aging.map((item) => (
          <div key={item.label} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3 text-sm">
            <span>{item.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${(item.valor / maxAging) * 100}%` }} />
            </div>
            <span className="tabular-nums text-slate-500">
              {brl(item.valor)} · {item.notas}
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stats.sellers.map((seller) => (
          <div key={seller.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-500">{seller.name}</p>
            <p className="text-lg font-semibold tabular-nums">{brl(seller.vencido)}</p>
            <p className="text-xs text-slate-500">carteira vencida</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-800">Maiores carteiras vencidas</h3>
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {top.map((client) => (
            <li key={client.code}>
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => onOpen(client.code)}
              >
                <span>
                  <span className="block font-medium text-slate-900">{client.name}</span>
                  <span className="text-xs text-slate-500">
                    Cód. {client.code}
                    {client.attention ? ` · ${COBRANCA_ATENCAO_LABEL[client.attention]}` : ''}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{brl(client.carteiraVencida)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CobrancaExceptions({
  clients,
  stats,
  regras,
  dddPadrao,
  onOpen,
  onAddRegra,
  onDeleteRegra,
  onDdd,
}: {
  clients: CobrancaClientView[];
  stats: CobrancaPainel['stats'];
  regras: CobrancaRegra[];
  dddPadrao: string;
  onOpen: (code: string) => void;
  onAddRegra: (tipo: CobrancaAtencao, codigoCliente: string, nomeContem: string) => void;
  onDeleteRegra: (id: string) => void;
  onDdd: (ddd: string) => void;
}) {
  const [tipo, setTipo] = useState(CobrancaAtencao.INTERNO);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [ddd, setDdd] = useState(dddPadrao);

  const groups: { id: CobrancaAtencao; text: string }[] = [
    {
      id: CobrancaAtencao.INTERNO,
      text: 'Nome da própria empresa. Confirme se é acerto interno antes de cobrar como cliente.',
    },
    {
      id: CobrancaAtencao.PREFEITURA,
      text: 'Órgão público. A cobrança segue por empenho, fora da fila de WhatsApp.',
    },
    {
      id: CobrancaAtencao.BALCAO,
      text: 'Venda sem identificar a pessoa. A maior parte deste saldo é cartão, não fiado.',
    },
  ];
  const cardClients = clients
    .filter((client) => client.cartao > 0)
    .slice()
    .sort((a, b) => b.cartao - a.cartao);

  function handleRegra(event: FormEvent) {
    event.preventDefault();
    onAddRegra(tipo, codigo, nome);
    setCodigo('');
    setNome('');
  }

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Cartão e exceções</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Estas contas ficam fora da fila. O cartão soma {brl(stats.cartao)} e, neste relatório, é
          recebível de operadora.
        </p>
      </div>
      {groups.map((group) => {
        const rows = clients.filter((client) => client.attention === group.id);
        if (!rows.length) return null;
        return (
          <section key={group.id} className="grid gap-2">
            <h3 className="font-medium text-slate-900">{COBRANCA_ATENCAO_LABEL[group.id]}</h3>
            <p className="text-sm text-slate-500">{group.text}</p>
            <ClientList clients={rows} onOpen={onOpen} amount={(client) => client.carteiraVencida} />
          </section>
        );
      })}
      <section className="grid gap-2">
        <h3 className="font-medium text-slate-900">Notas de cartão</h3>
        <p className="text-sm text-slate-500">
          Não mandar cobrança por estas notas. Se o cliente também tem carteira, a carteira continua na fila.
        </p>
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {cardClients.map((client) => (
            <li key={client.code}>
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => onOpen(client.code)}
              >
                <span>
                  <span className="block font-medium text-slate-900">{client.name}</span>
                  <span className="text-xs text-slate-500">Cód. {client.code}</span>
                </span>
                <span className="font-semibold tabular-nums">{brl(client.cartao)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-900">Códigos fora da fila</h3>
        <p className="text-sm text-slate-500">
          Cada loja define o que não entra no WhatsApp: conta interna, prefeitura, balcão. Não fica
          hardcoded no sistema.
        </p>
        <ul className="grid gap-2 text-sm">
          {regras.map((regra) => (
            <li key={regra.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
              <span>
                <span className="font-medium">{COBRANCA_ATENCAO_LABEL[regra.tipo]}</span>
                {regra.codigoCliente ? ` · código ${regra.codigoCliente}` : ''}
                {regra.nomeContem ? ` · nome contém “${regra.nomeContem}”` : ''}
              </span>
              <Button variant="ghost" onClick={() => onDeleteRegra(regra.id)}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
        <form className="grid gap-2 sm:grid-cols-[10rem_8rem_1fr_auto]" onSubmit={handleRegra}>
          <Select value={tipo} onChange={(event) => setTipo(event.target.value as CobrancaAtencao)}>
            {Object.values(CobrancaAtencao).map((item) => (
              <option key={item} value={item}>
                {COBRANCA_ATENCAO_LABEL[item]}
              </option>
            ))}
          </Select>
          <Input placeholder="Código" value={codigo} onChange={(event) => setCodigo(event.target.value)} />
          <Input placeholder="Trecho do nome" value={nome} onChange={(event) => setNome(event.target.value)} />
          <Button type="submit">Incluir</Button>
        </form>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onDdd(ddd);
          }}
        >
          <Input
            label="DDD padrão (números sem DDD)"
            value={ddd}
            inputMode="numeric"
            onChange={(event) => setDdd(event.target.value)}
            className="w-28"
          />
          <Button type="submit" variant="secondary">
            Salvar DDD
          </Button>
        </form>
      </section>
    </section>
  );
}

export function PrintablePhoneList({
  clients,
  lojaNome,
  referenciaLabel,
}: {
  clients: CobrancaClientView[];
  lojaNome: string;
  referenciaLabel: string;
}) {
  const rows = clients.filter(cameWithoutPhone);
  return (
    <div className="print-only">
      <h1>
        {lojaNome} — telefones para lançar no Shop Control
      </h1>
      <p>
        Relatório de {referenciaLabel}. {rows.length} clientes sem telefone no cadastro. Preencha a coluna e
        atualize o cliente no sistema.
      </p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Código</th>
            <th>Nome</th>
            <th>Cidade</th>
            <th>Vencido</th>
            <th>Telefone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((client, index) => (
            <tr key={client.code}>
              <td>{index + 1}</td>
              <td>{client.code}</td>
              <td>{client.name}</td>
              <td>{client.city}</td>
              <td>{brl(client.carteiraVencida)}</td>
              <td>{isFilledPhone(client.telefone) ? client.telefone : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientList({
  clients,
  onOpen,
  amount,
}: {
  clients: CobrancaClientView[];
  onOpen: (code: string) => void;
  amount: (client: CobrancaClientView) => number;
}) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {clients.map((client) => (
        <li key={client.code}>
          <button
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
            onClick={() => onOpen(client.code)}
          >
            <span className="font-medium text-slate-900">{client.name}</span>
            <span className="font-semibold tabular-nums">{brl(amount(client))}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
