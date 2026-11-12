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

      // 1. Products Table
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

      // 2. Users Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          password VARCHAR(150) NOT NULL
        );
      `);

      // 3. Cart Items Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
      `);

      // Seed Products
      const [prodRows] = await pool.query('SELECT COUNT(*) AS count FROM products');
      if (prodRows[0].count === 0) {
        for (const p of seedProducts) {
          await pool.query(
            'INSERT INTO products (name, category, price, rating, tags) VALUES (?, ?, ?, ?, ?)',
            [p.name, p.category, p.price, p.rating, JSON.stringify(p.tags)]
          );
        }
      }

      // Seed Default Demo User
      const [userRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
      if (userRows[0].count === 0) {
        await pool.query(
          'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
          ['Maulic', 'maulic@auramart.in', '1234']
        );
      }

      console.log('✅ MySQL initialized (products, users, cart_items)');
      return;
    } catch (err) {
      retries--;
      console.log(`Waiting for MySQL... retries left: ${retries}`);
      await new Promise(res => setTimeout(res, 4000));
    }
  }
  throw new Error('Could not connect to MySQL');
}

// Products Route
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

// Auth: Register or Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const [existing] = await pool.query('SELECT id, name, email, password FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      if (existing[0].password !== password) {
        return res.status(401).json({ error: "Invalid password" });
      }
      return res.json({ user: { id: existing[0].id, name: existing[0].name, email: existing[0].email } });
    }

    // Auto-register new user if email doesn't exist
    const displayName = name || email.split('@')[0];
    const [result] = await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [displayName, email, password]);
    res.json({ user: { id: result.insertId, name: displayName, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cart: Get User Cart
app.get('/cart/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id AS cartItemId, c.quantity, p.id AS productId, p.name, p.price, p.category
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.params.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cart: Add Item
app.post('/cart/add', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    const [existing] = await pool.query('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
    if (existing.length > 0) {
      await pool.query('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?', [existing[0].id]);
    } else {
      await pool.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)', [userId, productId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cart: Remove Item
app.delete('/cart/remove/:cartItemId', async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = ?', [req.params.cartItemId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ service: "catalog-service", db: "MySQL", status: "UP" }));

initDB()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Catalog & Commerce Service (MySQL) running on ${PORT}`)))
  .catch(err => {
    console.error('MySQL init failed:', err);
    process.exit(1);
  });