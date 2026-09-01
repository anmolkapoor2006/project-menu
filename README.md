# MenuQR — Full-Stack Real-Time Digital Menu & Kitchen Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933.svg?logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000.svg?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.12-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?logo=postgresql)](https://www.postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101.svg?logo=socketdotio)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4.svg?logo=tailwindcss)](https://tailwindcss.com/)

A high-performance, multi-tenant digital menu and real-time kitchen orchestration platform engineered for cafes and restaurants. Eliminates physical paper menu overhead, provides frictionless mobile ordering with zero-fee direct UPI payments, and streams live order updates to kitchen dashboards via WebSockets.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   Customer (Mobile)    │
                                  │   PWA / QR Browser     │
                                  └───────────┬────────────┘
                                              │
                     HTTP / REST (Browse & Order)│ WebSocket (Live Order Status)
                                              ▼
┌─────────────────────────┐       ┌────────────────────────┐       ┌─────────────────────────┐
│     Cafe Dashboard      │◄─────►│     Node.js Express    │◄─────►│   PostgreSQL Database   │
│  (Live Kitchen & Admin) │ WS/API│      Backend Server    │ Prisma│  (Multi-Tenant Schema)  │
└─────────────────────────┘       └───────────┬────────────┘       └─────────────────────────┘
                                              │
                                              ▼
                                  ┌────────────────────────┐
                                  │   Web Audio API Core   │
                                  │  (Alerts & Ringtone)   │
                                  └────────────────────────┘
```

---

## 🌟 Core Features & Technical Highlights

### 1. 📱 Mobile-First Customer Experience
- **Instant Scan-to-Order**: Instant rendering with dynamic category navigation pills and live search.
- **Dietary & Veg/Non-Veg Filtering**: Real-time client-side item filtering with zero re-fetch latency.
- **Cart Drawer & Deep Linking**: Persistent cart state with per-item customization notes and table identifier.

### 2. ⚡ Real-Time Kitchen Display System (KDS)
- **Room-Isolated WebSockets**: Restaurant-scoped rooms (`restaurant_<id>`) ensure low-latency order dispatching without cross-tenant message leakage.
- **Resilient Web Audio Alert Engine**: Overcomes strict browser autoplay restrictions using a singleton `AudioContext` arming and gesture unlock architecture with graceful fallback.
- **15-Second Persistent Staff Call Chimes**: Continuous ringtone dispatch when customers request waiter service or assistance.
- **State Machine Workflow**: Enforces strict transitions (`RECEIVED` $\rightarrow$ `PREPARING` $\rightarrow$ `SERVED` / `CANCELLED`) with automatic stale-order flags for unverified payments.

### 3. 💸 Direct UPI Payments (Zero-Gateway Fees)
- **Frictionless Deep Linking**: Generates native `upi://pay` deep links directly launching GPay, PhonePe, and Paytm.
- **Dynamic & Uploaded QR Support**: Supports dynamic client-side amount QR synthesis as well as high-contrast static merchant QR codes.
- **Merchant Verification Lifecycle**: Holds orders in `PAYMENT_PENDING_VERIFICATION` until verified by kitchen staff.

### 4. 📊 Analytics & Menu Engineering
- **Item-Level Revenue & Velocity Tracking**: Per-product volume and revenue aggregation with one-click CSV report export.
- **Traffic Trends**: Day-by-day scanning and view analytics powered by `Recharts`.
- **Granular Availability & Badging**: Instant "Sold Out" toggles and promotional badges (🔥 Bestseller, 🌶️ Spicy, ⭐ Chef Special, 🆕 New).

### 5. 🛡️ Multi-Tenant Security & Isolation
- **Role-Based Access Control (RBAC)**: `SUPER_ADMIN` and `RESTAURANT_ADMIN` tiers guarded by JWT middleware.
- **Tenant Scope Enforcement**: Database queries scoped to tenant IDs with ownership validation.
- **Input Validation**: Strict request schema validation powered by `Zod`.

---

## 🗂️ Project Structure

