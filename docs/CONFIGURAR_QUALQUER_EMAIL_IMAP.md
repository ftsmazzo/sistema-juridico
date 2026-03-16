# Configurar qualquer e-mail (IMAP) para monitoramento

O sistema suporta **qualquer conta de e-mail** que ofereça acesso IMAP: Yahoo, e-mail da OAB, Gmail, Outlook, provedores corporativos, etc. Cada conta é configurada em **Monitoramento de e-mail** com Host, Porta, usuário e senha.

## Correção importante (FETCH por UID)

O servidor IMAP precisa receber o comando FETCH indicando que os números são **UIDs** (identificadores únicos), não posições na caixa. Sem isso, o provedor pode responder "Command failed" e nenhum e-mail é lido. O sistema já envia essa indicação corretamente (`uid: true` nas opções do FETCH). Se antes você via muitos "IMAP fetch UID XXX falhou: Command failed" e 0 publicações, após o deploy com essa correção a verificação deve passar a ler os e-mails.

## Dados comuns por provedor

| Provedor | Host IMAP | Porta | SSL/TLS | Observação |
|----------|-----------|-------|---------|------------|
| **Yahoo** (yahoo.com, yahoo.com.br) | `imap.mail.yahoo.com` | 993 | Sim | Usar **senha de app**, não a senha da conta. Ver [CONFIGURAR_YAHOO_IMAP.md](CONFIGURAR_YAHOO_IMAP.md). |
| **Gmail** | `imap.gmail.com` | 993 | Sim | Usar senha de app (Google: Conta → Segurança → Senhas de app). |
| **Outlook / Microsoft 365** | `outlook.office365.com` | 993 | Sim | Pode exigir "Acesso a apps menos seguros" ou conta de app. |
| **E-mail OAB / corporativo** | Fornecido pelo provedor | 993 ou 143 | 993=Sim, 143=STARTTLS | Host costuma ser tipo `imap.dominio.adv.br` ou `mail.dominio.com.br`. |

- **Porta 993**: conexão SSL/TLS direta (marque **SSL/TLS** na conta).
- **Porta 143**: conexão sem criptografia inicial; o servidor pode pedir STARTTLS (o cliente faz upgrade). Use **SSL/TLS** desmarcado só se o provedor indicar porta 143 sem SSL.

## Campos na conta (sistema)

- **Host IMAP**: endereço do servidor (ex.: `imap.mail.yahoo.com`, `imap.dominio.adv.br`).
- **Porta**: em geral **993** (SSL) ou **143** (sem SSL / STARTTLS).
- **SSL/TLS**: marcar para porta 993; desmarcar só se usar 143 sem SSL.
- **E-mail (usuário)**: o endereço completo usado no login IMAP (ex.: `usuario@dominio.adv.br`).
- **Senha**: senha normal ou **senha de app**, conforme o provedor (Yahoo e Gmail exigem senha de app).
- **Remetentes**: opcional. Se quiser processar **só** e-mails de um remetente (ex.: Recorte Digital), coloque um endereço por linha, ex.: `oabsp@recortedigital.adv.br`. Deixar vazio processa todos os e-mails da caixa (o sistema só vira publicação o que for reconhecido como Recorte no conteúdo).

## Verificação e erros

1. Salve a conta e clique em **Verificar agora**.
2. O status **Ativo** (sem erro) indica que a conexão e o login funcionaram. Se mesmo assim **não aparecer e-mail** e no log surgir "IMAP fetch UID XXX falhou", isso era causado pelo FETCH sem indicação de UID; com a correção em produção, isso deve deixar de ocorrer.
3. Se aparecer **Erro** na conta, a mensagem (e o log do servidor) indicam o motivo: senha errada, host/porta incorretos, bloqueio do provedor, etc.

## Resumo

- **Qualquer e-mail com IMAP** pode ser configurado; não é só Yahoo.
- O sistema lê a pasta **INBOX** (primeira vez: últimos 30 dias; depois: últimos 3 dias).
- A correção do FETCH por UID evita "Command failed" e permite que os e-mails sejam lidos em qualquer provedor compatível com IMAP.
