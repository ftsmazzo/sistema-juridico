# N8N: Claude API para análise de publicações (Recorte Digital OAB)

## ⚠️ Segurança da API Key

**Nunca cole a API key em chat, repositório ou nó em texto fixo.** Se você já expôs a chave em algum lugar:

1. Acesse [Console Anthropic](https://console.anthropic.com/) → API Keys.
2. **Revogue** a chave exposta.
3. Crie uma **nova** chave.
4. No N8N, guarde a nova chave em **Credenciais** (tipo "Header Auth" ou variável) e use `{{ $credentials.apiKey }}` ou variável de ambiente.

---

## Escolher o modelo Claude

Na API da Anthropic você escolhe o modelo pelo parâmetro **`model`** no body da requisição. Exemplos de IDs:

| Modelo              | ID (exemplo)                 | Uso típico                          |
|---------------------|-----------------------------|-------------------------------------|
| Claude Sonnet 4     | `claude-sonnet-4-20250514`  | Bom custo/qualidade para texto     |
| Claude Opus 4       | `claude-opus-4-20250514`    | Máxima qualidade, mais caro        |
| Claude 3.5 Haiku    | `claude-3-5-haiku-20241022` | Rápido e barato                    |

Lista atual: [Anthropic – Models](https://docs.anthropic.com/en/api/models).

Para análise jurídica (resumos, prazos, base legal), **Claude Sonnet** costuma ser o melhor custo-benefício. Use **Opus** se quiser a melhor qualidade e **Haiku** para volume alto e custo menor.

---

## Chamar a API no N8N (HTTP Request)

### 1. Credencial

- Tipo: **Header Auth** (ou Generic Credential).
- Nome: `x-api-key` (ou o nome que a Anthropic pedir).
- Valor: sua API key (a nova, não a exposta).

Ou use variável de ambiente no N8N e referencie no header.

### 2. Nó HTTP Request

- **Method:** POST  
- **URL:** `https://api.anthropic.com/v1/messages`  
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key`: `{{ $credentials.apiKey }}` (ou sua credencial)
  - `anthropic-version`: `2023-06-01` (obrigatório)

- **Body (JSON):**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2048,
  "messages": [
    {
      "role": "user",
      "content": "Aqui vai o texto do prompt + os dados da publicação (veja abaixo)"
    }
  ]
}
```

Troque `claude-sonnet-4-20250514` pelo ID do modelo que quiser (ex.: `claude-3-5-sonnet-20241022`, `claude-opus-4-20250514`).

### 3. Montar o `content` do usuário

O conteúdo da mensagem do usuário deve ser o **prompt completo** + os dados da publicação. No N8N você pode:

- Usar um nó **Set** ou **Code** antes do HTTP Request para montar um campo, por exemplo `promptCompleto`, com o prompt + `{{ $json.textoCompleto }}`, `{{ $json.tipoPublicacao }}`, etc.
- No body do HTTP Request, usar algo como:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2048,
  "messages": [
    {
      "role": "user",
      "content": "{{ $json.promptCompleto }}"
    }
  ]
}
```

Ou montar o body em um Code node que recebe o item do ExtraiPublicacao e devolve o payload do POST (incluindo o texto do prompt com os campos da publicação já interpolados).

### 4. Resposta da Claude

A resposta vem em `response.body.content[0].text`. O MergeEnriquecido espera o JSON nesse `text`. Então:

- Se o nó HTTP Request devolver um item com `body.content[0].text`, o Merge pode usar esse campo para extrair o JSON.
- Se o N8N colocar a resposta em outro formato, ajuste o `getTextFromItem` no `n8n-merge-ia-publicacoes.js` para ler de onde estiver (ex.: `item.json.body.content[0].text`).

---

## Prompt melhorado (texto mais rico)

Use o prompt abaixo no lugar do antigo para que a IA devolva **resumos e observações mais úteis** (menos “pobres”), mantendo o mesmo JSON para o merge.

Ficheiro sugerido: `docs/n8n-prompt-ia-publicacoes-claude.txt` (conteúdo abaixo).

---

```
Você é um assistente jurídico especializado em análise de publicações do Diário da Justiça (Recorte Digital OAB/SP). Sua tarefa é extrair informações práticas para o escritório: o que aconteceu no processo, o que as partes devem fazer e em que prazo.

Entrada:
- textoCompleto: texto integral da publicação
- tipoPublicacao: tipo já identificado (ex.: Intimação, Despacho, Decisão)
- numeroProcesso, dataPublicacao, vara

Instruções:
1. Leia o texto completo com atenção, identificando: tipo de ato, decisões, intimações, prazos expressos e referências a artigos de lei.
2. Devolva APENAS um JSON válido (sem markdown, sem texto antes ou depois), com exatamente estes campos:

{
  "resumo": "Duas a quatro frases objetivas: (a) qual ato foi praticado (ex.: intimação para contestar, decisão que indefere liminar); (b) o que a parte deve fazer, se houver (apresentar contestação, juntar documentos); (c) prazo mencionado no texto, se houver. Use linguagem clara para o advogado.",
  "baseLegal": "Artigo e lei aplicável ao prazo ou ao ato, se o texto mencionar (ex.: Art. 231 CPC, Art. 335 CPC). Deixe vazio se não houver citação explícita. Não invente.",
  "prazoDiasUteisSugerido": número em dias úteis para cumprir o ato, ou 0 se não houver prazo,
  "observacoesIa": "Observações úteis para o escritório: urgência, valor da causa mencionado, prazos internos no texto, riscos (ex.: extinção, revelia), necessidade de juntada de documentos ou procuração. Se nada relevante, deixe vazio.",
  "movimentacoes": [ { "tipo": "Nome do ato (ex.: Intimação, Decisão, Recebimento, Despacho)", "resumo": "Resumo em uma linha do que esse ato determina ou comunica" } ]
}

Regras importantes:
- movimentacoes: se no mesmo texto houver mais de um ato (ex.: "Recebo os embargos... REJEITO os embargos. Intime-se"), liste cada um em um objeto separado. Se for só uma intimação, um único elemento.
- prazoDiasUteisSugerido: intimação para contestar ou manifestar costuma ser 15 dias úteis (CPC). Ajuste se o texto disser outro prazo (ex.: 5 dias, 10 dias). Use 0 se não houver prazo.
- baseLegal: preencha apenas se o texto citar artigo/lei. Não invente.
- resumo e observacoesIa: seja objetivo e útil para o advogado que vai ler na tela; evite repetir o óbvio.

Texto da publicação para analisar:

---
textoCompleto: {{ $json.textoCompleto }}
tipoPublicacao: {{ $json.tipoPublicacao }}
numeroProcesso: {{ $json.numeroProcesso }}
dataPublicacao: {{ $json.dataPublicacao }}
vara: {{ $json.vara }}
---

Responda somente com o JSON, sem markdown e sem texto antes ou depois.
```

---

## Resumo do fluxo com Claude

1. **ExtraiPublicacao (Code)** – continua igual; saída com `textoCompleto`, `tipoPublicacao`, `numeroProcesso`, `dataPublicacao`, `vara`.
2. **Montar prompt (Set ou Code)** – monta o texto do prompt acima substituindo `{{ $json.textoCompleto }}`, etc., e deixa em um campo (ex.: `promptCompleto`).
3. **HTTP Request** – POST para `https://api.anthropic.com/v1/messages` com `model` escolhido (ex.: `claude-sonnet-4-20250514`), `max_tokens` (ex.: 2048), `messages: [{ role: "user", content: "<promptCompleto>" }]`. Headers: `x-api-key`, `anthropic-version: 2023-06-01`.
4. **Ajustar saída (Code, opcional)** – se precisar, mapear `response.body.content[0].text` para o formato que o Merge espera (um campo `text` ou equivalente no item).
5. **MergeEnriquecido (Code)** – `docs/n8n-merge-ia-publicacoes.js`; garantir que ele leia o JSON da resposta da Claude (do campo onde você colocou o `text`).
6. **Monta body → HTTP Request** para sua API (webhook) – como já documentado.

Assim você consegue **escolher o modelo** (Sonnet, Opus, Haiku) alterando só o campo `model` no body da chamada à Claude e usar um **prompt mais rico** para melhorar o texto da automação.
