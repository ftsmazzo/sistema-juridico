# Fontes de dados jurídicos e automatização de prazos

**Objetivo:** Entender de onde podem vir os prazos processuais no Brasil (OAB, tribunais, sistemas) e o que é viável usar por **API, dados abertos ou integração** — sem depender só de digitação manual.

---

## 1. Resumo direto

| Pergunta | Resposta |
|----------|----------|
| **A OAB fornece API ou lista de prazos?** | Não. A OAB regula o exercício da profissão; não concentra dados de processos nem prazos. |
| **Existe algo oficial para processos e prazos?** | Sim. O **CNJ** (Conselho Nacional de Justiça) mantém o **Datajud** e uma **API pública** com metadados de processos (capas e **movimentações**). Com as movimentações dá para **derivar ou sugerir prazos**. |
| **Dá para “puxar” processos por advogado (OAB)?** | Sim, via **API comercial** (ex.: **Jusbrasil**): você informa o número da OAB e recebe os CNJs vinculados (e pode receber intimações por webhook). |
| **Raspagem de sites de tribunais?** | Não recomendado: termos de uso, bloqueios, instabilidade e risco jurídico. Preferir sempre API oficial (Datajud) ou integradores (Jusbrasil etc.). |
| **Conclusão** | Dá para automatizar: **(1)** lista de processos por OAB (Jusbrasil) → **(2)** detalhes e movimentações (API Datajud) → **(3)** regras ou IA para extrair/sugerir prazos das movimentações → **(4)** seu sistema cria o prazo (rascunho ou definitivo). Opcional: receber intimações por webhook (Jusbrasil) e criar prazo a partir delas. |

---

## 2. O que cada ator oferece

### 2.1 OAB (Ordem dos Advogados do Brasil)

- **Papel:** registro e fiscalização da advocacia (inscrição, número da OAB).
- **Dados de processos ou prazos:** a OAB **não** possui API pública de processos nem de prazos processuais.
- **Uso no projeto:** o número da OAB serve para **cadastrar o advogado** no seu sistema e, se usar Jusbrasil, para **consultar processos vinculados a essa OAB** (via API deles, não da OAB).

### 2.2 CNJ e Datajud (API pública)

