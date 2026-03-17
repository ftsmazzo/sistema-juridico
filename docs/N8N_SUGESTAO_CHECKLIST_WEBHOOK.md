# Webhook N8N — Sugestão de checklist do prazo

Quando o usuário clica em **"Sugerir passos com IA"** na página de detalhe de um prazo, o sistema envia um POST para a URL configurada em `WEBHOOK_N8N_SUGESTAO_CHECKLIST` com o contexto do prazo (publicação, movimentação e, se houver, dados do processo).

## Payload (POST JSON)

```json
{
  "prazoId": 123,
  "prazo": "Intimação para contestar",
  "data": "2026-04-01",
  "tipo": "civil",
  "conteudo": "Texto do prazo...",
  "numeroProcesso": "1234567-89.2026.8.26.0100",
  "movimentacaoTipo": "Intimação",
  "movimentacaoResumo": "Intimação para apresentar contestação em 15 dias úteis.",
  "publicacao": {
    "resumo": "Resumo da publicação (IA)...",
    "textoCompleto": "Texto completo (até 4000 caracteres)...",
    "vara": "1ª Vara Cível",
    "tipoPublicacao": "Intimação"
  },
  "processo": {
    "numeroCnj": "1234567-89.2026.8.26.0100",
    "status": "Ativo",
    "tipo": "Procedimento Comum Cível",
    "fase": "Contestação",
    "nomeCliente": "Cliente XYZ",
    "nomeAdvogado": "Advogado Responsável",
    "vara": "1ª Vara Cível",
    "comarca": "São Paulo",
    "observacoes": "...",
    "titulo": "Título do processo"
  },
  "ultimasMovimentacoesProcesso": [
    "2026-03-15: Intimação para contestar...",
    "2026-03-01: Citação realizada..."
  ]
}
```

- `processo` e `ultimasMovimentacoesProcesso` só vêm quando o prazo está vinculado a um processo no sistema.
- `textoCompleto` pode ser longo; use para contexto detalhado na IA.

## Resposta esperada

O webhook deve responder com **HTTP 200** e um dos formatos:

**Opção 1 — objeto com lista de itens (recomendado):**

```json
{
  "itens": [
    { "titulo": "Ler a íntegra da intimação" },
    { "titulo": "Elaborar contestação" },
    { "titulo": "Reunir documentos e comprovantes" },
    { "titulo": "Protocolar dentro do prazo" }
  ]
}
```

**Opção 2 — array de strings:**

```json
[
  "Ler a íntegra da intimação",
  "Elaborar contestação",
  "Protocolar dentro do prazo"
]
```

Cada `titulo` é limitado a 500 caracteres no sistema. Itens vazios são ignorados.

## Fluxo sugerido no N8N

1. **Webhook** — recebe o POST.
2. **Prompt para IA** — monte um texto com: tipo de prazo, resumo da movimentação, resumo da publicação e, se existir, dados do processo e últimas movimentações. Peça à IA: "Liste passos objetivos para o advogado cumprir este prazo, em ordem lógica. Retorne apenas um JSON no formato { \"itens\": [ { \"titulo\": \"...\" }, ... ] }."
3. **Parse da resposta da IA** (extrair JSON).
4. **Respond to Webhook** — devolver o JSON no formato acima.

Se o webhook não estiver configurado, o sistema retorna sugestões genéricas conforme o tipo de movimentação (intimação, decisão, audiência, etc.), sem chamar N8N.
