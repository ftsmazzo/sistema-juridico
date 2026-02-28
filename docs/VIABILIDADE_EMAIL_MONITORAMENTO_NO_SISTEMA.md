# Viabilidade: Monitoramento de e-mail dentro do sistema

## Objetivo

Em vez do advogado configurar tudo no N8N (conta de e-mail, remetentes, workflow), ter **no sistema** uma UX onde ele:

- Conecta as contas de e-mail que quer monitorar
- Define quais remetentes monitorar (ex.: Recorte Digital OAB/SP, tribunais)
- Vê última verificação, últimos e-mails processados, status
- Deixa o **backend** fazer: ler caixa, extrair publicações, gravar e criar prazos — sem depender do N8N

---

## Viabilidade técnica: **sim**

### O que já existe no sistema

| Parte | Onde está | Uso |
|-------|-----------|-----|
| Contrato do payload | `ItemPublicacaoOab` em `publicacoes-oab.types.ts` | Já usado pelo webhook |
| Processamento (gravar publicação + prazos) | `processarItemPublicacaoOab` em `processar-publicacao-oab.ts` | Basta receber o mesmo formato |
| Lógica de extração Recorte Digital | `docs/n8n-extrator-recorte-oab.js` | Regex e parsing em JS puro; **portável** para Node |

Ou seja: o “cérebro” (extrair do HTML/texto → `ItemPublicacaoOab` → processar) já existe. Falta só:

1. **Conectar ao e-mail** (IMAP ou Gmail API)
2. **Agendar** a verificação periódica
3. **Persistir** configurações (contas + remetentes) e **expor UX** para o advogado

### O que precisa ser construído

| Camada | O quê |
|--------|------|
| **Backend** | Módulo de leitura de e-mail (IMAP e/ou Gmail API); job agendado (ex.: a cada X min); port do extrator N8N para Node (entrada: corpo do e-mail; saída: `ItemPublicacaoOab[]`); reutilizar `processarItemPublicacaoOab` para cada item |
| **Banco** | Tabela(s) para: conta de e-mail (id, usuario_id, email, senha_criptografada ou refresh_token, remetentes_filtro, ultima_verificacao, ultimo_erro, ativo); opcional: log dos últimos e-mails processados por conta |
| **API** | CRUD de “contas de monitoramento”; endpoint interno ou job que roda a verificação (e atualiza última verificação / último erro) |
| **Frontend** | Tela “Monitoramento de e-mail”: listar contas, adicionar/editar (e-mail, remetentes, ativo), exibir última verificação, últimos e-mails/publicações; opcional: histórico de erros |

---

## Segurança e credenciais

- **Senha em texto plano** não pode. Opções:
  - **Criptografia no backend**: senha armazenada criptografada (ex.: AES com chave em env); descriptografar só na hora de conectar no job.
  - **OAuth (Gmail)**: preferível quando for só Gmail — usuário autoriza uma vez; guardamos apenas `refresh_token`; não armazenamos senha.
- **Remetentes**: guardar como lista (ex.: `oabsp@recortedigital.adv.br`, `@trt*.jus.br`) para filtrar quais e-mails processar.
- **Escopo por usuário**: cada conta de monitoramento vinculada ao usuário (advogado) logado; só ele vê e edita as próprias contas.

---

## Fluxo de dados (visão geral)

```
[Caixa de e-mail] → (IMAP ou Gmail API) → Backend lê mensagens
       → Filtra por remetente/configuração
       → Para cada e-mail: extrator (port do N8N) → ItemPublicacaoOab[]
       → Para cada item: processarItemPublicacaoOab() → publicacoes_oab + prazos
       → Atualiza “última verificação” e opcionalmente “últimos e-mails”
```

O webhook atual pode continuar existindo: N8N e o sistema interno podem **ambos** enviar publicações no mesmo formato; a API e a deduplicação já suportam.

---

## UX sugerida (resumida)

- **Menu**: item “Monitoramento de e-mail” (ou dentro de Configurações / Integrações).
- **Listagem**: cards por “conta” com:
  - Nome/e-mail da conta
  - Remetentes monitorados (tags ou lista)
  - Última verificação (data/hora)
  - Status (ok / erro na última execução)
  - Botões: Editar, Pausar/Ativar, “Ver últimos e-mails”
- **Adicionar/Editar conta**:
  - E-mail
  - Senha (ou fluxo OAuth “Conectar com Google”)
  - Lista de remetentes a monitorar (com sugestão: “Recorte Digital OAB/SP”)
  - Ativo sim/não
- **Detalhe / histórico**: últimos e-mails processados (subject, data), quantas publicações foram extraídas e link para as publicações/prazos criados.

Isso deixa tudo “bonito, organizado e linkado no sistema”, como você descreveu.

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Bloqueio por “app menos seguro” / 2FA | Preferir OAuth (Gmail); para IMAP genérico, orientar “senha de app” ou conta com 2FA configurado para gerar senha de app |
| Rate limit / bloqueio da caixa | Intervalo mínimo entre verificações (ex.: 5–15 min); uma fila/job por conta |
| Extrator quebrar se o Recorte mudar o layout | Manter extrator isolado (módulo); testes com amostras reais; fallback “não reconheceu” e log para ajuste de regex |
| Vários advogados, muitas contas | Job único que percorre contas ativas; limites por plano/usuário se precisar no futuro |

---

## Fases sugeridas (para planejamento)

1. **Fase 1 – MVP**
   - Tabela de contas (e-mail + senha criptografada + remetentes + última verificação).
   - Job em backend: IMAP, filtro por remetente, extrator (port do N8N) → `processarItemPublicacaoOab`.
   - Tela simples: listar contas, adicionar/editar, exibir “última verificação” e status.

2. **Fase 2**
   - “Últimos e-mails” por conta (subject, data, quantas publicações).
   - Histórico de erros e link para publicações/prazos gerados.

3. **Fase 3**
   - OAuth Gmail (opcional) para não armazenar senha.
   - Ajustes de UX (filtros, busca, notificações).

---

## Conclusão

- **Viável**: sim; a lógica já está no sistema (webhook + processamento) e no extrator em JS (portável para Node).
- **Segurança**: credenciais criptografadas ou OAuth; remetentes e escopo por usuário.
- **UX**: uma área “Monitoramento de e-mail” com contas, remetentes, última verificação e últimos e-mails atende o que você descreveu e mantém tudo dentro do sistema, sem depender do N8N.

Se quiser, o próximo passo pode ser: (1) desenhar o schema das tabelas e os endpoints da API, ou (2) portar o extrator N8N para um módulo Node e integrar ao job de leitura IMAP.
