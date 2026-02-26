# Usuários, Pessoas e Perfis — Regras de Negócio e Modelo de Dados

## 1. Visão geral

- **Pessoa**: cadastro de uma pessoa física (pode ser advogado ou não). Dados básicos: nome, contato, e — se for advogado — OAB.
- **Usuário**: acesso ao sistema (login/senha), vinculado a **uma Pessoa**, com **um Perfil** que define o que pode fazer.
- **Perfis**: 4 tipos — **Consultivo**, **Administrativo**, **Advogado**, **Gestor**. Cada usuário tem exatamente um perfil.

No futuro, **Clientes** (módulo micro CRM) poderão ser modelados como Pessoas com tipo "cliente" ou como entidade separada que referencia Pessoa.

---

## 2. Perfis e regras de permissão

| Perfil          | Descrição resumida | Gestão de usuários/pessoas | Prazos | Audiências | Agenda | Relatórios / Gestão geral |
|-----------------|--------------------|----------------------------|--------|------------|--------|----------------------------|
| **Consultivo**  | Só consulta        | Não                        | Ver (próprios ou todos, conforme regra) | Ver | Ver | Não |
| **Administrativo** | Cadastros e tarefas administrativas | Cadastro básico (não gestão total) | Ver/editar (próprios + atribuídos) | Idem | Ver/editar | Relatórios limitados |
| **Advogado**    | Tudo que é dele     | Não                        | Ver/editar **só os seus** | Idem | Ver/editar (próprio) | Não |
| **Gestor**      | Tudo + gestão de todos | Sim (criar/editar usuários, pessoas, perfis) | Ver/editar **todos** | Idem | Tudo | Sim (gestão geral) |

### 2.1 Detalhamento por perfil

- **Consultivo**
  - Apenas leitura: prazos, audiências, agenda, publicações (conforme escopo definido — ex.: só os que tiver permissão de ver).
  - Não cria, não edita, não exclui. Não acessa gestão de usuários nem relatórios gerenciais.

- **Administrativo**
  - Cadastro e manutenção de **informações básicas** (pessoas, contatos, dados auxiliares).
  - Prazos e audiências: ver e editar os **próprios** e os que forem **atribuídos a ele** (ou a um conjunto que o administrativo gerencia).
  - Pode ter relatórios limitados (ex.: prazos do dia/semana, listagens), sem gestão global de usuários.

- **Advogado**
  - Tudo que for **dele**: seus prazos, suas audiências, sua agenda.
  - Não vê nem edita dados de outros advogados. Não gerencia usuários nem acessa relatórios gerenciais.

- **Gestor**
  - **Tudo** que o Advogado tem, **mais**:
  - Ver e editar **todos** os prazos, audiências, agenda.
  - **Gestão de usuários e pessoas**: criar/editar/inativar usuários, vincular a pessoas, atribuir perfil.
  - Relatórios e visões gerenciais (dashboard geral, indicadores).

### 2.2 Resumo prático (quem faz o quê)

- **Consultivo**: só consulta.
- **Administrativo**: cadastro de informações básicas + operação sobre o que lhe for atribuído.
- **Advogado**: só o que é dele (sem gestão de outros).
- **Gestor**: tudo, incluindo gestão de todos e gestão de usuários.

---

## 3. Pessoas: Advogado ou não

- Toda pessoa cadastrada pode ser tipada como **Advogado** ou **Não advogado** (ex.: colaborador, estagiário, contato).
- **Advogado**: preenchimento obrigatório (ou recomendado) de **número OAB**; usado para vincular prazos, publicações OAB, etc.
- **Não advogado**: sem OAB; pode ser usuário do sistema com perfil Consultivo, Administrativo ou (em casos especiais) outros, sem aparecer como “advogado” em prazos/audiências.

Isso permite:
- Cadastrar advogados e não advogados no mesmo lugar.
- Reutilizar **Pessoa** no futuro **módulo Cliente** (cliente = pessoa com tipo "cliente" ou entidade Cliente referenciando Pessoa).

