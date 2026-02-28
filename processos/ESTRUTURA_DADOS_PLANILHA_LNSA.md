# Estrutura de dados: Planilha Processos_LNSA.xlsx

Este documento define a **origem** e a **estrutura de trabalho** do escritório. A planilha LNSA é a base do sistema; as tabelas do banco espelham suas abas e chaves.

**Arquivo:** `Planilha Processos_LNSA.xlsx` (pasta Processos)

---

## 1. Abas e correspondência com o banco

| Aba planilha | Tabela no sistema | Chave / vínculo |
|--------------|-------------------|------------------|
| **Clie-F**   | `clientes` (tipo PF) | Nome (linha) → identificação; casamento por nome com Proc-G |
| **Clie-J**   | `clientes` (tipo PJ) | Nome fantasia / razão social → identificação; casamento por nome com Proc-G |
| **Proc-G**   | `processos`        | **Nº do Processo (numero_cnj)** = chave única do processo |
| **Proc-M**   | `movimentacoes_processo` | **Processo Referência** (número CNJ ou nº de ordem da Proc-G) → `processos.id` |
| **Conf-P**   | (domínios / listas) | Fase, Tipo de Ação, Qualificação, Instância, Resultado — referência, não importada como tabela |

---

## 2. Chaves comuns entre abas

- **Processo:** coluna **Nº do Processo** (Proc-G), valor no formato CNJ (ex.: `1024471-68.2021.8.26.0506`). Único por processo. É a chave que liga:
  - Proc-G → uma linha = um processo.
  - Proc-M → coluna "Processo Referência" pode ser o **número CNJ** ou o **número de ordem** (#) da Proc-G.
- **Cliente:** em Proc-G a coluna **Cliente** (nome em texto) é casada com **Clie-F** (nome) ou **Clie-J** (nome fantasia/razão social). Não há código de cliente na planilha; o vínculo é por **nome** → na importação vira `processos.id_cliente` + `processos.nome_cliente`.
- **Advogado:** coluna **Advogado** (Proc-G) é texto; na importação casado com `usuarios` (nome + sobrenome) → `processos.id_advogado_responsavel` + `processos.nome_advogado`.

---

## 3. Detalhamento por aba

### 3.1 Clie-F (clientes pessoa física)

- **Dados a partir da linha 5** (linha 4 = cabeçalho).
- Colunas usadas na importação (índice 0-based): nome (3), cpf (4), sexo (5), data nascimento (6), telefone (8), email (9), endereço (10), bairro (11), cep (12), cidade (13), estado (14), profissão (15), estado civil (16), como conheceu (17), observações (18).
- **Chave de casamento com processos:** nome (normalizado, ex.: uppercase trim) → mapa nome → `clientes.id`.

### 3.2 Clie-J (clientes pessoa jurídica)

- **Dados a partir da linha 5.**
- Colunas: nome fantasia (1), razão social (2), cnpj (3), telefone (4), email (5), endereço (6), bairro (7), cep (8), cidade (9), estado (10), segmento atuação (11), responsável legal (12), como conheceu (13), observações (14), data cadastro (15).
- **Chave de casamento:** nome fantasia ou razão social (normalizado) → mapa nome → `clientes.id`.

### 3.3 Proc-G (cadastro de processos)

- **Cabeçalhos na linha 6; dados a partir da linha 7.**
- **Chave única:** coluna **Nº do Processo** (índice 4) = `numero_cnj`.
- Colunas mapeadas para `processos` (conforme `importar-planilha-processos.ts`):

| Índice | Coluna planilha           | Campo em `processos`        |
|--------|---------------------------|-----------------------------|
| 1      | Status                    | status                      |
| 2      | Tipo                      | tipo                        |
| 3      | Fase                      | fase                        |
| 4      | Nº do Processo            | numero_cnj                  |
| 5      | Tipo de Ação              | tipo_acao                   |
| 6      | Tipo de Cliente           | tipo_cliente                |
| 7      | Cliente                   | nome_cliente (+ id_cliente por casamento) |
| 8      | Qualificação (cliente)   | qualificacao_cliente        |
| 9      | Outro Envolvido           | outro_envolvido            |
| 10     | Qualificação (outro)      | qualificacao_outro         |
| 11     | Advogado                  | nome_advogado (+ id_advogado_responsavel por casamento) |
| 12     | Valor da Causa            | valor_causa                 |
| 13     | Valor Acordo/Sentença     | valor_acordo_sentenca       |
| 14–17  | Honorários, Sucumbências  | valor_honorarios_* , sucumbencias, total_honorarios |
| 18     | Prazo em Aberto?          | prazo_em_aberto             |
| 19     | Data do Prazo             | data_prazo                  |
| 20     | Instância                 | instancia                   |
| 21     | Comarca                   | comarca                     |
| 22     | Vara                      | vara                        |
| 23     | Observações               | observacoes                 |
| 24     | Data de Início            | data_inicio                 |
| 25     | Data Fim                  | data_fim                    |
| 26     | Duração                   | duracao_texto               |
| 27     | Resultado                 | resultado                   |
| 28     | Link do Processo          | link_processo               |
| 29     | Link Pasta Documentos     | link_pasta_documentos      |
| 31–32  | Título / nome pasta       | titulo                      |

- Datas na planilha vêm como **número serial Excel**; a importação converte para date (YYYY-MM-DD).

### 3.4 Proc-M (movimentações do processo)

- **Dados a partir da linha 5.**
- Colunas: **Processo Referência** (1) = número CNJ ou ordem do processo na Proc-G; **Movimentação** (2); **Data** (3).
- **Chave de vínculo:** "Processo Referência" → se for string com número CNJ, casa com `processos.numero_cnj`; se for número, casa com a ordem (linha) na Proc-G para obter `processos.id` → `movimentacoes_processo.id_processo`.

---

## 4. Fluxo de dados (origem → sistema)

1. **Planilha LNSA** (Excel) → importação (POST /api/processos/importar-excel) →
2. **clientes** (Clie-F + Clie-J), **processos** (Proc-G), **movimentacoes_processo** (Proc-M).
3. A **tabela `processos`** é a tabela de uso do escritório: um registro por processo, chave `numero_cnj`, com vínculos a cliente e advogado.

Qualquer outra fonte (ex.: Escavador) **só enriquece** essa base: atualiza campos em processos já existentes (ou sugere vínculos), **não cria** processos que não tenham origem na planilha ou no cadastro manual do escritório.
