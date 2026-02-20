# Fluxo reestruturado: extração → IA → gravação (e papel da LexML)

**Premissa:** A parte que **pega os e-mails** é **imutável**. A partir do **Code que formata** (extrai o bruto da publicação), podemos **reestruturar**: usar **IA com prompts bem definidos** para interpretar o conteúdo, definir movimentações/prazos e gravar; e, se fizer sentido, usar a **API LexML** para enriquecer (base legal).

---

## 1. LexML: o que ajuda e o que não ajuda

- **LexML** ([lexml.gov.br](https://www.lexml.gov.br/), dados abertos no projeto LexML) é rede de **legislação**, **jurisprudência**, **proposições**, **publicações oficiais**. Oferece **API gratuita** e dados em JSON/XML.
- **O que NÃO faz:** Não lê o texto da sua publicação nem “define” movimentação. Não substitui a interpretação do conteúdo do Recorte.
- **O que faz bem:** Consultar **normas** (lei, artigo, inciso) e **jurisprudência**. Ex.: “art. 231 CPC”, “art. 85 § 2º CPC” — texto da norma, link, metadados.
- **Uso no nosso fluxo:** **Depois** que a IA (ou regra) já definiu o **tipo de ato** e o **prazo** (ex.: intimação → 15 dias úteis), a LexML pode ser usada para:
  - **Enriquecer a exibição:** “15 dias úteis — Art. 231, CPC” com link ou texto do artigo.
  - **Opcional:** guardar na publicação/prazo a “base legal” (artigo, link LexML) para o advogado ver no sistema.

**Conclusão:** LexML **não** define movimentações a partir da publicação. Ela **complementa** — base legal do prazo. A **IA** é que interpreta o conteúdo da publicação e define uma ou mais movimentações (e prazos).

---

## 2. Visão do fluxo reestruturado

| Etapa | O quê | Imutável? |
|-------|--------|-----------|
| 1. **E-mail** | Gmail/IMAP busca mensagens (Recorte, etc.) | **Sim** — não mexe aqui. |
| 2. **Code (formata)** | Extrai do e-mail: texto da publicação, processo, data, vara, cabeçalho (advogado, OAB), etc. Saída = **dados brutos + texto completo** por publicação. | **Não** — pode evoluir (regex, campos), mas a **saída** deve seguir um contrato estável para o próximo passo. |
| 3. **IA (interpreta)** | Recebe o que o Code entregou. **Prompts claros**, instruções definidas, **informações reais** (texto da publicação, tipo já sugerido pelo parser). IA devolve: **uma ou mais movimentações** (tipo, resumo, prazo sugerido, observações), confiança, eventualmente base legal (art. X). | **Não** — aqui é o coração da reestruturação. |
| 4. **Gravação** | API do sistema: gravar publicação + movimentações + prazos conforme o que a IA retornou (validado por regras mínimas). | **Não** — consome o resultado da IA. |
| 5. **LexML (opcional)** | Para cada prazo criado, se quiser **enriquecer**: chamar LexML com o artigo aplicável (ex.: art. 231 CPC) e guardar link/texto como “base legal” na exibição. | **Não** — opcional. |

---

## 3. Contrato entre Code e IA (informações reais)

O **Code** deve entregar, por publicação, um objeto estável que a IA e a API entendam. Exemplo (alinhado ao que já existe):

- `numeroProcesso`, `dataPublicacao`, `dataDisponibilizacao`, `vara`, `jornal`, `caderno`, `pagina`
- `tipoPublicacao` (ex.: “Intimação” — vindo do regex, como sugestão)
- `textoCompleto` — **texto integral** da publicação (o que saiu no diário)
- `advogado`, `numeroOab`, `advogados[]`, `poloAtivo`, `polosPassivos[]`
- `emailId`, `publicacaoNumero`, `identificadorDocumento`, `urlDocumento`
- `valorMencionado` (se houver)

A **IA** recebe isso + **instruções fixas**, por exemplo:

- “Você recebe o texto de uma publicação do Diário da Justiça. Sua tarefa: (1) classificar uma ou mais **movimentações** (Intimação, Despacho, Decisão, Acórdão, etc.); (2) para cada uma, resumir em 1–2 linhas; (3) indicar prazo aplicável em dias úteis, se houver, e o artigo/norma de apoio; (4) marcar se há urgência ou observação relevante.”
- Entrada: JSON com os campos acima (em especial `textoCompleto` e `tipoPublicacao`).
- Saída: JSON estruturado (lista de movimentações, cada uma com tipo, resumo, prazo em dias úteis, base legal sugerida, confiança).

Assim a IA usa **informações reais** (o texto e os metadados já extraídos) e **prompts definidos** para produzir o que a API vai gravar.

---

## 4. Próximos passos concretos

1. **Manter imutável:** trigger + leitura de e-mail (Gmail/IMAP).
2. **Code:** Manter extração atual (ou pequenos ajustes), garantindo que a saída tenha sempre `textoCompleto` + metadados no formato combinado. Filtro: só seguir com `isRecorteDigital === true`.
3. **Definir esquema de saída da IA:** JSON com lista de movimentações (tipo, resumo, prazo em dias úteis, base legal opcional). Documentar no repositório (ex.: `docs/esquema-saida-ia-publicacoes.json` ou tipo em TypeScript).
4. **Implementar passo IA no workflow (N8N ou backend):** nó “OpenAI”/“LLM” (ou chamada à sua API que chama o modelo) com **prompt fixo** + variáveis = campos da publicação. Receber e parsear o JSON de saída.
5. **Gravação:** sua API recebe **publicação** (dados do Code) + **movimentações** (resultado da IA). Grava em `publicacoes_oab` e em tabela de movimentações/prazos, com vínculo publicação ↔ prazo. Regras de deduplicação continuam (emailId + publicacaoNumero, numeroProcesso + identificadorDocumento).
6. **LexML (se válido):** Após criar o prazo, se a IA tiver devolvido “art. 231 CPC” (ou outro), chamar a API LexML para obter link/texto da norma e guardar como “base legal” do prazo. Avaliar na prática se o retorno da LexML melhora a experiência; se sim, manter como opcional no fluxo.

---

## 5. Resumo

- **LexML** não interpreta publicação nem define movimentação; ajuda a **mostrar base legal** (artigo, link) depois que o prazo já foi definido (pela IA ou regra).
- **IA** com prompts claros e informações reais (texto + metadados do Code) é quem **define uma ou mais movimentações** e os prazos; a gravação usa isso.
- **E-mail** permanece imutável; **Code** formata e entrega contrato estável; **reestruturamos** a partir daí com IA → gravação, e LexML apenas como enriquecimento opcional.
