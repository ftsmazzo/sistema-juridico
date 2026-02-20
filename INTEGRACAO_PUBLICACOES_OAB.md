# Integração: Publicações OAB (Recorte Digital) → Sistema de Prazos

O workflow (N8N ou outro) **lê o e-mail recebido da OAB** com a publicação do Recorte Digital, **extrai o conteúdo** e envia para a API do sistema em JSON. A API grava as **publicações** e, quando for **Intimação**, pode criar automaticamente um **prazo** (ou sugestão) para os advogados vinculados.

---

## 1. Formato de entrada (JSON)

O payload é um **array** de itens. Cada item pode ser:

- **Publicação Recorte Digital** (`isRecorteDigital: true`): contém os campos da publicação.
- **E-mail ignorado** (`isRecorteDigital: false`): contém `publicacoes: []` e `mensagem` explicativa; a API pode ignorar ou só registrar log.

### 1.1 Campos por publicação (Recorte Digital)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `emailId` | string | ID do e-mail na caixa de entrada |
| `subject` | string | Assunto do e-mail |
| `date` | string (ISO) | Data do e-mail |
| `from` | string | Remetente |
| `to` | string | Destinatário |
| `isRecorteDigital` | boolean | `true` = publicação OAB |
| `advogado` | string | Nome do advogado principal (remetente OAB) |
| `numeroOab` | string | Ex.: `"270074 - SP"` |
| `dataProcessamento` | string | Ex.: `"13/02/2026 (SP)"` |
| `totalPublicacoes` | number | Total de publicações no e-mail |
| `publicacaoNumero` | number | Índice desta publicação (1, 2, 3...) |
| `dataDisponibilizacao` | string | Ex.: `"13/02/2026"` |
| `dataPublicacao` | string | Ex.: `"16/02/2026"` (DJE) |
| `jornal` | string | Ex.: `"Diário da Justiça do Estado de SÃO PAULO"` |
| `pagina` | string | Número da página |
| `caderno` | string | Ex.: `"TJSPDJEN"` |
| `local` | string | Ex.: `"DJEN - Diário de Justiça Eletrônico Nacional - TJSP"` |
| `vara` | string | Ex.: `"Foro de Ribeirão Preto - 2ª Vara da Fazenda Pública"` |
| `tipoPublicacao` | string | Ex.: **`"Intimação"`** — é o que gera prazo |
| `numeroProcesso` | string | CNJ (ex.: `"1034726-80.2024.8.26.0506"`) |
| `valorMencionado` | string | Ex.: `"R$30.647,03"` ou vazio |
| `textoCompleto` | string | Texto integral da publicação |
| `advogados` | array | `[{ "nome", "oab" }, ...]` — advogados do processo |
| `poloAtivo` | string | Nome do polo ativo |
| `polosPassivos` | array | Nomes dos polos passivos |
| `urlDocumento` | string | Link para o DJE |
| `identificadorDocumento` | string | ID no DJE |

### 1.2 Item não-Recorte (ignorado)

```json
{
  "emailId": "...",
  "subject": "...",
  "date": "...",
  "isRecorteDigital": false,
  "publicacoes": [],
  "mensagem": "E-mail não é do Recorte Digital OAB - ignorado ou sem publicações."
}
```

---

## 2. Contrato da API (webhook)

### 2.1 Endpoint

```
POST /api/webhooks/publicacoes-oab
Content-Type: application/json
```

**Body:** array JSON no formato acima.

**Autenticação (recomendado):** header `Authorization: Bearer <token>` ou `X-Webhook-Secret: <segredo>` para evitar chamadas indevidas. O workflow deve enviar o segredo configurado no servidor.

### 2.2 Comportamento esperado

