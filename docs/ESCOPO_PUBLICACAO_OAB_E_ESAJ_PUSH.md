# Escopo: O que é a “Publicação” OAB e como funciona o e-SAJ Push

Documento de **profundidade**: origem do dado, o que de fato chega, o que dá para extrair, e o que ainda não está definido no projeto. Inclui o e-SAJ (TJSP) Push para comparação e uso possível.

**Movimento vs Publicação:** para a diferença entre movimento (registro no tribunal) e publicação (texto no diário / no e-mail do Recorte), estrutura real do e-mail, correção do workflow (filtrar item não-Recorte) e estratégia de backfill, ver **[MOVIMENTO_VS_PUBLICACAO_E_MVP_RECORTE.md](./MOVIMENTO_VS_PUBLICACAO_E_MVP_RECORTE.md)**.

---

## 1. O que é a “Publicação” que a OAB manda

### 1.1 Fonte real (fora do nosso sistema)

- **Quem envia:** O **Recorte Digital** é um serviço das **seccionais da OAB** (OAB/SP, OAB/RJ, OAB/MG, etc.). Cada seccional tem seu portal (ex.: recortedigital.oabsp.org.br). O advogado se cadastra (OAB, CPF, e-mail) e fica em situação regular.
- **O que o Recorte faz:** Todo dia o sistema **pesquisa nos diários oficiais de justiça** (DJE dos TJs, TRTs, TRFs, TST, STF, STJ, etc.) onde **aparece o nome do advogado**. São publicações de **intimações**, **despachos**, **citações** e outras movimentações publicadas no diário.
- **O que o advogado recebe:**
  - **Por e-mail:** um **e-mail diário em HTML** com as publicações encontradas naquele dia (geralmente após as 15h).
  - **Pela internet:** as mesmas publicações no portal do Recorte Digital da seccional.

Ou seja: a “Publicação” **na origem** é **uma ocorrência no diário oficial** onde o nome do advogado consta. O que “chega” para o escritório é esse **e-mail em HTML** (um por dia, com uma ou várias publicações dentro).

### 1.2 Conteúdo do e-mail (o que pode estar dentro)

- Cada **publicação** no e-mail costuma corresponder a **um ato publicado no diário**: intimação, citação, decisão publicada, etc.
- Em tese, o e-mail contém:
  - **Dados do ato:** tipo (ex.: Intimação), número do processo, vara, data de publicação/disponibilização, jornal/caderno, página.
  - **O texto do ato:** o **conteúdo integral** que saiu no diário (o “recorte”) — é isso que no nosso sistema virou o campo `textoCompleto`.
- **Formato:** HTML. Ou seja, **não** é um JSON pronto. Pode ter tabelas, divs, múltiplas publicações no mesmo e-mail, cabeçalho/rodapé da OAB, eventualmente avisos ou outros blocos. Dependendo do layout, pode ter “outras coisas” além do ato (texto institucional, links, etc.) que atrapalham uma extração burra.

Conclusão: **sim, em princípio o ato está no e-mail** (é o recorte do diário). O que **não** está definido no projeto é: **(1)** um **exemplo real do HTML** que a OAB/Recorte envia; **(2)** qual **workflow/parser** (N8N ou outro) transforma esse HTML no JSON que a nossa API recebe; **(3)** em produção, o campo `textoCompleto` vem sempre preenchido ou às vezes vazio/parcial por falha de parsing.

### 1.3 O que o nosso sistema recebe (hoje)

Nosso **webhook** não recebe o e-mail bruto. Recebe um **JSON já montado** por um workflow (N8N) que:

1. Lê o e-mail (IMAP/Gmail ou gatilho de agendamento).
2. **Interpreta o HTML** e extrai, por publicação, os campos descritos em `INTEGRACAO_PUBLICACOES_OAB.md`.
3. Envia **POST** para `/api/webhooks/publicacoes-oab` com um **array de itens**, cada um no formato `ItemPublicacaoOab` (ver `src/lib/publicacoes-oab.types.ts`).

Ou seja: **a “Publicação” no nosso sistema** é exatamente **um item desse JSON** — resultado de um parsing que **não está versionado neste repositório**. O que temos definido é o **contrato** (campos, tipos, comportamento da API), não a forma do e-mail nem a lógica de extração.

### 1.4 Campos que usamos para prazo (e o que falta definir)

- **Para criar prazo:** usamos `tipoPublicacao` (ex.: “Intimação”), `dataPublicacao` ou `dataDisponibilizacao`, `numeroProcesso`, `vara`, `textoCompleto`, `advogados` / `numeroOab`, `identificadorDocumento`, `emailId`, `publicacaoNumero`.
- **Deduplicação:** `(emailId, publicacaoNumero)` e `(numeroProcesso, identificadorDocumento)`.

O que **não** está definido no escopo atual:

| Ponto | Situação |
|-------|----------|
| Amostra do e-mail HTML da OAB/Recorte | Não existe no repo; não dá para afirmar “só tem o ato” ou “tem muito lixo” sem abrir um e-mail real. |
| Onde está o parser (N8N ou outro) | Fora do repo; não sabemos se é um workflow compartilhado, interno, ou terceiro. |
| Estrutura do HTML (tags, classes, tabelas) | Não documentada; qualquer mudança no layout do e-mail pode quebrar a extração. |
| Cobertura por seccional | Recorte SP, RJ, MG etc. podem ter layouts ou regras ligeiramente diferentes. |
| `textoCompleto` na prática | Contrato diz “texto integral da publicação”; não há garantia documentada de que sempre vem preenchido. |

