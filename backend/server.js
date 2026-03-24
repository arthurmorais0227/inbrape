require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const PDFParser = require('pdf2json');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: ['https://inbrape.vercel.app', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// ─────────────────────────────────────────────
// DATABASE & AUTH MIDDLEWARE
// ─────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.internal')
    ? false
    : { rejectUnauthorized: false },
});

// Middleware de Autenticação
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ─────────────────────────────────────────────
// AI CALLS (NVIDIA & GROQ)
// ─────────────────────────────────────────────
async function callNvidia(prompt) {
  // Exemplo de implementação para Nvidia (substitua pela URL/Modelo real que você usa)
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "meta/llama-3.1-405b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function callGroq(prompt) {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      })
    });
    const data = await r.json();
    return data.choices?.[0]?.message?.content;
  } catch {
    return null;
  }
}

async function smartGenerate(prompt) {
  try {
    let res = await callNvidia(prompt);
    if (!res) res = await callGroq(prompt);
    return res;
  } catch {
    return await callGroq(prompt);
  }
}

// ─────────────────────────────────────────────
// HELPERS (EXCEL & PDF)
// ─────────────────────────────────────────────
function readExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function parsePdfBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataError', (errData) => reject(errData));
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      const text = pdfData.Pages.flatMap(p => p.Texts)
        .flatMap(t => t.R)
        .map(s => decodeURIComponent(s.T))
        .join(' ');
      resolve(text.replace(/\s+/g, ' ').trim());
    });
    pdfParser.parseBuffer(buffer);
  });
}

async function extractDocumentText(file) {
  if (!file?.buffer) return '';
  const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
  if (isPdf) return parsePdfBuffer(file.buffer);
  return file.buffer.toString('utf-8').trim();
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.post('/analyze-excel', auth, upload.single('file'), async (req, res) => {
  try {
    const data = readExcel(req.file.buffer);
    if (!data.length) throw new Error('Planilha vazia');

    const summary = {};
    const cols = Object.keys(data[0]);
    
    cols.forEach(col => {
      const values = data.map(r => r[col]).filter(v => v !== '');
      const nums = values.map(Number).filter(v => !isNaN(v));
      if (nums.length) {
        summary[col] = { tipo: 'numérico', media: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) };
      } else {
        summary[col] = { tipo: 'texto', total: values.length };
      }
    });

    const prompt = `Analise estes dados: ${JSON.stringify(summary)}. Pergunta: ${req.body.question || 'Gere insights'}`;
    const result = await smartGenerate(prompt);
    res.json({ result, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/analyze-document', auth, upload.single('file'), async (req, res) => {
  try {
    const text = await extractDocumentText(req.file);
    const result = await smartGenerate(`Analise: ${text.slice(0, 10000)}\nPergunta: ${req.body.question}`);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
const initDB = async () => {
  await pool.query('SELECT NOW()'); // Testa a conexão
  console.log("✅ Banco de dados conectado");
};

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));
}).catch(err => console.error("Falha ao iniciar:", err));