1. **Validar** o payload (array; cada item com `isRecorteDigital`).
2. Para cada item com `isRecorteDigital === true` **e** sem campo `publicacoes` vazio (ou seja, é uma publicação válida):
   - **Gravar** na tabela `publicacoes_oab` (ou equivalente) para histórico e auditoria.
   - Se `tipoPublicacao === "Intimação"` (ou normalizado):
     - **Calcular data do prazo:** a partir de `dataPublicacao` (ou `dataDisponibilizacao`), aplicar regra de dias úteis (ex.: 15 dias) conforme política do escritório.
     - **Vincular advogados:** por `numeroOab` ou lista `advogados[].oab` → buscar usuários no sistema com mesmo OAB e vincular ao prazo.
     - **Criar registro de prazo** com: tipo (cível/trabalhista/administrativo inferido ou fixo), data (calculada), conteúdo = `textoCompleto` (ou resumo), observação = número do processo + vara, processo = `numeroProcesso`, e vínculo com a publicação (`publicacao_id`).
3. Para itens com `isRecorteDigital === false`: opcional registrar em log; não criar prazo.
4. **Resposta:** `200 OK` com `{ "ok": true, "publicacoesRecebidas": N, "prazosCriados": M }` (ou detalhes por item).

### 2.3 Regras de negócio (sugestão)

- **Deduplicação:** não criar outro prazo para o mesmo `numeroProcesso` + `identificadorDocumento` (ou `emailId` + `publicacaoNumero`) se já existir publicação/prazo com essa chave.
- **Tipo de prazo:** por padrão considerar **cível** quando for TJSP/DJEN; ou permitir configuração por tribunal/caderno. Trabalhista se vier de TRT, etc.
- **Dias para o prazo:** 15 dias úteis a partir de `dataPublicacao` (ou conforme regra do escritório); configurável depois.
- **Advogados:** só vincular usuários que existirem no sistema e cujo campo OAB (a criar em `usuarios`) coincida com `advogados[].oab` (ex.: `"270074/SP"`). Se nenhum usuário bater, criar o prazo sem vínculo (admin associa depois) ou com o primeiro advogado do e-mail se houver cadastro.

---

## 3. Workflow (N8N) — lado do cliente

- **Gatilho:** agendamento (ex.: a cada 15 min ou 1x por hora) **ou** disparo ao receber e-mail (IMAP/Gmail).
- **Passos:** ler e-mail → extrair/parsear → montar o array JSON acima → **HTTP Request** para `POST https://<sua-api>/api/webhooks/publicacoes-oab` com o JSON no body e header de autenticação.
- O workflow “correto” é o que tem **gatilho de agendamento** (ou e-mail), conforme indicado pelo usuário.

---

## 4. Modelo de dados (resumo)

- **publicacoes_oab:** id, email_id, subject, date_email, from_email, to_email, advogado_principal, numero_oab, data_processamento, total_publicacoes, publicacao_numero, data_disponibilizacao, data_publicacao, jornal, pagina, caderno, local, vara, tipo_publicacao, numero_processo, valor_mencionado, texto_completo, polo_ativo, polos_passivos (JSONB), url_documento, identificador_documento, advogados (JSONB), created_at.  
  **Chave única:** (email_id, publicacao_numero) ou (numero_processo, identificador_documento) para deduplicação.

- **prazos:** (já existente no sistema) + campo opcional `publicacao_oab_id` (FK para publicacoes_oab) quando o prazo foi criado a partir de uma intimação OAB.

- **usuarios:** (já existente) + campo opcional `numero_oab` (ex.: `"270074/SP"`) para casar com `advogados[].oab`.

---

## 5. Exemplo de resposta da API

**Request:** `POST /api/webhooks/publicacoes-oab` com array de 4 itens (3 publicações + 1 não-Recorte).

**Response 200:**

```json
{
  "ok": true,
  "publicacoesRecebidas": 3,
  "publicacoesIgnoradas": 1,
  "prazosCriados": 3,
  "detalhes": [
    { "numeroProcesso": "1034726-80.2024.8.26.0506", "publicacaoId": 1, "prazoId": 101 },
    { "numeroProcesso": "1003735-88.2022.8.26.0572", "publicacaoId": 2, "prazoId": 102 },
    { "numeroProcesso": "1019204-70.2024.8.26.0196", "publicacaoId": 3, "prazoId": 103 }
  ]
}
```

---

*Documento de integração — Publicações OAB (Recorte Digital) → Sistema Agenda e Prazos. Workflow com gatilho de agendamento envia este JSON para o webhook.*
