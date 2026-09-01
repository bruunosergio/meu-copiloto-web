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

O app sobe em `http://localhost:5173`. O dia a dia de **todos os papéis** é `/loja` (código+senha do `npm run seed`: `SEED_STORE_CODIGO`/`SEED_STORE_SENHA`) e depois nome + PIN. `/login` é só emergência para quem ainda tem e-mail+senha sem PIN — ver [ADR-0010](../meu-copiloto-backend/docs/adr/0010-login-unico-edicao-e-aviso-similar.md) do backend.

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
│   ├── distribuidoras.service.ts
│   ├── emprestimos.service.ts
│   └── tarefas.service.ts
├── features/
│   ├── auth/                          StoreLoginPage + VendedorPickerPage (login do dia a dia), LoginPage (emergência),
│   │                                  AuthContext, useVendedorInactivityTimeout, ProtectedRoute
│   ├── users/                         UsersPage + UserFormModal (CRUD, admin — usuario+PIN para todos; e-mail/senha opcional)
│   ├── distribuidoras/                DistribuidorasPage (cadastro/desativacao, admin)
│   ├── shortages/                     RegisterShortagePage, ShortagesQueuePage, ShortageListRow, EditShortageModal, CancelShortageModal, DistribuidoraPickerModal
│   ├── emprestimos/                   EmprestimosPage (pendentes + histórico de devolução, lote)
│   └── tarefas/                       TarefasPage (quadro + sprints, admin/gerente)
├── components/                        Button, Input, Select, Modal, StatusBadge, CollapsibleSection, Layout (nav por papel)
└── lib/                                api-client (axios + interceptors), query-client, storage (sessao), format
```

Regra de organização: paginas e componentes **nunca chamam `axios` diretamente** — sempre passam por `services/`. Isso isola qualquer mudança de contrato da API numa unica camada, no espirito da separacao ui/infra do backend.

## Telas da Fase 1

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/login` | público | Acesso de emergência (e-mail+senha) para contas antigas sem PIN |
| `/loja` | público | Abre a sessão do terminal compartilhado da loja (código+senha) — passo 1 de todo mundo |
| `/loja/vendedores` | sessão de terminal ativa | Grade com nome + papel de quem tem PIN + teclado (mouse ou 0–9 / Enter). VENDEDOR vai para registrar; os outros, para a fila. Sem sessão de terminal, volta para `/loja`. |
| `/faltas` | todos | Fila em lista, seções Registrada e Concluída (recebidas/canceladas opcionais). Cada linha mostra nome de quem registrou + data/hora. ADMIN/GERENTE/COMPRADOR selecionam várias peças para **marcar como concluídas** (abre o seletor de distribuidora, uma para o lote) ou **marcar como recebidas**. “Marcar como concluída” numa linha também abre o picker (opcional, “Decidir depois”). Selo “Emprestada” quando a peça está na lista de empréstimos. Falta `REGISTRADA` pode ser **editada** (mesma permissão do cancelar). |
| `/faltas/registrar` | todos | Formulário de registro. Checkbox “Peça emprestada de loja parceira” cria o empréstimo junto. Se já existir código igual ou nome parecido na fila, avisa e pede confirmação. VENDEDOR permanece na tela após registrar. |
| `/emprestimos` | todos | Pendentes com seleção em lote para devolver (quem/para quem/quando). Histórico das devolvidas. Vendedor também devolve. |
| `/tarefas` | ADMIN e GERENTE | Quadro A fazer / Em andamento / Concluída, com sprints opcionais. |
| `/usuarios` | ADMIN | CRUD de usuários — todos pedem usuário+PIN; e-mail+senha opcional |
| `/distribuidoras` | ADMIN | Cadastro de distribuidoras. Desativar em vez de excluir. |

A fila atualiza a cada 15s (`refetchInterval` do TanStack Query) — suficiente para o MVP de uma loja; um WebSocket/SSE pode substituir isso numa fase futura se a necessidade de tempo real justificar.

### Sessão do vendedor no terminal compartilhado

O balcão costuma ter um único computador para vários vendedores durante o turno. Por isso a sessão do **VENDEDOR** (diferente da sessão do terminal, que fica aberta o turno todo) é deliberadamente curta: **2 minutos de inatividade** devolvem à tela de seleção de nomes (`/loja/vendedores`) — `useVendedorInactivityTimeout` reinicia um timer a cada clique/toque/tecla e chama `trocarVendedor()` ao expirar (ver [ADR-0010](../meu-copiloto-backend/docs/adr/0010-login-unico-edicao-e-aviso-similar.md) do backend). Admin/gerente/comprador não voltam à grade por inatividade. Enquanto estiver ativo, o vendedor pode registrar quantas faltas precisar sem sair da tela e sem escolher o nome de novo a cada uma.

`trocarVendedor()` limpa só o token pessoal do vendedor — a sessão do terminal (`storeToken`) continua válida, então o próximo vendedor não precisa digitar o código+senha da loja de novo.

## Como implementar uma nova feature

1. Adicione o tipo em `domain/types.ts` se envolver uma entidade nova.
2. Crie o método correspondente em `services/<recurso>.service.ts` (única camada que chama `apiClient`).
3. Construa a página/componentes em `features/<recurso>/`, consumindo o service via `@tanstack/react-query` (`useQuery`/`useMutation`).
4. Registre a rota em `App.tsx`, envolvendo em `<ProtectedRoute allowedRoles={[...]} />` se o acesso for restrito por papel.
5. Reaproveite os componentes de `components/` (`Button`, `Input`, `Select`, `Modal`) antes de criar um novo.
