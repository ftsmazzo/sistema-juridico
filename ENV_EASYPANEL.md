# Variáveis de ambiente — EasyPanel

Use estas variáveis no painel do EasyPanel em **Variables** (ou **Environment**) do app.

| Variável | Obrigatória | Exemplo | Descrição |
|----------|-------------|---------|-----------|
| `DATABASE_URL` | **Sim** | `postgresql://usuario:senha@host:5432/agenda_prazos` | URL de conexão do PostgreSQL. No EasyPanel pode ser o link interno do serviço Postgres (ex.: `postgresql://postgres:senha@postgres:5432/agenda_prazos`). |
| `PORT` | Não | `3000` | Porta em que a API sobe (padrão: 3000). O EasyPanel costuma injetar `PORT` automaticamente; use o valor que ele indicar se existir. |
| `NODE_ENV` | Não | `production` | Define ambiente (production/development). |
| `WEBHOOK_PUBLICACOES_OAB_SECRET` | Não | `um-token-segredo-forte` | Segredo para validar o webhook de Publicações OAB. Se definido, o N8N deve enviar no header `Authorization: Bearer <valor>` ou `X-Webhook-Secret: <valor>`. |

## Exemplo de bloco para copiar/colar

```env
DATABASE_URL=postgresql://postgres:SuaSenhaAqui@postgres:5432/agenda_prazos
PORT=3000
NODE_ENV=production
WEBHOOK_PUBLICACOES_OAB_SECRET=altere-um-token-segredo-forte
```

## Observações

- **PostgreSQL:** Crie o banco (ex.: `agenda_prazos`) no serviço Postgres do EasyPanel antes do primeiro deploy. As **tabelas são criadas automaticamente** na subida da API (migração na inicialização).
- **WEBHOOK_PUBLICACOES_OAB_SECRET:** Gere um valor aleatório forte (ex.: `openssl rand -hex 32`) e use o mesmo no N8N ao chamar o webhook.
