# Como os usuários usam o sistema (na prática)

Visão baseada no código do sistema atual: quem faz o quê, fluxos do dia a dia e onde está o atrito.

---

## 1. Quem usa

| Perfil | Quem é | O que vê no menu |
|--------|--------|-------------------|
| **Admin** | Sócio, coordenador ou secretária com permissão total | Tela inicial, Agenda (ver / adicionar / listar), Audiências, Outros anos, Alterar dados, **Painel do Administrador** (Prazos, Audiências, Usuários, Relatórios). |
| **Usuário (advogado)** | Advogados do escritório | Tela inicial, Agenda (ver / adicionar / listar), Audiências, Outros anos, Alterar dados. **Não** vê Painel do Administrador. |

Todos entram pelo **login** (usuário e senha) e têm acesso à **busca** no topo da sidebar (“Pesquisar um prazo...”).

---

## 2. Fluxo do dia a dia (visão geral)

1. **Manhã:** usuário abre o sistema e vai para a **Tela inicial**.
2. Vê os **cards:** Prazos de hoje, Prazos da semana, Audiências na semana (com “quantos cumpridos” e “quantas minhas”).
3. Clica em **“Prazos de hoje”** ou **“Prazos da semana”** → abre **Visualizar prazos** (por data ou semana).
4. Na tela de prazos: filtra por tipo (Administrativo / Trabalhista / Cível), por status (Cumprido / Não cumprido) ou **“Meus prazos”** (só os que têm ele como responsável).
5. Para cada prazo: lê conteúdo, pode **imprimir**, e, se ainda não cumprido, clica em **“Cumprir prazo”** (registra que ele cumpriu naquele momento).
6. Se precisar de **audiências:** vai em **Audiências** e vê o **calendário** com as audiências; clica no evento para ver detalhes (processo, vara, local, partes, preposto, observação).
7. Se precisar de **contato:** vai em **Agenda** → lista alfabética; pode buscar no campo “Pesquisar um contato” (front) ou usar **Listar** para ver todos; **Adicionar novo** ou **Editar** (quem tem permissão).
8. **Admin** ainda: **cadastra/edita prazos e audiências**, **gerencia usuários** e acessa **Relatórios** e **impressão** de relatórios.

O **e-mail diário** (cron) envia a cada usuário ativo a lista de **suas** audiências e **seus** prazos do dia — então parte do uso é “olhar o e-mail e depois abrir o sistema para cumprir ou conferir”.

---

## 3. Tela a tela (o que o usuário realmente faz)

### 3.1 Login

- Acessa `login.php`, digita usuário e senha.
- Se errar, vê notificação “Usuário e/ou senha inválidos”.
- Se acertar, vai para a **Tela inicial** (index).

### 3.2 Tela inicial (Dashboard)

- **Três cards clicáveis:**
  - **Prazos de hoje** → leva para “Visualizar prazos” do dia.
  - **Prazos da semana** → mesma tela, filtro de semana.
  - **Audiências na semana** → leva para a tela de Audiências (calendário).
- Cada card mostra totais e “quantos cumpridos” ou “quantas minhas”.
- Abaixo: **calendário do ano** com os dias que têm prazos coloridos (vencido / atual / em dia / concluído); clica no dia → “Visualizar prazos” daquela data.

**Uso típico:** “Entrei, vi que tenho 3 prazos hoje e 2 cumpridos; clico em ‘Prazos de hoje’ e vou trabalhar a lista.”

### 3.3 Visualizar prazos (dia ou semana)

- Título com a data (ou “semana” com filtros por dia da semana).
- **Filtros:** Mostrar todos | Administrativo | Trabalhista | Cível | Cumprido | Não cumprido | **Meus prazos**.
- **Impressão:** dropdown para imprimir todos ou por tipo (Administrativo / Trabalhista / Cível).
- Lista de **cards**, um por prazo, com:
  - Nome do prazo + data; “Prazo cumprido por Fulano em dd/mm/aaaa hh:mm” (se cumprido).
  - Advogados responsáveis.
  - Observação e Descrição (conteúdo).
  - **Ações (dropdown):** Imprimir prazo | **Cumprir prazo** (se não cumprido) | Descumprir (só admin) | Editar (só admin) | Minimizar | Excluir (só admin).

**Uso típico:** Advogado filtra “Meus prazos” e “Não cumprido”, abre cada card, lê o conteúdo, cumpre no tribunal ou no escritório e clica em “Cumprir prazo”. Admin usa a mesma tela para editar ou excluir.

### 3.4 Cadastrar / editar prazo (só admin)

- Menu Admin → Prazos → **Adicionar novo** ou, a partir da lista/visualizar, **Editar**.
- Formulário: Tipo (Administrativo / Cível / Trabalhista), Data, Prazo (nome/descrição curta), Observação, Conteúdo (texto longo), Status (Não cumprido ou “Cumprido por [usuário]”), Data/hora cumprido, **Advogados** (multi-select).
- Salvar → volta para o formulário (mensagem de sucesso) ou para a lista. Excluir (só na edição) com confirmação.

