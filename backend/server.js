const express = require('express');
const app = express();

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ status: 'API OK 🚀' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Rodando na porta ${PORT}`);
});