# Variáveis de ambiente — EasyPanel

Use estas variáveis no painel do EasyPanel em **Variables** (ou **Environment**) do app.

---

## 1. Serviço da API (backend)

| Variável | Obrigatória | Exemplo | Descrição |
|----------|-------------|---------|-----------|
| `DATABASE_URL` | **Sim** | `postgresql://postgres:SENHA@fabricaia_postgres:5432/agenda_prazos?sslmode=disable` | URL de conexão do PostgreSQL. No EasyPanel use o **nome do serviço** do Postgres como host (ex.: `fabricaia_postgres`). A API roda as migrações (cria/atualiza tabelas) automaticamente na subida. |
| `PORT` | Não | `3000` | Porta em que a API sobe (padrão: 3000). O EasyPanel costuma injetar `PORT` automaticamente; use o valor que ele indicar se existir. |
| `NODE_ENV` | Não | `production` | Define ambiente (production/development). |
| `WEBHOOK_PUBLICACOES_OAB_SECRET` | Não | `um-token-segredo-forte` | Segredo para validar o webhook de Publicações OAB. Se definido, o N8N deve enviar no header `Authorization: Bearer <valor>` ou `X-Webhook-Secret: <valor>`. |
| `JWT_SECRET` | **Sim** (produção) | `openssl rand -hex 32` | Segredo para assinar o token de login. Em produção, use um valor forte e único. |
| `OPENAI_API_KEY` | Não (cadastro por print) | `sk-...` | Chave da API OpenAI para extração por print. Configure **uma** das duas (OpenAI ou Anthropic). |
| `OPENAI_VISION_MODEL` | Não | `gpt-4o` | Modelo OpenAI na extração (padrão: gpt-4o). |
| `ANTHROPIC_API_KEY` | Não (cadastro por print) | `sk-ant-api03-...` | Chave da API Anthropic (Claude) para extração por print. Configure **uma** das duas (OpenAI ou Anthropic). |
| `CLAUDE_VISION_MODEL` | Não | `claude-sonnet-4-20250514` | Modelo Claude na extração por print (padrão: claude-sonnet-4-20250514). |
| `EMAIL_IA_MODEL` | Não | `claude-sonnet-4-6` | Modelo usado no **teste de e-mail Recorte** (Publicações → Testar e-mail). Para igualar à automação N8N com Claude Sonnet 4.6, defina `ANTHROPIC_API_KEY` e opcionalmente `EMAIL_IA_MODEL=claude-sonnet-4-6`. |
| `WEBHOOK_N8N_ANALISE_PUBLICACAO_URL` | Não (botão Análise com IA) | `https://seu-n8n.com/webhook/...` | URL do **webhook no N8N** que recebe uma publicação para rodar só a análise com IA. O sistema envia POST com a publicação; o N8N executa a IA e chama **PATCH /api/publicacoes/:id** para atualizar resumo, baseLegal, observacoesIa, movimentacoes, prazoDiasUteisSugerido. Ver `docs/N8N_ANALISE_PUBLICACAO_WEBHOOK.md`. |
| `WEBHOOK_N8N_NOTIFICA` | Não (WhatsApp) | `https://seu-n8n.com/webhook/notifica-publicacao` | URL do **webhook no N8N** chamada após gravar análise e prazos de uma publicação. O sistema envia POST com `msg` (texto formatado para WhatsApp), `publicacaoId`, `prazosCriados` e outros campos. Use no N8N no campo **msg** do nó Evolution para enviar a mensagem. |
| `EMAIL_MONITOR_ENCRYPTION_KEY` | Não (monitoramento de e-mail) | 32 ou 64 caracteres hex | Chave para criptografar a senha da conta IMAP em **Monitoramento de e-mail**. Pode ser 32 hex (ex.: `openssl rand -hex 16`) ou 64 hex (`openssl rand -hex 32`). Obrigatória se configurar uma conta com senha. |
| `PUBLICACOES_PRINT_PROMPT` | Não | — | Prompt customizado para a IA (sobrescreve o padrão). Útil para usar o mesmo prompt do N8N. |
| `ESCAVADOR_API_KEY` ou `ESCAVADOR_TOKEN` | Não (sincronizar Escavador) | `eyJ0eXAi...` (Bearer token) | Token da API Escavador para **POST /api/dados-escavador/sincronizar**. Obtenha em [api.escavador.com/tokens](https://api.escavador.com/tokens). **Importante:** defina como variável de **runtime** do serviço da API (não só Build Args). Cole o token sem espaços ou quebras de linha. Se aparecer 401 Unauthenticated, confira que a variável está nas env do **container** (não do build) e reinicie o serviço. |
| CORS | — | — | A API usa o middleware `cors()` e aceita requisições de qualquer origem, para o frontend em outro domínio (EasyPanel) funcionar. |

### Exemplo de bloco (API)

```env
# Host = nome do serviço Postgres no EasyPanel (ex.: fabricaia_postgres)
DATABASE_URL=postgresql://postgres:SUA_SENHA@fabricaia_postgres:5432/agenda_prazos?sslmode=disable
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

- **PostgreSQL:** Crie o banco `agenda_prazos` no serviço Postgres do EasyPanel antes do primeiro deploy. Use em `DATABASE_URL` o **nome do serviço** como host (ex.: `fabricaia_postgres`). As **tabelas são criadas/atualizadas automaticamente** na subida da API (todas as migrações em `drizzle/*.sql` rodam na inicialização).
- **WEBHOOK_PUBLICACOES_OAB_SECRET:** Gere um valor aleatório forte (ex.: `openssl rand -hex 32`) e use o mesmo no N8N ao chamar o webhook.
- **Escavador 401 Unauthenticated:** O token deve estar nas **variáveis de ambiente do serviço (runtime)** da API, não apenas nos Build Args. No EasyPanel: Variables do app/serviço da API. Copie o token do painel do Escavador sem espaços no início/fim. Após alterar, reinicie o container.
