# Notificação WhatsApp (Evolution API)

Quando uma publicação for inserida no sistema, enviar notificação WhatsApp com dados básicos formatados.

## Pré-requisito
- Evolution API já instalada e configurada no sistema.

## Próximos passos (após ajuste do e-mail)
1. Configurar variável de ambiente com a URL da Evolution API e instância (ex.: `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`).
2. Definir número(s) ou grupo para receber as notificações (ex.: config por usuário ou número fixo).
3. No fluxo que insere publicação (ex.: `processarItemPublicacaoOab` ou após `runEmailCheck`), após criar publicação(ões), chamar serviço de envio WhatsApp.
4. Formato da mensagem: dados básicos da publicação (processo, tipo, data, advogado, resumo em uma linha) bem formatados.

## Formato sugerido da mensagem
```
📬 Nova publicação OAB

Processo: 1234567-89.2024.8.26.0506
Tipo: Intimação
Data publicação: 16/02/2026
Advogado: Nome (OAB 123456/SP)

[Resumo ou texto curto]
```

## Referência Evolution API
- Envio de mensagem: endpoint da Evolution API para enviar texto ou template.
- Documentação: https://doc.evolution-api.com/
