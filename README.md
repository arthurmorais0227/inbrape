# 🤖 AI Doc Analyzer — Web

Aplicação web em React que analisa textos e planilhas Excel usando IA (Groq + LLaMA 3.3).

## Funcionalidades

- 📄 **Análise de texto** — Resumo, palavras-chave, sentimento e insights
- 📊 **Análise de planilha** — Upload de `.xlsx`, `.xls` ou `.csv` com análise geral ou pergunta personalizada
- 🕒 **Histórico** — Salva as últimas 30 análises no navegador

## Estrutura

```
ai-doc-analyzer-web/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   ├── index.js
    │   ├── pages/
    │   │   ├── TextAnalyzer.js
    │   │   ├── ExcelAnalyzer.js
    │   │   └── History.js
    │   └── services/
    │       ├── api.js
    │       └── storage.js
    └── package.json
```

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js v18+
- Chave de API do Groq em [console.groq.com](https://console.groq.com)

---

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o `.env` e coloque sua chave:

```
GROQ_API_KEY=gsk_sua_chave_aqui
PORT=3001
```

Inicie o servidor:

```bash
npm run dev
```

O backend estará em `http://localhost:3001`

---

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

O app abrirá em `http://localhost:3000`

---

## 🔒 Segurança

- A chave da API fica apenas no `.env` do backend
- O `.env` está no `.gitignore` e nunca vai pro GitHub
- Nunca coloque a chave diretamente no código

---


