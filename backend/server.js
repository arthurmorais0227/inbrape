require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const PDFParser = require('pdf2json'); // ← adiciona isso também

const app = express();

// ✅ upload deve ficar AQUI, antes de qualquer rota
const upload = multer({ storage: multer.memoryStorage() });

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

  res.json({
  token,
  user: {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role
  }
});
});

// 👇 ADICIONA ISSO AQUI
app.get('/auth/verify', auth, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// ─────────────────────────────────────────────
// ADMIN - USERS
// ─────────────────────────────────────────────
app.get('/admin/users', auth, admin, async (req, res) => {
  const r = await pool.query(
    `SELECT id, username, name, email, role, status,
            created_at AS "createdAt", approved_at AS "approvedAt"
     FROM users ORDER BY created_at DESC`
  );
  res.json(r.rows);
});

app.patch('/admin/users/:id/status', auth, admin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved','rejected'].includes(status))
    return res.status(400).json({ error: 'Status inválido' });

  await pool.query(
    `UPDATE users SET status=$1, approved_at=${status === 'approved' ? 'NOW()' : 'NULL'} WHERE id=$2`,
    [status, id]
  );
  res.json({ ok: true });
});

app.patch('/admin/users/:id/password', auth, admin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Senha muito curta' });

  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, id]);
  res.json({ ok: true });
});

app.delete('/admin/users/:id', auth, admin, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM users WHERE id=$1', [id]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────
// EXCEL-DATA (retorna linhas brutas para gráficos)
// ─────────────────────────────────────────────
app.post('/excel-data', auth, upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) throw new Error('Planilha vazia');

    const columns = Object.keys(rows[0]);

    res.json({
      rows,
      columns,
      totalRows: rows.length,
      sheetName,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// ANALYZE (texto livre — usado pelo gráfico IA)
// ─────────────────────────────────────────────
app.post('/analyze', auth, async (req, res) => {
  const { text, mode } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto ausente' });

  const prompt = mode === 'summary'
    ? `Responda APENAS com JSON puro, sem markdown, sem explicação fora do JSON.\n\n${text}`
    : text;

  let result;
  try {
    result = await callNvidia(prompt);
  } catch {
    result = await callGroq(prompt);
  }

  res.json({ result });
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
// ───────────────────────────────────────────--

app.post('/analyze-excel', auth, upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!data.length) throw new Error('Planilha vazia');

    const cols = Object.keys(data[0]);
    const summary = {};

    cols.forEach(col => {
      const values = data.map(r => r[col]).filter(v => v !== '');
      const nums = values.map(Number).filter(v => !isNaN(v));
      if (nums.length) {
        const sum = nums.reduce((a, b) => a + b, 0);
        summary[col] = { tipo:'numérico', min:Math.min(...nums), max:Math.max(...nums), media:sum/nums.length };
      } else {
        const freq = {};
        values.forEach(v => freq[v] = (freq[v]||0) + 1);
        summary[col] = { tipo:'categórico', top:Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5) };
      }
    });

    const prompt = `Você é um analista de dados.\n\nResumo:\n${JSON.stringify(summary,null,2)}\n\nAmostra:\n${JSON.stringify(data.slice(0,10),null,2)}\n\nPergunta:\n${req.body.question||'Gere insights estratégicos'}\n\nResponda em português.`;

    let result;
    try { result = await callNvidia(prompt); }
    catch { result = await callGroq(prompt); }

    // ✅ agora retorna meta junto
    res.json({
      result,
      summary,
      meta: {
        columns: cols,
        totalRows: data.length,
        sheetName,
        fileName: req.file.originalname,
      }
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// ANALYZE DOCUMENT (PDF, TXT, MD, CSV)
// ─────────────────────────────────────────────

app.post('/analyze-document', auth, upload.single('file'), async (req, res) => {
  try {
    const { question } = req.body;
    const { originalname, buffer } = req.file;
    const ext = originalname.split('.').pop().toLowerCase();

    let content = '';

    if (ext === 'pdf') {
      content = await new Promise((resolve, reject) => {
        const parser = new PDFParser();
        parser.on('pdfParser_dataReady', (data) => {
          const text = data.Pages
            .map(p => p.Texts.map(t => decodeURIComponent(t.R[0].T)).join(' '))
            .join('\n');
          resolve(text);
        });
        parser.on('pdfParser_dataError', reject);
        parser.parseBuffer(buffer);
      });
    } else {
      content = buffer.toString('utf-8');
    }

    if (!content.trim()) throw new Error('Não foi possível extrair texto do arquivo.');

    const prompt = `Você é um analista especialista em documentos.

Documento: "${originalname}"
Conteúdo:
${content.slice(0, 12000)}

Pergunta/Instrução: ${question}

Responda em português de forma clara e estruturada.`;

    let result;
    try { result = await callNvidia(prompt); }
    catch { result = await callGroq(prompt); }

    res.json({ result });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// ANALYZE IMAGE
// ─────────────────────────────────────────────
app.post('/analyze-image', auth, upload.single('file'), async (req, res) => {
  try {
    const { mode, question } = req.body;
    const { buffer, mimetype } = req.file;

    const base64 = buffer.toString('base64');
    const imageUrl = `data:${mimetype};base64,${base64}`;

    const prompts = {
      describe:      'Descreva esta imagem detalhadamente em português.',
      extract_text:  'Extraia todo o texto visível nesta imagem. Retorne apenas o texto encontrado, preservando a formatação.',
      analyze_chart: 'Analise este gráfico ou tabela. Descreva os dados, tendências e insights principais em português.',
      identify:      'Identifique todos os objetos, elementos e características visíveis nesta imagem em português.',
      quality:       'Avalie tecnicamente a qualidade desta imagem: nitidez, iluminação, composição, cores e pontos de melhoria.',
      custom:        question || 'Descreva esta imagem.',
    };

    const prompt = prompts[mode] || prompts.describe;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY não configurada.' });
    }

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      throw new Error(data.error?.message || 'Erro ao analisar imagem.');
    }

    const result = data.choices?.[0]?.message?.content;
    res.json({ result });

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
