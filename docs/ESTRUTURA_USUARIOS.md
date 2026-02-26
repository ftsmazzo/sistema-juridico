# Estrutura de usuários: Administrativo, Gestor e Advogados

Definição dos perfis (grupos) de usuário e permissões planejadas para o sistema.

---

## 1. Grupos (campo `usuarios.grupo`)

| Valor no banco | Perfil        | Descrição |
|----------------|---------------|-----------|
| `administrativo` | **Administrativo** | Acesso total: usuários, configurações, relatórios, todos os prazos/audiências/agenda. Pode criar e editar qualquer dado. |
| `gestor`       | **Gestor**    | Visão do escritório: relatórios, listagens gerais, prazos e audiências (leitura ampla ou por equipe). Pode gerenciar advogados e ver indicadores. Não altera configurações globais. |
| `advogado`     | **Advogado**  | Acesso às próprias tarefas: apenas prazos e audiências vinculados a ele (`prazos_usuarios`, `audiencias_usuarios`). Pode marcar cumprido, ver agenda. Não acessa gestão de usuários nem relatórios administrativos. |

- O campo **`grupo`** na tabela `usuarios` deve conter exatamente um desses valores.
- Valor legado possível: `usuario` — tratar como **advogado** até migrar para `advogado`.

---

## 2. Permissões (visão para implementação)

| Recurso / Ação        | Administrativo | Gestor | Advogado |
|-----------------------|----------------|--------|----------|
| Dashboard (totais)     | Sim (geral)    | Sim    | Sim (próprios) |
| Prazos — listar       | Todos          | Todos ou por equipe | Só os vinculados |
| Prazos — criar/editar | Sim            | Conforme regra      | Não (ou só rascunho próprio) |
| Prazos — marcar cumprido | Sim        | Sim (escopo gestor) | Só os seus |
| Audiências — listar   | Todas          | Todas ou por equipe | Só as vinculadas |
| Agenda (contatos)     | CRUD            | Ver/editar          | Só leitura |
| Usuários — CRUD       | Sim            | Não                 | Não |
| Relatórios            | Todos          | Relatórios gestão   | Não |
| Configurações / env  | Sim            | Não                 | Não |
| Webhook OAB           | Sim (config)   | Não                 | Não |

*(Tabela a refinar conforme regras de negócio; API e front devem checar `grupo` antes de expor dados e ações.)*

---

## 3. Dados já no schema

- **`usuarios.grupo`** — já existe; usar para armazenar `administrativo` | `gestor` | `advogado` (e temporariamente `usuario` = advogado).
- **`usuarios.numeroOab`** — usado para vincular prazos das publicações OAB; relevante principalmente para **advogados**.
- **`prazos_usuarios`** / **`audiencias_usuarios`** — definem a quais usuários (advogados) cada prazo/audiência está vinculado; filtro de listagem para advogado.

---

## 4. Próximos passos sugeridos

1. **Migração de dados:** atualizar registros com `grupo = 'usuario'` para `grupo = 'advogado'` (opcional, quando padronizar).
2. **API:** criar middleware ou helper que lê o usuário autenticado e o `grupo`, e aplica filtros (ex.: listar prazos só dos vinculados ao advogado).
3. **Frontend:** esconder ou desabilitar menus (Usuários, Relatórios, Configurações) conforme o `grupo` retornado após login.
4. **Login:** retornar no payload o `grupo` para o front montar o menu e as permissões.

---

*Documento de referência — Estrutura de usuários (Administrativo, Gestor, Advogados).*
