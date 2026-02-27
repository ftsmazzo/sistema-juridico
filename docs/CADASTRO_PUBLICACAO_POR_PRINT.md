# Cadastro de publicação por print (imagem)

O sistema permite cadastrar uma publicação OAB a partir de uma **imagem** (print de tela ou foto). O fluxo:

1. Usuário acessa **Publicações → Nova publicação** (ou `/publicacoes/nova`).
2. Envia a imagem: **arrastando** para a área, **clicando** para escolher arquivo ou **colando** (Ctrl+V) da área de transferência.
3. **Escolhe o provedor de IA (OpenAI ou Claude) e o modelo** nos selects ao lado do botão.
4. Clica em **Extrair e cadastrar**.
5. A API envia a imagem para a **IA escolhida** (OpenAI Vision ou Claude), que extrai os dados (número do processo, tipo, vara, data, texto, resumo, movimentações, etc.).
6. A publicação é gravada e o mesmo processo do webhook é aplicado: análise IA, movimentações e **prazos** (quando for intimação), com vínculo aos advogados do escritório.

## Provedores de IA e modelo

Na tela **Nova publicação por print** é possível:

- **Provedor:** OpenAI (GPT) ou Claude (Anthropic).
- **Modelo:** lista varia conforme o provedor (ex.: GPT-4o, GPT-4o mini, Claude Sonnet 4, Claude Opus 4, Claude 3.5 Haiku).

Basta configurar a chave do provedor que for usar (veja Configuração). O prompt de extração é o mesmo para ambos e está alinhado ao usado no N8N: resumo objetivo, observações úteis, movimentações e base legal.

## Configuração

- **OPENAI_API_KEY** (para usar OpenAI): chave da API OpenAI.
- **ANTHROPIC_API_KEY** (para usar Claude): chave da API Anthropic.
- **OPENAI_VISION_MODEL** (opcional): modelo OpenAI; padrão `gpt-4o`.
- **CLAUDE_VISION_MODEL** (opcional): modelo Claude; padrão `claude-sonnet-4-20250514`.
- **PUBLICACOES_PRINT_PROMPT** (opcional): prompt customizado. O padrão já segue a linha do prompt do N8N (análise jurídica, resumo em 2–4 frases, observacoesIa útil). O sistema espera que a IA retorne um **objeto JSON** com as chaves: `numeroProcesso`, `tipoPublicacao`, `vara`, `dataPublicacao`, `dataDisponibilizacao`, `textoCompleto`, `jornal`, `local`, `resumo`, `baseLegal`, `prazoDiasUteisSugerido`, `observacoesIa`, `movimentacoes` (array de `{ tipo, resumo }`).

Pelo menos uma das chaves (OPENAI ou ANTHROPIC) deve estar configurada. Na tela, o usuário escolhe qual provedor e qual modelo usar na hora de extrair.

## Usar o prompt do N8N

Se você tiver um prompt que já usa no N8N para análise da publicação:

1. Defina **PUBLICACOES_PRINT_PROMPT** com o texto do prompt, **adaptado para análise de imagem** (ex.: “Analise a IMAGEM e extraia…”). O sistema já pede resposta somente em JSON.
2. O prompt padrão da aplicação foi desenhado para dar o mesmo nível de detalhe que o fluxo N8N: resumo útil para o advogado, observacoesIa com urgência/riscos, movimentacoes por ato.

## Fluxo técnico

- **Front:** envia no body de `POST /api/publicacoes/por-print`: `image` (base64), e opcionalmente `provider` (`openai` | `claude`) e `model` (ex.: `claude-sonnet-4-20250514`). Requer autenticação (Bearer).
- **Backend:** `extrairPublicacaoDeImagem(image, { provider, model })` chama OpenAI ou Claude conforme o escolhido; monta um `ItemPublicacaoOab` com `emailId: "print-{userId}-{timestamp}"` e `publicacaoNumero: 1`; chama `processarItemPublicacaoOab()` (mesma lógica do webhook).
- **Resposta:** `201` com `{ publicacaoId, prazoIds, message }`; o front redireciona para `/publicacoes/:id`.
