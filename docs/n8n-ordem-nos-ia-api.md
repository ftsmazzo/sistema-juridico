# Ordem dos nós: ExtraiPublicacao → IA → Merge → API

## 1. Fluxo (esquerda → direita)

```
[Gmail/Trigger] → [ExtraiPublicacao] → [IA] → [MergeEnriquecido] → [Monta body] → [HTTP Request]
```

---

## 2. Nó 2: ExtraiPublicacao (Code)

Já está feito. Saída: vários itens (um por publicação).

---

## 3. Nó 3: IA (OpenAI / Anthropic / etc.)

- **Tipo:** OpenAI, Anthropic, ou outro que aceite prompt e devolva texto.
- **Entrada:** cada item do ExtraiPublicacao (o nó recebe 1 item por vez e roda N vezes).
- **Prompt:** use o conteúdo de `docs/n8n-prompt-ia-publicacoes.txt`. No N8N, monte o texto do prompt e use as variáveis `{{ $json.textoCompleto }}`, `{{ $json.tipoPublicacao }}`, `{{ $json.numeroProcesso }}`, `{{ $json.dataPublicacao }}`, `{{ $json.vara }}`.
- **Importante:** configure o nó de IA para **não substituir** o item: use opção tipo **“Merge with input”** ou **“Put output in field”** (ex.: campo `text` ou `output`) para que o item na saída continue tendo os campos do ExtraiPublicacao (emailId, textoCompleto, etc.) e mais o campo com a resposta da IA. Assim o Merge consegue juntar tudo.

---

## 4. Nó 4: MergeEnriquecido (Code)

- **Tipo:** Code.
- **Código:** cole o conteúdo de `docs/n8n-merge-ia-publicacoes.js`.
- **Entrada:** saída do nó de IA (cada item = publicação original + resposta da IA).
- **Saída:** um item por publicação com todos os campos originais + `resumo`, `baseLegal`, `prazoDiasUteisSugerido`, `observacoesIa`, `movimentacoes`.

---

## 5. Nó 5: Monta body (Code)

Agrupa todos os itens em um único array para o POST.

```js
const items = $input.all();
return [{ json: { publicacoes: items.map(i => i.json) } }];
```

Ou, se a API aceitar array na raiz:

```js
return [{ json: $input.all().map(i => i.json) }];
```

(Ajuste conforme o seu endpoint: body = `{{ $json.publicacoes }}` ou `{{ $json }}`.)

---

## 6. Nó 6: HTTP Request

- **Method:** POST
- **URL:** `https://<sua-api>/api/webhooks/publicacoes-oab`
- **Body:** `{{ $json.publicacoes }}` (ou o que combinou no Monta body).
- **Headers:** `Content-Type: application/json`, e se usar segredo: `Authorization: Bearer <token>` ou `X-Webhook-Secret: <segredo>`.

---

## 7. Banco de dados

A API passou a gravar os campos enriquecidos pela IA em `publicacoes_oab`: `resumo`, `base_legal`, `prazo_dias_uteis_sugerido`, `observacoes_ia`, `movimentacoes`. É preciso criar e rodar a migration para essas colunas (ex.: `npx drizzle-kit generate` e `npx drizzle-kit migrate`).
