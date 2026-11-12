const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5003;
const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:5001';

app.use(cors());

app.get('/recommendations/:id', async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/products`);
    const products = await response.json();

    const targetId = parseInt(req.params.id);
    const targetProduct = products.find(p => p.id === targetId);
    if (!targetProduct) return res.status(404).json({ error: "Product not found" });

    const recommendations = products
      .filter(p => p.id !== targetId)
      .map(p => {
        const sharedTags = p.tags.filter(tag => targetProduct.tags.includes(tag));
        const categoryBonus = p.category === targetProduct.category ? 1.5 : 0;
        const similarityScore = sharedTags.length * 2 + categoryBonus + (p.rating * 0.1);
        return {
          ...p,
          matchReason: sharedTags.length > 0 ? `Matches on: ${sharedTags.slice(0, 3).join(', ')}` : `Popular in ${p.category}`,
          similarityScore: Number(similarityScore.toFixed(2))
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3);

    res.json({ baseProduct: targetProduct.name, recommendations });
  } catch (err) {
    res.status(500).json({ error: "Recommendation service error" });
  }
});

app.get('/health', (req, res) => res.json({ service: "recommendation-service", status: "UP" }));
app.listen(PORT, '0.0.0.0', () => console.log(`Recommendation AI Service running on ${PORT}`));