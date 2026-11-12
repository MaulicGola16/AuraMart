const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:5001';
const SEARCH_URL = process.env.SEARCH_URL || 'http://search-service:5002';
const REC_URL = process.env.REC_URL || 'http://recommendation-service:5003';
const CHAT_URL = process.env.CHAT_URL || 'http://chatbot-service:5004';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', async (req, res) => {
  const r = await fetch(`${CATALOG_URL}/products`);
  res.json(await r.json());
});

app.get('/api/search', async (req, res) => {
  const q = encodeURIComponent(req.query.q || '');
  const r = await fetch(`${SEARCH_URL}/search?q=${q}`);
  res.json(await r.json());
});

app.get('/api/recommendations/:id', async (req, res) => {
  const r = await fetch(`${REC_URL}/recommendations/${req.params.id}`);
  res.status(r.status).json(await r.json());
});

app.post('/api/chat', async (req, res) => {
  const r = await fetch(`${CHAT_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await r.json());
});

app.get('/health', (req, res) => res.json({ service: "frontend-gateway", status: "UP" }));
app.listen(PORT, '0.0.0.0', () => console.log(`Frontend Gateway running on ${PORT}`));