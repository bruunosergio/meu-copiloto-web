import { StoreInfo, User } from '../domain';
import { OfflineVaultPayload, OfflineVaultUser } from './offline-vault';

const CREDS_KEY = 'meu-copiloto:offline-creds';
const UNLOCKED_KEY = 'meu-copiloto:offline-unlocked';
const OFFLINE_USER_KEY = 'meu-copiloto:offline-user';

export interface OfflineCreds {
  storeCodigo: string;
  storeSenha: string;
  userId?: string;
  pin?: string;
}

export const offlineSession = {
  saveCreds(creds: OfflineCreds) {
    sessionStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  },

  getCreds(): OfflineCreds | null {
    const raw = sessionStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as OfflineCreds) : null;
  },

  patchCreds(patch: Partial<OfflineCreds>) {
    const atual = this.getCreds() ?? { storeCodigo: '', storeSenha: '' };
    this.saveCreds({ ...atual, ...patch });
  },

  saveUnlocked(payload: OfflineVaultPayload) {
    sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(payload));
  },

  getUnlocked(): OfflineVaultPayload | null {
    const raw = sessionStorage.getItem(UNLOCKED_KEY);
    return raw ? (JSON.parse(raw) as OfflineVaultPayload) : null;
  },

  temLojaOffline(): boolean {
    return !!this.getUnlocked();
  },

  marcarUsuarioOffline() {
    sessionStorage.setItem(OFFLINE_USER_KEY, '1');
  },

  ehUsuarioOffline(): boolean {
    return sessionStorage.getItem(OFFLINE_USER_KEY) === '1';
  },

  limparUsuarioOffline() {
    sessionStorage.removeItem(OFFLINE_USER_KEY);
    const creds = this.getCreds();
    if (creds) {
      delete creds.userId;
      delete creds.pin;
      this.saveCreds(creds);
    }
  },

  limparTudo() {
    sessionStorage.removeItem(CREDS_KEY);
    sessionStorage.removeItem(UNLOCKED_KEY);
    sessionStorage.removeItem(OFFLINE_USER_KEY);
  },

  userFromVault(store: StoreInfo, vaultUser: OfflineVaultUser): User {
    return {
      id: vaultUser.id,
      storeId: store.id,
      nome: vaultUser.nome,
      email: null,
      usuario: null,
      telefoneWhatsapp: null,
      papel: vaultUser.papel,
      ativo: true,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
  },
};
