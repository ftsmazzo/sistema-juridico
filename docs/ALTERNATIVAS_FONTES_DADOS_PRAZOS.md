# Alternativas de fontes para dados e prazos (fora da caixa)

**Contexto:** DataJud está fora de questão (desatualizado e fraco). JusBrasil é pago e o modelo de consumo não ficou claro. Escavador cobra por requisição e não encaixa em low-ticket contínuo. Este doc reúne **alternativas reais** e **ideias com mais amplitude**, sem depender de uma única API milagrosa.

---

## 1. Maximizar o que você já tem (custo zero extra)

### 1.1 Recorte Digital (OAB) — já integrado

- Vocês já recebem **publicações OAB** via webhook e criam prazos automaticamente (15 dias úteis para intimações).
- **Ação:** Garantir que **todos** os advogados tenham **número OAB** cadastrado; revisar filtros/termos no Recorte para não perder publicações; documentar quais diários/jornais o Recorte cobre.
- **Limite:** Só cobre o que a OAB/Recorte envia. Não substitui “listar todos os processos do advogado” nem “consultar movimentação de qualquer processo”.

**Nota:** “Colar e calcular” (advogado colar texto da intimação para o sistema calcular o prazo) **não é automatização** — reproduz o fluxo manual atual. Foi **rejeitado** como solução a ser apresentada. Ver `ESCOPO_PUBLICACAO_OAB_E_ESAJ_PUSH.md` para o que é a Publicação OAB e o e-SAJ Push.

---

## 2. Email como fonte primária (automação barata)

- **Ideia:** Muitos tribunais e sistemas (PJe, e-SAJ, eProc) **enviam e-mail** quando há intimação ou movimentação.
- **Fluxo:**  
  1. N8N (ou outro) **lê a caixa de e-mail** do escritório (IMAP / Gmail API).  
  2. Filtra por remetente (ex.: domínios `@trtX.jus.br`, `@tjX.jus.br`, `pje.jus.br`, etc.) ou por assunto (ex.: “Intimação”, “Movimentação”).  
  3. **Extrai** do corpo/assunto: número do processo, tipo de movimento, data (regex ou IA).  
  4. Aplica **regra de prazo** (ex.: intimação → 15 dias úteis).  
  5. Chama **sua API** (POST para criar prazo) ou envia para uma fila/planilha para confirmação.
- **Custo:** Só infra (e-mail já existe; N8N self-hosted ou plano barato). Nenhuma API paga de processo.
- **Requisito:** Advogados encaminham ou usam uma caixa compartilhada que o N8N acesse; ou o e-mail do tribunal já cai numa caixa monitorada.

