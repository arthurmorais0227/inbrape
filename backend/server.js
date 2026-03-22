const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: ['https://inbrape.vercel.app', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'inbrape_jwt_secret_2026';

// ── POSTGRESQL ────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.internal') ? false : { rejectUnauthorized: false },
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

  // Cria admin se não existir
  const existing = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash('inbrape2026', 10);
    await pool.query(
      `INSERT INTO users (username, name, email, password_hash, role, status, approved_at)
       VALUES ('admin', 'Administrador', 'admin@inbrape.com.br', $1, 'admin', 'approved', NOW())`,
      [hash]
    );
    console.log('✅ Admin criado no banco.');
  }
  console.log('✅ Banco de dados pronto.');
}

// ── MIDDLEWARE ────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido ou expirado.' }); }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  next();
}

// ── AUTH ──────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Sua solicitação de acesso foi recusada.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

app.post('/auth/register', async (req, res) => {
  const { username, name, email, password } = req.body;
  if (!username || !name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($2)', [username, email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Usuário ou e-mail já cadastrado.' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, name, email, password_hash) VALUES ($1, $2, $3, $4)',
      [username.toLowerCase().trim(), name.trim(), email.toLowerCase().trim(), hash]
    );
    res.status(201).json({ message: 'Solicitação enviada! Aguarde aprovação do administrador.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao cadastrar.' }); }
});

app.get('/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ── ADMIN ─────────────────────────────────────
app.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, username, name, email, role, status, created_at, approved_at FROM users ORDER BY created_at DESC');
    res.json(r.rows.map(u => ({
      ...u,
      id: String(u.id),
      createdAt: u.created_at,
      approvedAt: u.approved_at,
    })));
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar usuários.' }); }
});

app.patch('/admin/users/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  try {
    const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (r.rows[0].role === 'admin') return res.status(403).json({ error: 'Não é possível alterar o admin.' });
    await pool.query(
      'UPDATE users SET status=$1, approved_at=$2 WHERE id=$3',
      [status, status === 'approved' ? new Date() : null, req.params.id]
    );
    res.json({ message: 'Status atualizado.' });
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar.' }); }
});

app.patch('/admin/users/:id/password', authMiddleware, adminMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ message: 'Senha atualizada.' });
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar senha.' }); }
});

app.patch('/admin/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  const { role } = req.body;
  if (!['admin','user'].includes(role)) return res.status(400).json({ error: 'Role inválida.' });
  if (req.params.id === '1') return res.status(403).json({ error: 'Não é possível alterar o admin principal.' });
  try {
    await pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    res.json({ message: 'Role atualizada.' });
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar role.' }); }
});

app.delete('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  if (req.params.id === '1') return res.status(403).json({ error: 'Não é possível excluir o admin principal.' });
  try {
    const r = await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ message: 'Usuário removido.' });
  } catch (e) { res.status(500).json({ error: 'Erro ao remover.' }); }
});

app.patch('/user/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });
  try {
    const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const valid = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (e) { res.status(500).json({ error: 'Erro ao alterar senha.' }); }
});

// ── GROQ ──────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function callGroq(prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages:[{role:'user',content:prompt}], max_tokens:1500 }),
  });
  if (!r.ok) { const e = await r.json(); console.error('Groq:',e); throw new Error('Erro ao chamar Groq.'); }
  return (await r.json()).choices?.[0]?.message?.content || 'Sem resposta.';
}

async function callGroqVision(base64, mimeType, prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role:'user', content:[
        { type:'image_url', image_url:{ url:`data:${mimeType};base64,${base64}` } },
        { type:'text', text:prompt }
      ]}],
      max_tokens: 1500,
    }),
  });
  if (!r.ok) throw new Error('Erro ao analisar imagem.');
  return (await r.json()).choices?.[0]?.message?.content || 'Sem resposta.';
}

app.get('/', (req, res) => res.json({ status: 'AI Doc Analyzer API 🚀' }));

