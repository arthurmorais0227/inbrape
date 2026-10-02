require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');  
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const PDFParser = require('pdf2json'); // ← adiciona isso também

const app = express();

// ✅ upload deve ficar AQUI, antes de qualquer rota
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === 'http://localhost:3000' ||
      origin === 'https://inbrape.onrender.com' ||
      /^https:\/\/inbrape(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
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

app.post('/auth/register', async (req, res) => {
  try {
    const { username, name, email, password } = req.body;

    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, name, email, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [username, name, email, hash]
    );

    res.status(201).json({
      message: 'Usuário criado! Aguarde aprovação do admin.'
    });

  } catch (e) {
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }

    res.status(500).json({ error: e.message });
  }
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

// Lista os ids de PDFs padrão que um usuário pode ver. Lista vazia = sem
// restrição (acesso a todos).
app.get('/admin/users/:id/pdf-access', auth, admin, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT pdf_standard_id FROM user_pdf_access WHERE user_id=$1',
      [req.params.id]
    );
    res.json(r.rows.map(row => row.pdf_standard_id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Define a lista completa de PDFs permitidos para um usuário (substitui a
// anterior). Enviar pdfIds: [] remove toda restrição (volta a ver todos).
app.put('/admin/users/:id/pdf-access', auth, admin, async (req, res) => {
  const { id } = req.params;
  const { pdfIds } = req.body;
  if (!Array.isArray(pdfIds)) return res.status(400).json({ error: 'pdfIds deve ser uma lista.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_pdf_access WHERE user_id=$1', [id]);
    if (pdfIds.length) {
      const values = pdfIds.map((_, i) => `($1, $${i + 2})`).join(',');
      await client.query(
        `INSERT INTO user_pdf_access (user_id, pdf_standard_id) VALUES ${values}`,
        [id, ...pdfIds]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
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
// ─────────────────────────────────────────────
// ANALYZE (gráfico inteligente com agrupamento)
// ─────────────────────────────────────────────
app.post('/analyze', auth, async (req, res) => {
  const { text, mode, rows, columns } = req.body;

  if (mode !== 'summary' || !rows) {
    // uso normal de texto
    const prompt = text;
    try {
      const result = await callAI(prompt);
      return res.json({ result });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // modo gráfico: IA processa e agrupa os dados
  const prompt = `Você é um especialista em análise de dados e visualização.

O usuário quer: "${text}"

Colunas disponíveis: ${columns.join(', ')}

Dados completos (${rows.length} linhas):
${JSON.stringify(rows.slice(0, 200))}

Sua tarefa:
1. Entenda o pedido do usuário
2. Filtre as linhas relevantes se necessário (ex: produtos que contêm "gaiola" ou "manga")
3. Agrupe e some os valores pela coluna de categoria escolhida
4. Retorne APENAS um JSON válido, sem markdown, sem explicação fora do JSON:

{
  "chartType": "bar|line|pie|doughnut|pareto",
  "labels": ["Categoria A", "Categoria B"],
  "values": [100, 200],
  "xCol": "nome da coluna usada como categoria",
  "yCol": "nome da coluna somada",
  "explanation": "explicação em português do que foi feito"
}

IMPORTANTE: os arrays labels e values devem ter o mesmo tamanho. Agrupe sempre — nunca retorne dados duplicados.`;

  try {
    const raw = await callAI(prompt);

    const match = (raw || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('IA não retornou JSON válido.');

    const config = JSON.parse(match[0]);
    res.json({ result: raw, config });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurada.');

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'Erro ao consultar Groq.');
  return data.choices?.[0]?.message?.content;
}

// ─────────────────────────────────────────────
// Tenta NVIDIA primeiro; se falhar, tenta Groq. Só falha de verdade se os dois falharem.
// ─────────────────────────────────────────────
async function callAI(prompt) {
  try {
    return await callNvidia(prompt);
  } catch (nvErr) {
    try {
      return await callGroq(prompt);
    } catch (groqErr) {
      throw new Error(`IA indisponível. NVIDIA: ${nvErr.message} | Groq: ${groqErr.message}`);
    }
  }
}

// ─────────────────────────────────────────────
// NVIDIA (visão — usado na análise de imagem)
// ─────────────────────────────────────────────
async function callNvidiaVision(prompt, imageUrl) {
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-90b-vision-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      max_tokens: 2000,
      temperature: 0.2,
    })
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'Erro ao analisar imagem (NVIDIA).');
  return data.choices?.[0]?.message?.content;
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

    const prompt = `
Você é um analista de dados.

IMPORTANTE:
- O resumo abaixo foi calculado com TODOS os ${data.length} registros da planilha.
- NÃO use apenas a amostra.
- Use o resumo como base principal.
- A amostra é apenas ilustrativa.

Resumo completo (base real dos dados):
${JSON.stringify(summary,null,2)}

Exemplo de linhas (apenas referência):
${JSON.stringify(data.slice(0,10),null,2)}

Pergunta:
${req.body.question || 'Gere insights estratégicos'}

Responda considerando TODOS os dados.
`;

    const result = await callAI(prompt);
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

    const result = await callAI(prompt);
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

    if (!process.env.NVIDIA_API_KEY) {
      return res.status(500).json({ error: 'NVIDIA_API_KEY não configurada.' });
    }

    const result = await callNvidiaVision(prompt, imageUrl);
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

  try {
    const result = await callAI(prompt);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/// ── PDF STANDARDS ─────────────────────────────────────────────────────────────

async function initPDFStandardsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pdf_standards (
      id SERIAL PRIMARY KEY,
      name VARCHAR(300) NOT NULL,
      description TEXT DEFAULT '',
      filename VARCHAR(300) NOT NULL,
      size INTEGER NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Restrição opcional de acesso: se um usuário tiver linhas aqui, só enxerga
  // esses PDFs padrão. Sem nenhuma linha = acesso a todos (comportamento padrão).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_pdf_access (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pdf_standard_id INTEGER NOT NULL REFERENCES pdf_standards(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, pdf_standard_id)
    );
  `);
}

// Retorna null se o usuário tem acesso a TODOS os PDFs padrão (irrestrito),
// ou um Set com os ids permitidos, se ele estiver restrito.
async function getAllowedStandardIds(user) {
  if (user.role === 'admin') return null;
  const r = await pool.query(
    'SELECT pdf_standard_id FROM user_pdf_access WHERE user_id=$1',
    [user.id]
  );
  if (!r.rows.length) return null;
  return new Set(r.rows.map(row => row.pdf_standard_id));
}

// Listar PDFs padrão
app.get('/pdf-standards', auth, async (req, res) => {
  try {
    const allowed = await getAllowedStandardIds(req.user);
    let r;
    if (allowed === null) {
      r = await pool.query(
        'SELECT id, name, description, filename, size, created_at FROM pdf_standards ORDER BY created_at DESC'
      );
    } else {
      r = await pool.query(
        'SELECT id, name, description, filename, size, created_at FROM pdf_standards WHERE id = ANY($1) ORDER BY created_at DESC',
        [[...allowed]]
      );
    }
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Adicionar PDF padrão (admin)
app.post('/pdf-standards', auth, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo.' });
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório.' });
    if (req.file.mimetype !== 'application/pdf')
      return res.status(400).json({ error: 'Apenas PDFs são aceitos.' });

    const r = await pool.query(
      `INSERT INTO pdf_standards (name, description, filename, size, data)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, filename, size, created_at`,
      [name.trim(), description?.trim() || '', req.file.originalname, req.file.size, req.file.buffer]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover PDF padrão (admin)
app.delete('/pdf-standards/:id', auth, admin, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM pdf_standards WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'PDF não encontrado.' });
    res.json({ message: 'PDF removido.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/pdf-edit', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum PDF.' });

  const { action, watermark, annotation, annotationPage, pages } = req.body;

  try {
    const { PDFDocument, rgb, degrees } = require('pdf-lib');
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pdfPages = pdfDoc.getPages();

    if (action === 'watermark' && watermark) {
      for (const page of pdfPages) {
        const { width, height } = page.getSize();
        page.drawText(watermark, {
          x: width / 2 - (watermark.length * 6),
          y: height / 2,
          size: 48,
          color: rgb(0.8, 0.8, 0.8),
          opacity: 0.25,
          rotate: degrees(45),
        });
      }
    }

    if (action === 'annotate' && annotation) {
      const idx = Math.min(Math.max((parseInt(annotationPage) || 1) - 1, 0), pdfPages.length - 1);
      pdfPages[idx].drawText(annotation, {
        x: 40,
        y: 30,
        size: 10,
        color: rgb(0.1, 0.16, 0.33),
        maxWidth: pdfPages[idx].getSize().width - 80,
      });
    }

    if (action === 'extract' && pages) {
      const sel = JSON.parse(pages);
      const newDoc = await PDFDocument.create();
      for (const p of sel) {
        const i = p - 1;
        if (i >= 0 && i < pdfPages.length) {
          const [copied] = await newDoc.copyPages(pdfDoc, [i]);
          newDoc.addPage(copied);
        }
      }
      const bytes = await newDoc.save();
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="paginas.pdf"' });
      return res.send(Buffer.from(bytes));
    }

    // ── MERGE COM PDFs PADRÃO ──────────────────────────────────────────────
    if (action === 'merge_standards') {
  const { standardIds } = req.body;
  let ids = standardIds ? JSON.parse(standardIds) : [];
  if (!ids.length) throw new Error('Nenhum PDF selecionado.');

  // Garante que o usuário só consiga mesclar PDFs padrão que ele tem permissão de ver
  const allowed = await getAllowedStandardIds(req.user);
  if (allowed !== null) {
    ids = ids.filter(id => allowed.has(Number(id)));
    if (!ids.length) throw new Error('Você não tem acesso a nenhum dos PDFs padrão selecionados.');
  }

  const mergedDoc = await PDFDocument.create();

  // Copia páginas do PDF do usuário
  const userPages = await mergedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
  userPages.forEach(p => mergedDoc.addPage(p));

  // Busca cada PDF padrão direto do banco
  for (const id of ids) {
    const r = await pool.query('SELECT data FROM pdf_standards WHERE id=$1', [id]);
    if (!r.rows.length) continue;

    const stdDoc = await PDFDocument.load(r.rows[0].data);
    const stdPages = await mergedDoc.copyPages(stdDoc, stdDoc.getPageIndices());
    stdPages.forEach(p => mergedDoc.addPage(p));
  }

  const bytes = await mergedDoc.save();
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="mesclado.pdf"' });
  return res.send(Buffer.from(bytes));
}
    // ── FIM MERGE ──────────────────────────────────────────────────────────

    const bytes = await pdfDoc.save();
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="editado.pdf"' });
    res.send(Buffer.from(bytes));

  } catch (e) {
    res.status(500).json({ error: 'Erro ao processar PDF.' });
  }
});

// ─────────────────────────────────────────────
// CRM (Gluo) — sincroniza pro Postgres, tela lê do Postgres
// ─────────────────────────────────────────────
const ExcelJS = require('exceljs');

const syncState = {
  running: false,
  module: null,
  page: 0,
  totalPages: null,
  startedAt: null,
  finishedAt: null,
  error: null,
};

function buildSearchText(record) {
  return Object.values(record)
    .filter((v) => typeof v === 'string')
    .join(' ')
    .toLowerCase();
}

function parseDataEmissao(r) {
  const raw = r.data_emissao_inbrape || (r.createdtime ? String(r.createdtime).split(' ')[0] : null);
  return raw || null;
}

async function gluoFetchPage(path, page, extraParams = {}) {
  const params = new URLSearchParams({ page, limit: 100, ...extraParams });
  const res = await fetch(`${process.env.GLUO_API_URL}${path}?${params}`, {
    headers: {
      Authorization: `Bearer ${process.env.GLUO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Gluo CRM respondeu ${res.status}`);
  const json = await res.json();
  const batch = json?.data || json?.result || json?.records || json?.items || (Array.isArray(json) ? json : []);
  return { batch, meta: json?.meta || {} };
}

async function upsertOrganizacoes(rows) {
  const valid = rows.filter((r) => r.id);
  if (valid.length === 0) return;
  const cols = ['id', 'accountname', 'cpfcnpj', 'industry', 'search_text', 'data'];
  const values = [];
  const placeholders = valid
    .map((r, i) => {
      const b = i * cols.length;
      values.push(r.id, r.accountname || null, r.cpfcnpj || null, r.industry || null, buildSearchText(r), JSON.stringify(r));
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6})`;
    })
    .join(',');
  await pool.query(
    `INSERT INTO crm_organizacoes (id, accountname, cpfcnpj, industry, search_text, data)
     VALUES ${placeholders}
     ON CONFLICT (id) DO UPDATE SET
       accountname=EXCLUDED.accountname, cpfcnpj=EXCLUDED.cpfcnpj, industry=EXCLUDED.industry,
       search_text=EXCLUDED.search_text, data=EXCLUDED.data, synced_at=now()`,
    values
  );
}

async function upsertCotacoes(rows) {
  const valid = rows.filter((r) => r.id);
  if (valid.length === 0) return;
  const cols = [
    'id', 'subject', 'quote_no', 'account_id', 'quotestage', 'total', 'validtill', 'data_emissao',
    'nome_representante_inbrape', 'complemento_inbrape', 'produto_inbrape', 'cod_representante_inbrape',
    'search_text', 'data',
  ];
  const values = [];
  const placeholders = valid
    .map((r, i) => {
      const b = i * cols.length;
      const total = r.total != null && !Number.isNaN(Number(r.total)) ? Number(r.total) : null;
      values.push(
        r.id, r.subject || null, r.quote_no || null, r.account_id || null,
        r.quotestage || null, total, r.validtill || null, parseDataEmissao(r),
        r.nome_representante_inbrape || null, r.complemento_inbrape || null,
        r.produto_inbrape || null, r.cod_representante_inbrape || null,
        buildSearchText(r), JSON.stringify(r)
      );
      return `(${cols.map((_, j) => `$${b + j + 1}`).join(',')})`;
    })
    .join(',');
  await pool.query(
    `INSERT INTO crm_cotacoes (${cols.join(', ')})
     VALUES ${placeholders}
     ON CONFLICT (id) DO UPDATE SET
       subject=EXCLUDED.subject, quote_no=EXCLUDED.quote_no, account_id=EXCLUDED.account_id,
       quotestage=EXCLUDED.quotestage, total=EXCLUDED.total, validtill=EXCLUDED.validtill,
       data_emissao=EXCLUDED.data_emissao,
       nome_representante_inbrape=EXCLUDED.nome_representante_inbrape,
       complemento_inbrape=EXCLUDED.complemento_inbrape,
       produto_inbrape=EXCLUDED.produto_inbrape,
       cod_representante_inbrape=EXCLUDED.cod_representante_inbrape,
       search_text=EXCLUDED.search_text, data=EXCLUDED.data, synced_at=now()`,
    values
  );
}

async function syncModule(path, upsertFn, moduleLabel) {
  let page = 1;
  const BATCH = 100;
  while (true) {
    syncState.module = moduleLabel;
    syncState.page = page;
    const { batch, meta } = await gluoFetchPage(path, page, { sort: '-createdtime' });
    if (meta?.totalPages) syncState.totalPages = meta.totalPages;
    if (batch.length === 0) break;
    await upsertFn(batch);
    if (batch.length < BATCH) break;
    page++;
    await new Promise((r) => setTimeout(r, 550));
  }
}

async function runFullSync() {
  if (syncState.running) return;
  syncState.running = true;
  syncState.error = null;
  syncState.startedAt = new Date().toISOString();
  syncState.finishedAt = null;
  try {
    await syncModule('/accounts', upsertOrganizacoes, 'organizacoes');
    await syncModule('/quotes', upsertCotacoes, 'cotacoes');
  } catch (err) {
    syncState.error = err.message;
    console.error('[crm/sync]', err.message);
  } finally {
    syncState.running = false;
    syncState.finishedAt = new Date().toISOString();
    syncState.module = null;
  }
}

async function initCrmTables() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_organizacoes (
      id TEXT PRIMARY KEY,
      accountname TEXT,
      cpfcnpj TEXT,
      industry TEXT,
      search_text TEXT,
      data JSONB NOT NULL,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_org_search ON crm_organizacoes USING gin (search_text gin_trgm_ops)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_org_industry ON crm_organizacoes (industry)');
  // NOVO: faltava índice pra busca por nome de organização (usado no filtro "Nome Organização" das cotações)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_org_accountname_trgm ON crm_organizacoes USING gin (accountname gin_trgm_ops)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_cotacoes (
      id TEXT PRIMARY KEY,
      subject TEXT,
      quote_no TEXT,
      account_id TEXT,
      quotestage TEXT,
      total NUMERIC,
      validtill TEXT,
      search_text TEXT,
      data JSONB NOT NULL,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('ALTER TABLE crm_cotacoes ADD COLUMN IF NOT EXISTS nome_representante_inbrape TEXT');
  await pool.query('ALTER TABLE crm_cotacoes ADD COLUMN IF NOT EXISTS complemento_inbrape TEXT');
  await pool.query('ALTER TABLE crm_cotacoes ADD COLUMN IF NOT EXISTS produto_inbrape TEXT');
  await pool.query('ALTER TABLE crm_cotacoes ADD COLUMN IF NOT EXISTS cod_representante_inbrape TEXT');
  // NOVO: coluna de data de emissão, pro filtro por data
  await pool.query('ALTER TABLE crm_cotacoes ADD COLUMN IF NOT EXISTS data_emissao DATE');

  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_search ON crm_cotacoes USING gin (search_text gin_trgm_ops)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_stage ON crm_cotacoes (quotestage)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_account ON crm_cotacoes (account_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_subject ON crm_cotacoes USING gin (subject gin_trgm_ops)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_repr ON crm_cotacoes USING gin (nome_representante_inbrape gin_trgm_ops)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_produto ON crm_cotacoes USING gin (produto_inbrape gin_trgm_ops)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_complemento ON crm_cotacoes USING gin (complemento_inbrape gin_trgm_ops)');
  // CORRIGIDO: era btree (não ajuda ILIKE), agora é trigram de verdade
  await pool.query('DROP INDEX IF EXISTS idx_crm_cot_codrepr');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_codrepr ON crm_cotacoes USING gin (cod_representante_inbrape gin_trgm_ops)');
  // NOVOS: pro filtro de Total (agora exato, não mais texto) e pro filtro de data
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_total ON crm_cotacoes (total)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_cot_data_emissao ON crm_cotacoes (data_emissao)');
}

// Monta WHERE/params compartilhado entre a listagem e a exportação de cotações
function buildCotacoesWhere(query) {
  const textFilters = {
    subject: query.subject,
    nome_representante_inbrape: query.nome_representante_inbrape,
    complemento_inbrape: query.complemento_inbrape,
    produto_inbrape: query.produto_inbrape,
    cod_representante_inbrape: query.cod_representante_inbrape,
  };
  const quotestage = (query.quotestage || '').trim();
  const accountName = (query.account_name || '').trim();
  const totalFilter = (query.total || '').trim();
  const dataDe = (query.data_de || '').trim();
  const dataAte = (query.data_ate || '').trim();

  const conditions = [];
  const params = [];
  Object.entries(textFilters).forEach(([col, val]) => {
    const v = (val || '').trim();
    if (v) { params.push(`%${v}%`); conditions.push(`c.${col} ILIKE $${params.length}`); }
  });
  // Estágio agora é comparação exata (case-insensitive) — mais rápido e mais correto
  // que ILIKE substring num campo de poucos valores possíveis (Aberto/Vencedor/Perdedor).
  if (quotestage) { params.push(quotestage); conditions.push(`LOWER(c.quotestage) = LOWER($${params.length})`); }
  // Total agora casa valor exato (usa índice numérico) em vez de ILIKE em texto convertido,
  // que forçava varredura completa da tabela toda vez.
  if (totalFilter) {
    const n = Number(totalFilter.replace(',', '.'));
    if (!Number.isNaN(n)) { params.push(n); conditions.push(`c.total = $${params.length}`); }
  }
  if (dataDe) { params.push(dataDe); conditions.push(`c.data_emissao >= $${params.length}`); }
  if (dataAte) { params.push(dataAte); conditions.push(`c.data_emissao <= $${params.length}`); }

  const needsJoin = !!accountName;
  if (accountName) { params.push(`%${accountName}%`); conditions.push(`o.accountname ILIKE $${params.length}`); }

  const from = needsJoin ? 'crm_cotacoes c LEFT JOIN crm_organizacoes o ON o.id = c.account_id' : 'crm_cotacoes c';
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { from, where, params };
}

function buildOrganizacoesWhere(query) {
  const q = (query.q || '').trim().toLowerCase();
  const filter = (query.filter || '').trim();
  const conditions = [];
  const params = [];
  if (q) { params.push(`%${q}%`); conditions.push(`search_text ILIKE $${params.length}`); }
  if (filter) { params.push(filter); conditions.push(`industry = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

// ── Organizações ──
app.get('/crm/organizacoes', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { where, params } = buildOrganizacoesWhere(req.query);

    // Antes eram 2 queries (COUNT + SELECT); agora é 1 só, usando COUNT(*) OVER()
    const listParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT data, COUNT(*) OVER() AS total_count
       FROM crm_organizacoes ${where}
       ORDER BY synced_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    const total = dataRes.rows.length > 0 ? parseInt(dataRes.rows[0].total_count, 10) : 0;

    res.json({ data: dataRes.rows.map((r) => r.data), meta: { page, limit, total, hasMore: offset + limit < total } });
  } catch (err) {
    console.error('[crm/organizacoes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/crm/organizacoes-nomes', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, accountname FROM crm_organizacoes');
    res.json({ data: r.rows });
  } catch (err) {
    console.error('[crm/organizacoes-nomes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/crm/organizacoes-filtros', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT DISTINCT industry FROM crm_organizacoes WHERE industry IS NOT NULL AND industry <> '' ORDER BY industry LIMIT 300`);
    res.json({ data: r.rows.map((row) => row.industry) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/crm/organizacoes/export', auth, async (req, res) => {
  try {
    const { where, params } = buildOrganizacoesWhere(req.query);
    const r = await pool.query(`SELECT data FROM crm_organizacoes ${where} ORDER BY accountname`, params);
    const rows = r.rows.map((row) => row.data);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Inbrape';
    const ws = wb.addWorksheet('Organizações', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'Nome', key: 'accountname', width: 34 },
      { header: 'CNPJ', key: 'cpfcnpj', width: 20 },
      { header: 'Segmento', key: 'industry', width: 24 },
      { header: 'Telefone', key: 'phone', width: 16 },
      { header: 'E-mail', key: 'email1', width: 28 },
      { header: 'Cidade', key: 'bill_city', width: 18 },
      { header: 'Estado', key: 'bill_state', width: 8 },
      { header: 'Classificação ABC', key: 'classificacao_abc_inbrape', width: 14 },
      { header: 'Dias sem venda', key: 'dias_sem_venda_inbrape', width: 14 },
      { header: 'Último faturamento (R$)', key: 'valor_ultimo_fat_inbrape', width: 18 },
      { header: 'Representante', key: 'nome_representante_inbrape', width: 24 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF024088' } };
      cell.alignment = { vertical: 'middle' };
    });
    ws.getRow(1).height = 22;

    rows.forEach((item, i) => {
      const row = ws.addRow(item);
      if (i % 2 === 1) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; });
    });
    const fatCol = ws.getColumn('valor_ultimo_fat_inbrape');
    fatCol.numFmt = '"R$" #,##0.00';
    ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + ws.columns.length)}1` };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="organizacoes.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[crm/organizacoes/export]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Cotações ──
app.get('/crm/cotacoes', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { from, where, params } = buildCotacoesWhere(req.query);

    const listParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT c.data, COUNT(*) OVER() AS total_count
       FROM ${from} ${where}
       ORDER BY c.synced_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    const total = dataRes.rows.length > 0 ? parseInt(dataRes.rows[0].total_count, 10) : 0;

    res.json({ data: dataRes.rows.map((r) => r.data), meta: { page, limit, total, hasMore: offset + limit < total } });
  } catch (err) {
    console.error('[crm/cotacoes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/crm/cotacoes/export', auth, async (req, res) => {
  try {
    const { from, where, params } = buildCotacoesWhere(req.query);
    const r = await pool.query(
      `SELECT c.data, o.accountname AS cliente_nome
       FROM ${from.includes('LEFT JOIN') ? from : 'crm_cotacoes c LEFT JOIN crm_organizacoes o ON o.id = c.account_id'}
       ${where}
       ORDER BY c.synced_at DESC`,
      params
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Inbrape';
    const ws = wb.addWorksheet('Cotações', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'Assunto', key: '_subject', width: 16 },
      { header: 'Nº Cotação', key: '_quote_no', width: 14 },
      { header: 'Cliente', key: '_cliente', width: 32 },
      { header: 'Representante', key: '_representante', width: 22 },
      { header: 'Status', key: '_status', width: 14 },
      { header: 'Total (R$)', key: '_total', width: 16 },
      { header: 'Data Emissão', key: '_data_emissao', width: 14 },
      { header: 'Produto', key: '_produto', width: 28 },
      { header: 'Complemento', key: '_complemento', width: 28 },
      { header: 'Cód. Representante', key: '_cod_rep', width: 14 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF024088' } };
      cell.alignment = { vertical: 'middle' };
    });
    ws.getRow(1).height = 22;

    const STAGE_ARGB = { vencedor: 'FFD1FAE5', perdedor: 'FFFEE2E2', aberto: 'FFDBEAFE' };

    r.rows.forEach((row, i) => {
      const d = row.data;
      const line = ws.addRow({
        _subject: d.subject || '',
        _quote_no: d.quote_no || '',
        _cliente: row.cliente_nome || '',
        _representante: d.nome_representante_inbrape || '',
        _status: d.quotestage || '',
        _total: d.total != null ? Number(d.total) : null,
        _data_emissao: d.data_emissao_inbrape || '',
        _produto: d.produto_inbrape || '',
        _complemento: d.complemento_inbrape || '',
        _cod_rep: d.cod_representante_inbrape || '',
      });
      if (i % 2 === 1) line.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; });
      const stageColor = STAGE_ARGB[String(d.quotestage || '').toLowerCase()];
      if (stageColor) line.getCell('_status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stageColor } };
    });

    ws.getColumn('_total').numFmt = '"R$" #,##0.00';
    ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + ws.columns.length)}1` };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cotacoes.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[crm/cotacoes/export]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Sincronização ──
app.post('/crm/sync', auth, admin, (req, res) => {
  if (syncState.running) return res.status(409).json({ error: 'Sincronização já em andamento' });
  runFullSync();
  res.json({ started: true });
});

app.get('/crm/sync/status', auth, (req, res) => {
  res.json(syncState);
});

// ─────────────────────────────────────────────
// RELATÓRIO DE VISITA POR ÁUDIO
// ─────────────────────────────────────────────
async function initVisitasTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_visitas (
      id SERIAL PRIMARY KEY,
      account_id TEXT,
      empresa_unidade TEXT,
      data_visita DATE,
      com_quem TEXT,
      objetivo TEXT,
      resultado TEXT,
      oportunidades TEXT,
      concorrente TEXT,
      estagio TEXT,
      proximo_passo TEXT,
      responsavel TEXT,
      data_proximo_passo DATE,
      apoio_comercial TEXT,
      transcricao TEXT,
      criado_por INTEGER REFERENCES users(id),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_visitas_account ON crm_visitas (account_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_crm_visitas_data ON crm_visitas (data_visita)');
}

async function transcribeAudio(buffer, filename) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY não configurada.');
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename || 'audio.m4a');
  form.append('model', 'whisper-large-v3');
  form.append('language', 'pt');
  form.append('response_format', 'json');

  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'Erro ao transcrever áudio.');
  return data.text;
}

function buildVisitExtractionPrompt(transcricao) {
  return `Você é um assistente que estrutura relatórios de visita comercial/técnica de campo (indústria de filtração — mangas e gaiolas).

Abaixo está a transcrição de um áudio gravado por um técnico/vendedor logo após uma visita a um cliente. Extraia as informações no formato de relatório padrão da empresa.

Transcrição:
"""
${transcricao}
"""

Responda APENAS com um JSON válido (sem markdown, sem texto antes ou depois), no formato exato:
{
  "empresa_unidade": "nome da empresa/unidade visitada, ou vazio se não mencionado",
  "com_quem": "nome(s), cargo(s) e área(s) das pessoas com quem falou",
  "objetivo": "objetivo da visita",
  "resultado": "o que foi constatado e decidido",
  "oportunidades": "outras oportunidades identificadas na planta (filtros, mangas, gaiolas, lonas, peças)",
  "concorrente": "concorrente atual e preço, se mencionado",
  "estagio": "uma destas opções: contato, apresentacao, homologacao-vendor-list, amostra, piloto, cotacao, pedido — ou vazio se não ficar claro",
  "proximo_passo": "próximo passo combinado",
  "responsavel": "responsável pelo próximo passo",
  "apoio_comercial": "apoio necessário do comercial, se mencionado"
}

Se alguma informação não foi mencionada na transcrição, deixe o campo como string vazia "". Não invente informação que não está na transcrição.`;
}

app.post('/visitas/transcrever', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('Envie um arquivo de áudio.');
    if (req.file.size > 20 * 1024 * 1024) throw new Error('Áudio muito grande. Máximo 20MB.');

    const transcricao = await transcribeAudio(req.file.buffer, req.file.originalname);
    if (!transcricao?.trim()) throw new Error('Não foi possível transcrever o áudio — ele pode estar vazio ou sem fala.');

    const raw = await callAI(buildVisitExtractionPrompt(transcricao));
    let campos;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      campos = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      throw new Error('A IA não retornou um formato válido. Tente novamente.');
    }

    // Sugere organizações já sincronizadas com nome parecido ao mencionado no áudio
    let sugestoesOrganizacao = [];
    if (campos.empresa_unidade) {
      const r = await pool.query(
        `SELECT id, accountname FROM crm_organizacoes WHERE accountname ILIKE $1 ORDER BY accountname LIMIT 5`,
        [`%${campos.empresa_unidade}%`]
      );
      sugestoesOrganizacao = r.rows;
    }

    res.json({ transcricao, campos, sugestoesOrganizacao });
  } catch (e) {
    console.error('[visitas/transcrever]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/visitas', auth, async (req, res) => {
  try {
    const {
      account_id, empresa_unidade, data_visita, com_quem, objetivo, resultado,
      oportunidades, concorrente, estagio, proximo_passo, responsavel,
      data_proximo_passo, apoio_comercial, transcricao,
    } = req.body;

    const r = await pool.query(
      `INSERT INTO crm_visitas
        (account_id, empresa_unidade, data_visita, com_quem, objetivo, resultado, oportunidades,
         concorrente, estagio, proximo_passo, responsavel, data_proximo_passo, apoio_comercial, transcricao, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        account_id || null, empresa_unidade || null, data_visita || null, com_quem || null,
        objetivo || null, resultado || null, oportunidades || null, concorrente || null,
        estagio || null, proximo_passo || null, responsavel || null, data_proximo_passo || null,
        apoio_comercial || null, transcricao || null, req.user.id,
      ]
    );
    res.json({ id: r.rows[0].id });
  } catch (e) {
    console.error('[visitas/salvar]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/visitas', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const totalRes = await pool.query('SELECT COUNT(*) FROM crm_visitas');
    const total = parseInt(totalRes.rows[0].count, 10);

    const r = await pool.query(
      `SELECT v.*, u.name AS criado_por_nome
       FROM crm_visitas v
       LEFT JOIN users u ON u.id = v.criado_por
       ORDER BY v.criado_em DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: r.rows, meta: { page, limit, total, hasMore: offset + limit < total } });
  } catch (e) {
    console.error('[visitas/listar]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// PAINEL DE INTELIGÊNCIA
// ─────────────────────────────────────────────

// Pipeline: valor e contagem por estágio, conversão, tendência mensal, top contas
app.get('/dashboard/pipeline', auth, async (req, res) => {
  try {
    const porEstagio = await pool.query(`
      SELECT COALESCE(NULLIF(quotestage, ''), 'Sem estágio') AS estagio,
             COUNT(*) AS qtd, COALESCE(SUM(total), 0) AS valor
      FROM crm_cotacoes
      GROUP BY estagio
      ORDER BY valor DESC
    `);

    const tendencia = await pool.query(`
      SELECT to_char(date_trunc('month', (data->>'createdtime')::timestamp), 'YYYY-MM') AS mes,
             COUNT(*) AS qtd, COALESCE(SUM(total), 0) AS valor
      FROM crm_cotacoes
      WHERE data->>'createdtime' IS NOT NULL
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6
    `);

    const topContas = await pool.query(`
      SELECT c.account_id, COALESCE(o.accountname, 'Sem organização') AS accountname,
             COUNT(*) AS qtd, COALESCE(SUM(c.total), 0) AS valor
      FROM crm_cotacoes c
      LEFT JOIN crm_organizacoes o ON o.id = c.account_id
      GROUP BY c.account_id, o.accountname
      ORDER BY valor DESC
      LIMIT 10
    `);

    const vencedor = porEstagio.rows.find(r => r.estagio.toLowerCase() === 'vencedor');
    const perdedor = porEstagio.rows.find(r => r.estagio.toLowerCase() === 'perdedor');
    const ganhas = Number(vencedor?.qtd || 0);
    const perdidas = Number(perdedor?.qtd || 0);
    const taxaConversao = (ganhas + perdidas) > 0 ? ganhas / (ganhas + perdidas) : null;
    const valorAberto = porEstagio.rows
      .filter(r => !['vencedor', 'perdedor'].includes(r.estagio.toLowerCase()))
      .reduce((acc, r) => acc + Number(r.valor), 0);

    res.json({
      porEstagio: porEstagio.rows.reverse(),
      tendencia: tendencia.rows.reverse(),
      topContas: topContas.rows,
      resumo: { taxaConversao, valorAberto, ganhas, perdidas },
    });
  } catch (e) {
    console.error('[dashboard/pipeline]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Visitas: volume por semana, por pessoa, por estágio relatado, próximos passos vencidos
app.get('/dashboard/visitas', auth, async (req, res) => {
  try {
    const porSemana = await pool.query(`
      SELECT to_char(date_trunc('week', data_visita), 'DD/MM') AS semana, COUNT(*) AS qtd
      FROM crm_visitas
      WHERE data_visita IS NOT NULL AND data_visita >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY date_trunc('week', data_visita)
      ORDER BY date_trunc('week', data_visita) ASC
    `);

    const porPessoa = await pool.query(`
      SELECT COALESCE(u.name, 'Desconhecido') AS pessoa, COUNT(*) AS qtd
      FROM crm_visitas v
      LEFT JOIN users u ON u.id = v.criado_por
      GROUP BY pessoa
      ORDER BY qtd DESC
      LIMIT 10
    `);

    const porEstagio = await pool.query(`
      SELECT COALESCE(NULLIF(estagio, ''), 'Não informado') AS estagio, COUNT(*) AS qtd
      FROM crm_visitas
      GROUP BY estagio
      ORDER BY qtd DESC
    `);

    const vencidos = await pool.query(`
      SELECT v.id, v.empresa_unidade, v.proximo_passo, v.responsavel, v.data_proximo_passo
      FROM crm_visitas v
      WHERE v.data_proximo_passo IS NOT NULL AND v.data_proximo_passo < CURRENT_DATE
      ORDER BY v.data_proximo_passo ASC
      LIMIT 20
    `);

    const totalRes = await pool.query('SELECT COUNT(*) FROM crm_visitas');

    res.json({
      porSemana: porSemana.rows,
      porPessoa: porPessoa.rows,
      porEstagio: porEstagio.rows,
      proximosPassosVencidos: vencidos.rows,
      totalVisitas: parseInt(totalRes.rows[0].count, 10),
    });
  } catch (e) {
    console.error('[dashboard/visitas]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Contas: classificação ABC e contas em risco (usando campos que a própria Gluo já calcula)
app.get('/dashboard/contas', auth, async (req, res) => {
  try {
    const porClasse = await pool.query(`
      SELECT COALESCE(NULLIF(data->>'classificacao_abc_inbrape', ''), 'Sem classe') AS classe, COUNT(*) AS qtd
      FROM crm_organizacoes
      GROUP BY classe
      ORDER BY qtd DESC
    `);

    const emRisco = await pool.query(`
      SELECT id, accountname,
             NULLIF(data->>'dias_sem_venda_inbrape', '')::int AS dias_sem_venda,
             NULLIF(data->>'valor_ultimo_fat_inbrape', '')::numeric AS ultimo_faturamento,
             NULLIF(data->>'classificacao_abc_inbrape', '') AS classe
      FROM crm_organizacoes
      WHERE NULLIF(data->>'dias_sem_venda_inbrape', '') IS NOT NULL
        AND NULLIF(data->>'cliente_ativo_inbrape', '') = '1'
      ORDER BY dias_sem_venda DESC NULLS LAST
      LIMIT 15
    `);

    res.json({ porClasse: porClasse.rows, emRisco: emRisco.rows });
  } catch (e) {
    console.error('[dashboard/contas]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
initDB().then(async () => {
  await initPDFStandardsTable();
  await initCrmTables();
  await initVisitasTable();
  app.listen(PORT, () => {
    console.log(`🚀 Server rodando na porta ${PORT}`);
  });
});