const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5004;
const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:5001';

app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/products`);
    const products = await response.json();

    const msg = (req.body.message || '').toLowerCase();
    let reply = "";
    let suggestedItems = [];

    if (msg.includes('return') || msg.includes('refund') || msg.includes('exchange')) {
      reply = "AuraMart offers a 14-day hassle-free return and instant refund policy via UPI or original payment method.";
    } else if (msg.includes('shipping') || msg.includes('delivery') || msg.includes('track')) {
      reply = "Express 24-hour delivery is available across major metros. Orders above ₹999 qualify for free shipping!";
    } else if (msg.includes('budget') || msg.includes('cheap') || msg.includes('under 2000')) {
      suggestedItems = products.filter(p => p.price < 2000);
      reply = `Top-rated picks under ₹2,000: ${suggestedItems.map(p => `${p.name} (₹${p.price})`).join(', ')}.`;
    } else {
      const matched = products.filter(p =>
        p.tags.some(t => msg.includes(t)) || p.category.toLowerCase().includes(msg) || msg.includes(p.name.toLowerCase())
      );
      if (matched.length > 0) {
        suggestedItems = matched.slice(0, 2);
        reply = `Great options for you: ${suggestedItems.map(p => `${p.name} (₹${p.price}, ⭐ ${p.rating})`).join(' and ')}.`;
      } else {
        reply = "Hi! I'm AuraBot. Ask me for outfit ideas, gym gear, work accessories, items under ₹2,000, or return policies!";
      }
    }

    res.json({ reply, suggestedItems });
  } catch (err) {
    res.status(500).json({ error: "Chatbot service error" });
  }
});

app.get('/health', (req, res) => res.json({ service: "chatbot-service", status: "UP" }));
app.listen(PORT, '0.0.0.0', () => console.log(`Chatbot AI Service running on ${PORT}`));