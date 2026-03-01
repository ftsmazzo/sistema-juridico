# Webhook N8N — Análise com IA da publicação

O sistema pode enviar uma publicação para o N8N **apenas para rodar a análise com IA** (sem verificar e-mail). Isso é feito pelo botão **"Análise com IA"** na tela de detalhe da publicação.

## Fluxo recomendado: N8N devolve a análise no response

1. O sistema faz **POST** para o webhook com a publicação.
2. O N8N executa o nó de IA (ex.: Claude) e **responde** com o resultado no body.
3. O sistema **lê a resposta**, extrai a análise e **grava** na publicação (resumo, baseLegal, observacoesIa, movimentacoes, prazoDiasUteisSugerido).
4. O usuário vê "Análise recebida e gravada na publicação." e pode atualizar a página para ver os dados.

Assim o N8N não precisa chamar de volta a API (PATCH). Basta configurar o webhook para **Respond to Webhook** com o JSON no formato abaixo.

### Formato da resposta do N8N (para o sistema gravar)

O sistema espera um **array** com um objeto que tenha `content` (array), e o primeiro item de `content` com `type: "text"` e `text` contendo um **JSON string** com a análise:

```json
[
  {
    "content": [
      {
        "type": "text",
        "text": "{\"resumo\": \"...\", \"baseLegal\": \"...\", \"prazoDiasUteisSugerido\": 15, \"observacoesIa\": \"...\", \"movimentacoes\": [{\"tipo\": \"...\", \"resumo\": \"...\"}]}"
      }
    ]
  }
]
```

O campo `text` deve ser um **objeto JSON em string** com as chaves abaixo. O sistema aceita o JSON **com ou sem** o wrapper em markdown (por exemplo `` ```json ... ``` ``); se vier envolvido, o wrapper é removido antes de parsear.

- `resumo` (string)
- `baseLegal` (string; será truncado a 255 caracteres)
- `prazoDiasUteisSugerido` (número)
- `observacoesIa` (string)
- `movimentacoes` (array de `{ "tipo": string, "resumo": string }`)

Se a resposta vier nesse formato, o sistema grava os campos na publicação e retorna `{ "ok": true, "message": "Análise recebida e gravada na publicação." }`. Caso contrário, retorna sucesso mas com mensagem informando que a resposta não continha análise no formato esperado (e a publicação não é alterada).

## Configuração no sistema

1. **Variável de ambiente (API)**  
   Defina no EasyPanel (ou `.env` local) a URL do webhook do N8N:

   ```env
   WEBHOOK_N8N_ANALISE_PUBLICACAO_URL=https://seu-n8n.com/webhook/abc123...
   ```

2. Se a variável não estiver definida, o botão "Análise com IA" continuará visível, mas a API retornará 503 com a mensagem de que o webhook não está configurado.

## Fluxo alternativo: N8N chama PATCH na API

Se preferir, o N8N pode **não** devolver a análise no response e, em vez disso, chamar **PATCH** na API do sistema após a IA:

- **PATCH** `https://sua-api/api/publicacoes/:publicacaoId`  
  com body: `{ "resumo", "baseLegal", "observacoesIa", "movimentacoes", "prazoDiasUteisSugerido" }`

O sistema já aceita esse PATCH (campos editáveis). O `publicacaoId` vem no payload que o sistema envia no POST ao webhook.

## Payload enviado pelo sistema (POST para o N8N)

O body do POST é um único objeto JSON, no formato de “item de publicação OAB”, com campo extra `publicacaoId`:

- `publicacaoId` — ID da publicação no banco (usar no PATCH)
- `emailId`, `subject`, `from`, `to`, `advogado`, `numeroOab`, `dataProcessamento`, `totalPublicacoes`
- `publicacaoNumero`, `dataDisponibilizacao`, `dataPublicacao`, `jornal`, `pagina`, `caderno`, `local`, `vara`
- `tipoPublicacao`, `numeroProcesso`, `valorMencionado`, `textoCompleto`
- `advogados`, `poloAtivo`, `polosPassivos`, `urlDocumento`, `identificadorDocumento`
- `isRecorteDigital: true`

O N8N pode usar o mesmo nó de IA que já usa no fluxo de e-mail (ex.: Claude Sonnet 4.6), lendo `textoCompleto` e demais campos. **Recomendado:** configurar o webhook para responder com o array no formato descrito acima; o sistema grava a análise na publicação. Alternativamente, o N8N pode chamar PATCH na API com `publicacaoId` após a IA.

## Resposta da API ao disparar

- **200** — Sucesso. Mensagens possíveis:
  - `"Análise recebida e gravada na publicação."` — A resposta do N8N veio no formato esperado e os dados foram salvos.
  - `"Enviado para análise no N8N. A resposta não continha análise em formato esperado; a publicação não foi alterada."` — N8N respondeu 200 mas o body não era o array com `content[].text` em JSON.
  - `"Enviado para análise no N8N. A resposta não veio em JSON; a publicação não foi atualizada."` — O body da resposta não é JSON válido.
- **503** — Webhook não configurado (`WEBHOOK_N8N_ANALISE_PUBLICACAO_URL` vazio).
- **502** — Erro ao chamar o N8N (rede ou resposta não OK).

O frontend invalida a query da publicação após sucesso; ao atualizar a página os dados já vêm atualizados quando a análise foi gravada.
