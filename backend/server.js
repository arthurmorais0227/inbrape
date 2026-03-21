const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function callGroq(prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages:[{role:'user',content:prompt}], max_tokens:1500 }),
  });
  if (!r.ok) { const e = await r.json(); console.error('Groq error:',e); throw new Error('Erro ao chamar Groq.'); }
  return (await r.json()).choices?.[0]?.message?.content || 'Sem resposta.';
}

async function callGroqVision(base64, mimeType, prompt) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model:'meta-llama/llama-4-scout-17b-16e-instruct',
      messages:[{ role:'user', content:[
        { type:'image_url', image_url:{ url:`data:${mimeType};base64,${base64}` }},
        { type:'text', text:prompt }
      ]}],
      max_tokens:1500
    }),
  });
  if (!r.ok) { const e = await r.json(); console.error('Vision error:',e); throw new Error('Erro ao analisar imagem.'); }
  return (await r.json()).choices?.[0]?.message?.content || 'Sem resposta.';
}

app.get('/', (req,res) => res.json({status:'AI Doc Analyzer API 🚀'}));

// Analisar texto
app.post('/analyze', async (req,res) => {
  const {text,mode} = req.body;
  if (!text?.trim()) return res.status(400).json({error:'Texto vazio.'});
  const prompts = {
    summary:   `Faça um resumo claro e objetivo em português:\n\n${text}`,
    keywords:  `Extraia as 10 principais palavras-chave com breve explicação de cada uma:\n\n${text}`,
    sentiment: `Analise o sentimento (Positivo/Negativo/Neutro), pontuação 0-10 e indicadores encontrados:\n\n${text}`,
    insights:  `Extraia 5 insights relevantes com impacto de cada um:\n\n${text}`,
    translate: `Traduza para português brasileiro natural. Se já em português, traduza para inglês:\n\n${text}`,
    improve:   `Reescreva melhorando clareza e coesão. Apresente a versão melhorada e explique as mudanças:\n\n${text}`,
    questions: `Gere 8 perguntas relevantes e responda cada uma:\n\n${text}`,
    action:    `Liste os pontos de ação práticos que podem ser tomados:\n\n${text}`,
  };
  try { res.json({result: await callGroq(prompts[mode]||prompts.summary)}); }
  catch(e) { res.status(500).json({error:e.message}); }
});

// Analisar planilha
app.post('/analyze-excel', upload.single('file'), async (req,res) => {
  if (!req.file) return res.status(400).json({error:'Nenhum arquivo.'});
  const {question} = req.body;
  try {
    const wb = XLSX.read(req.file.buffer, {type:'buffer'});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, {defval:''});
    if (!data.length) return res.status(400).json({error:'Planilha vazia.'});
    const sample = data.slice(0,100);
    const cols = Object.keys(sample[0]);
    const prompt = question?.trim()
      ? `Analista de dados sênior. Responda em português: "${question}"\nArquivo: ${req.file.originalname}\nLinhas: ${data.length} | Colunas: ${cols.join(', ')}\nDados:\n${JSON.stringify(sample,null,2)}`
      : `Analista de dados sênior. Analise em português:\n1. Visão geral\n2. Estatísticas principais\n3. Tendências\n4. Anomalias\n5. Insights estratégicos\n6. Próximos passos\n\nArquivo: ${req.file.originalname}\nLinhas: ${data.length} | Colunas: ${cols.join(', ')}\nDados:\n${JSON.stringify(sample,null,2)}`;
    res.json({result: await callGroq(prompt), meta:{totalRows:data.length, columns:cols, sheetName:wb.SheetNames[0], fileName:req.file.originalname}});
  } catch(e) { res.status(500).json({error:'Erro ao processar planilha.'}); }
});

