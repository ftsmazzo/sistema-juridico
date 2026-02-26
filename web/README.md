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
