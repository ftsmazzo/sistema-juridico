# Arquitetura: Integração dados Escavador ↔ Processos e Clientes

Objetivo: usar os dados já baixados em `dados_escavador` para **enriquecer a tabela de processos** do escritório, **identificar clientes** (polo ativo/passivo) e **estruturar** tudo para evoluir com regras de negócio e inteligência.

---

## 0. Origem dos dados: planilha LNSA = base do sistema

- A **estrutura de trabalho** do escritório vem da **planilha `Planilha Processos_LNSA.xlsx`** (pasta Processos). Ela tem várias abas que se conectam por chaves.
- O **povoamento** que o escritório fez (importação Excel) é a **tabela base**: `clientes` (Clie-F, Clie-J), `processos` (Proc-G), `movimentacoes_processo` (Proc-M). Essa é a **origem** e a **estrutura do sistema**.
- Os **dados raspados do Escavador** incluem processos que **não são ativos** ou **anteriores ao escritório**. Por isso:
  - **Escavador só enriquece a tabela origem** (a que veio da planilha / cadastro do escritório).
  - **Não** criamos processo a partir do Escavador quando o processo não existe no sistema. Só **atualizamos** processos já existentes (por `numero_cnj`) com dados do Escavador (última movimentação, comarca, vara, polo, etc.).
- Estrutura detalhada da planilha (abas, colunas, chaves): **`processos/ESTRUTURA_DADOS_PLANILHA_LNSA.md`**.

---

## 1. Estrutura atual (resumo)

### 1.1 Tabela `processos` (uso do escritório hoje — origem: Proc-G da planilha)

- **Chave:** `numero_cnj` (único) — um processo = uma linha. Origem: coluna **Nº do Processo** da aba **Proc-G**.
- **Relacionamentos:** `id_cliente` → clientes (casamento por nome com Clie-F/Clie-J), `id_advogado_responsavel` → usuarios (casamento por nome).
- **Principais campos:** status, tipo, fase, tipo_acao, id_cliente, nome_cliente, qualificacao_cliente, outro_envolvido, id_advogado_responsavel, nome_advogado, valor_causa, data_prazo, data_inicio, data_fim, comarca, vara, observacoes, link_processo, titulo, etc.
- **O que não tem (e o Escavador tem):** data da **última movimentação**, **quantidade de movimentações**, e de forma explícita **qual polo o escritório representa** (ativo/passivo) e o **nome da parte contrária**.

### 1.2 Tabela `clientes`

- **Uso:** PF/PJ (nome, razao_social, cpf, cnpj, contato, endereço, etc.).
- **Relação:** processos.id_cliente → clientes.id. O processo pode ter `nome_cliente` mesmo sem `id_cliente` (texto livre).
- Não há hoje vínculo direto com “polo” (ativo/passivo).

### 1.3 Tabela `dados_escavador`

- **Chave lógica:** `(numero_cnj, advogado_oab_uf, advogado_oab_numero)` — mesmo processo pode aparecer para vários advogados (várias linhas).
- **Por linha:** um processo **para um advogado (OAB)**. Inclui:
  - **Partes:** `titulo_polo_ativo`, `titulo_polo_passivo` (quem é autor e quem é réu).
  - **Datas:** `data_inicio`, `data_ultima_movimentacao`, `data_ultima_verificacao`.
  - **Juízo:** tribunal_sigla, comarca, vara.
  - **Classificação:** classe_processual, assunto_principal, area, status_predito.
  - **Metadados:** valor_causa, quantidade_movimentacoes, segredo_justica, link_processo.
  - **Advogado:** advogado_nome, advogado_oab_uf, advogado_oab_numero.

### 1.4 Usuários / Advogados

- `usuarios` (login, perfil, etc.) com `numero_oab` (e opcionalmente `id_pessoa` → pessoas).
- O escritório já associa processo a **um** advogado responsável: `processos.id_advogado_responsavel`.

---

## 2. Chaves comuns para integração

| Origem              | Chave / uso na integração |
|---------------------|----------------------------|
| Processo único      | `numero_cnj` (numeroCnj) — mesma coisa em `processos` e `dados_escavador`. |
| Advogado            | OAB: `advogado_oab_uf` + `advogado_oab_numero` (dados_escavador) ↔ `usuarios.numero_oab` (normalizado, ex.: "SP 270074"). |
| Cliente (parte)     | Nome/razão: `titulo_polo_ativo` ou `titulo_polo_passivo` (texto) ↔ `clientes.nome` / `clientes.razao_social` (match por texto). |