---

## 4. Modelo de dados (tabelas)

### 4.1 `pessoas`

Cadastro único de pessoas (advogados e não advogados).

| Campo         | Tipo        | Descrição |
|---------------|-------------|-----------|
| id            | serial PK   | |
| nome          | varchar(255)| Nome |
| sobrenome     | varchar(255)| Sobrenome |
| email         | varchar(255)| E-mail |
| celular       | varchar(50) | Celular |
| tipo          | varchar(20) | `'advogado'` \| `'colaborador'` \| `'cliente'` (futuro) — default `'colaborador'` |
| numero_oab    | varchar(50) | OAB (quando tipo = advogado) |
| ativo         | boolean     | default true |
| created_at    | timestamp   | |
| updated_at    | timestamp   | |

- **Relacionamento**: um usuário do sistema (tabela `usuarios`) referencia **uma** pessoa (`id_pessoa`).

### 4.2 `perfis` (opcional: tabela de referência)

Se quiser nome/descrição no banco:

| Campo     | Tipo        | Descrição |
|-----------|-------------|-----------|
| id        | serial PK   | |
| codigo    | varchar(30) | `consultivo`, `administrativo`, `advogado`, `gestor` — unique |
| nome      | varchar(100)| Nome de exibição |
| descricao | text        | Opcional |

Caso contrário, o perfil pode ser apenas um **enum no código** e uma coluna `perfil` em `usuarios`.

### 4.3 `usuarios` (acesso ao sistema)

Conta de acesso (login/senha) vinculada a uma pessoa, com um perfil.

| Campo       | Tipo        | Descrição |
|-------------|-------------|-----------|
| id          | serial PK   | |
| id_pessoa   | int FK → pessoas | 1:1 com pessoa (uma pessoa, uma conta; no futuro pode ser 1:N se precisar) |
| login       | varchar(255)| Único |
| senha       | varchar(255)| Hash (ex.: bcrypt) |
| perfil      | varchar(30) | `consultivo` \| `administrativo` \| `advogado` \| `gestor` |
| ativo       | boolean     | default true |
| relatorio   | varchar(255)| Legado (pode migrar depois) |
| created_at  | timestamp   | |
| updated_at  | timestamp   | |

- **Migração**: a tabela atual `usuarios` tem nome, sobrenome, email, celular, login, senha, grupo, numeroOab. Na migração:
  1. Criar tabela `pessoas` e preencher uma pessoa por usuário atual (nome, sobrenome, email, celular, numeroOab, tipo = advogado se tiver OAB senão colaborador).
  2. Adicionar `id_pessoa` em `usuarios`, preencher com o id da pessoa correspondente.
  3. Mapear `grupo` → `perfil` (usuario → advogado, administrativo/gestor mantidos).
  4. Depois remover colunas redundantes (nome, sobrenome, email, celular, numeroOab) de `usuarios` e passar a ler da `pessoas` via JOIN.

### 4.4 Módulo Cliente (futuro — micro CRM)

- **Opção A**: campo `tipo` em `pessoas` com valor `'cliente'`; tabela `clientes` com dados extras (razão social, nome contato, etc.) e FK `id_pessoa`.
- **Opção B**: apenas tabela `clientes` com FK `id_pessoa` (pessoa pode ser ao mesmo tempo “colaborador” e “cliente” em contextos diferentes, ou só cliente).

Recomendação: **Opção A** — pessoa com tipo `cliente` e tabela `clientes` para dados específicos de CRM (empresa, contrato, etc.), permitindo reutilizar o mesmo cadastro de pessoas.

---

## 5. Matriz de permissões (referência para implementação)

