const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'store.sqlite');
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 category TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 price INTEGER NOT NULL CHECK(price >= 0),
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
 image TEXT NOT NULL DEFAULT '',
 featured INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER REFERENCES users(id),
 customer_name TEXT NOT NULL,
 email TEXT NOT NULL,
 phone TEXT NOT NULL,
 address TEXT NOT NULL,
 city TEXT NOT NULL,
 payment_method TEXT NOT NULL DEFAULT 'COD',
 status TEXT NOT NULL DEFAULT 'Pending',
 subtotal INTEGER NOT NULL,
 shipping INTEGER NOT NULL DEFAULT 250,
 total INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 product_id INTEGER REFERENCES products(id),
 product_name TEXT NOT NULL,
 price INTEGER NOT NULL,
 quantity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 sid TEXT PRIMARY KEY,
 sess TEXT NOT NULL,
 expired INTEGER NOT NULL
);
`);

const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (!count) {
 const insert = db.prepare(`INSERT INTO products (name,category,description,price,stock,image,featured)
 VALUES (@name,@category,@description,@price,@stock,@image,@featured)`);
 const seed = [
  ['Kurumi-inspired Premium Desk Mat','Accessories','A dark crimson desk mat for anime and gaming setups.',2499,18,'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=900',1],
  ['Anime Collector Mystery Box','Collectibles','A surprise bundle for collectors. Contents vary by edition.',3499,12,'https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=900',1],
  ['RGB Gaming Headset Stand','Tech','Minimal black stand with RGB-style ambient lighting.',2199,20,'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=900',0],
  ['Manga Display Shelf','Manga','Compact display shelf for manga volumes and figures.',3999,8,'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900',1],
  ['Violet Fantasy Keychain Set','Accessories','A set of fantasy-themed charms and keychains.',899,35,'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=900',0],
  ['Mecha Figure Collectible','Figures','A display-ready collectible figure for your shelf.',5999,6,'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=900',1]
 ];
 const tx = db.transaction(rows => rows.forEach(p => insert.run({name:p[0],category:p[1],description:p[2],price:p[3],stock:p[4],image:p[5],featured:p[6]})));
 tx(seed);
}
module.exports = db;
