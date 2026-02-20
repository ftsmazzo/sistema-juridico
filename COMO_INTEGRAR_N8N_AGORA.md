# Como integrar o N8N agora (sem interface visual)

Hoje você tem **só a API** no ar: não existe tela de login, dashboard nem listagem no navegador. Mesmo assim a integração com o N8N já funciona: o workflow manda os dados para a API e ela grava no banco.

---

## O que existe hoje

| Existe | Não existe (ainda) |
|--------|---------------------|
| API no EasyPanel (health + webhook) | Site/dashboard para abrir no navegador |
| Banco PostgreSQL com tabelas | Tela de login |
| Endpoint que **recebe** as publicações OAB e cria prazos | Telas para **ver** prazos, audiências, etc. |

Ou seja: **não tem nada “visual”** para o usuário. O que existe é um **serviço** que o N8N chama e que grava no banco.

---

## Fluxo da integração (do e-mail até o banco)

```
E-mail OAB (Recorte Digital)
        ↓
   Seu workflow no N8N
   (lê o e-mail, extrai o JSON)
        ↓
   Nó "HTTP Request" no N8N
   POST para a sua API
        ↓
   API sistema-juridico
   (POST /api/webhooks/publicacoes-oab)
        ↓
   API grava em publicacoes_oab e cria prazos
        ↓
   Dados ficam no PostgreSQL
```

A integração é **só entre N8N e a API**; não precisa de interface web para isso.

---

## Passo a passo: o que fazer no N8N

### 1. URL da API

Você precisa da URL pública do app no EasyPanel, por exemplo:

- `https://sistema-juridico.seudominio.com`  
ou o que o EasyPanel tiver gerado (ex.: `https://xxx.easypanel.host`).

A URL completa do webhook é:

- **`https://SUA-URL-AQUI/api/webhooks/publicacoes-oab`**

(Substitua `SUA-URL-AQUI` pelo domínio/URL real do serviço.)

### 2. No workflow do N8N (o que tem gatilho de agendamento)

Depois do passo em que você **já tem o array de publicações em JSON** (o formato que você mostrou antes):

1. Adicione um nó **HTTP Request** (ou use um que já exista).
2. Configure:
   - **Method:** `POST`
   - **URL:** `https://SUA-URL-AQUI/api/webhooks/publicacoes-oab`
   - **Body Content Type:** JSON
   - **Body:** o array de publicações (a saída do passo anterior do workflow — o JSON com `isRecorteDigital`, `numeroProcesso`, `tipoPublicacao`, etc.).
3. (Opcional) Quando tiver o secret no EasyPanel:
   - **Header:** `Authorization` = `Bearer SEU_SECRET`  
   ou  
   - **Header:** `X-Webhook-Secret` = `SEU_SECRET`

4. Salve e ative o workflow.

Sempre que o workflow rodar (por agendamento ou quando processar um e-mail), ele envia esse JSON para a API; a API grava as publicações e cria os prazos de intimação no banco.

---

## Como saber se está funcionando (sem tela)

- **No N8N:** no nó HTTP Request, veja a resposta. Deve vir algo como:
  - Status **200**
  - Body tipo: `{ "ok": true, "publicacoesRecebidas": 3, "prazosCriados": 3, ... }`
- **Na API:** se tiver log no EasyPanel, deve aparecer algo como “Migração 0000_initial executada” na subida e, ao receber o POST, a API processa sem erro.
- **No banco:** conferir no PostgreSQL se existem linhas em:
  - `publicacoes_oab`
  - `prazos`
  - `prazos_usuarios` (se tiver usuários com `numero_oab` cadastrado)

Para ver o banco você pode usar:
- Ferramenta do EasyPanel (se tiver para o Postgres), ou
- Cliente (DBeaver, pgAdmin, etc.) conectando no mesmo Postgres com a mesma `DATABASE_URL`.

---

## Resumindo

1. **Integrar N8N** = no workflow, depois de montar o JSON das publicações, adicionar um **HTTP Request** em **POST** para:
   - `https://SUA-URL-DO-EASYPANEL/api/webhooks/publicacoes-oab`
   - Body = array de publicações em JSON.
2. **Não tem nada visual** = correto por enquanto; a integração é só N8N → API → banco.
3. **Secret** = pode configurar depois no EasyPanel e no N8N (header `Authorization` ou `X-Webhook-Secret`).
4. **Ver os dados** = por enquanto só pelo banco (ou por um endpoint extra que a gente possa adicionar, por exemplo `GET /api/prazos` para você testar).

Quando tivermos o front (dashboard, login, listagem de prazos), você continuará usando o **mesmo** webhook no N8N; a única diferença é que aí também vai dar para ver os prazos na tela.