| Ação / Recurso        | Consultivo | Administrativo | Advogado | Gestor |
|-----------------------|------------|----------------|----------|--------|
| Ver próprios prazos   | Sim        | Sim            | Sim      | Sim    |
| Ver todos os prazos   | Não*       | Não*           | Não      | Sim    |
| Editar próprios prazos| Não        | Sim            | Sim      | Sim    |
| Editar outros prazos  | Não        | Parcial**      | Não      | Sim    |
| Ver próprias audiências| Sim       | Sim            | Sim      | Sim    |
| Ver todas audiências  | Não*       | Não*           | Não      | Sim    |
| Editar audiências     | Não        | Parcial**      | Só suas  | Sim    |
| Agenda (ver/editar)   | Só ver     | Ver/editar     | Própria  | Tudo   |
| Cadastro de pessoas   | Não        | Sim            | Não      | Sim    |
| Gestão usuários/perfis| Não        | Não            | Não      | Sim    |
| Relatórios gerenciais | Não        | Limitado       | Não      | Sim    |

\* Consultivo/Administrativo: escopo de “quem pode ver o quê” pode ser configurável (ex.: ver todos só leitura para consultivo).  
\** Administrativo: apenas sobre o que for atribuído a ele ou ao seu escopo.

---

## 6. Plano de implementação sugerido

### Fase 1 — Modelo e migração
1. Criar tabela `pessoas` e (opcional) `perfis`.
2. Adicionar em `usuarios`: `id_pessoa` (FK), `perfil` (enum ou FK); manter `grupo` temporariamente para migração.
3. Script de migração: para cada registro em `usuarios`, criar `pessoas` e atualizar `usuarios.id_pessoa`; preencher `perfil` a partir de `grupo`.
4. Ajustar código (API e front) para usar `perfil` e dados da pessoa (JOIN).
5. Remover colunas legadas de `usuarios` (nome, sobrenome, email, celular, numeroOab, grupo) e passar a usar apenas `pessoas` + `perfil`.

### Fase 2 — Módulo usuários no front e API
1. CRUD de **Pessoas** (listar, criar, editar, inativar) — tela só para Gestor (e eventualmente Administrativo para “cadastro básico”).
2. CRUD de **Usuários** (vincular a pessoa, definir login, perfil, ativo) — só Gestor.
3. Telas de listagem filtradas por perfil (quem vê o quê).
4. Middleware/guard na API: checagem de perfil em cada rota (consultivo só GET; advogado filtro por id_pessoa; gestor sem filtro).

### Fase 3 — Módulo Cliente (micro CRM)
1. Estender `pessoas.tipo` com `'cliente'` ou criar tabela `clientes` com `id_pessoa`.
2. Telas básicas: cadastro de cliente, vínculo com pessoa, listagem (e depois atividades, pipeline, etc.).

---

## 7. Variável de ambiente (API)

- **JWT_SECRET**: segredo para assinar o token de autenticação (login). Definir em produção (ex.: `openssl rand -hex 32`).

## 8. Migração de dados (uma vez)

Após rodar a migração `0003_pessoas_e_perfil.sql`, executar o script para preencher `pessoas` e `usuarios.id_pessoa` / `usuarios.perfil`:

```bash
DATABASE_URL=postgresql://... npx tsx src/scripts/migrar-usuarios-para-pessoas.ts
```

## 8.1. Seed dos gestores iniciais (opcional)

Para criar os 2 usuários gestores iniciais (Feres Junqueira Najm e Frederico Mazzo):

```bash
npm run db:seed-gestores
```

Requer `DATABASE_URL` no ambiente. O script é idempotente (não duplica se o login já existir).

## 9. Próximos passos (concluídos na implementação)

- Schema e migração 0003.
- `roles.ts` com 4 perfis e helpers de permissão.
- API: POST /api/auth/login, GET/POST/PATCH /api/pessoas, GET/POST/PATCH /api/usuarios (com middleware requireAuth e checagem de perfil).
- Front: login com token, guard de rota, páginas Pessoas e Usuários (Gestor/Administrativo).
