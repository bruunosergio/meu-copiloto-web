import { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, Select } from '../../components';
import {
  COBRANCA_ATENCAO_LABEL,
  COBRANCA_STATUS_LABEL,
  CobrancaClientView,
  CobrancaStatus,
} from '../../domain';
import { brl, chargeMessage, isFilledPhone, toWhatsApp, whatsAppUrl } from './cobranca-phone';

const STATUSES = Object.values(CobrancaStatus);

export function CobrancaClientModal({
  client,
  lojaNome,
  dddPadrao,
  onClose,
  onPhone,
  onStatus,
  onPromise,
  onNote,
}: {
  client: CobrancaClientView | null;
  lojaNome: string;
  dddPadrao: string;
  onClose: () => void;
  onPhone: (code: string, phone: string) => void;
  onStatus: (code: string, status: CobrancaStatus) => void;
  onPromise: (code: string, date: string) => void;
  onNote: (code: string, note: string) => void;
}) {
  if (!client) return null;
  return (
    <ClientFicha
      client={client}
      lojaNome={lojaNome}
      dddPadrao={dddPadrao}
      onClose={onClose}
      onPhone={onPhone}
      onStatus={onStatus}
      onPromise={onPromise}
      onNote={onNote}
    />
  );
}

function ClientFicha({
  client,
  lojaNome,
  dddPadrao,
  onClose,
  onPhone,
  onStatus,
  onPromise,
  onNote,
}: {
  client: CobrancaClientView;
  lojaNome: string;
  dddPadrao: string;
  onClose: () => void;
  onPhone: (code: string, phone: string) => void;
  onStatus: (code: string, status: CobrancaStatus) => void;
  onPromise: (code: string, date: string) => void;
  onNote: (code: string, note: string) => void;
}) {
  const [phone, setPhone] = useState(client.telefone);
  const [note, setNote] = useState(client.anotacao ?? '');
  const dirtyPhone = useRef(false);
  const dirtyNote = useRef(false);

  useEffect(() => {
    dirtyPhone.current = false;
    dirtyNote.current = false;
    setPhone(client.telefone);
    setNote(client.anotacao ?? '');
  }, [client.code]);

  useEffect(() => {
    if (dirtyPhone.current) return;
    setPhone(client.telefone);
  }, [client.telefone]);

  useEffect(() => {
    if (dirtyNote.current) return;
    setNote(client.anotacao ?? '');
  }, [client.anotacao]);

  useEffect(() => {
    if (phone === client.telefone) return;
    const timeout = window.setTimeout(() => onPhone(client.code, phone), 350);
    return () => window.clearTimeout(timeout);
  }, [phone, client.code, client.telefone, onPhone]);

  useEffect(() => {
    if (note === (client.anotacao ?? '')) return;
    const timeout = window.setTimeout(() => onNote(client.code, note), 350);
    return () => window.clearTimeout(timeout);
  }, [note, client.code, client.anotacao, onNote]);

  const message = chargeMessage(client, lojaNome);
  const link = whatsAppUrl(phone, message, dddPadrao);
  const target = toWhatsApp(phone, dddPadrao);

  return (
    <Modal open title={client.name} onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-500">
        Código {client.code}
        {client.addressLine ? ` · ${client.addressLine}` : client.city ? ` · ${client.city}` : ''}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {client.attention ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {COBRANCA_ATENCAO_LABEL[client.attention]}
          </span>
        ) : null}
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
          Carteira vencida {brl(client.carteiraVencida)}
        </span>
        {client.cartao > 0 ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Cartão {brl(client.cartao)}
          </span>
        ) : null}
        {client.oldestVenc ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Desde {client.oldestVenc} · {client.oldestDays} dias
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Input
            label="Telefone"
            id="ficha-fone"
            value={phone}
            inputMode="tel"
            placeholder="82999998888"
            onChange={(event) => {
              dirtyPhone.current = true;
              setPhone(event.target.value);
            }}
          />
          {phone && !isFilledPhone(phone) ? (
            <p className="mt-1 text-xs text-red-600">Inclua o DDD. Exemplo: 82999998888.</p>
          ) : null}
          {target?.landline ? (
            <p className="mt-1 text-xs text-slate-500">Este número parece fixo. O WhatsApp não abre em telefone fixo.</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Select
            label="Andamento"
            id="ficha-status"
            value={client.status}
            onChange={(event) => onStatus(client.code, event.target.value as CobrancaStatus)}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {COBRANCA_STATUS_LABEL[item]}
              </option>
            ))}
          </Select>
          {client.status === CobrancaStatus.PROMETEU ? (
            <Input
              type="date"
              label="Data prometida"
              value={client.promessa ?? ''}
              onChange={(event) => onPromise(client.code, event.target.value)}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="ficha-nota" className="text-sm font-medium text-slate-700">
          Observação
        </label>
        <textarea
          id="ficha-nota"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={note}
          placeholder="Ex.: pediu para voltar sexta de manhã"
          rows={3}
          onChange={(event) => {
            dirtyNote.current = true;
            setNote(event.target.value);
          }}
        />
      </div>

      {client.carteiraVencida > 0 && !client.attention ? (
        <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Mensagem pronta</p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{message}</p>
          <div className="flex flex-wrap gap-2">
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
                Abrir WhatsApp
              </a>
            ) : (
              <Button disabled>Sem celular para WhatsApp</Button>
            )}
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(message)}>
              Copiar mensagem
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">Vencimento</th>
              <th className="py-2 pr-3 font-medium">Situação</th>
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 font-medium">Vendedor</th>
              <th className="py-2 pr-3 font-medium">Descrição</th>
              <th className="py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {client.docs.map((doc, index) => (
              <tr key={`${doc.saida}-${doc.venc}-${index}`} className="border-b border-slate-100">
                <td className="py-2 pr-3 whitespace-nowrap">{doc.venc}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {doc.tipo === 'C'
                    ? 'Cartão'
                    : doc.days > 0
                      ? `${doc.days} dias`
                      : doc.days === 0
                        ? 'Vence hoje'
                        : `Em ${Math.abs(doc.days)} dias`}
                </td>
                <td className="py-2 pr-3">{doc.tipoLabel}</td>
                <td className="py-2 pr-3">{doc.sellerName}</td>
                <td className="py-2 pr-3">{doc.desc || 'Saldo em aberto'}</td>
                <td className="py-2 text-right whitespace-nowrap tabular-nums">{brl(doc.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Marcar como pago só tira o cliente da fila deste painel. A baixa continua no Shop Control.
      </p>
    </Modal>
  );
}
