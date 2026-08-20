export enum Role {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
  COMPRADOR = 'COMPRADOR',
  /** Mesmas permissoes do COMPRADOR na fila + quadro de Tarefas. */
  GERENTE = 'GERENTE',
}

/** Ciclo simplificado (ADR-0008): CONCLUIDA = pedido feito na distribuidora. */
export enum ShortageStatus {
  REGISTRADA = 'REGISTRADA',
  CONCLUIDA = 'CONCLUIDA',
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
  registradoPorNome: string | null;
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

export enum EmprestimoStatus {
  PENDENTE = 'PENDENTE',
  DEVOLVIDA = 'DEVOLVIDA',
}

export interface Emprestimo {
  id: string;
  storeId: string;
  shortageId: string;
  emprestadaDe: string | null;
  status: EmprestimoStatus;
  registradoPorId: string;
  registradoPorNome: string | null;
  devolvidoPorId: string | null;
  devolvidoPorNome: string | null;
  devolvidoPara: string | null;
  devolvidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  pecaNome: string | null;
  pecaCodigo: string | null;
  faltaStatus: ShortageStatus | null;
}

export enum TarefaStatus {
  A_FAZER = 'A_FAZER',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
}

export interface Sprint {
  id: string;
  storeId: string;
  nome: string;
  inicio: string | null;
  fim: string | null;
  encerrada: boolean;
  criadoPorId: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Tarefa {
  id: string;
  storeId: string;
  sprintId: string | null;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  prazo: string | null;
  criadoPorId: string;
  concluidaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export const STATUS_LABEL: Record<ShortageStatus, string> = {
  [ShortageStatus.REGISTRADA]: 'Registrada',
  [ShortageStatus.CONCLUIDA]: 'Concluída',
  [ShortageStatus.RECEBIDA]: 'Recebida',
  [ShortageStatus.CANCELADA]: 'Cancelada',
};

export const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.VENDEDOR]: 'Vendedor',
  [Role.COMPRADOR]: 'Comprador',
  [Role.GERENTE]: 'Gerente',
};

export const TAREFA_STATUS_LABEL: Record<TarefaStatus, string> = {
  [TarefaStatus.A_FAZER]: 'A fazer',
  [TarefaStatus.EM_ANDAMENTO]: 'Em andamento',
  [TarefaStatus.CONCLUIDA]: 'Concluída',
};

export const EMPRESTIMO_STATUS_LABEL: Record<EmprestimoStatus, string> = {
  [EmprestimoStatus.PENDENTE]: 'Pendente',
  [EmprestimoStatus.DEVOLVIDA]: 'Devolvida',
};

export function podeGerenciarFilaCompleta(papel: Role): boolean {
  return papel === Role.ADMIN || papel === Role.COMPRADOR || papel === Role.GERENTE;
}

export function podeGerenciarTarefas(papel: Role): boolean {
  return papel === Role.ADMIN || papel === Role.GERENTE;
}
