# Variáveis de ambiente — EasyPanel

Use estas variáveis no painel do EasyPanel em **Variables** (ou **Environment**) do app.

---

## 1. Serviço da API (backend)

| Variável | Obrigatória | Exemplo | Descrição |
|----------|-------------|---------|-----------|
| `DATABASE_URL` | **Sim** | `postgresql://usuario:senha@host:5432/agenda_prazos` | URL de conexão do PostgreSQL. No EasyPanel pode ser o link interno do serviço Postgres (ex.: `postgresql://postgres:senha@postgres:5432/agenda_prazos`). |
| `PORT` | Não | `3000` | Porta em que a API sobe (padrão: 3000). O EasyPanel costuma injetar `PORT` automaticamente; use o valor que ele indicar se existir. |
| `NODE_ENV` | Não | `production` | Define ambiente (production/development). |
| `WEBHOOK_PUBLICACOES_OAB_SECRET` | Não | `um-token-segredo-forte` | Segredo para validar o webhook de Publicações OAB. Se definido, o N8N deve enviar no header `Authorization: Bearer <valor>` ou `X-Webhook-Secret: <valor>`. |
| `JWT_SECRET` | **Sim** (produção) | `openssl rand -hex 32` | Segredo para assinar o token de login. Em produção, use um valor forte e único. |
| CORS | — | — | A API usa o middleware `cors()` e aceita requisições de qualquer origem, para o frontend em outro domínio (EasyPanel) funcionar. |

### Exemplo de bloco (API)

```env
DATABASE_URL=postgresql://postgres:SuaSenhaAqui@postgres:5432/agenda_prazos
PORT=3000
NODE_ENV=production
WEBHOOK_PUBLICACOES_OAB_SECRET=altere-um-token-segredo-forte
```

---

## 2. Serviço do Frontend (web)

**Build:** repositório central → **Build context** = `web` → **Dockerfile** = `Dockerfile` (caminho relativo ao context, ou seja `web/Dockerfile` no repo).

A única configuração necessária é uma **variável de build** (Build Arg), não variável de runtime. No EasyPanel, use a seção de **Build Arguments** do serviço do frontend.

| Nome (Build Arg) | Obrigatória | Valor | Descrição |
|------------------|-------------|--------|-----------|
| `VITE_API_URL` | **Sim** | `https://fabricaia-sistema-juridico.90qhxz.easypanel.host` | URL base da API. O front chama essa URL para `/health` e futuros endpoints. Sem barra no final. |

### Valor para copiar (sua API)

```
VITE_API_URL=https://fabricaia-sistema-juridico.90qhxz.easypanel.host
```

- **Porta do container:** 80 (Nginx).
- Depois do deploy, acesse o front pelo domínio que o EasyPanel der (ou o que você configurar para o serviço web).

---

## Observações (API)

- **PostgreSQL:** Crie o banco (ex.: `agenda_prazos`) no serviço Postgres do EasyPanel antes do primeiro deploy. As **tabelas são criadas automaticamente** na subida da API (migração na inicialização).
- **WEBHOOK_PUBLICACOES_OAB_SECRET:** Gere um valor aleatório forte (ex.: `openssl rand -hex 32`) e use o mesmo no N8N ao chamar o webhook.
