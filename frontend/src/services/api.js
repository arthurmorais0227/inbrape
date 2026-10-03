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

export async function getCrmOrganizacoes(page = 1, limit = 20, q = '', filter = '') {
  const params = new URLSearchParams({ page, limit });
  if (q) params.set('q', q);
  if (filter) params.set('filter', filter);
  const r = await fetch(`${API_URL}/crm/organizacoes?${params}`, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao buscar organizações.'); }
  return await r.json();
}

// Recebe um objeto de filtros por coluna, incluindo agora data_de / data_ate
export async function getCrmCotacoes(page = 1, limit = 20, filters = {}) {
  const params = new URLSearchParams({ page, limit });
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const r = await fetch(`${API_URL}/crm/cotacoes?${params}`, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao buscar cotações.'); }
  return await r.json();
}

export async function getCrmPedidos(page = 1, limit = 20, filters = {}) {
  const params = new URLSearchParams({ page, limit });
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const r = await fetch(`${API_URL}/crm/pedidos?${params}`, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao buscar pedidos de venda.'); }
  return await r.json();
}

export async function getCrmOrganizacoesNomes() {
  const r = await fetch(`${API_URL}/crm/organizacoes-nomes`, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao buscar nomes de organizações.'); }
  return await r.json();
}

export async function getCrmOrganizacoesFiltros() {
  const r = await fetch(`${API_URL}/crm/organizacoes-filtros`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Erro ao buscar filtros.');
  return await r.json();
}

export async function triggerCrmSync(module = 'all') {
  const r = await fetch(`${API_URL}/crm/sync`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ module }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || 'Erro ao iniciar sincronização.');
  return json;
}

export async function getCrmSyncStatus() {
  const r = await fetch(`${API_URL}/crm/sync/status`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Erro ao consultar status da sincronização.');
  return await r.json();
}

// Baixa o Excel respeitando os filtros atuais (mesmos params usados na listagem)
async function downloadFile(url, filename) {
  const r = await fetch(url, { headers: authHeaders() });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro ao exportar.'); }
  const blob = await r.blob();
  const objUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objUrl);
}

export async function exportCrmOrganizacoes(q = '', filter = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (filter) params.set('filter', filter);
  await downloadFile(`${API_URL}/crm/organizacoes/export?${params}`, 'organizacoes.xlsx');
}

export async function exportCrmCotacoes(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  await downloadFile(`${API_URL}/crm/cotacoes/export?${params}`, 'cotacoes.xlsx');
}

export async function exportCrmPedidos(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  await downloadFile(`${API_URL}/crm/pedidos/export?${params}`, 'pedidos_venda.xlsx');
}

export async function transcreverVisita(file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${API_URL}/visitas/transcrever`, { method: 'POST', headers: authHeaders(), body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Erro ao transcrever áudio.');
  return data;
}

export async function salvarVisita(payload) {
  const r = await fetch(`${API_URL}/visitas`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Erro ao salvar relatório.');
  return data;
}

export async function listarVisitas(page = 1, limit = 20) {
  const r = await fetch(`${API_URL}/visitas?page=${page}&limit=${limit}`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Erro ao listar relatórios.');
  return r.json();
}

export async function getDashboardPipeline() {
  const r = await fetch(`${API_URL}/dashboard/pipeline`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Erro ao buscar dados de pipeline.');
  return r.json();
}

export async function getDashboardVisitas() {
  const r = await fetch(`${API_URL}/dashboard/visitas`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Erro ao buscar dados de visitas.');
  return r.json();
}

export async function getDashboardContas() {
  const r = await fetch(`${API_URL}/dashboard/contas`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Erro ao buscar dados de contas.');
  return r.json();
}