import { CreateShortagePayload } from '../services/shortages.service';

const OUTBOX_KEY = 'meu-copiloto:shortage-outbox';

export interface OutboxItem {
  id: string;
  userId: string;
  criadoEm: string;
  payload: CreateShortagePayload;
}

function ler(): OutboxItem[] {
  const raw = localStorage.getItem(OUTBOX_KEY);
  return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
}

function gravar(itens: OutboxItem[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(itens));
}

export const shortageOutbox = {
  list(): OutboxItem[] {
    return ler();
  },

  count(): number {
    return ler().length;
  },

  add(userId: string, payload: CreateShortagePayload): OutboxItem {
    const item: OutboxItem = {
      id: crypto.randomUUID(),
      userId,
      criadoEm: new Date().toISOString(),
      payload,
    };
    gravar([...ler(), item]);
    return item;
  },

  remove(id: string) {
    gravar(ler().filter((item) => item.id !== id));
  },
};