Regra prática:

- **Um processo** em `processos` pode ter **várias linhas** em `dados_escavador` (uma por advogado OAB).
- Na integração: para cada `numero_cnj` podemos **agregar ou escolher** uma linha do Escavador (ex.: pela OAB do advogado responsável do processo) para atualizar `processos` e sugerir cliente.

---

## 3. Mapeamento Escavador → Processos (dados a preencher/atualizar)

Campos que o Escavador tem e que fazem sentido em `processos`:

| dados_escavador              | processos (atual ou sugerido)     | Observação |
|------------------------------|-----------------------------------|------------|
| data_ultima_movimentacao     | **novo:** data_ultima_movimentacao | Determinar última mov. do processo (atualizar na integração). |
| quantidade_movimentacoes     | **novo:** quantidade_movimentacoes (opcional) | Metadado útil para relatórios/IA. |
| comarca                      | comarca                            | Preencher se vazio. |
| vara                         | vara                               | Preencher se vazio. |
| valor_causa                  | valor_causa                        | Preencher se vazio. |
| link_processo                | link_processo                      | Preencher se vazio. |
| classe_processual / assunto  | tipo_acao, tipo (ou novo campo)   | Enriquecer classificação. |
| data_inicio                  | data_inicio                        | Já existe; preencher se vazio. |
| titulo_polo_ativo / passivo  | Ver seção Cliente e polo abaixo   | Não gravar direto em processos; usar para cliente e polo. |

Recomendação: **adicionar em `processos`** (migração):

- `data_ultima_movimentacao` (date) — preenchida/atualizada pela integração.
- `quantidade_movimentacoes` (integer, opcional) — se quiser guardar no processo.
- `polo_do_cliente` (varchar, ex.: 'ativo' | 'passivo' | null) — indica se o cliente do escritório é o polo ativo ou passivo (derivado do Escavador + match advogado OAB).

Assim a tabela do escritório continua sendo a fonte da verdade, mas enriquecida com dados do Escavador.

---

## 4. Estratégia: cliente e polo (ativo / passivo)

- No Escavador, cada linha é **por advogado (OAB)**. Esse advogado representa **uma das partes** (polo ativo ou passivo).
- **titulo_polo_ativo** e **titulo_polo_passivo** são os nomes/descrições das partes. O “cliente” do escritório é **uma delas** (a que o advogado representa).

Passos sugeridos:

1. **Vincular processo ao advogado (OAB)**  
   - Ao integrar, usar a linha de `dados_escavador` em que `(advogado_oab_uf, advogado_oab_numero)` = OAB do `id_advogado_responsavel` do processo (ou da primeira linha do processo se ainda não houver advogado).
2. **Inferir o polo do cliente**  
   - Por enquanto: **não sabemos** só pelo Escavador se o advogado está no ativo ou no passivo. Duas opções:
   - **Hipótese por matching:** tentar match de `nome_cliente` (ou nome do cliente em `clientes`) com `titulo_polo_ativo` e com `titulo_polo_passivo`; o que bater define o polo (e o outro é a parte contrária).
   - **Campo manual depois:** gravar em `processos` os dois textos (ou só o que for cliente) e permitir o usuário marcar “polo do cliente = ativo | passivo” na tela; na integração só sugerir.
3. **Usar a tabela `clientes` existente**  
   - **Match:** para cada processo a integrar, buscar em `clientes` por nome/razao_social parecido com `titulo_polo_ativo` e `titulo_polo_passivo`. Se achar um único match razoável → preencher `processos.id_cliente` e, se tiver o campo, `polo_do_cliente`.
   - **Sugestão de novo cliente:** se não houver match e o escritório quiser criar cliente a partir do Escavador, criar registro em `clientes` (ex.: nome = titulo_polo_ativo ou titulo_polo_passivo, tipo = PF ou PJ conforme heurística) e depois vincular ao processo. Isso pode ser uma “sugestão” na tela de integração (não criar em massa sem confirmação).
4. **Campos em processos para organizar**  
   - `polo_do_cliente`: 'ativo' | 'passivo' | null.  
   - Opcional: `nome_polo_contrario` (varchar) — a outra parte, para relatórios e IA.

Resumo: **sim, usar a tabela cliente existente**; usar Escavador para **sugerir** id_cliente e polo (ativo/passivo) por matching e, se desejado, sugerir criação de cliente a partir dos polos.

