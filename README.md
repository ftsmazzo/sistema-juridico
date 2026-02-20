# Agenda e Prazos — API

Sistema de agenda e controle de prazos para escritório de advocacia. Substituição do sistema legado (PHP) por API moderna (Node + PostgreSQL) com automações.

## Stack

- **Node.js** + **TypeScript** + **Express**
- **PostgreSQL** + **Drizzle ORM**
- Webhook para **Publicações OAB** (Recorte Digital) → criação automática de prazos

## Pré-requisitos

- Node.js 18+
- PostgreSQL
- Variáveis de ambiente (copie `.env.example` para `.env`)

## Instalação

```bash
pnpm install
# ou npm install
```

## Banco de dados

Crie o banco e configure `DATABASE_URL` no `.env`. Depois:

```bash
pnpm db:push
```

Isso cria as tabelas: `usuarios`, `prazos`, `prazos_usuarios`, `audiencias`, `audiencias_usuarios`, `agenda`, `publicacoes_oab`.

## Rodar a API

```bash
pnpm dev
```

A API sobe em `http://localhost:3000`.

## Webhook: Publicações OAB

O workflow (N8N) que lê o e-mail da OAB e extrai o JSON deve enviar:

- **POST** `http://<sua-api>/api/webhooks/publicacoes-oab`
- **Header:** `Content-Type: application/json`
- **Header (opcional):** `Authorization: Bearer <WEBHOOK_PUBLICACOES_OAB_SECRET>` ou `X-Webhook-Secret: <segredo>`
- **Body:** array de itens no formato documentado em `INTEGRACAO_PUBLICACOES_OAB.md`

Para cada item com `isRecorteDigital: true` e tipo **Intimação**, a API:

1. Grava a publicação em `publicacoes_oab`
2. Calcula a data do prazo (15 dias úteis a partir da data de publicação)
3. Cria o registro em `prazos` e vincula advogados pelo campo **OAB** (`usuarios.numero_oab`)

Cadastre em **usuários** o campo **Número OAB** (ex.: `270074/SP`) para que o vínculo automático funcione.

## Documentação

- `PLANO_ESCOPO_TECNOLOGIAS_MVP.md` — escopo, stack, MVP
- `INTEGRACAO_PUBLICACOES_OAB.md` — contrato do webhook e formato JSON
- `COMO_OS_USUARIOS_USAM_O_SISTEMA.md` — uso do sistema atual
- `FONTES_DADOS_JURIDICOS_AUTOMATIZACAO_PRAZOS.md` — fontes de dados (Datajud, Jusbrasil)
