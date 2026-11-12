const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.MYSQL_HOST || 'mysql-service',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'auramart',
  password: process.env.MYSQL_PASSWORD || 'auramart123',
  database: process.env.MYSQL_DATABASE || 'auramartdb',
  waitForConnections: true,
  connectionLimit: 10
};

let pool;

const seedProducts = [
  { name: "AeroStride Running Shoes", category: "Footwear", price: 3499, rating: 4.8, tags: ["running", "shoes", "lightweight", "sports", "marathon", "breathable", "gym", "footwear"] },
  { name: "SonicPulse ANC Headphones", category: "Electronics", price: 5999, rating: 4.7, tags: ["audio", "headphones", "wireless", "bluetooth", "music", "noise cancelling", "travel", "work"] },
  { name: "Noir Formal Cotton Shirt", category: "Apparel", price: 1899, rating: 4.6, tags: ["shirt", "formal", "dark", "black", "office", "evening", "cotton", "apparel", "wear"] },
  { name: "ProFit Smart Fitness Watch", category: "Electronics", price: 4299, rating: 4.9, tags: ["fitness", "watch", "tracker", "health", "sports", "running", "heart rate", "gym"] },
  { name: "Urban Nomad Laptop Backpack", category: "Accessories", price: 2499, rating: 4.5, tags: ["bag", "backpack", "laptop", "travel", "waterproof", "office", "commute"] },
  { name: "ActiveDry Gym Training Shorts", category: "Apparel", price: 999, rating: 4.4, tags: ["shorts", "gym", "running", "sports", "workout", "breathable", "lightweight"] },
  { name: "ErgoMech Wireless Keyboard", category: "Electronics", price: 3799, rating: 4.8, tags: ["keyboard", "wireless", "office", "work", "typing", "coding", "ergonomic"] },
  { name: "HydroCore Insulated Flask", category: "Accessories", price: 799, rating: 4.6, tags: ["bottle", "water", "gym", "travel", "sports", "outdoor", "hydration"] }
];

async function initDB(retries = 10) {
  while (retries > 0) {
    try {
      pool = mysql.createPool(dbConfig);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          price INT NOT NULL,
          rating FLOAT NOT NULL,
          tags JSON NOT NULL
        );
      `);

      const [rows] = await pool.query('SELECT COUNT(*) AS count FROM products');
      if (rows[0].count === 0) {
        for (const p of seedProducts) {
          await pool.query(
            'INSERT INTO products (name, category, price, rating, tags) VALUES (?, ?, ?, ?, ?)',
            [p.name, p.category, p.price, p.rating, JSON.stringify(p.tags)]
          );
        }
        console.log('✅ Seeded MySQL products table');
      }
      return;
    } catch (err) {
      retries--;
      console.log(`Waiting for MySQL... retries left: ${retries}`);
      await new Promise(res => setTimeout(res, 4000));
    }
  }
  throw new Error('Could not connect to MySQL');
}

app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id ASC');
    const formatted = rows.map(r => ({
      ...r,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ service: "catalog-service", db: "MySQL", status: "UP" }));

initDB()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Catalog Service (MySQL) running on ${PORT}`)))
  .catch(err => {
    console.error('MySQL init failed:', err);
    process.exit(1);
  });