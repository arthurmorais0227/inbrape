const API_URL = 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('ai_token');
}

function authHeaders() {
  return {
    'Authorization': `Bearer ${getToken()}`,
  };
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