Referência conceitual: [automatizar tarefas jurídicas com n8n](https://www.horadecodar.com.br/automatizar-tarefas-juridicas-n8n-advogados/) (gatilho por e-mail, parsing, notificações).

---

## 3. Bot (WhatsApp / Telegram) — entrada manual assistida

- **Ideia:** Advogado manda **número do processo** ou **encaminha a mensagem do tribunal** para um bot.
- O bot (conectado ao seu backend ou N8N):
  - Interpreta número do processo e, se houver, data/tipo no texto.
  - Calcula o prazo (regra fixa ou por tipo).
  - Responde: “Prazo calculado: DD/MM/AAAA. Criar no sistema? Sim/Não.”
  - Se “Sim”, chama sua API e cria o prazo.
- **Custo:** Custo do canal (ex.: Evolution API, Twilio, API oficial WhatsApp Business). Não paga por “consulta processual”.
- **Vantagem:** Zero digitação no sistema; o advogado usa o celular no dia a dia e o prazo entra no Agenda Prazos.

---

## 4. Por tribunal: o que existe além de DataJud

- **DataJud:** Você considerou fora (desatualizado/fraco). Segue sendo a única “API oficial” unificada; se no futuro melhorar, pode ser reavaliado.
- **TRT24 (e outros TRTs):** A “API de acesso automatizado” do TRT24 é na prática o **próprio DataJud** (eles redirecionam para a API Pública Datajud). Não é fonte alternativa.
- **ProcAPI (Defensoria TO):** API da Defensoria Pública do Tocantins. Serve para **processos da Defensoria**, não para escritório privado de forma geral. [ProcAPI](https://procapi.defensoria.to.def.br/)
- **Tribunais individuais (e-SAJ, PJe, eProc):** Não há API pública documentada para escritórios. Acesso é via portal web (e às vezes “Serviço Push” por e-mail, que encaixa na ideia do **e-mail como fonte**).

Conclusão: **não há hoje uma “API gratuita e boa” por tribunal** que substitua DataJud ou agregador pago. A saída é **não depender de consulta em tempo real** e usar **e-mail + colar texto + bot**.

---

## 5. Ferramentas que fazem “scraping” (risco e uso ético)

- **pyESAJ** ([documentação](https://pyesaj.readthedocs.io/)): pacote Python que fala com o **e-SAJ (TJSP)** de forma programática (automação de navegador / scraping).
- **Risco:** Termos de uso dos portais geralmente proíbem acesso automatizado; bloqueios por IP/captcha; quebra de ToS. **Não recomendado** como base estável para escritório, mas existe como “fora da caixa” para quem aceita o risco em ambiente controlado (ex.: uso interno, baixo volume).

---

## 6. LexML (legislação e jurisprudência, não processo)

- **LexML** ([lexml.gov.br](https://www.lexml.gov.br/), [dados abertos](https://projeto.lexml.gov.br/transparencia/dados-abertos)): rede de informação legislativa e jurídica (Senado e parceiros). Oferece **legislação**, **jurisprudência**, **doutrina**, **publicações oficiais**, com API e dados abertos.
- **Uso para prazos:** Não serve para interpretar o texto da publicação (isso é feito por **IA**). Nem para listar movimentações do processo.
- **Uso para prazos (continuação):** Não serve para “listar movimentações do processo X”. Serve para: **(1)** consultar **prazos legais** (ex.: “art. 231 CPC – quantos dias?”); **(2)** enriquecer o sistema com base legal ao **exibir** o prazo (“15 dias úteis, art. X”); **(3)** futuramente, **sugerir** prazo com base em norma. Gratuito. Fluxo reestruturado (Code → IA → gravação) e uso da LexML: **`docs/FLUXO_IA_PUBLICACOES_E_LEXML.md`**.

---

## 7. Comerciais: como consumir e alternativas

| Fonte        | Modelo típico              | Como ficar claro o consumo |
|-------------|----------------------------|----------------------------|
| **JusBrasil** | Contrato B2B, limites (req/dia, webhooks) | Pedir à equipe comercial: **(1)** preço por faixa de uso; **(2)** documento de “como consumir” (endpoints, webhook, exemplos); **(3)** trial ou sandbox. |
| **Escavador** | Créditos por requisição    | Já testado; usar só para **consultas pontuais** ou testes, não como base contínua. |
| **Intima.ai** | Automação em PJe, e-SAJ, etc. (protocolo, intimações) | Foco em **protocolo e automação com certificado**. Ver se oferecem **consulta de movimentação** e qual o preço; site: [intima.ai](https://intima.ai/servicos/protocolos). |
| **Codilo**   | Comercial, “monitoramento” | Pesquisar modelo (por processo? por OAB? mensal?) e pedir proposta clara. |

Nenhum deles é “low-ticket” no sentido de custo zero; a ideia é **reduzir dependência** deles com e-mail + colar + bot e usar só onde fizer sentido.

---

## 8. Ideias “fora da caixa” em uma frase

- **E-mail como sistema de notificação:** Tribunal manda e-mail → N8N lê → extrai processo + data → calcula prazo → chama sua API. Custo praticamente zero de “consulta processual”.
- **Bot WhatsApp/Telegram:** Advogado manda processo ou encaminha mensagem → bot calcula e pergunta se cria prazo → sua API cria. Experiência simples e barata.
- **Recorte Digital em foco:** Garantir que 100% do que a OAB/Recorte envia vire prazo automático; não pagar por “mais uma fonte” antes de esgotar essa.
- **Planilha + importação:** Manter lista de processos em planilha; importar para o sistema quando necessário; prazos entram quando o advogado confirma (colando texto ou pelo bot). Aceitar que “lista de processos” pode ser manual no início.
- **Cooperativa/parceria:** Vários escritórios dividindo uma conta (JusBrasil/Escavador). Cuidado com **termos de uso** (compartilhamento de conta pode ser proibido).
- **LexML:** Usar para **embasar** prazos (artigo da lei) e jurisprudência, não como fonte de movimentação.

---

## 9. Resumo: o que priorizar para “low-ticket” real

| Prioridade | Ação | Custo |
|------------|------|--------|
| 1 | **Recorte Digital (OAB)** já integrado: garantir cobertura máxima e OAB cadastrada; definir escopo real da “Publicação” (ver `ESCOPO_PUBLICACAO_OAB_E_ESAJ_PUSH.md`). | Zero extra |
| 2 | **e-SAJ Push (TJSP):** e-mail gratuito quando há movimentação em processos que o advogado cadastrou; falta amostra do e-mail para parser. | Grátis |
| 3 | **E-mail como fonte:** N8N lê caixa (Recorte + eventual Push), extrai processo/data, regra de prazo, chama sua API. | Só e-mail + N8N |
| 4 | **Bot (WhatsApp/Telegram):** advogado manda processo ou encaminha → bot calcula e cria prazo via API. | Custo do canal |
| 5 | **LexML:** consulta de legislação/jurisprudência para exibir base legal do prazo (opcional). | Grátis |
| 6 | **APIs pagas (JusBrasil, Escavador, Intima.ai):** só depois de esgotar 1–5; e com proposta comercial clara (JusBrasil). | Sob demanda |

---

## 10. Próximos passos sugeridos

1. **Escopo OAB e e-SAJ:** Ver `ESCOPO_PUBLICACAO_OAB_E_ESAJ_PUSH.md` — capturar amostras do e-mail do Recorte e do Push para definir parsing e regras quando campo vier vazio.
2. **N8N:** Prototipar workflow “e-mail → parse → sua API” para Recorte (e depois Push, quando tiver amostra do e-mail).
3. **Recorte Digital:** Revisar documentação/contrato para listar exatamente quais diários e termos estão cobertos; garantir que o parser que alimenta o webhook está documentado ou versionado.
4. **JusBrasil (se ainda interessar):** Pedir à equipe comercial **(1)** modelo de preço por faixa e **(2)** guia de consumo (endpoints, webhook, exemplos de payload).
5. **LexML:** Avaliar se vale integrar para “mostrar base legal” ao exibir um prazo (art. X da lei Y).

Com isso, o projeto ganha **alternativas reais** sem depender de DataJud nem de um único fornecedor pago, e com amplitude suficiente para escolher o que encaixa no orçamento e no fluxo do escritório.
