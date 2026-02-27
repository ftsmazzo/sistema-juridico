# Formas de popular processos e estrutura relacional

## 1. Estrutura relacional (espelha a planilha)

```
clientes (PF + PJ, espelha Clie-F e Clie-J)
    ↑
    │ id_cliente
    │
processos (espelha Proc-G) ────── id_advogado_responsavel → usuarios
    │
    ├── movimentacoes_processo (espelha Proc-M: histórico por processo)
    │
    ├── prazos (já existia; ganhou processo_id para vincular prazo ao processo)
    │
    └── publicacoes_oab (já existia; ganhou processo_id para vincular publicação ao processo)
```

- **clientes:** uma tabela para PF e PJ; `tipo` = 'PF' | 'PJ'. Campos de Clie-F (nome, CPF, sexo, data nascimento, profissão, estado civil...) e Clie-J (nome fantasia, razão social, CNPJ, segmento atuação, responsável legal...).
- **processos:** todos os campos da Proc-G; `id_cliente` → clientes; `id_advogado_responsavel` → usuarios. Mantém `nome_cliente` e `nome_advogado` para exibição e para quando a importação não conseguir casar (evita perder o dado).
- **movimentacoes_processo:** histórico de movimentações do processo (Proc-M); `id_processo` → processos.
- **prazos** e **publicacoes_oab:** ganharam `processo_id` (opcional) para vincular prazo/publicação a um processo cadastrado.

---

## 2. Formas de popular (mínimo manual)

### 2.1 Importação em lote a partir do Excel

- **Objetivo:** ler a planilha LNSA e popular clientes, processos e movimentações com o mínimo de digitação.
- **Fluxo sugerido:**
  1. **Importar clientes** (uma vez): abas Clie-F e Clie-J → tabela `clientes`. Criar um registro por linha (a partir da linha 5 nas duas abas). Converter data de cadastro (número serial Excel → date).
  2. **Importar processos:** aba Proc-G (a partir da linha 7) → tabela `processos`. Para cada linha:
     - Converter datas (serial Excel → date) para data_inicio, data_fim, data_prazo.
     - **Casar cliente:** buscar em `clientes` por nome (ou nome fantasia/razão) e preencher `id_cliente`; se não achar, deixar `id_cliente` null e preencher `nome_cliente` com o texto da planilha.
     - **Casar advogado:** buscar em `usuarios` (ou pessoas) por nome e preencher `id_advogado_responsavel`; se não achar, deixar null e preencher `nome_advogado`.
  3. **Importar movimentações:** aba Proc-M → tabela `movimentacoes_processo`. Casar pela coluna "Processo Referência" (número CNJ) com `processos.numero_cnj` para obter `id_processo`; ordem e data conforme a planilha.

- **Implementação:** script Node (ex.: `processos/importar-excel.ts`) ou endpoint protegido `POST /api/processos/importar-excel` (multipart: arquivo .xlsx). Opcional: checkboxes "Importar clientes", "Importar processos", "Importar movimentações" para rodar em etapas.

### 2.2 Cadastro manual (formulário)

- **Objetivo:** criar/editar um processo (e eventualmente cliente) pela tela, quando não vier do Excel.
- **Fluxo:** tela de listagem de processos (filtros por status, advogado, cliente); botão "Novo processo"; formulário com todos os campos da tabela `processos`. Combos: cliente (lista de clientes), advogado responsável (lista de usuários com perfil advogado/gestor). Campos de texto livre para fase, tipo de ação, resultado (ou futuramente listas vindas de tabelas de domínio / Conf-P).
- **Cliente:** se o cliente não existir, opção "Cadastrar novo cliente" (modal ou tela) que grava em `clientes` e já associa ao processo.

### 2.3 A partir de uma publicação OAB (Recorte Digital)

- **Objetivo:** não perder o vínculo quando a publicação já traz o número do processo; reduzir trabalho manual.
- **Fluxo:**
  - Na tela de **detalhe da publicação** (ou na listagem de prazos): exibir "Nº processo: 1024471-68.2021.8.26.0506". Botão **"Vincular a processo"**: abre busca (ou dropdown) por processo cadastrado (busca por `numero_cnj`). Ao escolher, atualiza `publicacoes_oab.processo_id` e, se for o caso, `prazos.processo_id` dos prazos dessa publicação.
  - Botão **"Criar processo a partir desta publicação"**: preenche um formulário (ou modal) com dados já preenchidos: `numero_cnj` = numeroProcesso da publicação, `vara`, `comarca` (se vier no texto), `link_processo` (url documento). Usuário complementa cliente, advogado, tipo de ação etc. e salva. Depois de criar, já seta `publicacoes_oab.processo_id` (e prazos) nesse novo processo.

### 2.4 Vinculação automática por número do processo (opcional)

- **Objetivo:** ao cadastrar uma publicação (webhook N8N ou cadastro por print), se o sistema já tiver um processo com o mesmo `numero_cnj`, preencher automaticamente `publicacoes_oab.processo_id` e, ao criar prazos, preencher `prazos.processo_id`.
- **Implementação:** no fluxo que grava publicação e gera prazos (ex.: `processarItemPublicacaoOab`), após inserir a publicação, fazer `SELECT id FROM processos WHERE numero_cnj = $numeroProcesso` (normalizando espaço/caractere). Se existir, atualizar `publicacao.processo_id` e, ao criar cada prazo, setar `prazo.processo_id`.

---

## 3. Resumo das tabelas criadas/alteradas

| Tabela | Ação | Relacionamento |
|--------|------|----------------|
| **clientes** | Criada | — |
| **processos** | Criada | id_cliente → clientes; id_advogado_responsavel → usuarios |
| **movimentacoes_processo** | Criada | id_processo → processos |
| **prazos** | Alterada | processo_id → processos (opcional) |
| **publicacoes_oab** | Alterada | processo_id → processos (opcional) |

Assim, todos os dados do processo estão contemplados na tabela `processos` (e em `movimentacoes_processo` para o histórico), a estrutura relacional da planilha é preservada (clientes, processos, movimentações, advogado), e há várias formas de popular: **Excel em lote**, **cadastro manual** e **a partir de publicação**, com opção de **vinculação automática** por número do processo.
