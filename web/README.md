# Agenda Prazos — Frontend

Interface web do sistema de agenda e controle de prazos (React + Vite + TypeScript).

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** (design system com variáveis CSS)
- **React Router** — rotas
- **TanStack Query** — dados da API e cache

## Desenvolvimento

```bash
cd web
npm install
cp .env.example .env
# Edite .env: VITE_API_URL=http://localhost:3000 (se a API estiver em outra origem)
npm run dev
```

Abre em `http://localhost:5173`. O Dashboard chama a API em `VITE_API_URL` para o health check.

## Build

```bash
npm run build
```

Saída em `dist/`. Em produção, configure o servidor (ou EasyPanel) para servir os arquivos estáticos e apontar `/api` para a API se desejar proxy.

## Estrutura

- `src/components/` — componentes reutilizáveis (layout, UI)
- `src/pages/` — páginas por rota (Dashboard, Prazos, Login)
- `src/lib/` — api client, utils
- Rotas: `/login`, `/dashboard`, `/prazos`

## Conectar à API

Defina `VITE_API_URL` (ex.: `https://sua-api.easypanel.host`) para que as chamadas (health, futuros endpoints) usem a API em produção.

## Deploy no EasyPanel (Docker)

O serviço usa um **Dockerfile** em dois estágios: build com Node e servidor com Nginx.

- **Contexto de build:** pasta `web/` (raiz do repositório = pai de `web`, então em EasyPanel use **Build Context** = `./web` ou o caminho que aponte para a pasta `web`).
- **Dockerfile:** `Dockerfile` (dentro de `web/`, então path = `Dockerfile` com context = `web`).

No EasyPanel: novo serviço → GitHub → repositório → **Build Context** = `web`, **Dockerfile path** = `Dockerfile`. Porta 80. Para usar a API em produção, configure a variável de ambiente no build (se o EasyPanel permitir build args) ou injete `VITE_API_URL` no build; caso contrário, defina a URL da API no código ou em um config carregado em runtime (ex.: `window.ENV`).
