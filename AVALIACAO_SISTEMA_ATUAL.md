# Avaliação do Sistema Atual — Agenda e Controle de Prazos (Escritório de Advocacia)

**Cliente:** Escritório de Advocacia (Coelho Vignini)  
**Sistema:** Aplicação web para agendamento, audiências e controle de prazos processuais  
**Data da avaliação:** 12/02/2026  

---

## 1. Visão geral

O sistema atual é uma aplicação **PHP monolítica** (sem framework), com frontend em **HTML + Bootstrap + jQuery**, banco **MySQL** e envio de e-mails via **PHPMailer**. O código está na pasta `antigo/` e o dump do banco em `agenda_agendacv.sql`.

| Aspecto | Situação atual |
|--------|----------------|
| **Backend** | PHP puro (short tags `<?`), mysqli |
| **Frontend** | HTML server-side, Bootstrap, jQuery, DataTables, Select2, DateTimePicker |
| **Banco** | MySQL, charset latin1 (depois forçado utf8 em queries) |
| **Autenticação** | Sessão PHP, grupo admin vs usuário |
| **Deploy** | Provável hospedagem compartilhada (`.htaccess` presente) |

---

## 2. Modelo de dados (banco)

### Tabelas principais

- **agenda** — Contatos (nome, telefone, celular, email, endereço, nascimento)
- **usuarios** — Login, nome, sobrenome, email, celular, senha, ativo, relatório, grupo
- **prazos** — tipo (administrativo/cível/trabalhista), data, observação, conteúdo, prazo, status (0 ou id do usuário que cumpriu), data_cumprido, datahoracumprido
- **prazosUsuarios** — N:N entre prazos e usuários (advogados responsáveis)
- **audiencias** — numprocesso, vara, local, reclamante, reclamado, preposto, datahora, observação
- **audienciasUsuarios** — N:N entre audiências e usuários

### Pontos fracos do modelo

- **Charset:** tabelas em `latin1`; risco de problemas com acentuação mesmo com `SET NAMES utf8` em cada script.
- **Senha:** campo armazena hash; na aplicação está em **MD5** (ver seção Segurança).
- **Campo `status` em prazos:** mistura “não cumprido” (0) com “cumprido por usuário X” (id do usuário), o que exige JOIN com `usuarios` para exibir; modelo pouco claro e difícil de estender.
- **Datas:** `data_cumprido` em `prazos` parece redundante com `datahoracumprido`; não há auditoria (created_at, updated_at, quem alterou).
- **Sem soft delete:** exclusões são físicas; não há histórico de alterações.
- **Sem índices** além das primary keys; consultas por data, usuário e tipo podem sofrer com crescimento dos dados.

---

## 3. Segurança (crítico)

### 3.1 Credenciais em código

Em `include/configuracoes.php`:

- **Banco:** usuário, senha e nome do banco fixos no arquivo.
- **E-mail:** host SMTP, porta, usuário e **senha do e-mail** em texto plano.

**Risco:** Qualquer vazamento do código (repositório, backup, FTP) expõe banco e conta de e-mail. **Recomendação:** usar variáveis de ambiente e nunca versionar credenciais.

### 3.2 Autenticação

- **Hash de senha:** MD5 em `seguranca.php`. MD5 é inadequado para senhas (rápido de quebrar, sem salt).
- **Redirecionamento pós-login:** via JavaScript (`window.location`), sem HTTP redirect; aceitável funcionalmente, mas menos idiomático.

### 3.3 SQL

- Uso de `real_escape_string` + concatenação em várias queries (prazos, audiências, usuários, etc.).
- **Prepared statements não são usados** em nenhum ponto analisado.
- Em `adm-form-prazos.php` (linha 41):  
  `DELETE FROM prazosUsuarios WHERE ... AND idUsuario NOT IN (".implode(", ", $_POST['advogados']).")`  
  Os IDs vêm do formulário; se não forem validados como inteiros, há risco de SQL injection.
- Em `index.php` e outras: uso de `$_SESSION['cod']` direto na query; se a sessão for manipulada, pode haver acesso indevido.

**Recomendação:** migrar todas as queries para **prepared statements** e validar/cast todos os inputs (inteiros, datas, etc.).

### 3.4 Controle de acesso

- Verificação de grupo apenas para “admin”; páginas administrativas checam `verificarGrupo('admin')`.
- Não há CSRF em formulários; não há rate limiting no login.
- Logout: `session_destroy()` + redirecionamento; adequado para o modelo atual.

---

## 4. Arquitetura e qualidade de código

- **Monolito por páginas:** cada URL é um arquivo PHP que faz include de config, funções, segurança, abre conexão e mistura lógica + HTML.
- **Conexão ao banco:** nova `mysqli` em **cada** script; não há pool nem camada de acesso centralizada.
- **Duplicação:** mesma lógica de conexão, charset e instanciação de `seguranca` repetida em todos os arquivos.
- **Sem camada de serviço/repositório:** SQL espalhado nos arquivos de tela; difícil de testar e de evoluir.
- **Short tags `<?`:** dependem de configuração do PHP; `<?=` para echo; hoje ainda suportado, mas não é boa prática.
- **Tratamento de erros:** em vários pontos há `die()` com mensagem técnica (ex.: erro do mysqli), expondo detalhes ao usuário.
- **Typo:** em `adm-list-prazos-data.php` sessão usa `"erro-inixistente"` (trecho de mensagem).

