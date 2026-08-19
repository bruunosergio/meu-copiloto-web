export enum Role {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
  COMPRADOR = 'COMPRADOR',
}

export enum ShortageStatus {
  REGISTRADA = 'REGISTRADA',
  EM_COTACAO = 'EM_COTACAO',
  COMPRADA = 'COMPRADA',
  RECEBIDA = 'RECEBIDA',
  CANCELADA = 'CANCELADA',
}

/**
 * ADMIN/COMPRADOR tem email (nunca usuario); VENDEDOR tem usuario (nunca email) -
 * ver ADR-0007 do backend.
 */
export interface User {
  id: string;
  storeId: string;
  nome: string;
  email: string | null;
  usuario: string | null;
  telefoneWhatsapp: string | null;
  papel: Role;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface StoreInfo {
  id: string;
  nome: string;
  codigo: string;
}

export interface VendedorSummary {
  id: string;
  nome: string;
}

export interface Shortage {
  id: string;
  storeId: string;
  codigoPeca: string | null;
  nomePeca: string;
  qtdRestante: number;
  observacao: string | null;
  registradoPorId: string;
  distribuidoraId: string | null;
  origem: 'WEB' | 'WHATSAPP_AUDIO' | 'WHATSAPP_TEXTO';
  status: ShortageStatus;
  criadaEm: string;
  atualizadaEm: string;
}

export interface Distribuidora {
  id: string;
  storeId: string;
  nome: string;
  ativa: boolean;
  criadaEm: string;
  atualizadaEm: string;
}

export const STATUS_LABEL: Record<ShortageStatus, string> = {
  [ShortageStatus.REGISTRADA]: 'Registrada',
  [ShortageStatus.EM_COTACAO]: 'Em cotação',
  [ShortageStatus.COMPRADA]: 'Comprada',
  [ShortageStatus.RECEBIDA]: 'Recebida',
  [ShortageStatus.CANCELADA]: 'Cancelada',
};

export const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.VENDEDOR]: 'Vendedor',
  [Role.COMPRADOR]: 'Comprador',
};
