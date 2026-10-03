const express = require('express');
const router = express.Router();

const GLUO_API_URL = process.env.GLUO_API_URL;
const GLUO_API_TOKEN = process.env.GLUO_API_TOKEN;

const CRM_STATUS_TRANSLATIONS = {
  created: 'criado',
  delivered: 'entregue',
  cancelled: 'cancelado',
  canceled: 'cancelado',
  open: 'aberto',
  won: 'vencedor',
  lost: 'perdedor',
  approved: 'aprovado',
  rejected: 'rejeitado',
  invoiced: 'faturado',
  pending: 'pendente',
  closed: 'fechado',
  paid: 'pago',
  draft: 'rascunho',
  active: 'ativo',
  inactive: 'inativo',
  archived: 'arquivado',
};

function translateCrmStatusValue(value) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  if (!normalized) return value;
  return CRM_STATUS_TRANSLATIONS[normalized.toLowerCase()] || value;
}

function translateCrmRecord(record) {
  if (!record || typeof record !== 'object') return record;
  if (Array.isArray(record)) return record.map((item) => translateCrmRecord(item));

  const out = {};
  for (const [key, value] of Object.entries(record)) {
    const lowerKey = String(key).toLowerCase();
    if (value && typeof value === 'object') {
      out[key] = translateCrmRecord(value);
    } else if (typeof value === 'string' && (
      lowerKey.includes('status') ||
      lowerKey.includes('stage') ||
      lowerKey.includes('state') ||
      lowerKey.includes('estado')
    )) {
      out[key] = translateCrmStatusValue(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function gluoFetch(path, query = '') {
  const res = await fetch(`${GLUO_API_URL}${path}${query}`, {
    headers: {
      Authorization: `Bearer ${GLUO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Gluo CRM respondeu ${res.status}`);
  return res.json();
}

// GET /api/crm/organizacoes?page=1&limit=20
router.get('/organizacoes', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await gluoFetch('/accounts', `?page=${page}&limit=${limit}`);
    const translated = Array.isArray(data?.data)
      ? { ...data, data: data.data.map((item) => translateCrmRecord(item)) }
      : data;
    res.json(translated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/cotacoes?page=1&limit=20
router.get('/cotacoes', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await gluoFetch('/quotes', `?page=${page}&limit=${limit}`);
    const translated = Array.isArray(data?.data)
      ? { ...data, data: data.data.map((item) => translateCrmRecord(item)) }
      : data;
    res.json(translated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;    