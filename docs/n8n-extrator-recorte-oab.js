// N8N Code Node - Extrator Recorte Digital OAB/SP
// Entrada: $input.all() (itens Gmail). Saída: apenas itens de publicação (isRecorteDigital true). E-mails não-Recorte não geram saída.

const items = $input.all();
const saida = [];

function text(msg) {
  const r = msg?.json?.text || msg?.json?.textAsHtml || msg?.json?.html || '';
  if (typeof r !== 'string') return '';
  return r.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s*:\s*/g, ': ').trim();
}

function isRecorte(msg) {
  const s = (msg?.json?.subject || '').toLowerCase();
  const t = text(msg);
  return /recorte digital|oab\/sp/.test(s) || /Recorte Digital - OAB - Resultado da Busca|Data processamento\/pesquisa/.test(t);
}

function pick(regex, str, def = '') {
  const m = (str || '').match(regex);
  return m ? (m[1] !== undefined ? m[1].trim() : m[0].trim()) : def;
}

function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

for (const item of items) {
  const json = item.json || {};
  const raw = text(item);
  if (!isRecorte(item)) continue;

  const advogado = norm(pick(/Advogado\(a\)\s*[\s\S]*?([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*Número da OAB|$)/i, raw));
  const numeroOab = pick(/Número da OAB\s*[\s\S]*?(\d{5,6}\s*-\s*[A-Z]{2})/i, raw);
  const dataProcessamento = pick(/Data processamento\/pesquisa\s*[\s\S]*?(\d{2}\/\d{2}\/\d{4}\s*\([A-Z]{2}\))/i, raw);

  const rePub = /Publicação:\s*(\d+)\s*\./gi;
  const blocos = [];
  let m;
  while ((m = rePub.exec(raw)) !== null) blocos.push({ num: parseInt(m[1], 10), start: m.index });

  if (blocos.length === 0) {
    if (/Data de Disponibilização/.test(raw) && /PROCESSO:\s*\d{7}/.test(raw)) blocos.push({ num: 1, start: 0 });
    else continue;
  }

  const from = json.from?.text || json.from?.value?.[0]?.address || '';
  const to = json.to?.text || json.to?.value?.[0]?.address || '';

  for (let i = 0; i < blocos.length; i++) {
    const start = blocos[i].start;
    const end = blocos[i + 1] ? blocos[i + 1].start : raw.length;
    let t = raw.slice(start, end).trim();
    const totalIdx = t.search(/Total de Publicações:\s*\d+/i);
    if (totalIdx >= 0) t = t.slice(0, totalIdx).trim();

    const dataDisp = pick(/Data de Disponibilização:\s*(\d{2}\/\d{2}\/\d{4})/i, t);
    const dataPub = pick(/Data de Publicação:\s*(\d{2}\/\d{2}\/\d{4})/i, t);
    const jornal = norm(pick(/Jornal:\s*([^\n]+?)(?=\s*Página:|$)/i, t));
    const pagina = pick(/Página:\s*(\d+)/i, t);
    const caderno = norm(pick(/Caderno:\s*([^\n]+?)(?=\s*Local:|$)/i, t));
    const local = norm(pick(/Local:\s*([^\n]+?)(?=\s*Vara:|$)/i, t));
    const vara = norm(pick(/Vara:\s*([\s\S]+?)(?=\s*Publicação:\s*Intimação|\s*PROCESSO:|$)/i, t));
    const tipoPub = norm(pick(/(?:Publicação:\s*)(Intimação|Despacho|Decisão|Sentença|Acórdão|Outros?|[\wçãõ\s]+?)(?=\s*PROCESSO:|\s*$)/i, t)) || 'Intimação';
    const numeroProcesso = pick(/PROCESSO:\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/i, t);
    const valorMencionado = pick(/R\$\s*[\d.,]+/, t);
    const urlDocumento = (pick(/Acesso ao documento:\s*(https?\s*:\s*\/\/[^\s]+)/i, t) || '').replace(/\s/g, '');
    const identificadorDocumento = pick(/Identificador do documento:\s*(\d+)/i, t);

    const idxProc = t.search(/PROCESSO:\s*\d{7}/i);
    const textoCompleto = idxProc >= 0 ? norm(t.slice(idxProc)) : norm(t);

    const advogados = [];
    const reAdv = /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑa-z\s]+?)\s*\(\s*OAB\s*(\d+\/[A-Z]{2})\s*\)/g;
    let advM;
    while ((advM = reAdv.exec(t)) !== null) advogados.push({ nome: norm(advM[1]), oab: advM[2].trim() });

    const poloAtivo = norm(pick(/POLO ATIVO:\s*([^|]+?)(?=\s*POLO PASSIVO:|\s*ADVOGADO:|$)/i, t));
    const polosPassivos = [];
    const rePassivo = /POLO PASSIVO:\s*([^|]+?)(?=\s*POLO PASSIVO:|\s*ADVOGADO:|\s*Acesso|$)/gi;
    let passM;
    while ((passM = rePassivo.exec(t)) !== null) polosPassivos.push(norm(passM[1]));

    saida.push({
      json: {
        emailId: json.id,
        subject: json.subject,
        date: json.date,
        from,
        to,
        isRecorteDigital: true,
        advogado,
        numeroOab,
        dataProcessamento,
        totalPublicacoes: blocos.length,
        publicacaoNumero: blocos[i].num,
        dataDisponibilizacao: dataDisp,
        dataPublicacao: dataPub,
        jornal,
        pagina,
        caderno,
        local,
        vara,
        tipoPublicacao: tipoPub,
        numeroProcesso,
        valorMencionado,
        textoCompleto,
        advogados,
        poloAtivo,
        polosPassivos,
        urlDocumento,
        identificadorDocumento,
      },
    });
  }
}

return saida;
