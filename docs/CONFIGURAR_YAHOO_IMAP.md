# Configurar Yahoo (incl. @yahoo.com.br) para monitoramento de e-mail

O sistema lê a caixa de entrada **via IMAP** para buscar publicações do Recorte Digital. Para o **Yahoo** (incluindo **adrianolms@yahoo.com.br**) funcionar, é obrigatório usar **senha de app**, não a senha normal da conta.

**Definir a senha:** use **só a tela do sistema**. Vá em **Monitoramento de e-mail** → **Editar** na conta → campo **Senha** → cole a senha de app → **Salvar**. Não precisa rodar nada no terminal.

---

## 1. Senha de app (obrigatório)

O Yahoo **não aceita** a senha normal da conta em clientes IMAP. É preciso gerar uma **senha de app**:

1. Acesse a **Segurança da conta Yahoo**:  
   [https://login.yahoo.com/account/security](https://login.yahoo.com/account/security)
2. Faça login com **adrianolms@yahoo.com.br** (e senha atual).
3. Ative a **verificação em duas etapas** (se ainda não estiver ativa).
4. Em **Senhas de app**, clique em **Gerar senha de app** (ou "Generate app password").
5. Escolha um nome (ex.: "Sistema OAB" ou "Recorte") e confirme.
6. **Copie a senha de 16 caracteres** que aparecer — ela só é mostrada uma vez.  
   Use **essa senha** no sistema, não a senha que você usa para entrar no Yahoo.

---

## 2. Dados para colocar no sistema

Em **Monitoramento de e-mail** → Nova conta (ou Editar a conta do Adriano), use:

| Campo        | Valor                    |
|-------------|---------------------------|
| **Host IMAP** | `imap.mail.yahoo.com`   |
| **Porta**     | `993`                   |
| **SSL/TLS**   | Marcado (ativo)         |
| **E-mail (usuário)** | `adrianolms@yahoo.com.br` |
| **Senha**     | A **senha de app** de 16 caracteres (não a senha normal do Yahoo) |
| **Remetentes** | `oabsp@recortedigital.adv.br` (um por linha) |

O Recorte Digital OAB chega **sempre** desse remetente. No campo **Remetentes**, coloque exatamente:
`oabsp@recortedigital.adv.br`  
Assim o sistema processa **só** e-mails vindos desse endereço e ignora o resto da caixa.

---

## 3. Verificação

1. A conta deve estar com os dados acima (Host, Porta, E-mail, Senha, **Remetentes** = `oabsp@recortedigital.adv.br`) e **ativa**.
2. Clique em **Verificar agora**. A verificação pode levar alguns minutos.
3. Se aparecer **Erro**, edite a conta e veja a mensagem completa. Se der **0 publicações**, confira se há e-mails do Recorte na caixa e se **Remetentes** está com `oabsp@recortedigital.adv.br`.

O sistema busca na pasta **INBOX** (primeira vez: últimos 30 dias; depois: últimos 3 dias).

---

## 4. Resumo

- **Yahoo:** host `imap.mail.yahoo.com`, porta `993`, SSL ativo.
- **Senha:** sempre a **senha de app** do Yahoo.
- **Remetentes:** `oabsp@recortedigital.adv.br` — e-mail de onde vêm as publicações do Recorte Digital OAB. O sistema só processa mensagens **de** esse remetente.
- Em caso de erro, ver a mensagem em **Monitoramento de e-mail** (coluna de status ou ao editar a conta).

---

## 5. Senha pela tela (sem terminal)

Sempre que precisar alterar a senha da conta: **Monitoramento de e-mail** → **Editar** na conta do Adriano → campo **Senha** → cole a senha de app do Yahoo → **Salvar**. Nada de terminal nem SQL. A variável `EMAIL_MONITOR_ENCRYPTION_KEY` no servidor é **opcional** (se não estiver definida, a senha é guardada de forma que o sistema consiga usar na verificação).