// Analisar imagem
app.post('/analyze-image', upload.single('file'), async (req,res) => {
  if (!req.file) return res.status(400).json({error:'Nenhuma imagem.'});
  const {mode,question} = req.body;
  const prompts = {
    describe:      'Descreva esta imagem em detalhes em português: elementos, cores, composição e contexto.',
    extract_text:  'Extraia todo o texto visível. Organize de forma estruturada mantendo hierarquia original.',
    analyze_chart: 'Analise este gráfico/visualização: tipo, dados, tendências, valores e conclusões.',
    identify:      'Identifique todos os objetos, elementos e itens com contexto relevante.',
    quality:       'Avalie tecnicamente: resolução, iluminação, composição, foco e dê sugestões de melhoria.',
    custom:        question || 'Descreva esta imagem detalhadamente.',
  };
  try {
    const result = await callGroqVision(req.file.buffer.toString('base64'), req.file.mimetype, prompts[mode]||prompts.describe);
    res.json({result});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Analisar documento (PDF/TXT)
app.post('/analyze-document', upload.single('file'), async (req,res) => {
  if (!req.file) return res.status(400).json({error:'Nenhum arquivo.'});
  const {question} = req.body;
  if (!question?.trim()) return res.status(400).json({error:'Pergunta não informada.'});

  const ext = path.extname(req.file.originalname).toLowerCase();
  let content = '';

  try {
    if (ext === '.pdf') {
      // Envia o PDF como imagem para o modelo vision processar
      const base64 = req.file.buffer.toString('base64');
      const prompt = `Você é um analista especializado. Analise este documento PDF e responda em português:\n\nPergunta/Instrução: "${question}"\n\nResponda de forma clara, estruturada e objetiva.`;
      const result = await callGroqVision(base64, 'application/pdf', prompt);
      return res.json({result});
    } else {
      // TXT, MD, CSV — lê como texto
      content = req.file.buffer.toString('utf-8');
      const prompt = `Você é um analista especializado. Analise o documento abaixo e responda em português:\n\nPergunta/Instrução: "${question}"\n\nDocumento (${req.file.originalname}):\n${content.slice(0, 12000)}\n\nResponda de forma clara, estruturada e objetiva.`;
      const result = await callGroq(prompt);
      return res.json({result});
    }
  } catch(e) {
    console.error('Document error:', e);
    res.status(500).json({error: e.message || 'Erro ao processar documento.'});
  }
});

// Editor PDF — marca d'água, anotação, extração de páginas
app.post('/pdf-edit', upload.single('file'), async (req,res) => {
  if (!req.file) return res.status(400).json({error:'Nenhum PDF enviado.'});
  const {action, watermark, annotation, annotationPage, pages} = req.body;

  try {
    const { PDFDocument, rgb, degrees } = require('pdf-lib');
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pdfPages = pdfDoc.getPages();

    if (action === 'watermark' && watermark) {
      for (const page of pdfPages) {
        const {width,height} = page.getSize();
        page.drawText(watermark, {
          x: width/2 - (watermark.length * 6),
          y: height/2,
          size: 48,
          color: rgb(0.8,0.8,0.8),
          opacity: 0.25,
          rotate: degrees(45),
        });
      }
    }

    if (action === 'annotate' && annotation) {
      const pageIdx = Math.min(Math.max((parseInt(annotationPage)||1)-1, 0), pdfPages.length-1);
      const page = pdfPages[pageIdx];
      const {width} = page.getSize();
      page.drawText(annotation, {
        x: 40, y: 30,
        size: 10,
        color: rgb(0.1,0.16,0.33),
        maxWidth: width - 80,
      });
    }

    if (action === 'extract' && pages) {
      const selectedPages = JSON.parse(pages);
      const newDoc = await PDFDocument.create();
      for (const p of selectedPages) {
        const idx = p - 1;
        if (idx >= 0 && idx < pdfPages.length) {
          const [copied] = await newDoc.copyPages(pdfDoc, [idx]);
          newDoc.addPage(copied);
        }
      }
      const bytes = await newDoc.save();
      res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="paginas_extraidas.pdf"`});
      return res.send(Buffer.from(bytes));
    }

    const pdfBytes = await pdfDoc.save();
    res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="editado.pdf"`});
    res.send(Buffer.from(pdfBytes));
  } catch(e) {
    console.error('PDF edit error:', e);
    res.status(500).json({error: 'Erro ao processar PDF. Verifique se o pdf-lib está instalado: npm install pdf-lib'});
  }
});

app.listen(PORT, () => console.log(`✅ Servidor em http://localhost:${PORT}`));


// ── AUTH ──────────────────────────────────────
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'inbrape_secret_2026_change_in_production';

// Usuários (em produção use banco de dados)
const USERS = [
  { id: 1, username: 'admin', passwordHash: bcrypt.hashSync('inbrape2026', 10), role: 'admin', name: 'Administrador' },
  { id: 2, username: 'arthur', passwordHash: bcrypt.hashSync('arthur123', 10), role: 'user', name: 'Arthur Morais' },
];

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios.' });

  const user = USERS.find(u => u.username === username.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

app.get('/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});
