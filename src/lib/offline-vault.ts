import { Role, StoreInfo, VendedorSummary } from '../domain';
import { cifrarJson, decifrarJson } from './offline-crypto';

const VAULT_KEY = 'meu-copiloto:offline-vault';

export interface OfflineVaultUser {
  id: string;
  nome: string;
  papel: Role;
  pinHash: string;
}

export interface OfflineVaultPayload {
  store: StoreInfo;
  users: OfflineVaultUser[];
}

interface VaultRecord {
  codigo: string;
  envelope: string;
}

export const offlineVault = {
  async save(codigo: string, senha: string, payload: OfflineVaultPayload): Promise<void> {
    const envelope = await cifrarJson(senha, payload);
    const record: VaultRecord = { codigo: codigo.trim().toLowerCase(), envelope };
    localStorage.setItem(VAULT_KEY, JSON.stringify(record));
  },

  temCofre(codigo: string): boolean {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return false;
    const record = JSON.parse(raw) as VaultRecord;
    return record.codigo === codigo.trim().toLowerCase();
  },

  async unlock(codigo: string, senha: string): Promise<OfflineVaultPayload | null> {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as VaultRecord;
    if (record.codigo !== codigo.trim().toLowerCase()) return null;
    try {
      return await decifrarJson<OfflineVaultPayload>(senha, record.envelope);
    } catch {
      return null;
    }
  },

  paraGrade(users: OfflineVaultUser[]): VendedorSummary[] {
    return users.map(({ id, nome, papel }) => ({ id, nome, papel }));
  },
};
