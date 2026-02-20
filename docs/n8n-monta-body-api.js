// N8N Code Node: MontaBody
// Conecte depois do MergeEnriquecido. Entrada: N itens (cada um = uma publicação enriquecida).
// Saída: 1 item com o array no campo usado no HTTP Request (publicacoes).
const items = $input.all();
return [{ json: { publicacoes: items.map((i) => i.json) } }];
