# Teste do pipeline de monitoramento de e-mail (projeto teste)

Este é um **projeto teste** do fluxo de monitoramento de e-mail dentro do sistema. Pode ser abandonado se a qualidade não for satisfatória.

## Objetivo do teste

Validar se, ao trazer a extração do e-mail para o backend (em vez do N8N), **a qualidade da IA se mantém**. Na automação N8N a resposta da IA (resumo, observações, prazos, movimentações) é considerada **melhor** que a da IA do cadastro por print (imagem). Por isso:

- O **enriquecimento por IA** usa o **mesmo prompt do N8N** (`docs/n8n-prompt-ia-publicacoes.txt`), em análise **por texto** (não por imagem).
- Assim comparamos: mesmo e-mail → extração no backend → mesma IA (texto) → gravação. Se o resultado for bom, seguimos; se não, podemos abandonar ou ajustar.

## O que foi implementado

| Componente | Descrição |
|------------|-----------|
| `src/lib/extrator-recorte-email.ts` | Port do extrator N8N: corpo do e-mail → `ItemPublicacaoOab[]`. |
| `src/lib/enriquecer-publicacao-ia-texto.ts` | Enriquece cada publicação com IA usando o **mesmo prompt do N8N** (texto); retorna resumo, baseLegal, prazoDiasUteisSugerido, observacoesIa, movimentacoes. |
| `src/routes/email-monitor-test.ts` | Endpoint de teste: recebe corpo do e-mail, extrai → enriquece com IA → processa (grava publicação + prazos). |

## Como testar

### Pelo sistema (recomendado)

1. Acesse **Publicações** no menu.
2. Clique em **Testar e-mail Recorte** (botão ao lado de "Nova publicação").
3. **Cole o corpo do e-mail** no campo de texto (copie do seu cliente de e-mail ou do N8N).
4. Opcional: preencha Assunto, De, Para (ajudam na deduplicação).
5. Clique em **Processar e-mail**.
6. Veja o resultado (quantas publicações extraídas/gravadas, prazos) e o link para ver a publicação.

Nada de N8N nem Postman: tudo na própria tela.

### Endpoint (alternativa)

**POST** `/api/email-monitor/test`  
**Autenticação:** Bearer (login normal do sistema).  
**Body (JSON):**

```json
{
  "emailText": "cole aqui o texto completo do e-mail Recorte Digital",
  "subject": "Recorte Digital OAB/SP. Public. 3. DJSP ...",
  "from": "oabsp@recortedigital.adv.br",
  "to": "advogado@email.com",
  "emailId": "opcional-id-do-email"
}
```

- **emailText** ou **emailHtml**: obrigatório. Cole o corpo do e-mail (texto ou HTML).
- **subject**, **from**, **to**, **emailId**: opcionais; ajudam na deduplicação e no log.

### Resposta de sucesso (200)

```json
{
  "ok": true,
  "publicacoesExtraidas": 3,
  "publicacoesGravadas": 3,
  "prazosCriados": 2,
  "publicacaoIds": [101, 102, 103],
  "prazoIds": [201, 202]
}
```

Se houver erros em alguma publicação (ex.: IA falhou, publicação duplicada):

```json
{
  "ok": false,
  "publicacoesExtraidas": 3,
  "publicacoesGravadas": 2,
  "prazosCriados": 1,
  "publicacaoIds": [101, 102],
  "prazoIds": [201],
  "erros": ["Publicação 3: ..."]
}
```

### Configuração

- **ANTHROPIC_API_KEY** (recomendado para igualar à automação): chave da API Anthropic. Com ela, o teste usa **Claude** e por padrão o modelo **Claude Sonnet 4.6** (`claude-sonnet-4-6`), o mesmo da automação.
- **EMAIL_IA_MODEL** (opcional): modelo a usar; padrão `claude-sonnet-4-6`. Ex.: `EMAIL_IA_MODEL=claude-sonnet-4-6`.
- Se não houver ANTHROPIC_API_KEY, usa-se OPENAI_API_KEY e OPENAI_VISION_MODEL (ex.: gpt-4o). A qualidade costuma ficar abaixo da automação com Claude.

### Exemplo com curl (após login)

1. Faça login e guarde o token.
2. Salve o corpo de um e-mail Recorte em `email.txt`.
3. Chame:

```bash
curl -X POST "https://sua-api/api/email-monitor/test" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"emailText\": \"$(cat email.txt | jq -Rs .)\"}"
```

(Se o e-mail tiver muitas aspas, pode ser mais fácil enviar via Postman/Insomnia com o texto colado no campo `emailText`.)

## Critério de qualidade

- Compare uma **mesma publicação** processada (1) pela automação N8N e (2) por este endpoint (cole o mesmo e-mail).
- Veja em **Publicações** o resumo, observações da IA e movimentações.
- Se a qualidade for **próxima ou igual** à do N8N, o teste é positivo e vale seguir para IMAP/UX. Se for pior de forma consistente, podemos revisar o prompt ou o modelo, ou abandonar o projeto teste.

## Próximos passos (se o teste for aprovado)

- Conectar IMAP (Yahoo, e-mail OAB), agendar verificação e persistir contas (conforme `VIABILIDADE_EMAIL_MONITORAMENTO_NO_SISTEMA.md`).
- UX: tela para o advogado configurar contas e remetentes e ver última verificação / últimos e-mails.

## Abandonar o teste

Se não der certo: remover ou não usar o endpoint `/api/email-monitor/test` e os módulos `extrator-recorte-email.ts` e `enriquecer-publicacao-ia-texto.ts`; o restante do sistema (webhook N8N, print) continua igual.
