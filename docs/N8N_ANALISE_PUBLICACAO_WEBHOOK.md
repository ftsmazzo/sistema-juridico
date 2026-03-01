# Webhook N8N — Análise com IA da publicação

O sistema pode enviar uma publicação para o N8N **apenas para rodar a análise com IA** (sem verificar e-mail). Isso é feito pelo botão **"Análise com IA"** na tela de detalhe da publicação.

## Configuração no sistema

1. **Variável de ambiente (API)**  
   Defina no EasyPanel (ou `.env` local) a URL do webhook do N8N:

   ```env
   WEBHOOK_N8N_ANALISE_PUBLICACAO_URL=https://seu-n8n.com/webhook/abc123...
   ```

2. Se a variável não estiver definida, o botão "Análise com IA" continuará visível, mas a API retornará 503 com a mensagem de que o webhook não está configurado.

## Fluxo

1. Usuário clica em **"Análise com IA"** na publicação.
2. A API carrega a publicação, monta um payload no formato esperado pelo N8N e faz **POST** para `WEBHOOK_N8N_ANALISE_PUBLICACAO_URL`.
3. O N8N recebe o body (um único objeto de publicação, com `publicacaoId`).
4. O N8N executa o nó de IA (ex.: Claude) sobre `textoCompleto` (e demais campos úteis).
5. O N8N chama **PATCH** na API do sistema:  
   `PATCH /api/publicacoes/:publicacaoId`  
   com body contendo os campos editáveis retornados pela IA, por exemplo:
   - `resumo`
   - `baseLegal`
   - `observacoesIa`
   - `movimentacoes`
   - `prazoDiasUteisSugerido`

6. A API atualiza a publicação (os mesmos campos já aceitos pelo PATCH existente). O usuário pode atualizar a página para ver o resultado.

## Payload enviado pelo sistema (POST para o N8N)

O body do POST é um único objeto JSON, no formato de “item de publicação OAB”, com campo extra `publicacaoId`:

- `publicacaoId` — ID da publicação no banco (usar no PATCH)
- `emailId`, `subject`, `from`, `to`, `advogado`, `numeroOab`, `dataProcessamento`, `totalPublicacoes`
- `publicacaoNumero`, `dataDisponibilizacao`, `dataPublicacao`, `jornal`, `pagina`, `caderno`, `local`, `vara`
- `tipoPublicacao`, `numeroProcesso`, `valorMencionado`, `textoCompleto`
- `advogados`, `poloAtivo`, `polosPassivos`, `urlDocumento`, `identificadorDocumento`
- `isRecorteDigital: true`

O N8N pode usar o mesmo nó de IA que já usa no fluxo de e-mail (por exemplo, Claude Sonnet 4.6), lendo `textoCompleto` e demais campos, e depois montar o body do PATCH usando `publicacaoId` na URL.

## Resposta da API ao disparar

- **200** — `{ "ok": true, "message": "Enviado para análise no N8N. A publicação será atualizada em instantes se o workflow estiver ativo." }`
- **503** — Webhook não configurado (`WEBHOOK_N8N_ANALISE_PUBLICACAO_URL` vazio).
- **502** — Erro ao chamar o N8N (rede ou resposta não OK).

O frontend invalida a query da publicação após sucesso, para que ao atualizar a página os dados já venham atualizados pelo PATCH que o N8N fez.
