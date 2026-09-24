const express = require('express');
const router = express.Router();

const GLUO_API_URL = process.env.GLUO_API_URL;
const GLUO_API_TOKEN = process.env.GLUO_API_TOKEN;

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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/cotacoes?page=1&limit=20
router.get('/cotacoes', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await gluoFetch('/quotes', `?page=${page}&limit=${limit}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;    