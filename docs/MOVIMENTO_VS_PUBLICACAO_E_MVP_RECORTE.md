# Movimento vs Publicação, estrutura real do e-mail e MVP Recorte

Documento feijão-com-arroz: diferença entre **movimento** e **publicação**, por que o movimento “não está na publicação por interpretação”, estrutura real do e-mail do Recorte (com base em amostra), correção do workflow (item extra que não é publicação), MVP e estratégia de histórico.

---

## 1. Movimento vs Publicação (feijão com arroz)

### 1.1 O que é **movimento** (no tribunal)

- **Movimento** é o **registro interno** do sistema do tribunal (PJe, e-SAJ, eProc, etc.) de algo que aconteceu no processo: “Intimação”, “Despacho”, “Decisão”, “Juntada de documento”, “Citação”, etc.
- Cada movimento tem tipicamente: **data**, **tipo** (código TPU ou nome), **texto/resumo**, e fica na **movimentação processual** do processo.
- O tribunal **publica** parte desses atos no **Diário da Justiça** (DJE). Nem todo movimento vira publicação; quando vira, o **texto publicado** é o que aparece no diário.

### 1.2 O que é **publicação** (no Recorte Digital)

- **Publicação** é o que saiu **no Diário da Justiça** (DJE): um “recorte” (trecho) do diário onde consta o nome do advogado.
- O Recorte Digital **não acessa** o sistema do tribunal (não lê “movimentações” do PJe/e-SAJ). Ele **pesquisa no diário oficial** e envia por e-mail o que encontrou.
- Ou seja: o que chega no e-mail é **só o que foi publicado no diário** — o **texto da publicação** (o ato em si, como saiu no DJE). Não é um “movimento” estruturado (código TPU, etc.); é o **conteúdo publicado**.

### 1.3 Por que “o movimento não está na publicação por interpretação”?

- **Movimento** = entidade no sistema do tribunal (estruturada: tipo, data, código).
- **Publicação** = texto que saiu no diário (o “ato” em forma de texto).
- Nós **não recebemos** o movimento do tribunal. Recebemos só o **texto da publicação** (no e-mail do Recorte). A partir desse texto nós **inferimos** tipo (Intimação, Despacho, etc.), processo, data, advogados — ou seja, **interpretamos** o texto para extrair dados. O “movimento” (como registro do tribunal) não vem na publicação; o que vem é o **ato em si em texto**, e nós é que interpretamos para montar o JSON e o prazo. Por isso: o movimento **não está na publicação “por interpretação”** no sentido de “o tribunal mandou o movimento” — está o **texto do ato publicado**, e a **interpretação** é nossa (regex/parser no N8N).

Resumo: **Publicação** = trecho do diário (texto do ato). **Movimento** = registro no sistema do tribunal. No Recorte temos só publicação; “movimento” a gente deriva por interpretação do texto.

---

## 2. Estrutura real do e-mail do Recorte (amostra OAB/SP)

Com base no e-mail real que você forneceu (1 e-mail com 3 publicações):

- **Assunto:** `Recorte Digital OAB/SP. Public. 3. DJSP 13/02/26, DJU 12/02/26 (75.90162334)` (indica 3 publicações).
- **Remetente:** `oabsp@recortedigital.adv.br` (ou encaminado por `feresnajm@adv.oabsp.org.br`).
- **Corpo:** HTML com:
  1. **Cabeçalho** (logo OAB, texto do serviço, link histórico 120 dias).
  2. **Tabela “Recorte Digital - OAB - Resultado da Busca”** com: Advogado(a), Número da OAB, Data processamento/pesquisa.
  3. **Blocos repetidos** para cada publicação, no formato:
     - `Publicação: 1.` (2., 3., …)
     - Data de Disponibilização: DD/MM/AAAA
     - Data de Publicação: DD/MM/AAAA
     - Jornal: Diário da Justiça do Estado de SÃO PAULO
     - Página: 63716
     - Caderno: TJSPDJEN
     - Local: DJEN - …
     - Vara: Foro de …
     - **Publicação:** Intimação (ou outro tipo)
     - Texto completo: `PROCESSO: 1034726-80.2024.8.26.0506 - PROCEDIMENTO COMUM CIVEL - || … ADV: … POLO ATIVO: … POLO PASSIVO: … Acesso ao documento: … Identificador do documento: 531063716`
  4. **Total de Publicações: 3** no final.
  5. Rodapé (termo de uso, imagem webjur).

Em **um** e-mail podem vir **uma ou mais** publicações (no exemplo: 3). Cada bloco “Publicação: N.” é uma publicação; o **ato em si** está no texto após “Publicação: Intimação” / “PROCESSO: …”.

---

## 3. Problema do “último item que não é publicação”

### O que acontece

- O **Gmail (Get Message)** devolve vários e-mails (ex.: últimos 10).
- Entre eles pode vir **1 e-mail do Recorte** (com 3 publicações) e **outros e-mails** (ex.: Lembrete de renovação de domínio).
- O **Code node** faz:
  - Para cada **e-mail** do array de entrada:
    - Se **não** é Recorte → emite **1 item** com `isRecorteDigital: false` e `mensagem: "E-mail não é do Recorte Digital OAB - ignorado..."`.
    - Se **é** Recorte → emite **1 item por publicação** (3 itens), todos com `isRecorteDigital: true`.
  - Resultado: **4 itens** (3 publicações + 1 “não-Recorte”).