---

## 5. Estratégia: advogado responsável

- Em `dados_escavador`: `advogado_oab_uf` + `advogado_oab_numero`.
- Em `usuarios`: `numero_oab` (formato pode ser "SP 270074" ou "270074/SP" — normalizar para comparação).
- **Na integração:** ao criar ou atualizar processo a partir de uma linha do Escavador, buscar `usuarios` (ou pessoas) cuja OAB corresponda a essa UF + número e setar `processos.id_advogado_responsavel` e `nome_advogado` se estiver vazio.

---

## 6. Fluxo de integração (visão geral)

**Regra:** só enriquecemos processos **já existentes** (origem planilha ou cadastro). Não criamos processo a partir do Escavador.

1. **Seleção**  
   - Entrada: lista de `numero_cnj` (ou “todos os de dados_escavador que ainda não estão em processos”, ou “todos os processos sem data_ultima_movimentacao”, etc.).
2. **Para cada processo (por numero_cnj):**  
   - Buscar em `dados_escavador` todas as linhas com esse `numero_cnj`.  
   - Se o processo **já existe** em `processos`:  
     - Escolher a linha do Escavador (ex.: pela OAB do `id_advogado_responsavel`; ou a mais recente por `data_ultima_verificacao`).  
     - Atualizar: data_ultima_movimentacao, quantidade_movimentacoes, comarca, vara, valor_causa, link_processo (se vazios ou “sempre atualizar”), e opcionalmente classe/assunto.  
     - Atualizar ou preencher `polo_do_cliente` e nome da parte contrária conforme matching.  
     - Fazer match de cliente por titulo_polo_ativo / titulo_polo_passivo e, se houver um match, sugerir ou preencher `id_cliente`.  
   - Se o processo **não existe** em `processos`:  
     - **Não criar.** A base é a planilha LNSA; processos que só existem no Escavador são ignorados. “sugestão”3. **Cliente**  
   - Sempre que houver match (nome/razão ≈ titulo_polo_ativo ou titulo_polo_passivo), preencher `id_cliente` e `polo_do_cliente`.  
   - Opcional: tela ou relatório “sugestões de cliente” para criar em `clientes` a partir dos polos e depois vincular.

---

## 7. Decisões de modelo (checklist)

- [ ] **Migração:** adicionar em `processos`: `data_ultima_movimentacao` (date), `quantidade_movimentacoes` (integer), `polo_do_cliente` ('ativo'|'passivo'), e opcionalmente `nome_polo_contrario` (varchar).
- [ ] **Integração “só atualizar”:** apenas processos já existentes; preencher/atualizar campos acima + comarca, vara, valor_causa, link_processo.
- [ ] **Integração “criar processo”:** para numero_cnj que está em dados_escavador mas não em processos, não criar processo a partir do Escavador; a base é a planilha LNSA (processos só no Escavador são ignorados).
- [ ] **Match cliente:** regra (ex.: normalizar e comparar nome/razao_social com titulo_polo_ativo e titulo_polo_passivo; mínimo de similaridade).
- [ ] **Polo do cliente:** inicialmente sugerido por match (qual dos dois polos bate com cliente); depois permitir correção manual na tela do processo.
- [ ] **UI:** tela ou modal “Integrar dados Escavador” (por processo, por lote ou “todos pendentes”) com preview e confirmação antes de gravar.

---

## 8. Próximos passos para inteligência

Com essa base:

- **Relatórios:** processos por cliente, por advogado, por polo, por última movimentação.
- **Alertas:** processos sem movimentação há X dias; processos com prazo próximo.
- **IA:** usar cliente, polo, comarca, assunto, última mov. para resumos, sugestões de prazo, priorização.
- **Governança:** manter dados_escavador como cache (não pagar de novo); processos como tabela de uso do escritório sempre enriquecida pela integração.

---

## 9. Resumo em uma frase

**Chave comum:** `numero_cnj`. **Dados Escavador** enriquecem **processos** (última mov., comarca, vara, valor, link, polo) e ajudam a **identificar e vincular clientes** (match por titulo_polo_ativo/passivo) e a **definir o polo do cliente** (ativo/passivo), usando a **tabela clientes existente** e, se quiser, sugerindo novos clientes a partir dos polos; **advogado** é resolvido por OAB → usuarios. Tudo preparado para depois aplicar regras e inteligência em cima de processos e clientes unificados.
