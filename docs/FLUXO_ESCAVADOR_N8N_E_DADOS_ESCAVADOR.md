# Fluxo Escavador (N8N ou direto no sistema) → dados_escavador → Integrar dados

## Objetivo

- Consumir a API do Escavador (processos por OAB) **uma vez**, organizar os dados e **gravar na tabela `dados_escavador`** para não pagar de novo.
- Você pode fazer isso **pelo N8N** (Code + HTTP Request) ou **direto no sistema** (botão/endpoint que chama o Escavador e grava).
- Campos como **data_ultima_movimentacao** ficam guardados para uso futuro (ex.: alertas, “Integrar dados”).

---

## 1. Tabela `dados_escavador`

Criada pela migração `drizzle/0004_dados_escavador.sql`. Campos principais:

| Campo | Uso |
|-------|-----|
| `numero_cnj` | Chave do processo (único por advogado OAB). |
| `advogado_nome`, `advogado_oab_uf`, `advogado_oab_numero` | Advogado da busca. |
| `data_inicio`, `data_ultima_movimentacao`, `data_ultima_verificacao` | Datas (última mov. importante para funções futuras). |
| `tribunal_sigla`, `comarca`, `vara` | Juízo. |
| `classe_processual`, `assunto_principal`, `area`, `status_predito` | Classificação. |
| `titulo_polo_ativo`, `titulo_polo_passivo` | Partes. |
| `valor_causa`, `quantidade_movimentacoes`, `segredo_justica` | Valores e metadados. |
| `processo_principal_numero`, `link_processo` | Processo relacionado e URL (ex.: ESAJ). |
| `payload_completo` | JSON bruto do Escavador (para não perder nada). |

**Único:** `(numero_cnj, advogado_oab_uf, advogado_oab_numero)` → mesmo processo para o mesmo advogado é **atualizado** (upsert).

---

## 2. N8N: Code node para organizar e enviar

Arquivo: **`docs/n8n-code-escavador-organizar-e-enviar.js`**

- **Entrada:** 1 item com o **body da resposta** do Escavador (processos por OAB). Pode ser array com um objeto `{ advogado_encontrado, items, links, paginator }` ou esse objeto direto.
- **Saída:** 1 item com:
  - `advogado`: `{ nome, oab_uf, oab_numero }`
  - `items`: array de objetos normalizados (um por processo), no formato que a API espera.
  - `_meta`: `{ total_items, next_page }` (opcional; para paginação depois).

O Code tenta obter `oab_uf` e `oab_numero` do nó **Set** (se existir). Caso contrário, tenta extrair do primeiro envolvido com OAB no primeiro item. Se quiser garantir, use um nó **Set** antes do Code com `oab_uf` e `oab_numero` (ex.: vindos do nó que chama o Escavador).

### Fluxo sugerido no N8N

1. **HTTP Request** – GET Escavador (processos por OAB), ex.:  
   `https://api.escavador.com/api/v2/advogado/processos?oab_estado=SP&oab_numero=270074`  
   (com auth e paginação se quiser).
2. **Code** – Colar o conteúdo de `n8n-code-escavador-organizar-e-enviar.js`. Entrada = saída do HTTP Request.
3. **Opcional:** **Set** antes do Code – Definir `oab_uf` e `oab_numero` para o advogado (se não quiser depender da extração no Code).
4. **HTTP Request** – POST para a **API Agenda Prazos**:
   - URL: `{{ $env.BASE_URL }}/api/dados-escavador` (ex.: `https://sua-api.com/api/dados-escavador`).
   - Method: POST.
   - Headers: `Authorization: Bearer <token>` (token de um usuário logado).
   - Body: `{{ $json }}` (o `json` do item que saiu do Code; contém `advogado` e `items`).

Se a API retornar 200, os processos foram gravados ou atualizados em `dados_escavador`.

---

## 3. API: gravar, listar e sincronizar

- **POST /api/dados-escavador** (requer autenticação)  
  - Body: `{ advogado: { nome, oab_uf, oab_numero }, items: [ ... ] }` (exatamente o que o Code do N8N monta).  
  - Faz **upsert** por `(numero_cnj, advogado_oab_uf, advogado_oab_numero)`.  
  - Resposta: `{ ok, total, processados, advogado }`.

- **POST /api/dados-escavador/sincronizar** (requer autenticação)  
  - **Faz tudo no backend:** chama o Escavador, normaliza e grava em `dados_escavador`. Não precisa do N8N.  
  - Requer `ESCAVADOR_API_KEY` (ou `ESCAVADOR_TOKEN`) no ambiente (Bearer token da API Escavador).  
  - Body **um advogado:** `{ "oab_uf": "SP", "oab_numero": "270074" }`.  
  - Body **vários advogados:** `{ "advogados": [ { "oab_uf": "SP", "oab_numero": "270074" }, { "oab_uf": "SP", "oab_numero": "249356" } ] }`.  
  - Exemplo: Feres (270074) e Adriano (249356) — uma requisição com `advogados` atualiza os dois.  
  - Resposta: `{ ok: true, resultados: [ { oab_uf, oab_numero, processados, total_items, advogado, erro? } ] }`.  
  - Uma página por OAB (paginação Escavador pode ser feita em versão futura).

- **GET /api/dados-escavador** (requer autenticação)  
  - Query opcional: `oab_uf`, `oab_numero` (filtrar por advogado).  
  - Retorna lista de registros de `dados_escavador` (para tela futura “Integrar dados”).

---

## 4. Botão “Integrar dados” (futuro)

- Na aplicação (ex.: tela “Dados Escavador” ou “Processos”), um botão **Integrar dados**.
- Ação: para cada registro de `dados_escavador` (ou os selecionados), criar ou atualizar o **processo** na tabela `processos` (e opcionalmente vincular cliente/advogado por OAB/nome).
- Campos como `data_ultima_movimentacao` e `quantidade_movimentacoes` já estarão em `dados_escavador`; na integração podem ir para `processos` se forem adicionados ao schema (ex.: coluna `data_ultima_movimentacao` em `processos`).

Assim você paga uma vez no Escavador, grava em `dados_escavador` e depois só “integra” quando quiser, sem consumir a API de novo.