A **API** já trata: itens com `isRecorteDigital === false` são ignorados (não grava, não cria prazo). O “problema” é que o **workflow** envia os 4 itens no mesmo POST; a API grava só os 3 e “ignora” o 4º. Funciona, mas:

- O payload fica maior à toa.
- Se no futuro a API mudar, o 4º item pode gerar confusão.

### Solução no workflow: filtrar antes do POST

- **Depois** do Code node e **antes** do HTTP Request (POST para o webhook), coloque um **Filter** (ou **IF**):
  - **Condição:** `{{ $json.isRecorteDigital === true }}`
- Assim **só** itens de publicação Recorte seguem para a API. O item “E-mail não é do Recorte…” **não** é enviado.
- Quem quiser **registrar** e-mails ignorados pode mandar esse 4º item para outro nó (ex.: log, planilha), sem passar no POST.

---

## 4. MVP baseado no Recorte (serviço que todo advogado tem)

- **Fonte:** Recorte Digital OAB (e-mail diário em HTML).
- **Cobertura:** Todo advogado em situação regular tem acesso; fácil de configurar; **sem custo de API** (só e-mail + N8N).
- **Fluxo MVP:**
  1. **Gatilho:** agendado (ex.: a cada 15 min) ou ao receber e-mail.
  2. **Gmail:** buscar últimos N mensagens (ex.: 20).
  3. **Code node:** extrair publicações (código versionado em `docs/n8n-extrator-recorte-oab.js`).
  4. **Filter:** deixar passar só `json.isRecorteDigital === true`.
  5. **Agrupar** os itens filtrados em um **array** (um único body para o POST: array de publicações).
  6. **HTTP Request:** POST `https://<sua-api>/api/webhooks/publicacoes-oab` com body = array e header de autenticação.
- **API:** grava em `publicacoes_oab`, deduplica por `(emailId, publicacaoNumero)` e `(numeroProcesso, identificadorDocumento)`, e para cada item com `tipoPublicacao === "Intimação"` calcula 15 dias úteis e cria prazo + vínculo por OAB.

Isso já entrega **automação sem custo de API**, com base só no que todo advogado tem (Recorte).

---

## 5. Melhorias possíveis no extrator (Code node)

- **Regex mais tolerante** a variação de espaço/encoding em “Publicação: N.” (ex.: `Publicação:\s*(\d+)\s*\.` já cobre bem; garantir que “Total de Publicações” não vire bloco).
- **Cortar o último bloco** em “Total de Publicações: N” para não incluir rodapé no `textoCompleto` (o seu código já faz isso com `totalMatch`).
- **Só emitir itens com publicação válida:** ex.: `numeroProcesso` e `publicacaoNumero` preenchidos; se o bloco vier vazio (ex.: e-mail Recorte sem blocos por falha de parse), continuar emitindo 1 item com `isRecorteDigital: true` e `publicacoes: []` para esse e-mail, e no workflow **não** enviar para a API (ou API ignora quando não tiver `publicacaoNumero`).
- **Subject mais estrito:** considerar só mensagens cujo subject contém “Recorte Digital” **e** “Public.” (ou “Publicação”) para reduzir risco de falso positivo.

O código que você mandou já está alinhado com a estrutura real; as melhorias acima são refinamentos.

---

## 6. Histórico anterior (“só grava daqui pra frente”)

### Por que parece que “tira histórico”

- O fluxo atual processa **só os e-mails que o gatilho traz** (últimos N ou novos). Quem ligou o workflow **hoje** só passa a gravar **a partir de agora**; o que já veio no passado não é reprocessado.

### Como ter histórico: backfill a partir da caixa de e-mail

- O Recorte diz que “Uma cópia dos últimos **120 dias** pode ser obtida acessando o Histórico de Publicações” — no **portal**, não por API. Na **caixa de e-mail**, as mensagens antigas continuam lá (Gmail guarda).
- **Estratégia:** rodar um **fluxo de backfill** (uma vez ou eventualmente):
  1. **Gmail:** buscar mensagens de um **período passado** (ex.: últimos 120 dias) com filtro de subject “Recorte Digital” (ou da pasta/label onde caem os Recortes).
  2. Mesmo **Code node** (extrator).
  3. **Filter:** só `isRecorteDigital === true`.
  4. Agrupar em array e **POST** no mesmo webhook.
  5. A **API** já faz **deduplicação** por `(emailId, publicacaoNumero)` e `(numeroProcesso, identificadorDocumento)` — então publicações já gravadas não serão duplicadas; as que ainda não estavam no banco entram e geram prazos (para intimações) como hoje.

Assim a “mecânica” **não** apaga histórico: ela só não processa o passado por padrão. Para **incluir** o passado, basta rodar o mesmo pipeline sobre e-mails antigos (backfill); o histórico fica na API/banco a partir do que já existia na caixa.

---

## 7. Checklist rápido

- [ ] **Workflow:** Filter após o Code: passar só itens com `json.isRecorteDigital === true` para o POST.
- [ ] **Agrupar:** os itens filtrados em um único array no body do POST (conforme a API espera).
- [ ] **Backfill (opcional):** fluxo ou run manual que busca e-mails dos últimos 120 dias (subject Recorte), usa o mesmo extrator + filter + POST; API deduplica.
- [ ] **Doc e código:** extrator versionado em `docs/n8n-extrator-recorte-oab.js` (ou nome parecido) para referência e evolução.

Com isso: **Movimento vs Publicação** ficam claros, o “ato” está no texto da publicação (e a interpretação é nossa), o item que não é publicação deixa de ir para a API (filter), e o histórico pode ser preenchido por backfill sem perda de dados.
