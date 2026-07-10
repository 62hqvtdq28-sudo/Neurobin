---
name: Neurobin project overview
description: Architecture, stack, and key facts about the Neurobin Iraqi pharmacy platform
---

## What it is
Digital pharmacy for the Iraqi market. Customer storefront + admin dashboard + AI pharmacist chatbot.

## Stack
- **Backend:** Node.js custom HTTP server (`server.js`), port 5000
- **Frontend:** Vanilla JS + HTML + Tailwind CSS + Lucide icons + DOMPurify
- **Database/Auth:** Supabase (PostgreSQL), accessed via `supabase-db.js`
- **AI:** Groq API (LLaMA), proxied via `POST /api/groq-proxy` in server.js
- **Notifications:** WhatsApp + Telegram

## Key files
- `server.js` — HTTP server; routes: `POST /api/groq-proxy`, `GET /api/config`
- `app.js` — Customer storefront logic (catalog, cart, checkout, chatbot)
- `admin.js` + `admin.html` — Admin dashboard (~6400 lines)
- `supabase-db.js` — Central Supabase data adapter
- `products.js`, `orders.js`, `packages.js`, `discounts.js`, `bundles.js` — Admin modules
- `styles.css` — Primary UI styles
- `index.html` — Customer storefront
- `track.html` — Order tracking
- `migrator.html` — Data migration utility

## Database tables (Supabase)
products, orders, bundles, packages, discount_codes, contact_messages, settings, features, testimonials

## Run
`node server.js` on port 5000. `.replit` deploys as autoscale.

## GitHub
https://github.com/62hqvtdq28-sudo/Neurobin

**Why:** Source of truth is the GitHub repo; always pull before starting new tasks.
**How to apply:** Any change goes to these vanilla JS/HTML files, not a framework. Keep style consistent with existing code.
