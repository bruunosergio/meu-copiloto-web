export type RawDoc = {
  desc: string;
  seller: string;
  tipo: string;
  emissao: string;
  venc: string;
  valor: number;
  saida: string;
  parcela: string;
};

export type RawClient = {
  code: string;
  name: string;
  phones: string[];
  address: string[];
  bairro: string;
  city: string;
  uf: string;
  cep: string;
  numero: string;
  docs: RawDoc[];
  total: number;
};

export type TextToken = {
  x: number;
  y: number;
  t: string;
};

export type ParsedReport = {
  referencia: string;
  clients: RawClient[];
};

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const MONEY_RE = /^[\d.]+,\d{2}$/;
const CODE_RE = /^(\d+)\s+-\s+(.+)$/;
const SELLER_RE = /^\d+\s+-\s+\S+/;
const PARCELA_RE = /Saída\s+(\d+)\s+-\s+(\d+)\/(\d+)/;
const CEP_RE = /^\d{5}-?\d{3}$/;
const UF_RE = /^[A-Z]{2}$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;

const SKIP_EXACT = new Set([
  'Descrição',
  'Tipo',
  'Emissão',
  'Atualizado*',
  'Nota',
  'Fatura',
  'Seq.',
  'Venc.',
  'Valor',
  'Fones:',
  'Vendedor',
  'Cliente:',
  'CPF / CNPJ:',
  'RG:',
  'Endereço:',
  'Bairro:',
  'Cidade:',
  'UF:',
  'CEP:',
  'N°:',
  'Empresa:',
  'Filial:',
  'Classe Cliente:',
  'Data Inicial:',
  'Data Final:',
  'Conta Bancária:',
  'Recebíveis em Aberto Por Cliente - Resumido',
]);

