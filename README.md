# Meu Copiloto — Painel Web

Painel web do [Meu Copiloto](../meu-copiloto-backend), o assistente de reposição de estoque. Aqui vivem o login, a administração de usuários, o formulário de registro manual de falta e a fila do comprador — as telas que precisam de tela grande e mouse, complementando a captura por WhatsApp (Fase 2).

> **Status:** Fase 1 — núcleo sem IA. Consome a API do `meu-copiloto-backend`.

## Stack

React + TypeScript, Vite, React Router, TanStack Query (estado de servidor), Tailwind CSS, Axios.

## Como rodar localmente

Pré-requisito: o [backend](../meu-copiloto-backend) rodando (por padrão em `http://localhost:3000`).

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se o backend rodar em outra porta/host
npm run dev
```

O app sobe em `http://localhost:5173`. Faça login com o usuário admin criado pelo `npm run seed` do backend.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot-reload |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |
| `npm run lint` | ESLint |

## Estrutura do projeto

```
src/
├── app/ (implicito em App.tsx)      Rotas e composição da aplicação
├── domain/                            Tipos espelhando as entidades do backend (User, Shortage, Distribuidora, enums)
├── services/                          Cliente HTTP por recurso — unico lugar que fala com a API
│   ├── auth.service.ts
│   ├── users.service.ts
│   ├── shortages.service.ts
│   └── distribuidoras.service.ts
├── features/
│   ├── auth/                          LoginPage, AuthContext (sessao), ProtectedRoute (guarda por papel)
│   ├── users/                         UsersPage + UserFormModal (CRUD de usuarios, admin)
│   ├── distribuidoras/                DistribuidorasPage (cadastro/desativacao de fornecedores, admin)
│   └── shortages/                     RegisterShortagePage, ShortagesQueuePage, ShortageListRow, CancelShortageModal, DistribuidoraPickerModal
├── components/                        Button, Input, Select, Modal, StatusBadge, CollapsibleSection, Layout (nav por papel)
└── lib/                                api-client (axios + interceptors), query-client, storage (sessao), format
```

Regra de organização: paginas e componentes **nunca chamam `axios` diretamente** — sempre passam por `services/`. Isso isola qualquer mudança de contrato da API numa unica camada, no espirito da separacao ui/infra do backend.

## Telas da Fase 1

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/login` | público | Autenticação |
| `/faltas` | todos | Fila de faltas em lista (linhas), agrupada em seções por status (Registrada, Em cotação, Comprada — cada uma expansível/recolhível) e com busca por código/nome. Vendedor só vê as próprias faltas (filtrado pelo backend); admin/comprador veem a fila completa. Botões de avançar status e cancelar aparecem conforme o papel e as regras de `docs/02-modelo-dominio.md` do backend. Ao clicar em "Marcar como comprada", abre o `DistribuidoraPickerModal` — uma grade de botões (1 clique) para escolher a distribuidora vencedora da cotação; é opcional ("Decidir depois" avança sem escolher) e pode ser definida/corrigida depois direto na linha da falta (link "definir"/"trocar"). |
| `/faltas/registrar` | todos | Formulário de registro manual de falta (fallback web ao WhatsApp da Fase 2) |
| `/usuarios` | ADMIN | CRUD de usuários da loja |
| `/distribuidoras` | ADMIN | Cadastro de distribuidoras/fornecedores usados no seletor de cotação. Desativar em vez de excluir — preserva o histórico das faltas que já usaram aquela distribuidora. |

A fila atualiza a cada 15s (`refetchInterval` do TanStack Query) — suficiente para o MVP de uma loja; um WebSocket/SSE pode substituir isso numa fase futura se a necessidade de tempo real justificar.

## Como implementar uma nova feature

1. Adicione o tipo em `domain/types.ts` se envolver uma entidade nova.
2. Crie o método correspondente em `services/<recurso>.service.ts` (única camada que chama `apiClient`).
3. Construa a página/componentes em `features/<recurso>/`, consumindo o service via `@tanstack/react-query` (`useQuery`/`useMutation`).
4. Registre a rota em `App.tsx`, envolvendo em `<ProtectedRoute allowedRoles={[...]} />` se o acesso for restrito por papel.
5. Reaproveite os componentes de `components/` (`Button`, `Input`, `Select`, `Modal`) antes de criar um novo.
