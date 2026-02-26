# Cadastro de publicação por print (imagem)

O sistema permite cadastrar uma publicação OAB a partir de uma **imagem** (print de tela ou foto). O fluxo:

1. Usuário acessa **Publicações → Nova publicação** (ou `/publicacoes/nova`).
2. Envia a imagem: **arrastando** para a área, **clicando** para escolher arquivo ou **colando** (Ctrl+V) da área de transferência.
3. Clica em **Extrair e cadastrar**.
4. A API envia a imagem para a **IA (OpenAI Vision)** que extrai os dados (número do processo, tipo, vara, data, texto, movimentações, etc.).
5. A publicação é gravada e o mesmo processo do webhook é aplicado: análise IA, movimentações e **prazos** (quando for intimação), com vínculo aos advogados do escritório.

## Configuração

- **OPENAI_API_KEY** (obrigatória para o cadastro por print): chave da API OpenAI.
- **OPENAI_VISION_MODEL** (opcional): modelo de visão; padrão `gpt-4o`.
- **PUBLICACOES_PRINT_PROMPT** (opcional): prompt customizado. Se você já usa um prompt no N8N para análise da publicação, pode colar aqui (texto completo) para a IA seguir as mesmas instruções. O sistema espera que a IA retorne um **objeto JSON** com as chaves: `numeroProcesso`, `tipoPublicacao`, `vara`, `dataPublicacao`, `textoCompleto`, `resumo`, `baseLegal`, `prazoDiasUteisSugerido`, `observacoesIa`, `movimentacoes` (array de `{ tipo, resumo }`).

## Usar o prompt do N8N

Se você tiver o prompt que usa na IA do N8N e os code nodes de extração em JS:

1. **Só o prompt:** defina a variável de ambiente `PUBLICACOES_PRINT_PROMPT` com o texto do prompt. Ajuste se necessário para que a resposta seja **somente JSON** (o sistema já pede "retorne apenas JSON" no system message).
2. **Prompt + formato de saída:** se o seu fluxo N8N devolve um objeto com outros nomes de campos, podemos adaptar o `extrair-publicacao-por-ia.ts` para mapear a resposta da IA para os campos da publicação. Envie o exemplo de JSON que a IA retorna ou o código JS de extração para alinharmos.

## Fluxo técnico

- **Front:** envia a imagem em **base64** (campo `image`) no body de `POST /api/publicacoes/por-print`. Requer autenticação (Bearer).
- **Backend:** `extrairPublicacaoDeImagem()` chama a OpenAI com a imagem + prompt; monta um `ItemPublicacaoOab` com `emailId: "print-{userId}-{timestamp}"` e `publicacaoNumero: 1`; chama `processarItemPublicacaoOab()` (mesma lógica do webhook).
- **Resposta:** `201` com `{ publicacaoId, prazoIds, message }`; o front redireciona para `/publicacoes/:id`.
