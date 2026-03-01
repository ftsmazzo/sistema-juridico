# Fluxo único: E-mail no sistema, análise no N8N

O sistema centraliza **configuração e verificação de e-mail**; a **análise com IA** continua no N8N (melhor qualidade). Um único fluxo, sem triplicar etapas.

## Visão geral

1. **No sistema**
   - **Monitoramento de e-mail** (menu): configurar conta IMAP (Yahoo, OAB, etc.), intervalo de verificação automática, “Verificar agora”, ver “Última verificação” e último erro.
   - A verificação automática (job a cada minuto) e o botão “Verificar agora” fazem: conectar IMAP → buscar e-mails → extrair publicações (extrator Recorte) → **criar apenas publicações** (sem prazos, sem IA).
2. **Análise**
   - O usuário abre cada publicação e clica em **“Análise com IA”**: o sistema envia a publicação para o webhook do N8N.
   - O N8N roda a IA (ex.: Claude) e devolve a análise no response; o sistema grava resumo, base legal, observações, movimentações e **cria os prazos** a partir da análise.

Assim: **e-mail e extração no sistema**; **uma única análise no N8N**; **prazos só depois da análise**.

## O que foi implementado

- **Backend**
  - Tabela `conta_email_monitoramento`: host, port, secure, user, password_encrypted, remetentes_filtro, interval_minutes, last_checked_at, last_error, ativo.
  - Criptografia da senha (AES-256-GCM) com `EMAIL_MONITOR_ENCRYPTION_KEY`.
  - Serviço IMAP (imapflow + mailparser): buscar e-mails recentes, filtrar por remetente.
  - `runEmailCheck`: carrega conta, descriptografa, busca e-mails, extrai publicações (extrator Recorte), chama `processarItemPublicacaoOab` (que cria **só publicação** quando não há dados de IA).
  - API: GET/PUT `/api/email-monitor/config`, POST `/api/email-monitor/verificar-agora`.
  - Job agendado: a cada 1 minuto, se existir conta ativa e o intervalo desde `last_checked_at` tiver passado, executa a verificação.
- **Frontend**
  - Página **Monitoramento de e-mail**: formulário (nome, host, porta, SSL, usuário, senha, remetentes um por linha, intervalo, ativo), bloco de status (última verificação, último erro), botão “Verificar agora”.
- **Documentação**
  - `ENV_EASYPANEL.md`: variável `EMAIL_MONITOR_ENCRYPTION_KEY`.

## Movimentações no processo

A análise da IA retorna `movimentacoes` (array de tipo + resumo). O sistema já grava na publicação e gera **prazos** e **movimentações** (tabela `movimentacoes`) a partir disso. Se no futuro for necessário espelhar essas movimentações na tabela de **processo** (`movimentacoes_processo`), pode ser feita uma etapa adicional ao gravar a análise (por exemplo ao chamar `criarPrazosAPartirDePublicacao` ou no PATCH da publicação).

## Resumo

- **Um fluxo**: e-mail e extração no sistema; análise (e prazos) via N8N + botão “Análise com IA”.
- **Sem duplicar IA**: não se roda análise no sistema e de novo no N8N; só no N8N.
- **Prazos só após análise**: criados quando a análise do N8N é gravada (response do webhook ou PATCH).