**Recomendação de escopo:** Incluir no projeto **(1)** captura de **um ou mais e-mails reais** do Recorte (HTML bruto, anonimizado), **(2)** descrição ou fluxo do **parser** (qual N8N ou ferramenta, onde roda), **(3)** regra explícita: se `textoCompleto` vier vazio, o que fazer (gravar mesmo assim? usar só número do processo + data? alertar?). Assim fica claro “o que é a Publicação” da origem até o banco e onde pode falhar.

---

## 2. e-SAJ (TJSP) – Sistema Push por e-mail

### 2.1 O que é

- **Sistema Push** do **e-SAJ** (Tribunal de Justiça de São Paulo): serviço que **envia e-mail ao advogado quando há movimentação** em processos que ele **cadastrou** para acompanhar.
- Página de acesso: [e-SAJ – Push – Acompanhar Processo Judicial](https://esaj.tjsp.jus.br/esaj/portal.do?servico=750000).
- Dúvidas oficiais: [TJSP – Dúvidas Sistema Push](https://www.tjsp.jus.br/CanaisAtendimentoRelacionamento/DuvidasFrequentes/SistemaPush).

### 2.2 Custo e acesso

- **Custo:** **gratuito**.
- **Quem pode:** apenas usuários de **entidades conveniadas** com o TJSP: **OAB/TJ**, **MP/TJ** e **Defensoria Pública/TJ**.
- **Habilitação:** CPF e número da OAB, com dados atualizados e situação regular na entidade. Cadastro no portal e-SAJ (quem não tem conta, clica em “Não estou habilitado” e cria).

### 2.3 Como o advogado usa (fluxo normal)

1. Acessa o e-SAJ com CPF e senha (ou se habilita).
2. Entra no serviço **Push**.
3. **Cadastra o número do processo** que quer acompanhar.
4. Sempre que houver **movimentação** nesse processo (1ª ou 2ª instância), o TJSP **envia um e-mail** para o endereço cadastrado.

Ou seja: é **uso normal** para advogados que atuam no TJSP — não é serviço pago nem “escondido”. A limitação é que o **próprio advogado precisa adicionar cada processo**; não é uma lista automática por OAB como no Recorte.

### 2.4 O que ainda não está definido (para automatizar)

- **Formato do e-mail do Push:** o TJSP não documenta publicamente o layout (HTML/texto, assunto, corpo). Para usar como fonte automática (ex.: N8N lê a caixa, identifica e-mail do Push, extrai processo + tipo de movimentação + data e chama nossa API), seria necessário:
  - **Capturar um ou mais e-mails reais** do Push (assunto, corpo, anexos se houver).
  - Definir se o e-mail traz **só link** para o e-SAJ ou também **texto da movimentação** no corpo.
- **Escopo de tribunais:** o Push é **só TJSP** (1ª e 2ª instância). Não cobre TRT, TRF, outros TJs. Complementa o Recorte (que cobre vários tribunais), não substitui.

**Resumo e-SAJ Push:** gratuito, de fácil acesso para advogados (OAB/SP), uso diário normal. Para automatizar prazos a partir dele, falta **definir o formato do e-mail** (amostra real + regras de parsing) e aí desenhar o fluxo (ex.: N8N → nossa API), assim como fizemos com o Recorte.

---

## 3. Comparação rápida: Recorte Digital x e-SAJ Push

| Aspecto | Recorte Digital (OAB) | e-SAJ Push (TJSP) |
|---------|------------------------|---------------------|
| Quem envia | OAB (seccional) | TJSP |
| Conteúdo | Publicações em diários onde o **nome do advogado** aparece (vários tribunais) | Movimentações dos **processos que o advogado cadastrou** (só TJSP) |
| Cadastro | E-mail(s) no Recorte; nome já vem do cadastro OAB | Advogado **adiciona cada processo** no Push |
| Formato do e-mail | HTML diário (uma ou várias publicações) | Não documentado; precisa de amostra |
| Custo | Incluso na anuidade OAB (sem custo extra) | Gratuito |
| Cobertura | Múltiplos tribunais (TJ, TRT, TRF, TST, STF, STJ, etc.) | Apenas TJSP (1ª e 2ª instância) |
| No nosso sistema | Webhook recebe JSON **já parseado** (por um workflow externo) | Ainda **não** integrado; falta definir formato do e-mail e parser |

---

## 4. O que falta no projeto (checklist de escopo)

- [ ] **Amostra(s) do e-mail do Recorte Digital** (HTML bruto, anonimizado) para documentar “o que a OAB manda” e validar se o ato está isolado ou misturado a outro conteúdo.
- [ ] **Documentação ou fluxo do parser** que gera o JSON do webhook (qual ferramenta, onde roda, como mapeia HTML → campos).
- [ ] **Regra** quando `textoCompleto` (ou outros campos essenciais) vier vazio ou inválido.
- [ ] **Amostra(s) do e-mail do e-SAJ Push** para definir se dá para extrair processo, tipo de movimentação e data automaticamente.
- [ ] **Decisão:** integrar o Push no mesmo fluxo de “e-mail → parser → API” (N8N lê Push + Recorte) ou em workflow separado.

---

## 5. Sobre “colar e calcular”

A ideia de “colar texto da intimação e o sistema calcular o prazo” **não é automatização** — é o mesmo fluxo manual de hoje (copiar/colar). Foi **rejeitada** como solução a ser apresentada e **não** deve ser tratada como alternativa de automação neste projeto.
