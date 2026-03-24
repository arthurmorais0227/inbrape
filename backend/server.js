require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

app.use(cors({
  origin: ['https://inbrape.vercel.app', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// ─────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.internal')
    ? false
    : { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );
  `);

  const existing = await pool.query("SELECT id FROM users WHERE username='admin'");
  if (!existing.rows.length) {
    const hash = await bcrypt.hash('inbrape2026', 10);
    await pool.query(`
      INSERT INTO users (username, name, email, password_hash, role, status, approved_at)
      VALUES ('admin','Administrador','admin@inbrape.com.br',$1,'admin','approved',NOW())
    `, [hash]);
    console.log('✅ Admin criado');
  }
}

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function admin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  const r = await pool.query(
    'SELECT * FROM users WHERE LOWER(username)=LOWER($1)',
    [username]
  );

  const user = r.rows[0];
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  if (user.status !== 'approved') {
    return res.status(403).json({ error: 'Conta não aprovada' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token });
});

// ─────────────────────────────────────────────
// NVIDIA (principal)
// ─────────────────────────────────────────────
async function callNvidia(prompt) {
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'microsoft/phi-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  if (!r.ok) {
    throw new Error(await r.text());
  }

  const data = await r.json();
  return data.choices?.[0]?.message?.content;
}

// ─────────────────────────────────────────────
// GROQ (fallback)
// ─────────────────────────────────────────────
async function callGroq(prompt) {
  if (!process.env.GROQ_API_KEY) return null;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      })
    });

    const data = await r.json();
    return data.choices?.[0]?.message?.content;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// HELPER EXCEL
// ─────────────────────────────────────────────
function readExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// ─────────────────────────────────────────────
// ANALYZE EXCEL (ULTRA OTIMIZADO)
// ─────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

app.post('/analyze-excel', auth, upload.single('file'), async (req, res) => {
  try {
    const data = readExcel(req.file.buffer);
    if (!data.length) throw new Error('Planilha vazia');

    const cols = Object.keys(data[0]);

    // 🔥 resumo estatístico
    const summary = {};

    cols.forEach(col => {
      const values = data.map(r => r[col]).filter(v => v !== '');

      const nums = values.map(Number).filter(v => !isNaN(v));

      if (nums.length) {
        const sum = nums.reduce((a, b) => a + b, 0);
        summary[col] = {
          tipo: 'numérico',
          min: Math.min(...nums),
          max: Math.max(...nums),
          media: sum / nums.length
        };
      } else {
        const freq = {};
        values.forEach(v => freq[v] = (freq[v] || 0) + 1);

        summary[col] = {
          tipo: 'categórico',
          top: Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
        };
      }
    });

    const sample = data.slice(0, 10);

    const prompt = `
Você é um analista de dados.

Resumo:
${JSON.stringify(summary, null, 2)}

Amostra:
${JSON.stringify(sample, null, 2)}

Pergunta:
${req.body.question || 'Gere insights estratégicos'}

Responda em português.
`;

    let result;

    try {
      result = await callNvidia(prompt);
    } catch {
      result = await callGroq(prompt);
    }

    res.json({ result, summary });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
app.post('/chat', auth, async (req, res) => {
  const prompt = req.body.messages.map(m => m.content).join('\n');

  let result;
  try {
    result = await callNvidia(prompt);
  } catch {
    result = await callGroq(prompt);
  }

  res.json({ result });
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server rodando na porta ${PORT}`);
  });
});