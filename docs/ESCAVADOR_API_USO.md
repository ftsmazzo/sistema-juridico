# Uso da API Escavador no projeto

## Teste do token (20/02/2025)

Chamada **grátis** usada para validar o token:

- **URL:** `GET https://api.escavador.com/api/v2/tribunais`
- **Resultado:** Status 200, `Creditos-Utilizados: 0`

---

## Rotas por custo

| Custo | Rotas | Uso |
|-------|--------|-----|
| **Grátis (0 créditos)** | `GET /api/v2/tribunais`, `GET /api/v2/tribunais/sistemas`, callbacks (listar/marcar/reenviar), certificados | Testar token, listar tribunais para filtros |
| **Pago** | Processo por CNJ, movimentações, documentos, envolvido, advogado, monitoramentos, resumo IA | Consultar dados de processos |

O custo em centavos por requisição vem no header `Creditos-Utilizados` da resposta.

---

## Dados que já temos no projeto

No banco do **Agenda Prazos** você já tem número de processo (CNJ) em:

- **`prazos.numero_processo`**
- **`publicacoes_oab.numero_processo`**

Para usar com o Escavador:

- **Processo (capa):** `GET /api/v2/processos/numero_cnj/{numero}` — consome crédito.
- **Movimentações (incl. publicações):** `GET /api/v2/processos/numero_cnj/{numero}/movimentacoes` — consome crédito.

O número deve estar no **formato CNJ** (ex.: `0000000-00.0000.0.00.0000`). Se no seu banco estiver sem máscara, formate antes de chamar a API.

---

## Como montar a chamada HTTP (N8N / Node HTTP Request)

Todas as rotas exigem:

1. **Método:** GET (ou POST/PATCH/DELETE conforme a documentação).
2. **URL base:** `https://api.escavador.com/api/v2`
3. **Headers:**
   - `Authorization`: `Bearer SEU_TOKEN`
   - `X-Requested-With`: `XMLHttpRequest`

### Exemplo 1 – Teste (grátis): listar tribunais

- **Method:** GET  
- **URL:** `https://api.escavador.com/api/v2/tribunais`  
- **Headers:**
  - `Authorization` = `Bearer {{ $env.ESCAVADOR_TOKEN }}` (ou variável/credencial do N8N)
  - `X-Requested-With` = `XMLHttpRequest`

### Exemplo 2 – Processo por CNJ (pago, usando número do seu banco)

- **Method:** GET  
- **URL:** `https://api.escavador.com/api/v2/processos/numero_cnj/{{ $json.numero_processo }}`  
  (onde `numero_processo` vem do item atual, ex.: de um SELECT em `prazos` ou `publicacoes_oab`.)
- **Headers:** mesmos acima.

### Nó no N8N

1. Adicione o nó **HTTP Request**.
2. **Method:** GET (ou o da rota).
3. **URL:** a URL completa (base + path).
4. Em **Headers**, adicione:
   - Name: `Authorization`, Value: `Bearer SEU_TOKEN` (preferir credencial/variável).
   - Name: `X-Requested-With`, Value: `XMLHttpRequest`.

Guarde o token em **credencial** ou variável de ambiente; não deixe fixo no workflow.

---

## Segurança do token

O token que você usou no teste foi exposto neste chat. Recomendação: **gerar um novo token** no painel do Escavador e usar apenas em variável de ambiente ou credencial (ex.: `ESCAVADOR_TOKEN`), nunca commitado no código.

---

## Avaliação: Escavador vs proposta low-ticket e PJe

### Escavador e custo

- A API Escavador cobra **por requisição** (créditos) nas rotas úteis: processo por CNJ, movimentações, documentos, advogado, monitoramentos, etc.
- Para uso **contínuo** (consultar muitos processos ou movimentações ao longo do tempo), o custo tende a crescer e **foge da proposta de low-ticket contínuo**.
- Conclusão: Escavador faz sentido para **consultas pontuais** ou **volume baixo**; para automatização contínua e barata, não é a melhor base.

### PJe – documentação de padrões de API

A documentação [Padrões de API do PJe](https://docs.pje.jus.br/manuais-basicos/padroes-de-api-do-pje) descreve **como as APIs do PJe são desenhadas** (orientação a recursos, verbos HTTP, filtros, paginação, formato de resposta, mensageria com RabbitMQ). Ela **não** é:

- uma API pública única que o escritório chama de fora para “qualquer processo do Brasil”;
- um serviço de terceiros que você contrata por requisição.

O PJe é o **sistema processual eletrônico** usado **por cada tribunal** (cada instância tem seu próprio PJe). As APIs seguem esses padrões **dentro do ecossistema do tribunal** (módulos como `pje-legacy`, audiências, colegiado, etc.). O acesso costuma ser:

- **interno** ao tribunal (rede, SSO), ou
- **para integradores homologados** (convênio, certificado, acordo com o órgão).

Para um escritório que quer **baixo custo contínuo**:

- A documentação do PJe **faz sentido** como **referência técnica** se no futuro houver **acesso a um tribunal específico** (ex.: convênio, certificado, API homologada).
- **Não** resolve hoje o problema de “uma API barata para muitos processos de vários tribunais”; isso continua sendo papel de agregadores (Datajud) ou intermediários comerciais (Jusbrasil, etc.).

### O que faz sentido para o projeto (low-ticket contínuo)

Conforme o doc **FONTES_DADOS_JURIDICOS_AUTOMATIZACAO_PRAZOS.md** do próprio projeto:

| Fonte | Custo | Papel |
|-------|--------|--------|
| **Datajud (CNJ)** | API pública (após cadastro) | Movimentações e capa por processo; **base para prazos** com regras ou IA. |
| **Jusbrasil** (se orçamento permitir) | Comercial | Processos por OAB, webhook de intimações; complementa a lista de CNJs. |
| **PJe** | N/A para escritório hoje | Padrão de API dos tribunais; só entra no desenho se houver acesso a um tribunal específico. |
| **Escavador** | Por requisição | Útil para testes ou volume baixo; **não** como base de uso contínuo low-ticket. |

Recomendação: manter **Datajud** como fonte principal para movimentações e derivação de prazos; usar Escavador só eventualmente (ex.: teste, consulta pontual); tratar a doc do PJe como referência para o dia em que houver integração com algum tribunal que use PJe.
