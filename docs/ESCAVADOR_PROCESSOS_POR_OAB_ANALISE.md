# Análise: processos por OAB (Escavador) × tabela processos

## 1. Quantidade extraída

| Conceito | Valor |
|----------|--------|
| **Total do advogado no Escavador** | **449** processos (`advogado_encontrado.quantidade_processos`) |
| **Nesta resposta (1ª página)** | **20** processos (`items.length`; `paginator.per_page: 20`) |
| **Advogado** | FERES JUNQUEIRA NAJM (OAB SP 270074) |

Ou seja: você tem **20 processos nesta amostra**; o Escavador informa que esse advogado possui **449** no total. Para trazer todos, é preciso paginar usando `links.next` (cursor).

---

## 2. O que já temos na tabela `processos` e onde buscar no Escavador

| Campo nossa tabela | Origem no JSON Escavador | Observação |
|--------------------|---------------------------|------------|
| `numero_cnj` | `item.numero_cnj` | Direto. |
| `data_inicio` | `item.data_inicio` | String "YYYY-MM-DD". |
| `comarca` | `item.unidade_origem?.cidade` ou `fontes[0].capa.informacoes_complementares` (Jurisdição) | Ex.: Franca, Ribeirão Preto, Conceição das Alagoas. |
| `vara` | `item.unidade_origem?.nome` ou `fontes[0].capa.orgao_julgador` | Ex.: "05 CIVEL DE FRANCA", "12 VARA CIVEL DE RIBEIRAO PRETO". |
| `valor_causa` | Primeira fonte com `capa`: `fonte.capa.valor_causa.valor` ou `valor_formatado` | Ex.: "5246.1300" ou "R$ 5.246,13". |
| `status` | `fontes[0].status_predito` (quando tipo TRIBUNAL) | "ATIVO" ou null; pode virar "Ativo"/"Encerrado". |
| `tipo` / `fase` | `fontes[0].capa.classe` ou `capa.area` | Ex.: "Execução de Título Extrajudicial", "Cumprimento de sentença", "CIVEL". |
| `tipo_acao` | `fontes[0].capa.assunto` ou `assunto_principal_normalizado.path_completo` | Ex.: "Inadimplemento", "DIREITO CIVIL > Obrigações > Inadimplemento". |
| `instancia` | `fontes[0].grau_formatado` | "Primeiro Grau", "Segundo Grau". |
| `nome_cliente` | `item.titulo_polo_ativo` (ou polo do nosso cliente) | Autor/exequente. |
| `outro_envolvido` | `item.titulo_polo_passivo` | Réu/executado. |
| `nome_advogado` | `advogado_encontrado.nome` (no topo da resposta) | Quem consultou por OAB. |
| `link_processo` | `fontes[].url` (quando existe) | Ex.: link ESAJ em uma das fontes. |
| `titulo` | Montar: `titulo_polo_ativo vs titulo_polo_passivo` ou só um deles | Resumo das partes. |

Com isso já dá para **criar/atualizar** registros na tabela `processos` a partir do payload do Escavador (casando por `numero_cnj` e, se quiser, preenchendo `id_advogado_responsavel` pelo OAB 270074 no `usuarios`).

---

## 3. Dados do Escavador que podem enriquecer a tabela (novos campos)

Estes campos **não existem** hoje na tabela e aparecem no Escavador; faz sentido avaliar incluir:

| Dado Escavador | Onde fica no JSON | Sugestão de uso |
|----------------|-------------------|------------------|
| **Tribunal** | `item.unidade_origem.tribunal_sigla` ou `fontes[0].tribunal.sigla` | TJSP, TRF3, TJMG. Útil para filtros e relatórios. **Sugestão:** coluna `tribunal_sigla` (varchar). |
| **Data última movimentação** | `item.data_ultima_movimentacao` | Atualização do processo. **Sugestão:** coluna `data_ultima_movimentacao` (date). |
| **Quantidade de movimentações** | `item.quantidade_movimentacoes` | Indicador de atividade. **Sugestão:** coluna `quantidade_movimentacoes` (integer) ou manter só em `movimentacoes_processo`. |
| **Classe processual** | `fontes[0].capa.classe` | Ex.: "Execução de Título Extrajudicial", "Agravo de Instrumento". Já podemos colocar em `tipo` ou `fase`; se quiser separado: **Sugestão:** `classe_processual` (varchar). |
| **Segredo de justiça** | `fontes[0].segredo_justica` | boolean. **Sugestão:** coluna `segredo_justica` (boolean). |
| **Processo principal (relacionado)** | `item.processos_relacionados[]` (ex.: número do processo principal) | Para cumprimento de sentença, etc. **Sugestão:** coluna `numero_processo_principal` (varchar) ou `id_processo_principal` (FK). |
| **URL do processo** | `fontes[].url` (ex.: ESAJ) | Já temos `link_processo`; pode vir da primeira fonte que tiver `url`. |
| **Estado de origem** | `item.estado_origem.sigla` | SP, MG. Pode ir em `observacoes` ou **Sugestão:** coluna `uf_tribunal` (varchar 2). |

Resumo de **enriquecimento imediato sem mudar schema**: usar os campos da seção 2 para preencher `numero_cnj`, `data_inicio`, `comarca`, `vara`, `valor_causa`, `status`, `tipo`/`fase`/`tipo_acao`, `instancia`, `nome_cliente`, `outro_envolvido`, `nome_advogado`, `link_processo`, `titulo`.  

Para **enriquecer mais** (e melhorar filtros/relatórios), os campos da seção 3 são os melhores candidatos a novas colunas: `tribunal_sigla`, `data_ultima_movimentacao`, opcionalmente `classe_processual`, `segredo_justica`, `numero_processo_principal` e/ou `uf_tribunal`.

---

## 4. Observações sobre o payload

- **Múltiplas fontes:** Um processo pode ter várias entradas em `fontes` (tribunal 1º grau, 2º grau, diário oficial). Para preencher a tabela, use preferencialmente a fonte com `tipo: "TRIBUNAL"` e `capa` preenchida; se não houver, use a primeira fonte com dados.
- **Polo ativo/passivo:** Em processos com sigilo, `titulo_polo_ativo` ou `titulo_polo_passivo` podem vir como "Sigilo"; mesmo assim dá para gravar número, comarca, vara, datas e valor quando disponíveis.
- **Vínculo ao advogado:** Para preencher `id_advogado_responsavel`, buscar em `usuarios` por `numeroOab` = "270074" (e UF SP); o nome do advogado vem em `advogado_encontrado.nome`.
- **Clientes:** Para preencher `id_cliente`/`nome_cliente`, é possível tentar casar `titulo_polo_ativo` ou `titulo_polo_passivo` com a tabela `clientes` (por nome ou CNPJ/CPF quando o Escavador trouxer nos envolvidos).

Se quiser, o próximo passo pode ser: (1) definir quais colunas novas criar (seção 3) e gerar migração, ou (2) implementar um endpoint/script que receba esse JSON (por página ou completo) e faça insert/update em `processos` usando apenas os campos atuais.
