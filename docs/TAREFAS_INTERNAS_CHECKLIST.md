# Checklist — Tarefas internas (MVP aprovado)

## Banco de dados
- [x] Tabela `tarefa_label` (labels globais, nome único por `lower(trim(nome))`)
- [x] Tabela `tarefa_interna` (vínculo obrigatório a `prazos`, data limite obrigatória, tipo enum, status)
- [x] Tabela `tarefa_interna_label` (N:N)
- [x] Migração idempotente em `drizzle/*.sql` (executada no deploy via `runMigrations`)

## Regras de negócio
- [x] `id_criador !== id_responsavel` (validação na API)
- [x] Apenas o responsável marca **cumprida**
- [x] Apenas o criador **edita/cancela** (e dispara regras de renotificação)
- [x] Sem celular (usuário ou pessoa vinculada): **bloqueia criação** com mensagem clara
- [x] Alerta **D−3 dias úteis** (feriados BR: `feriados.ts`): só entre **9h e 14h** `America/Sao_Paulo`
- [x] Se faltar **menos de 3 dias úteis**: primeiro envio no **próximo slot** 9h–14h
- [x] Criação e cumprimento: WhatsApp **na hora** (fora da janela se necessário)
- [x] Edição com reenvio: reset `d3_enviado_em`, reenvia evento `criada`, recalcula D−3

## Integração WhatsApp (N8N / Evolution)
- [x] `WEBHOOK_N8N_TAREFAS_INTERNAS_URL` — um webhook, campo `event`: `criada` | `cumprida` | `alerta_d3` | `cobranca`
- [x] Templates básicos no código (ajustáveis depois)
- [x] Dois destinatários no `alerta_d3` (POST separados ou payload com lista — implementado como dois envios)

## API
- [x] `GET/POST /api/tarefas-internas`, `GET/PATCH /api/tarefas-internas/:id`
- [x] `POST /api/tarefas-internas/:id/cumprir`
- [x] `POST /api/tarefas-internas/:id/cobranca` (criador, após D−3, máx. 1 a cada 24h)
- [x] `GET/POST /api/tarefa-labels` (POST só cria se não existir — case-insensitive)

## Frontend
- [x] Menu **Tarefas internas** + lista com filtros (pendentes, atrasadas, responsável, criador, labels, intervalo de datas, tipo)
- [x] Ordenação padrão: data limite ASC
- [x] Tela de criação/edição (vínculo a prazo, labels, tipo)
- [x] Bloco no **Detalhe do prazo**: listar + criar + ações

## Agendamento
- [x] Scheduler no processo da API (intervalo curto; dispara só na janela 9h–14h SP)

## Pós-MVP (não escopo deste PR)
- [ ] Perfis só gestores criam tarefas
- [ ] Templates de mensagem editáveis no painel
- [ ] Feriados estaduais/municipais
