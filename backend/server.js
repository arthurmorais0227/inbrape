const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'inbrape_jwt_secret_2026';
const USERS_FILE = path.join(__dirname, 'users.json');

// ── USER STORE ────────────────────────────────
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const admin = {
      id: '1',
      username: 'admin',
      name: 'Administrador',
      email: 'admin@inbrape.com.br',
      passwordHash: bcrypt.hashSync('inbrape2026', 10),
      role: 'admin',
      status: 'approved',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify([admin], null, 2));
    return [admin];
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
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

// ── AUTH ROUTES ───────────────────────────────
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  if (user.status === 'pending') return res.status(403).json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
  if (user.status === 'rejected') return res.status(403).json({ error: 'Sua solicitação de acesso foi recusada.' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET, { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email } });
});

app.post('/auth/register', async (req, res) => {
  const { username, name, email, password } = req.body;
  if (!username || !name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  const users = loadUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) return res.status(409).json({ error: 'Nome de usuário já existe.' });
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'E-mail já cadastrado.' });
  const newUser = {
    id: Date.now().toString(),
    username: username.toLowerCase().trim(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: await bcrypt.hash(password, 10),
    role: 'user',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  res.status(201).json({ message: 'Solicitação enviada! Aguarde aprovação do administrador.' });
});

app.get('/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ── ADMIN USER MANAGEMENT ─────────────────────
app.get('/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = loadUsers().map(({ passwordHash, ...u }) => u);
  res.json(users);
});

app.patch('/admin/users/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (users[idx].role === 'admin') return res.status(403).json({ error: 'Não é possível alterar o admin.' });
  users[idx].status = status;
  if (status === 'approved') users[idx].approvedAt = new Date().toISOString();
  saveUsers(users);
  res.json({ message: 'Status atualizado.' });
});

app.patch('/admin/users/:id/password', authMiddleware, adminMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });
  users[idx].passwordHash = await bcrypt.hash(password, 10);
  saveUsers(users);
  res.json({ message: 'Senha atualizada.' });
});

app.patch('/admin/users/:id/role', authMiddleware, adminMiddleware, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Role inválida.' });
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (users[idx].id === '1') return res.status(403).json({ error: 'Não é possível alterar o admin principal.' });
  users[idx].role = role;
  saveUsers(users);
  res.json({ message: 'Role atualizada.' });
});

app.delete('/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  if (req.params.id === '1') return res.status(403).json({ error: 'Não é possível excluir o admin principal.' });
  const users = loadUsers();
  const filtered = users.filter(u => u.id !== req.params.id);
  if (filtered.length === users.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
  saveUsers(filtered);
  res.json({ message: 'Usuário removido.' });
});

// Usuário troca própria senha
app.patch('/user/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Preencha todos os campos.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const valid = await bcrypt.compare(currentPassword, users[idx].passwordHash);
  if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });
  users[idx].passwordHash = await bcrypt.hash(newPassword, 10);
  saveUsers(users);
  res.json({ message: 'Senha alterada com sucesso.' });
});

// ── GROQ / ANALYSIS ROUTES ────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function callGroq(prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 }),
  });
  if (!r.ok) { const e = await r.json(); console.error('Groq:', e); throw new Error('Erro ao chamar Groq.'); }
  return (await r.json()).choices?.[0]?.message?.content || 'Sem resposta.';
}

async function callGroqVision(base64, mimeType, prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        { type: 'text', text: prompt }
      ]}],
      max_tokens: 1500,
    }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error('Erro ao analisar imagem.'); }
  return (await r.json()).choices?.[0]?.message?.content || 'Sem resposta.';
}

app.get('/', (req, res) => res.json({ status: 'AI Doc Analyzer API 🚀' }));

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
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!data.length) return res.status(400).json({ error: 'Planilha vazia.' });
    const sample = data.slice(0, 100);
    const cols = Object.keys(sample[0]);
    const prompt = question?.trim()
      ? `Analista de dados. Responda em português: "${question}"\nArquivo: ${req.file.originalname}\nLinhas: ${data.length} | Colunas: ${cols.join(', ')}\n${JSON.stringify(sample, null, 2)}`
      : `Analista de dados. Analise em português com: visão geral, estatísticas, tendências, anomalias, insights e próximos passos.\nArquivo: ${req.file.originalname}\nLinhas: ${data.length} | Colunas: ${cols.join(', ')}\n${JSON.stringify(sample, null, 2)}`;
    res.json({ result: await callGroq(prompt), meta: { totalRows: data.length, columns: cols, sheetName: wb.SheetNames[0], fileName: req.file.originalname } });
  } catch (e) { res.status(500).json({ error: 'Erro ao processar planilha.' }); }
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
    res.json({ result: await callGroqVision(req.file.buffer.toString('base64'), req.file.mimetype, prompts[mode] || prompts.describe) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/analyze-document', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo.' });
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Pergunta não informada.' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  let content = '';
  try {
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
    const prompt = `Analista especializado. Responda em português:\n\nPergunta: "${question}"\n\nDocumento (${req.file.originalname}):\n${content.slice(0, 12000)}\n\nResponda de forma clara e objetiva.`;
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
        page.drawText(watermark, { x: width/2-(watermark.length*6), y: height/2, size: 48, color: rgb(0.8,0.8,0.8), opacity: 0.25, rotate: degrees(45) });
      }
    }
    if (action === 'annotate' && annotation) {
      const idx = Math.min(Math.max((parseInt(annotationPage)||1)-1, 0), pdfPages.length-1);
      const page = pdfPages[idx];
      page.drawText(annotation, { x: 40, y: 30, size: 10, color: rgb(0.1,0.16,0.33), maxWidth: page.getSize().width-80 });
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
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="paginas.pdf"' });
      return res.send(Buffer.from(bytes));
    }
    const bytes = await pdfDoc.save();
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="editado.pdf"' });
    res.send(Buffer.from(bytes));
  } catch (e) { res.status(500).json({ error: 'Erro ao processar PDF.' }); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`✅ Servidor em http://localhost:${PORT}`));