- **O que é:** Base Nacional de Dados do Poder Judiciário; reúne metadados processuais dos tribunais.
- **API pública:**  
  - URL base: `https://api-publica.datajud.cnj.jus.br/`  
  - Documentação: [Datajud – API Pública](https://datajud-wiki.cnj.jus.br/api-publica/)  
  - Acesso: requer **cadastro no portal do CNJ** e credenciais (chave de API).
- **O que a API devolve (resumido):**
  - **Capa do processo:** número CNJ, tribunal, classe, assuntos, órgão julgador, data de ajuizamento, etc.
  - **Movimentações:** para cada movimento:
    - `codigo` (TPU – Tabela Processual Unificada)
    - `nome` (ex.: “Intimação para manifestação”, “Decisão”, “Despacho”)
    - `dataHora` (quando o movimento ocorreu)
    - `complementosTabelados` (variáveis adicionais, quando existirem)
    - `orgaoJulgador`
- **Prazos:** a API **não** retorna um campo “data limite do prazo” pronto. O que existe é a **data do movimento** (ex.: intimação). O **prazo para cumprir** costuma ser calculado por regra (ex.: 15 dias úteis a partir da intimação). Então:
  - **Dá para:** consumir movimentações pela API e, no **seu sistema**, aplicar regras (por tipo de movimento/TPU) ou **IA** para **sugerir a data do prazo** e criar o registro no seu controle de prazos.

### 2.3 Jusbrasil (API comercial)

- **O que é:** produto B2B (Jusbrasil Soluções) com APIs para escritórios.
- **Funcionalidades relevantes:**
  - **Processos por OAB:** você cadastra números de OAB; a API devolve os **CNJs** (processos) vinculados a cada OAB (base própria + consulta em tempo real a tribunais).
  - **Webhook:** quando há novos processos ou atualizações, o Jusbrasil pode enviar os dados para um **endpoint seu** (até 10.000 CNJs por evento).
  - **Intimações:** existe API de **intimações eletrônicas** (comunicações processuais dos tribunais); entrega via webhook para um endpoint que você configurar.
- **Autenticação:** Bearer Token; limites (ex.: 5.000 req/dia, 120/min).
- **Custo:** comercial; é preciso **contratar** (consultar “Como contratar” na documentação).
- **Uso no projeto:**  
  - Manter **lista atualizada de processos** por advogado (OAB) sem digitar.  
  - Receber **intimações** em tempo quase real e, no seu backend ou N8N, **interpretar a intimação** (com regra ou IA) e **criar/sugerir prazo** no seu sistema.

### 2.4 PJe, e-SAJ, e-PROC, Projudi (sistemas dos tribunais)

- **O que são:** sistemas processuais eletrônicos usados pelos tribunais (protocolo, andamentos, intimações).
- **API:** vários têm API (ex.: PJe tem padrões de API REST), mas o acesso é pensado para **o tribunal** ou para **integradores homologados** (ex.: Intima.ai), não para o escritório “raspar” ou chamar direto de forma caseira.
- **Conclusão:** não dá para tratar como “uma API pública que o escritório consome direto”. O caminho é usar **Datajud** (dados agregados pelo CNJ) ou **intermediários** (Jusbrasil, Intima.ai, etc.) que já se conectam a esses sistemas.

### 2.5 Outros (Intima.ai, Codilo, etc.)

- **Intima.ai:** APIs de automação em sistemas judiciais (PJe, e-SAJ, etc.) – envio de petições, protocolos, etc. Modelo B2B.
- **Codilo:** documentação menciona “monitoramento” e “push” de processos; modelo comercial.
- **Uso:** podem ser alternativas ou complementos ao Jusbrasil para **receber** intimações ou **listar** processos; depende de orçamento e do que o escritório já usa.

---

## 3. Onde os prazos “nascem” na prática

- **Intimação / publicação** no processo (movimento com data).
- **Regra legal ou regimentar:** “15 dias úteis”, “5 dias” etc., a partir daquela data.
- **Sistema:** a data do movimento vem da API (Datajud); a **data limite** você calcula (regra fixa por tipo) ou estima com IA.

Por isso:
- **Consumir movimentações** (Datajud ou, se contratar, Jusbrasil com detalhe de movimentos) é a base.
- **Interpretar** cada movimento (por código TPU ou nome) e aplicar **regras de prazo** (ou IA) gera a “data do prazo” que você grava no seu sistema.

---

## 4. Fluxos viáveis de automatização

### 4.1 Só com API pública (CNJ Datajud)

1. Escritório mantém no seu sistema uma **lista de processos** (CNJs) de interesse (cadastro manual ou importação).
2. **N8N ou backend** em cron (ex.: diário) chama a **API Datajud** por processo (por tribunal, conforme documentação).
3. Você recebe as **movimentações** (código, nome, dataHora).
4. No seu sistema:
   - **Regras:** para movimentos conhecidos (ex.: “Intimação para manifestação” → prazo 15 dias úteis a partir de `dataHora`), você calcula a data limite e cria/sugere um prazo.
   - **IA (opcional):** para movimentos com texto ou complementos, usar IA para sugerir tipo de prazo e data.
5. **Resultado:** prazos **sugeridos** ou **criados automaticamente** no seu sistema, com revisão/confirmação pelo advogado se quiser.

**Vantagem:** usa apenas fonte oficial e gratuita (após cadastro).  
**Limitação:** você precisa manter a lista de CNJs (ou obtê-la de outro lugar, ex.: Jusbrasil).

### 4.2 Com Jusbrasil (processos por OAB + webhook)

1. Cadastro das **OABs** do escritório na API Jusbrasil.
2. Jusbrasil envia por **webhook** os **CNJs** vinculados a cada OAB (e atualizações).
3. Seu **backend** ou **N8N** recebe o webhook e:
   - grava/atualiza a lista de processos no seu banco (PostgreSQL),
   - opcionalmente dispara consulta à **API Datajud** para buscar movimentações daqueles CNJs e gerar prazos como no fluxo 4.1.
4. Se contratar o módulo de **intimações**: ao chegar intimação no webhook, você parseia (regra ou IA) e **cria o prazo** no seu sistema.

**Vantagem:** lista de processos por advogado automatizada; possível receber intimações e criar prazos em tempo quase real.  
**Custo:** comercial (Jusbrasil).

### 4.3 Híbrido (recomendado para MVP/Fase 2)

- **Lista de processos:**  
  - **MVP:** cadastro manual (ou planilha importada) dos CNJs.  
  - **Fase 2:** se houver orçamento, Jusbrasil (ou similar) para manter processos por OAB e webhook.
- **Movimentações e prazos:**  
  - **API Datajud** para buscar movimentações dos CNJs que você já tem.  
  - **Regras** (tipo de movimento → prazo em dias úteis) + opcional **IA** para sugerir tipo e data.  
  - **N8N:** cron que chama sua API ou Datajud, processa movimentos e chama sua API para criar/sugerir prazos.
- **Intimações em tempo real:** só se contratar Jusbrasil (ou outro) com entrega por webhook; aí o webhook chama sua API ou N8N e cria o prazo.

---

## 5. Raspagem (scraping)

- **Sites de tribunais (consultas públicas, Diário da Justiça etc.):**  
  - Geralmente há restrições nos termos de uso, captchas e mudanças de layout.  
  - Risco de bloqueio e de questionamento jurídico (abuso de acesso, LGPD).  
- **Recomendação:** **não** basear a solução em raspagem. Preferir **API Datajud** (oficial) e, se fizer sentido, **APIs comerciais** (Jusbrasil, Intima.ai, etc.).

---

## 6. O que colocar no plano do produto

- **Escopo técnico**
  - Integração com **API Datajud** (CNJ) para movimentações e **derivação/sugestão de prazos** por regras e/ou IA.
  - Opcional (Fase 2 / orçamento): **Jusbrasil** (ou similar) para processos por OAB e, se disponível, intimações por webhook.
- **Regras de negócio**
  - Definir **quem** mantém a lista de processos no MVP (manual/importação) e, depois, se será via OAB (Jusbrasil).
  - Definir **tipos de movimento** (TPU/nome) que geram prazo e **regras de contagem** (dias úteis, tipo de prazo).
  - Prazos criados automaticamente podem ser “sugeridos” (advogado confirma) ou “automáticos” (conforme política do escritório).
- **Documentação**
  - Incluir este arquivo (**FONTES_DADOS_JURIDICOS_AUTOMATIZACAO_PRAZOS.md**) no repositório e referenciar no **PLANO_ESCOPO_TECNOLOGIAS_MVP.md** na parte de automação e fontes de dados.

---

## 7. Links úteis

| Recurso | URL |
|--------|-----|
| API Pública Datajud (CNJ) | https://www.cnj.jus.br/sistemas/datajud/api-publica/ |
| Datajud – Wiki (endpoints, glossário) | https://datajud-wiki.cnj.jus.br/api-publica/ |
| Jusbrasil – Documentação API | https://api.jusbrasil.com.br/docs/ |
| Jusbrasil – Processos por OAB | https://api.jusbrasil.com.br/docs/oab/index.html |
| Jusbrasil – Webhook | https://api.jusbrasil.com.br/docs/oab/webhook.html |
| PJe – Padrões de API | https://docs.pje.jus.br/manuais-basicos/padroes-de-api-do-pje |

---

*Documento de referência para o projeto Agenda e Prazos — fontes de dados jurídicos e automatização de prazos. Atualizado em 12/02/2026.*
