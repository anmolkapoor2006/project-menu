# QR Menu & Digital Ordering Platform

A modern, multi-tenant QR digital menu and real-time ordering SaaS platform built for cafes and restaurants.

## 🚀 Key Features

- **📱 Customer-Facing Digital Menu**: Mobile-optimized, fast, search & filter by Veg/Non-Veg, category drawer, smooth animations.
- **⚡ Live Kitchen / Orders Dashboard**: Real-time order synchronization with WebSockets (`Socket.io`) and browser-supported audio chime alerts.
- **🔔 Staff Calling System**: Customers can ring staff with 15-second persistent ringtones and instant top notifications.
- **💸 UPI & Counter Checkout**: Direct UPI QR / app payment deep-links without third-party gateway friction, plus manual payment verification.
- **🎨 Dynamic Menu Builder**: Category management, menu items, pricing, custom badges (Bestseller, Spicy, Chef Special, New), and availability toggle.
- **📊 Real-Time Analytics**: Scan tracking, traffic trends, conversion rates, and item-by-item revenue exportable as CSV.
- **🛡️ Admin & Super Admin Controls**: Multi-tenant cafe management, platform-wide metrics, broadcasts, and kitchen on/off pause switch.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite, TypeScript), TailwindCSS, Recharts, Lucide Icons, Socket.io-client, Axios
- **Backend**: Node.js, Express (TypeScript), Prisma ORM, PostgreSQL / SQLite, Socket.io, JWT Authentication, Zod, Multer
- **Deployment**: Vercel / Netlify (Frontend) & Vercel / Node.js Host (Backend)

---

## 📦 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run build
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```

---

## 🌐 Environment Variables

### Backend (`backend/.env`)
```env
PORT=5001
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/qrmenu?schema=public"
JWT_SECRET="your_jwt_secret_key"
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL="http://localhost:5001"
```