---

## 5. Funcionalidades mapeadas

| Módulo | Funcionalidade | Observação |
|--------|----------------|------------|
| **Login** | Autenticação por login/senha | Sem 2FA, sem “lembrar-me” estruturado |
| **Dashboard** | Resumo do dia/semana (prazos, audiências), calendário anual | Calendário com cores por status (vencido, atual, em dia, concluído) |
| **Prazos** | CRUD, listagem por data, por dia, vinculação a advogados, status cumprido/não cumprido, tipo (adm/cível/trabalhista) | Só admin cadastra/edita; usuário visualiza |
| **Audiências** | CRUD, listagem, vínculo com usuários, impressão | Dados processuais (processo, vara, local, partes, preposto) |
| **Agenda** | Contatos (CRUD), listagem alfabética, busca no front | Agenda de contatos do escritório |
| **Usuários** | CRUD (admin), grupos (admin/usuário), permissão de relatório | Senha em texto no formulário de edição (provável reutilização de hash no banco) |
| **Relatórios** | Formulário e listagem (adm-form-relatorios, adm-list-relatorios, adm-print-relatorios) | Não analisado em detalhe |
| **E-mail** | `cron-email.php`: envia por usuário ativo as audiências e prazos do dia | Credenciais no código; sem fila nem retry |

---

## 6. UX / Interface

- **Layout:** tema Bootstrap com sidebar fixa, topbar, widgets com ícones (Font Awesome); visual datado.
- **Navegação:** menu lateral com submenus (Agenda, Prazos, Audiências, Outros anos, Admin); coerente com as funções.
- **Feedback:** notificações via plugin (ex.: $.notify) para sucesso/erro; uso de sessão para mensagens pós-redirecionamento.
- **Formulários:** máscaras (data, data/hora), datepicker com dias úteis (seg–sex); Select2 para multi-select de advogados.
- **Tabelas:** DataTables para listagens; ordenação e busca no cliente.
- **Responsividade:** Bootstrap; não foi testado em mobile.
- **Acessibilidade:** não há foco em ARIA, contraste ou navegação por teclado.

---

## 7. Pontos positivos

- **Escopo claro:** cobre agenda, prazos e audiências de forma alinhada ao dia a dia do escritório.
- **Separação admin/usuário:** usuários veem apenas o que precisam; admin concentra cadastros e listagens.
- **Calendário anual:** visão rápida do ano com indicação de dias com prazos e status.
- **E-mail diário:** cron que envia ao usuário suas audiências e prazos do dia é um diferencial operacional.
- **Multi-advogado por prazo/audiência:** tabelas N:N permitem compartilhar responsabilidades.

---

## 8. Resumo executivo

| Dimensão | Avaliação | Comentário |
|----------|-----------|------------|
| **Segurança** | Crítica | Credenciais no código, MD5, sem prepared statements, risco de SQL injection em pontos. |
| **Manutenção** | Baixa | Código duplicado, sem camada de serviço, SQL nas telas, PHP antigo. |
| **Escalabilidade** | Limitada | Monolito, uma conexão por request, sem cache, sem fila para e-mail. |
| **Funcionalidade** | Adequada | Atende agenda, prazos, audiências e relatórios básicos. |
| **UX** | Regular | Funcional, mas visual e padrões de interação antigos. |
| **Dados** | Melhorável | Modelo útil, mas sem auditoria, sem índices e com decisões estranhas (ex.: status em prazos). |

O sistema **cumpre o papel** de controle de prazos e audiências, mas está **desatualizado em stack, segurança e arquitetura**. Para um escritório que quer “uma ferramenta melhor, mais moderna e mais eficiente”, faz sentido propor **substituição por uma aplicação nova**, com migração dos dados e foco em segurança, usabilidade e evolução futura (ex.: integrações, mobile, notificações, relatórios avançados).

---

## 9. Próximos passos sugeridos

1. **Imediato (se o sistema antigo continuar no ar):**  
   - Mover credenciais para variáveis de ambiente.  
   - Trocar MD5 por **password_hash** (bcrypt) e migrar senhas no próximo login ou com script único.  
   - Introduzir prepared statements nos pontos mais críticos (login, prazos, audiências, usuários).

2. **Para a proposta do novo sistema:**  
   - Usar este documento como base para justificar a substituição.  
   - Definir stack moderna (ex.: API + SPA ou SSR), banco com schema revisado, autenticação robusta, auditoria e melhorias de UX (calendário, filtros, notificações, relatórios).  
   - Incluir migração dos dados atuais e, se desejado, período de convivência ou treinamento.

---

*Documento gerado com base no código em `antigo/` e no dump `agenda_agendacv.sql`.*
