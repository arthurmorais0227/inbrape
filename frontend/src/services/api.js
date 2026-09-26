const API_URL = process.env.REACT_APP_API_URL || 'https://inbrape.onrender.com';

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('ai_token')}` };
}

export async function analyzeText(text, mode) {
  const r = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text, mode }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro na análise.'); }
  return (await r.json()).result;
}

export async function analyzeExcel(file, question) {
  const fd = new FormData();
  fd.append('file', file);
  if (question) fd.append('question', question);
  const r = await fetch(`${API_URL}/analyze-excel`, { method: 'POST', headers: authHeaders(), body: fd });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro ao analisar planilha.'); }
  return await r.json();
}

export async function analyzeImage(file, mode, question) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('mode', mode);
  if (question) fd.append('question', question);
  const r = await fetch(`${API_URL}/analyze-image`, { method: 'POST', headers: authHeaders(), body: fd });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro ao analisar imagem.'); }
  return (await r.json()).result;
}

export async function analyzeDocument(file, question) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('question', question);
  const r = await fetch(`${API_URL}/analyze-document`, { method: 'POST', headers: authHeaders(), body: fd });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro ao analisar documento.'); }
  return (await r.json()).result;
}

export async function getCrmOrganizacoes(page = 1, limit = 20) {
  const r = await fetch(`${API_URL}/crm/organizacoes?page=${page}&limit=${limit}`, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao buscar organizações.'); }
  return await r.json();
}

export async function getCrmCotacoes(page = 1, limit = 20) {
  const r = await fetch(`${API_URL}/crm/cotacoes?page=${page}&limit=${limit}`, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao buscar cotações.'); }
  return await r.json();
}

export async function getCrmOrganizacoesNomes() {
  const r = await fetch(`${API_URL}/crm/organizacoes-nomes`, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao buscar nomes de organizações.'); }
  return await r.json();
}