```
├── backend/
│   ├── api/                 # Serverless deployment entrypoints
│   ├── prisma/              # Prisma schema & migration definitions
│   └── src/
│       ├── controllers/     # Modular business logic (Auth, Menu, Orders, Analytics)
│       ├── middleware/      # Auth, role check, rate limiting, file upload
│       ├── io.ts            # WebSocket server initialization & room management
│       ├── prisma.ts        # Singleton Prisma client
│       └── server.ts        # Express app configuration & route registration
│
├── frontend/
│   ├── public/              # Static assets and routing fallbacks
│   └── src/
│       ├── api/             # Axios instance with request/response interceptors
│       ├── components/      # Modular UI widgets (LiveOrders, QRSection, AnalyticsView)
│       ├── pages/           # Views (PublicMenu, Dashboard, MenuBuilder, AdminDashboard, Login, Signup)
│       ├── utils/           # Audio engine & helper utilities
│       ├── config.ts        # Environment-aware API configuration
│       └── index.css        # Custom design tokens, typography, and animations
```

---

## 🛠️ Technology Stack

| Domain | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, Socket.io Client |
| **Backend** | Node.js, Express.js, TypeScript, Prisma ORM, Socket.io, JWT, Zod, Multer |
| **Database** | PostgreSQL (Production) / SQLite (Local Dev) |
| **Audio Architecture** | Web Audio API (Synthesized oscillators with gain ramps) |
| **Deployment** | Vercel (Frontend & Serverless API), Netlify, Docker |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn
- PostgreSQL (or local SQLite)

### 1. Clone the Repository
```bash
git clone https://github.com/anmolkapoor2006/project-menu.git
cd project-menu
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env # or create .env with variables below

# Run database migrations and generate Prisma client
npx prisma migrate dev
npx prisma db seed

# Start development server (Port 5001)
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start Vite development server (Port 5173)
npm run dev
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5001
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/qrmenu?schema=public"
JWT_SECRET="your-secure-jwt-secret-key"
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL="http://localhost:5001"
```

---

## 📡 Key REST API Endpoints

### Authentication
- `POST /api/auth/register` — Register owner account & generate cafe workspace.
- `POST /api/auth/login` — Authenticate and receive JWT.
- `GET /api/auth/me` — Retrieve current authenticated session and tenant details.

### Public Menu & Customer Ordering
- `GET /api/public/menu/:slug` — Retrieve full menu for a cafe by unique slug.
- `POST /api/public/menu/:slug/order` — Submit customer order.
- `POST /api/public/menu/:slug/call-staff` — Trigger real-time staff call notification.
- `POST /api/public/menu/:slug/view-event` — Log QR scan or direct page view.

### Restaurant Management (Protected)
- `GET /api/restaurants/:id/orders` — List active and historical kitchen orders.
- `PUT /api/orders/:id/status` — Update order lifecycle state (`RECEIVED` $\rightarrow$ `PREPARING` $\rightarrow$ `SERVED`).
- `GET /api/restaurants/:id/full-menu` — Fetch categories and menu items for editor.
- `GET /api/restaurants/:id/analytics` — Aggregate view counts, sales, and item popularity.
- `PUT /api/restaurants/:id` — Update cafe profile, UPI ID, logo, and order acceptance switch.

---

## 🗄️ Database Schema Overview

```
User (1) ────────── (N) Restaurant (1) ────────── (N) MenuCategory
                             │                           │
                             │ (1)                       │ (1)
                             ▼ (N)                       ▼ (N)
                           Order ── (N)──(1) ── MenuItem
                             │                      │
                             ▼ (1)                  ▼ (1)
                         OrderItem ───────────► OrderItem
```

---

## 🚢 Deployment

### Frontend (Vercel / Netlify)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- Client-side routing is handled via `vercel.json` rewrites and `_redirects`.

### Backend (Vercel Serverless / Node Container)
- Exposes `api/index.ts` serverless handler configured for Vercel functions with Regional Mumbai (`bom1`) routing.
- Can alternatively be containerized via the included `Dockerfile` and `docker-compose.yml`.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