**Uso típico:** Admin (ou secretária) abre um e-mail/intimação ou anotação, digita tudo manualmente e escolhe os advogados responsáveis. Esse é o ponto mais “pesado” e manual do sistema.

### 3.5 Listar prazos por data (admin)

- Admin → Prazos → **Listar**.
- Tabela: colunas **Data** e **Nº de prazos**; ordenação por data (datepicker no front).
- Clicar na linha → **Lista de prazos daquela data** (tabela com Tipo, Conteúdo, Status); clicar na linha de novo → **Editar prazo**.

**Uso típico:** “Quero ver todos os prazos que vencem no dia X” → Listar → clica na data → vê a lista do dia.

### 3.6 Audiências

- **Tela de audiências:** calendário (FullCalendar ou similar) com os eventos.
- Clicar no evento → **modal** com: número do processo, vara, local, reclamante, reclamado, preposto, data/hora, observação.
- Admin cadastra/edita em Admin → Audiências → Adicionar nova / Listar (e formulário com os mesmos campos).

**Uso típico:** “Ver quando tenho audiência” → abrir calendário; clicar no dia para ver detalhes. Secretária ou admin cadastra quando marca a audiência.

### 3.7 Agenda (contatos)

- **Visualizar:** lista em blocos por letra (A, B, C…); cada contato com nome, telefone, celular, e-mail, endereço, nascimento e botão **Editar** (quem tiver permissão).
- **Pesquisar:** campo no topo (busca no front, filtro na lista).
- **Adicionar novo / Listar:** pelo menu; quem pode editar usa para incluir ou alterar contato.

**Uso típico:** “Preciso do telefone do juiz X” → Agenda → buscar ou rolar até a letra.

### 3.8 Busca (sidebar)

- Campo “Pesquisar um prazo…” no menu; submit por POST para `busca.php`.
- Resultado: mesma lógica de “Visualizar prazos”, mas filtrado por palavra no conteúdo/observação/prazo.
- Filtros por tipo e “Meus prazos” continuam disponíveis.

**Uso típico:** “Lembro que tinha um prazo com a palavra ‘recurso’” → busca “recurso” e filtra.

### 3.9 Alterar dados (perfil)

- Qualquer usuário logado: alterar **nome, sobrenome, e-mail, celular, login** (e **senha** em outro bloco).
- Sem opção de trocar “quem sou” (admin não muda grupo aqui; isso fica em Admin → Usuários).

### 3.10 Outros anos

- Submenu dinâmico: lista os **anos** que têm pelo menos um prazo cadastrado.
- Clicar no ano → tela de **outros-anos.php** (calendário daquele ano, mesma ideia da tela inicial).

**Uso típico:** “Quero ver como foi 2024” → Outros anos → 2024.

### 3.11 Admin: Usuários e Relatórios

- **Usuários:** listar e formulário para adicionar/editar (nome, sobrenome, e-mail, celular, login, senha, ativo, relatório, grupo).
- **Relatórios:** formulário de relatório e listagem/impressão (adm-form-relatorios, adm-list-relatorios, adm-print-relatorios) — critérios e formato dependem da implementação.

---

## 4. Onde está o atrito (na prática)

| Atrito | Onde |
|--------|------|
| **Digitação manual de prazos** | Admin abre formulário e preenche tipo, data, conteúdo, observação, advogados. Nada vem de tribunal ou e-mail automaticamente. |
| **Entrada manual de audiências** | Mesma coisa: processo, vara, local, partes, data/hora tudo digitado. |
| **Lembretes só por e-mail** | Cron envia uma vez ao dia; não há WhatsApp nem alertas progressivos (D-3, D-1). |
| **“Meus prazos” depende do cadastro** | Se o admin não vincular o advogado ao prazo, ele não aparece em “Meus prazos” nem no e-mail. |
| **Editar prazo só no PC** | Não há fluxo “marcar cumprido” por celular/WhatsApp; tem que entrar na web. |
| **Busca só por palavra** | Não há filtro por processo (CNJ), por cliente ou por período avançado na própria busca. |

---

## 5. Resumo em uma frase

**Admin (ou secretária) cadastra prazos e audiências à mão e vincula advogados; os advogados entram na tela inicial, clicam em “Prazos de hoje” ou “Prazos da semana”, filtram por “Meus prazos” e “Não cumprido”, leem o conteúdo e clicam em “Cumprir prazo” quando cumprem; também consultam audiências no calendário e contatos na agenda; o sistema manda um e-mail diário com o resumo do dia.** O maior gargalo é a **entrada manual** de prazos e audiências e a **falta de lembretes por WhatsApp e de automação** (API/Datajud/Jusbrasil) para alimentar o sistema.

---

*Documento de referência — como os usuários usam o sistema atual. Baseado no código em `antigo/`.*