function money(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function collapseRepeat(value: string) {
  const text = value.split(/\s+/).filter(Boolean).join(' ');
  if (!text) return '';
  const parts = text.split(' ');
  for (let size = 1; size < parts.length; size += 1) {
    if (parts.length % size !== 0) continue;
    const chunk = parts.slice(0, size);
    const repeated = Array.from({ length: parts.length / size }, () => chunk)
      .flat()
      .join(' ');
    if (repeated === text) return chunk.join(' ');
  }
  return text;
}

function dedupe(values: string[]) {
  const out: string[] = [];
  for (const value of values) {
    const clean = collapseRepeat(value);
    if (clean && !out.includes(clean)) out.push(clean);
  }
  return out;
}

type Token = TextToken;

function isFooter(row: Token[]) {
  const texts = row.map((item) => item.t);
  const blob = texts.join(' ');
  if (blob.startsWith('Atualizado*:') || blob.startsWith('Tipo:') || blob.startsWith('Recebíveis')) return true;
  if (texts.some((text) => ['Empresa:', 'Filial:', 'Classe Cliente:', 'Conta Bancária:', 'Data Inicial:'].includes(text))) {
    return true;
  }
  if (texts.some((text) => TIME_RE.test(text))) return true;
  if (row.length === 1 && /^\d{1,2}$/.test(row[0].t)) return true;
  return false;
}

function findReferencia(pages: Token[][]) {
  for (const page of pages) {
    const rows = clusterRows(page);
    for (const row of rows) {
      if (!row.some((item) => TIME_RE.test(item.t))) continue;
      const date = row.find((item) => DATE_RE.test(item.t));
      if (date) return date.t;
    }
  }
  return '';
}

function clusterRows(page: Token[]) {
  const sorted = [...page].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Token[][] = [];
  for (const token of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(token.y - current[0].y) < 2) current.push(token);
    else rows.push([token]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

export function parseReceivables(pages: Token[][]): ParsedReport {
  const referencia = findReferencia(pages);
  const clients: RawClient[] = [];
  const state: { client: (RawClient & { open: boolean }) | null } = { client: null };
  let pending: string[] = [];

  const flushPending = () => {
    const client = state.client;
    if (client && client.docs.length && pending.length) {
      const extra = pending.join(' ').trim();
      const lastDoc = client.docs[client.docs.length - 1];
      if (extra && lastDoc) lastDoc.desc = `${lastDoc.desc} ${extra}`.trim();
    }
    pending = [];
  };

  const startClient = (code: string, name: string) => {
    if (state.client && state.client.code === code && state.client.name === name && state.client.open) {
      pending = [];
      return;
    }
    if (state.client) {
      clients.push(finish(state.client));
    }
    state.client = {
      code,
      name,
      phones: [],
      address: [],
      bairro: '',
      city: '',
      uf: '',
      cep: '',
      numero: '',
      docs: [],
      total: 0,
      open: true,
    };
    pending = [];
  };

  for (const page of pages) {
    for (const row of clusterRows(page)) {
      if (isFooter(row)) continue;
      const labels = new Set(row.map((item) => item.t));

      if (labels.has('Cliente:')) {
        const nameItem = row.find((item) => item.x > 60 && CODE_RE.test(item.t));
        const match = nameItem?.t.match(CODE_RE);
        if (match) {
          flushPending();
          startClient(match[1], match[2].trim());
        }
        continue;
      }

      if (!state.client) continue;
      const active = state.client;

      if (labels.has('Total:')) {
        flushPending();
        let total = 0;
        for (const item of row) {
          if (MONEY_RE.test(item.t) && item.x > 500) total = money(item.t);
        }
        active.total = total;
        active.open = false;
        continue;
      }

      if (labels.has('Fones:') || labels.has('Endereço:') || labels.has('N°:')) {
        for (const item of row) {
          if (SKIP_EXACT.has(item.t)) continue;
          if (item.x >= 70 && item.x < 230) {
            if (item.t.replace(/\D/g, '').length >= 8) active.phones.push(item.t);
          } else if (item.x >= 250 && item.x < 460) active.address.push(item.t);
          else if (item.x >= 460) active.numero = item.t;
        }
        continue;
      }

      if (labels.has('Bairro:') || labels.has('Cidade:') || labels.has('UF:')) {
        for (const item of row) {
          if (SKIP_EXACT.has(item.t)) continue;
          if (item.x < 220) {
            const digits = item.t.replace(/\D/g, '');
            if (digits.length >= 8 && item.t.length < 22) active.phones.push(item.t);
            else active.bairro = `${active.bairro} ${item.t}`.trim();
          } else if (item.x >= 250 && item.x < 400) active.city = `${active.city} ${item.t}`.trim();
          else if (item.x >= 400 && item.x < 455 && UF_RE.test(item.t)) active.uf = item.t;
          else if (CEP_RE.test(item.t)) active.cep = item.t;
        }
        continue;
      }

      if (labels.has('Venc.') && labels.has('Valor')) continue;
      if (
        (labels.size <= 2 && [...labels].every((label) => label === 'Vendedor' || label === 'Descrição')) ||
        (labels.size === 1 && labels.has('Vendedor'))
      ) {
        continue;
      }

      let seller = '';
      let tipo = '';
      let emissao = '';
      let venc = '';
      let seq = '';
      let valor: number | null = null;
      let atualizado: number | null = null;
      const descParts: string[] = [];

      for (const item of row) {
        if (SKIP_EXACT.has(item.t)) continue;
        if (item.x < 145 && SELLER_RE.test(item.t)) seller = item.t;
        else if (item.x >= 235 && item.x < 262 && /^[A-Z]$/.test(item.t)) tipo = item.t;
        else if (item.x >= 350 && item.x < 400 && DATE_RE.test(item.t)) emissao = item.t;
        else if (item.x >= 400 && item.x < 460 && DATE_RE.test(item.t)) venc = item.t;
        else if (item.x >= 510 && MONEY_RE.test(item.t)) atualizado = money(item.t);
        else if (item.x >= 450 && item.x < 510 && MONEY_RE.test(item.t)) valor = money(item.t);
        else if (item.x >= 325 && item.x < 370 && /^\d+$/.test(item.t)) seq = item.t;
        else if (item.x >= 140 && item.x < 240) descParts.push(item.t);
      }

      let desc = descParts.join(' ').trim();
      const amount = atualizado ?? valor;
      const isDoc = amount !== null && (venc || emissao) && (tipo || seller || desc);
      if (isDoc) {
        if (pending.length) {
          desc = `${pending.join(' ')} ${desc}`.trim();
          pending = [];
        }
        const parcela = desc.match(PARCELA_RE);
        const saida = parcela?.[1] || (seq && seq !== '0' ? seq : '');
        active.docs.push({
          desc: desc.replace(/\s+/g, ' ').trim(),
          seller,
          tipo,
          emissao,
          venc,
          valor: amount,
          saida,
          parcela: parcela ? `${parcela[2]}/${parcela[3]}` : '',
        });
      } else if (desc) pending.push(desc);
    }
  }

  const last = state.client;
  if (last) {
    flushPending();
    clients.push(finish(last));
  }

  if (!referencia || clients.length === 0) {
    throw new Error('Este PDF não é o relatório de recebíveis em aberto do Shop Control.');
  }

  return { referencia, clients };
}

function finish(client: RawClient & { open?: boolean }): RawClient {
  const summed = round2(client.docs.reduce((total, doc) => total + doc.valor, 0));
  return {
    code: client.code,
    name: client.name,
    phones: dedupe(client.phones),
    address: dedupe(client.address),
    bairro: collapseRepeat(client.bairro).toUpperCase(),
    city: collapseRepeat(client.city).toUpperCase(),
    uf: (client.uf || 'AL').toUpperCase(),
    cep: client.cep,
    numero: collapseRepeat(client.numero),
    docs: client.docs,
    total: client.total || summed,
  };
}