app.post('/chat', authMiddleware, async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'Mensagens não informadas.' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role:'system', content:'Você é um assistente de IA inteligente e prestativo da Inbrape. Responda sempre em português brasileiro de forma clara, objetiva e amigável.' },
          ...messages.slice(-20),
        ],
        max_tokens: 1500,
      }),
    });
    if (!r.ok) throw new Error('Erro ao chamar Groq.');
    const data = await r.json();
    res.json({ result: data.choices?.[0]?.message?.content || 'Sem resposta.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/analyze', authMiddleware, async (req, res) => {
  const { text, mode } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Texto vazio.' });
  const prompts = {
    summary:   `Faça um resumo claro e objetivo em português:\n\n${text}`,
    keywords:  `Extraia as 10 principais palavras-chave com breve explicação:\n\n${text}`,
    sentiment: `Analise o sentimento (Positivo/Negativo/Neutro), pontuação 0-10 e indicadores:\n\n${text}`,
    insights:  `Extraia 5 insights relevantes com impacto de cada um:\n\n${text}`,
    translate: `Traduza para português brasileiro. Se já em português, traduza para inglês:\n\n${text}`,
    improve:   `Reescreva melhorando clareza e coesão. Explique as mudanças:\n\n${text}`,
    questions: `Gere 8 perguntas relevantes e responda cada uma:\n\n${text}`,
    action:    `Liste os pontos de ação práticos que podem ser tomados:\n\n${text}`,
  };
  try { res.json({ result: await callGroq(prompts[mode] || prompts.summary) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/analyze-excel', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo.' });
  const { question } = req.body;
  try {
    const wb = XLSX.read(req.file.buffer, { type:'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval:'' });
    if (!data.length) return res.status(400).json({ error: 'Planilha vazia.' });
    const sample = data.slice(0,100);
    const cols = Object.keys(sample[0]);
    const prompt = question?.trim()
      ? `Analista de dados. Responda em português: "${question}"\nArquivo: ${req.file.originalname}\nLinhas: ${data.length} | Colunas: ${cols.join(', ')}\n${JSON.stringify(sample,null,2)}`
      : `Analista de dados. Analise em português: visão geral, estatísticas, tendências, anomalias, insights e próximos passos.\nArquivo: ${req.file.originalname}\nLinhas: ${data.length} | Colunas: ${cols.join(', ')}\n${JSON.stringify(sample,null,2)}`;
    res.json({ result: await callGroq(prompt), meta:{ totalRows:data.length, columns:cols, sheetName:wb.SheetNames[0], fileName:req.file.originalname } });
  } catch (e) { res.status(500).json({ error: 'Erro ao processar planilha.' }); }
});

app.post('/excel-data', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo.' });
  try {
    const wb = XLSX.read(req.file.buffer, { type:'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval:'' });
    if (!rows.length) return res.status(400).json({ error: 'Planilha vazia.' });
    const columns = Object.keys(rows[0]);
    res.json({ rows: rows.slice(0,100), columns, totalRows: rows.length, sheetName });
  } catch (e) { res.status(500).json({ error: 'Erro ao ler planilha.' }); }
});

app.post('/analyze-image', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem.' });
  const { mode, question } = req.body;
  const prompts = {
    describe: 'Descreva esta imagem em detalhes em português.',
    extract_text: 'Extraia todo o texto visível. Organize de forma estruturada.',
    analyze_chart: 'Analise este gráfico: tipo, dados, tendências e conclusões.',
    identify: 'Identifique todos os objetos e elementos com contexto.',
    quality: 'Avalie tecnicamente: resolução, iluminação, composição e dê sugestões.',
    custom: question || 'Descreva esta imagem detalhadamente.',
  };
  try {
    res.json({ result: await callGroqVision(req.file.buffer.toString('base64'), req.file.mimetype, prompts[mode]||prompts.describe) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/analyze-document', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo.' });
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Pergunta não informada.' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  try {
    let content = '';
    if (ext === '.pdf') {
      const PDFParser = require('pdf2json');
      content = await new Promise((resolve, reject) => {
        const parser = new PDFParser();
        parser.on('pdfParser_dataReady', data => {
          const text = data.Pages
            .map(page => page.Texts.map(t => t.R.map(r => {
              try { return decodeURIComponent(r.T); } catch { return r.T; }
            }).join('')).join(' ')).join('\n');
          resolve(text);
        });
        parser.on('pdfParser_dataError', err => reject(err));
        parser.parseBuffer(req.file.buffer);
      });
    } else {
      content = req.file.buffer.toString('utf-8');
    }
    if (!content.trim()) return res.status(400).json({ error: 'Não foi possível extrair texto.' });
    const prompt = `Analista especializado. Responda em português:\n\nPergunta: "${question}"\n\nDocumento (${req.file.originalname}):\n${content.slice(0,12000)}\n\nResponda de forma clara e objetiva.`;
    res.json({ result: await callGroq(prompt) });
  } catch (e) { console.error('Document error:', e); res.status(500).json({ error: 'Erro ao processar documento.' }); }
});

app.post('/pdf-edit', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum PDF.' });
  const { action, watermark, annotation, annotationPage, pages } = req.body;
  try {
    const { PDFDocument, rgb, degrees } = require('pdf-lib');
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pdfPages = pdfDoc.getPages();
    if (action === 'watermark' && watermark) {
      for (const page of pdfPages) {
        const { width, height } = page.getSize();
        page.drawText(watermark, { x:width/2-(watermark.length*6), y:height/2, size:48, color:rgb(0.8,0.8,0.8), opacity:0.25, rotate:degrees(45) });
      }
    }
    if (action === 'annotate' && annotation) {
      const idx = Math.min(Math.max((parseInt(annotationPage)||1)-1, 0), pdfPages.length-1);
      pdfPages[idx].drawText(annotation, { x:40, y:30, size:10, color:rgb(0.1,0.16,0.33), maxWidth:pdfPages[idx].getSize().width-80 });
    }
    if (action === 'extract' && pages) {
      const sel = JSON.parse(pages);
      const newDoc = await PDFDocument.create();
      for (const p of sel) {
        const i = p-1;
        if (i >= 0 && i < pdfPages.length) {
          const [copied] = await newDoc.copyPages(pdfDoc, [i]);
          newDoc.addPage(copied);
        }
      }
      const bytes = await newDoc.save();
      res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="paginas.pdf"' });
      return res.send(Buffer.from(bytes));
    }
    const bytes = await pdfDoc.save();
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="editado.pdf"' });
    res.send(Buffer.from(bytes));
  } catch (e) { res.status(500).json({ error: 'Erro ao processar PDF.' }); }
});

// ── START ─────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`✅ Servidor em http://localhost:${PORT}`));
}).catch(err => {
  console.error('❌ Erro ao conectar ao banco:', err);
  process.exit(1);
});