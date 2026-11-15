import { CobrancaClientView } from '../../domain';

export function digits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isFilledPhone(value: string): boolean {
  const count = digits(value).length;
  return count >= 8 && count <= 13;
}

export function cameWithoutPhone(client: CobrancaClientView): boolean {
  return !client.phones.some((phone) => digits(phone).length >= 8);
}

export type WhatsAppTarget = {
  number: string;
  landline: boolean;
};

export function toWhatsApp(raw: string, dddPadrao: string): WhatsAppTarget | null {
  const parts = raw
    .split(/\/|,|;/)
    .map((part) => digits(part))
    .filter(Boolean);

  const parsed = parts
    .map((value) => normalize(value, dddPadrao))
    .filter((value): value is WhatsAppTarget => value !== null);

  return parsed.find((item) => !item.landline) ?? parsed[0] ?? null;
}

function normalize(value: string, dddPadrao: string): WhatsAppTarget | null {
  let national = value;
  if (national.startsWith('55') && (national.length === 12 || national.length === 13)) {
    national = national.slice(2);
  }
  national = national.replace(/^0+/, '');
  const ddd = digits(dddPadrao).slice(0, 2) || '82';
  if (national.length === 8 || national.length === 9) national = `${ddd}${national}`;
  if (national.length !== 10 && national.length !== 11) return null;
  const subscriber = national.slice(2);
  return {
    number: `55${national}`,
    landline: subscriber.length === 8,
  };
}

export function brl(value: number): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const [inteiro, frac] = abs.toFixed(2).split('.');
  const withDots = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}R$ ${withDots},${frac}`;
}

export function chargeMessage(client: CobrancaClientView, lojaNome: string): string {
  const notas = client.notasVencidas;
  const desde = client.oldestVenc ? `, a mais antiga com vencimento em ${client.oldestVenc}` : '';
  const notaLabel = notas === 1 ? 'nota' : 'notas';
  return [
    `Olá. Aqui é da ${lojaNome}.`,
    '',
    `O cadastro ${client.name} (cód. ${client.code}) está com ${brl(client.carteiraVencida)} em carteira vencida, em ${notas} ${notaLabel}${desde}.`,
    '',
    'Pode passar na loja ou me confirmar uma data para acertar?',
  ].join('\n');
}

export function whatsAppUrl(phone: string, message: string, dddPadrao: string): string | null {
  const target = toWhatsApp(phone, dddPadrao);
  if (!target || target.landline) return null;
  return `https://wa.me/${target.number}?text=${encodeURIComponent(message)}`;
}

function cell(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

export function missingPhoneCsv(clients: CobrancaClientView[]) {
  const header = ['Codigo', 'Nome', 'Cidade', 'Valor vencido carteira', 'Notas vencidas', 'Telefone'];
  const rows = clients.filter(cameWithoutPhone).map((client) => [
    client.code,
    client.name,
    client.city,
    brl(client.carteiraVencida),
    client.notasVencidas,
    isFilledPhone(client.telefone) ? client.telefone : '',
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(';')).join('\r\n')}`;
}

export function missingPhoneText(clients: CobrancaClientView[]) {
  return clients
    .filter(cameWithoutPhone)
    .map((client) => `${client.code} - ${client.name}`)
    .join('\n');
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
