# Análise da planilha Processos (LNSA) e proposta de tabela

## 1. Origem dos dados

- **Arquivo:** `processos/Planilha Processos_LNSA.xlsx`
- **Aba principal para cadastro de processos:** **Proc-G** (dados a partir da linha 7; cabeçalhos na linha 6).

As abas **Clie-F** (pessoas físicas) e **Clie-J** (pessoas jurídicas) são os clientes; na planilha o processo traz o **nome do cliente** em texto. **Conf-P** é tabela de configuração (Fase, Tipo de Ação, Qualificação, Instância, Resultado).

---

## 2. Estrutura da aba Proc-G (cadastro de processos)

Cabeçalhos (linha 6) e tipo de dado inferido a partir dos exemplos:

| # | Coluna na planilha | Tipo sugerido | Exemplo | Observação |
|---|--------------------|---------------|---------|------------|
| 1 | # | integer | 1, 2, 3... | Número sequencial (pode ser id interno) |
| 2 | Status | string | Ativo, Encerrado | Situação do processo |
| 3 | Tipo | string | Judicial | Tipo (Judicial, Administrativo, etc.) |
| 4 | Fase | string | Fase de Sentença, Fase Recursal, Fase Inicial | Fase processual |
| 5 | Nº do Processo | string | 1024471-68.2021.8.26.0506 | Número CNJ (único) |
| 6 | Tipo de Ação | string | Embargos à Execução, Inventário, Cumprimento de sentença | Espécie da ação |
| 7 | Tipo de Cliente | string | Pessoa Física, Pessoa Jurídica | PF ou PJ |
| 8 | Cliente | string | Pepe Oficina, Maria Neide... | Nome do cliente (nosso) |
| 9 | Qualificação (cliente) | string | Autor, Réu, Inventariante, Executante... | Polo do nosso cliente |
| 10 | Outro Envolvido | string | Bradesco Auto RE..., José Aparecido... | Nome da outra parte |
| 11 | Qualificação (outro) | string | Réu, Inventariado, Requerente... | Polo da outra parte |
| 12 | Advogado | string | FERES JUNQUEIRA NAJM, ADRIANO LOURENÇO... | Advogado responsável |
| 13 | Valor da Causa | decimal | 62139.16 | Valor em R$ |
| 14 | Valor de Acordo / Sentença | string/decimal | 62139.16, Não | Valor ou "Não" |
| 15 | Valor Honorários em R$ | string | Não, ou valor | |
| 16 | Valor Honorários em % | string | — | |
| 17 | Sucumbências | string | — | |
| 18 | Total em Honorários | string | — | |
| 19 | Prazo em Aberto? | string | Sim, Não | |
| 20 | Data do Prazo | date | — | Data do próximo prazo |
| 21 | Instância | string | 1ª Instância, Tribunal de Justiça... | |
| 22 | Comarca | string | Ribeirão Preto, São Paulo, Franca | |
| 23 | Vara | string | 2ª Vara Cível, 1ª Vara da Fazenda | |
| 24 | Observações | text | Texto livre | |
| 25 | Data de Início do Processo | date | 44392 (Excel) | Data numérica Excel |
| 26 | Data Fim do Processo | date | 44791 ou vazio | |
| 27 | Duração | string | 1687 dias, 1884 dias | Calculado/descritivo |
| 28 | Resultado | string | Procedente, Acordo, Improcedente... | Quando encerrado |
| 29 | Link do Processo | string (URL) | https://esaj.tjsp.jus.br/... | Link ESAJ ou outro |
| 30 | Link para Pasta de Documentos Digital | string (URL ou path) | — | |
| 31 | Diferença de dias (não apagar!) | integer | 1687 | Uso interno planilha |

Na planilha há ainda duas colunas no fim que parecem “nome para pasta” (ex.: "Pepe Oficina - Embargos à Execução (1024471-68...)"). Podem virar um único campo **titulo** ou **etiqueta** para exibição.

---

## 3. Relacionamentos com o sistema atual

- **Clientes:** hoje não existe tabela `clientes` no banco; existe `pessoas` (e usuários vinculados). Para não misturar com usuários, faz sentido criar uma tabela **clientes** (ou usar **pessoas** com tipo `cliente`) e o processo ter `id_cliente` (ou `id_pessoa`). Na planilha o vínculo é por **nome**; na importação será preciso casar nome com cliente cadastrado ou criar cliente na hora.
- **Advogado responsável:** no sistema já existe `usuarios` com `pessoas` (nome). O processo pode ter `id_usuario_responsavel` (ou `id_pessoa_advogado`) e na importação casar pelo nome do advogado.
- **Prazos / Publicações:** a tabela `prazos` e `publicacoes_oab` já existem e podem ter (ou ganhar) `id_processo` para vincular publicação/prazo a um processo cadastrado.

