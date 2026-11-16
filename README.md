# Sasaki's Collection Store — Version 2

A full-stack storefront built with HTML, CSS, vanilla JavaScript, Node.js, Express and SQLite.

## Features
- Responsive dark fantasy / violet / silver storefront with generated, non-explicit fantasy cosplay hero artwork.
- Product search and category filters, featured products, shopping bag and Cash on Delivery checkout.
- Customer registration, login and logout. Passwords are hashed with bcrypt (12 rounds).
- Separate admin role and dashboard; product creation/archive, stock view, order list and order status management.
- Server-side product pricing, stock validation and stock restoration when an order is cancelled.
- SQLite database and SQLite-backed sessions.
- Rate limits on account login/register and checkout; Helmet security headers.
- Pakistan pricing in PKR. Sample catalogue is demo content and must be replaced with real stock/prices.

## Requirements
Node.js 20 or newer.

## Local setup
1. Extract the ZIP and open the folder in VS Code.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set a unique `SESSION_SECRET` of at least 32 characters. Set your own `ADMIN_NAME`, `ADMIN_EMAIL`, and strong `ADMIN_PASSWORD` (12+ characters).
5. Run `npm run create-admin`.
6. Run `npm start`.
7. Open `http://localhost:3000` for the shop and `http://localhost:3000/admin` for the admin dashboard.

## Hosting / persistent storage
Set `NODE_ENV=production`, a strong `SESSION_SECRET`, and `DB_PATH` to a file on your provider's persistent disk, e.g. `/var/data/store.sqlite`. The SQLite session file is stored beside the DB. Attach the persistent disk at `/var/data` and ensure the Node service user can write there. Use a single service instance with SQLite. Back up the database regularly and test restores.

## Important security / launch checklist
- Do not commit `.env`, database files, customer information, or real credentials to GitHub.
- Change the example admin credentials before use.
- Use HTTPS in production.
- Configure automated off-site database backups.
- Test account creation, login, checkout, order cancellation and stock restoration before taking real orders.
- COD only. No card gateway, Easypaisa/JazzCash, shipping API, email/SMS/WhatsApp notifications, image-upload pipeline, or tax/accounting integration is connected.
- This is a solid development starter, not a security-audited or production-certified commerce platform. Have the deployment and operational security reviewed before accepting real customer orders.
