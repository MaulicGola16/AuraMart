const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5002;
const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:5001';

app.use(cors());

const synonymMap = {
  "jogging": ["running", "sports", "gym"],
  "workout": ["gym", "fitness", "sports", "running"],
  "coding": ["office", "work", "laptop", "keyboard"],
  "music": ["audio", "headphones", "wireless"],
  "party": ["evening", "dark", "formal", "shirt"],
  "wear": ["apparel", "footwear", "shirt", "shorts", "shoes"]
};

app.get('/search', async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/products`);
    const products = await response.json();

    const rawQuery = (req.query.q || '').toLowerCase().trim();
    if (!rawQuery) return res.json({ query: "", expandedTerms: [], results: products });

    const queryTokens = rawQuery.split(/\s+/);
    let expandedTokens = new Set(queryTokens);
    queryTokens.forEach(t => { if (synonymMap[t]) synonymMap[t].forEach(s => expandedTokens.add(s)); });

    const finalTerms = Array.from(expandedTokens);
    const scored = products.map(p => {
      let score = 0;
      finalTerms.forEach(term => {
        if (p.name.toLowerCase().includes(term)) score += 5;
        if (p.category.toLowerCase().includes(term)) score += 3;
        if (p.tags.some(tag => tag.includes(term))) score += 2;
      });
      if (score > 0) score += (p.rating * 0.2);
      return { ...p, relevanceScore: Number(score.toFixed(2)) };
    }).filter(p => p.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({ originalQuery: rawQuery, expandedTerms: finalTerms, results: scored });
  } catch (err) {
    res.status(500).json({ error: "Search service failed to reach catalog-service" });
  }
});

app.get('/health', (req, res) => res.json({ service: "search-service", status: "UP" }));
app.listen(PORT, '0.0.0.0', () => console.log(`Search AI Service running on ${PORT}`));