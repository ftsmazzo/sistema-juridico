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

- **Remetentes:** deixe **vazio** para trazer todos os e-mails da caixa de entrada (incluindo encaminhados).  
  Se preencher (ex.: `@recortedigital.adv.br`), o sistema só processa e-mails **de** esses remetentes.

---

## 3. Teste com e-mails encaminhados

Você encaminou 3 publicações de **fredmazzo@gmail.com** para **adrianolms@yahoo.com.br**:

1. Os e-mails devem estar na **Caixa de entrada** do adrianolms@yahoo.com.br.
2. No sistema, a conta deve estar com os dados acima e **ativa**.
3. Clique em **Verificar agora** na conta.  
   - Se aparecer **Erro** na lista, passe o mouse ou edite a conta para ver a mensagem completa (ex.: falha de autenticação = senha errada ou uso da senha normal em vez da senha de app).
   - Se não aparecer erro mas **0 e-mails**: confira se o **Remetentes** está vazio (para aceitar qualquer remetente, inclusive encaminhados).

O sistema busca e-mails dos **últimos 30 dias** na pasta **INBOX**. E-mails em outras pastas (Rascunhos, Enviados, etc.) não são lidos.

---

## 4. Resumo

- **Yahoo:** host `imap.mail.yahoo.com`, porta `993`, SSL ativo.
- **Senha:** sempre a **senha de app** gerada no site do Yahoo, nunca a senha normal.
- **Remetentes em branco:** processa todos os e-mails da caixa de entrada (incluindo encaminhados).
- Em caso de erro, ver a mensagem em **Monitoramento de e-mail** (coluna de status ou ao editar a conta).

---

## 5. Senha pela tela (sem terminal)

Sempre que precisar alterar a senha da conta: **Monitoramento de e-mail** → **Editar** na conta do Adriano → campo **Senha** → cole a senha de app do Yahoo → **Salvar**. Nada de terminal nem SQL. A variável `EMAIL_MONITOR_ENCRYPTION_KEY` no servidor é **opcional** (se não estiver definida, a senha é guardada de forma que o sistema consiga usar na verificação).
