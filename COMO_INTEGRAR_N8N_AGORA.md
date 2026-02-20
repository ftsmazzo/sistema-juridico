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

## Importante: envie tudo em um único POST

A API recebe o **array completo** em **uma única requisição**. Você **não** precisa (e não deve) fazer um POST por publicação: monte o array com todas as publicações do e-mail (as 3, 4, 10 que forem) e envie esse array inteiro no body. A API percorre os itens e processa cada um.

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

Você envia **tudo de uma vez**: um único POST com o **array completo** (todas as publicações do e-mail, incluindo o item não-Recorte se vier no mesmo array). Não precisa enviar item por item.

Depois do passo em que você **já tem o array de publicações** (o JSON com 3, 4, 10 itens — tanto faz):

1. Adicione um nó **HTTP Request**.
2. Configure:
   - **Method:** `POST`
   - **URL:** `https://SUA-URL-AQUI/api/webhooks/publicacoes-oab`
   - **Body Content Type:** JSON
   - **Body:** o **array inteiro** de publicações. Duas opções:
     - **Array direto:** `{{ $json }}` (ou a expressão que no seu workflow devolve o array completo).
     - **Objeto com chave:** `{ "publicacoes": {{ JSON.stringify($json) }} }` — se no N8N for mais fácil mandar um objeto com uma propriedade `publicacoes` contendo o array, a API aceita os dois formatos.
3. (Opcional) Quando tiver o secret no EasyPanel:
   - **Header:** `Authorization` = `Bearer SEU_SECRET`  
   ou  
   - **Header:** `X-Webhook-Secret` = `SEU_SECRET`

4. Salve e ative o workflow.

A API processa **todos** os itens do array em uma única requisição: grava as publicações Recorte Digital, cria os prazos de intimação e ignora os itens com `isRecorteDigital: false`.

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