---

## 4. Proposta de tabela principal: `processos`

Tabela única para o cadastro de processos, espelhando a planilha e permitindo vínculos futuros.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | serial PK | sim | Id interno |
| `numero_cnj` | varchar(50) unique | sim | Nº do processo (CNJ) |
| `status` | varchar(30) | sim | Ativo, Encerrado |
| `tipo` | varchar(30) | não | Judicial, Administrativo |
| `fase` | varchar(80) | não | Fase de Sentença, Fase Recursal, etc. |
| `tipo_acao` | varchar(120) | não | Embargos à Execução, Inventário, etc. |
| `tipo_cliente` | varchar(20) | não | Pessoa Física, Pessoa Jurídica |
| `id_cliente` | integer FK | não | FK para cliente (quando existir tabela clientes) ou pessoa |
| `nome_cliente` | varchar(255) | não | Nome do cliente (redundante para exibição/importação) |
| `qualificacao_cliente` | varchar(60) | não | Autor, Réu, Inventariante, etc. |
| `outro_envolvido` | varchar(255) | não | Nome da outra parte |
| `qualificacao_outro` | varchar(60) | não | Réu, Autor, etc. |
| `id_advogado_responsavel` | integer FK | não | FK para usuarios.id (advogado responsável) |
| `nome_advogado` | varchar(255) | não | Nome do advogado (redundante/importação) |
| `valor_causa` | decimal(18,2) | não | Valor da causa em R$ |
| `valor_acordo_sentenca` | decimal(18,2) | não | Valor de acordo/sentença (ou null) |
| `valor_honorarios_reais` | varchar(50) | não | "Não" ou valor em texto (pode normalizar depois) |
| `valor_honorarios_percentual` | varchar(30) | não | |
| `sucumbencias` | varchar(100) | não | |
| `total_honorarios` | varchar(100) | não | |
| `prazo_em_aberto` | boolean | não | true/false (Sim/Não) |
| `data_prazo` | date | não | Data do próximo prazo |
| `instancia` | varchar(80) | não | 1ª Instância, Tribunal... |
| `comarca` | varchar(120) | não | |
| `vara` | varchar(120) | não | |
| `observacoes` | text | não | |
| `data_inicio` | date | não | Data de início do processo |
| `data_fim` | date | não | Data de encerramento |
| `duracao_texto` | varchar(50) | não | Ex.: "1687 dias" (opcional, pode calcular) |
| `resultado` | varchar(80) | não | Procedente, Acordo, Improcedente |
| `link_processo` | varchar(500) | não | URL ESAJ ou outro |
| `link_pasta_documentos` | varchar(500) | não | Link pasta digital |
| `titulo` | varchar(400) | não | Nome curto para listagem (ex.: Cliente - Tipo Ação (número)) |
| `created_at` | timestamp | sim | |
| `updated_at` | timestamp | sim | |

- **Índices sugeridos:** `numero_cnj` (unique), `status`, `id_cliente`, `id_advogado_responsavel`, `data_inicio`, `data_prazo`.
- **Datas:** na planilha as datas vêm como número serial do Excel (ex.: 44392). Na importação é preciso converter (dias desde 30/12/1899 ou 01/01/1900, conforme o Excel).

---

## 5. Tabelas de apoio (opcional para MVP)

- **clientes** (ou uso de `pessoas` com tipo cliente): id, nome/razão, CPF/CNPJ, tipo (PF/PJ), contato, endereço, etc., para vincular `processos.id_cliente`. Se quiser manter simples no início, pode deixar só `nome_cliente` em processos e criar clientes depois.
- **Conf-P (configuração):** Fase, Tipo de Ação, Qualificação, Instância, Resultado — podem ser listas fixas no código ou tabelas de domínio (ex.: `tipos_acao`, `fases_processo`) para combo no cadastro.

---

## 6. Implementação feita

- **Schema (Drizzle):** tabelas `clientes`, `processos` e `movimentacoes_processo` criadas em `src/db/schema.ts`. Campos de valor em varchar para aceitar "Não" e números da planilha.
- **Vínculos:** `processos.id_cliente` → clientes; `processos.id_advogado_responsavel` → usuarios; `prazos.processo_id` e `publicacoes_oab.processo_id` → processos (opcional).
- **Migração:** `drizzle/0001_windy_silver_sable.sql` (rodar `npm run db:migrate` ou `db:push`).
- **Formas de popular e estrutura relacional:** ver `processos/FORMAS_DE_POPULAR_E_ESTRUTURA_RELACIONAL.md` (importação Excel, cadastro manual, a partir de publicação, vinculação automática por número).
