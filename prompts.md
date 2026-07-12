# Project Prompts: Multi-Tenant Digital Menu & QR Ordering Platform

This file contains the detailed, three-part sequential prompt plan for building your SaaS web application. You can feed these prompt instructions sequentially into your AI coding assistant (like Claude Code, Cursor, or ChatGPT) as you finish each phase.

---

## 🟢 PROMPT 1: Project Scaffolding, Multi-Tenant Database, and Authentication

### Goal
Set up the workspace foundations for our multi-tenant QR menu platform. We need two separate codebases (independent folders) that communicate via a REST API. We will configure database access with PostgreSQL & Prisma and implement secure JWT authentication with roles.

---

### Instructions for Agent

#### 1. Project Directory Structure
Create the following structure in the root directory:
```text
/
├── backend/            # Express, Node, Prisma, PostgreSQL
├── frontend/           # React, Vite, Tailwind CSS, React Router
├── docker-compose.yml  # Config to run PostgreSQL, Backend, Frontend
└── README.md           # Instructions on how to run and test
```

#### 2. Backend Setup
- Initialize a Node.js project in `/backend`.
- Install dependencies: `express`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs`, `@prisma/client`, `zod` (for validation).
- Dev dependencies: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/bcryptjs`, `prisma`, `ts-node-dev` (if using TypeScript, otherwise JavaScript equivalents).
- Set up a clean Express server with:
  - `.env` support.
  - CORS configured to allow requests from the frontend origin.
  - Global error handling middleware.
  - JSON parsing middleware.

#### 3. Database Schema (Prisma & PostgreSQL)
Initialize Prisma in `/backend`. Use PostgreSQL as the database provider. Define the following initial models with relationships:
- **User**: `id` (UUID), `name`, `email` (unique), `passwordHash`, `role` (`SUPER_ADMIN` | `RESTAURANT_ADMIN`), `createdAt`, `updatedAt`.
- **Restaurant**: `id` (UUID), `ownerId` (FK to `User`), `name`, `slug` (unique, URL-friendly name, e.g., "cafe-central"), `logoUrl` (nullable), `address` (nullable), `contactNumber` (nullable), `isActive` (boolean, default: true), `createdAt`, `updatedAt`.

Create a database migration script and run it.

#### 4. Backend Authentication APIs
Implement the following routes under `/api/auth`:
- `POST /api/auth/register`: Signup for Restaurant Admins only. Accepts `name`, `email`, `password`, `restaurantName`, and `slug`. Validate fields using Zod.
  - Automatically creates a `User` (role: `RESTAURANT_ADMIN`).
  - Automatically creates a corresponding `Restaurant` tied to this user.
  - Hashes passwords using `bcryptjs` (salt rounds: 10).
- `POST /api/auth/login`: Login for all users. Validates credentials, returns a JWT containing `userId`, `role`, and `restaurantId` (if `RESTAURANT_ADMIN`).
- **Middlewares**:
  - `authenticateToken`: Validates the JWT in the `Authorization: Bearer <token>` header.
  - `requireRole(role)`: Validates that the logged-in user matches the required role (e.g., `SUPER_ADMIN` or `RESTAURANT_ADMIN`).

#### 5. Database Seeding
Create a seed script in Prisma to automatically generate:
- One `SUPER_ADMIN` user with secure credentials (read from environment variables or a fallback like `admin@qrmenu.com` / `adminpassword123` for development).
- Two test restaurants, each with a dummy `RESTAURANT_ADMIN` user.

#### 6. Frontend Setup
- Scaffolding: Create a React app in `/frontend` using Vite (`npm create vite@latest . -- --template react`).
- Style: Install and configure Tailwind CSS.
- Router: Install `react-router-dom` and set up the routes:
  - `/login`: Unified Login page.
  - `/signup`: Register page for Restaurant Admins.
  - `/admin/dashboard`: Placeholder for Super Admin (accessible only to `SUPER_ADMIN`).
  - `/dashboard`: Placeholder for Restaurant Admin (accessible only to `RESTAURANT_ADMIN`).
- State / API Client:
  - Create an Axios instance configured with a base URL from an environment variable (`VITE_API_URL`).
  - Add an interceptor to automatically attach the JWT from `localStorage`/`sessionStorage` to the `Authorization` header.
  - Implement basic route guards (Route Protection) to block unauthenticated users from admin routes.

---

### Verification
Ensure you provide a simple docker-compose configuration or clear manual commands in the README to start the database, run migrations, seed the DB, and launch the dev servers for both backend and frontend. I should be able to log in to both dashboard templates.

---
---

## 🟡 PROMPT 2: Menu Builder CRUD, QR Code Generation, Public Mobile Menu, and Analytics Event Logging

### Goal
Implement the core value proposition of our SaaS. Cafe owners should be able to manage their menus and download a custom QR code. Customers should be able to scan the QR code to view a mobile-optimized public menu, while we log analytics tracking events.

---

### Instructions for Agent

#### 1. Database Schema Extension
Add the following models to your Prisma schema and apply the migration:
- **MenuCategory**: `id` (UUID), `restaurantId` (FK to `Restaurant`), `name`, `displayOrder` (Int, for sorting), `createdAt`.
- **MenuItem**: `id` (UUID), `categoryId` (FK to `MenuCategory`), `name`, `description` (text, nullable), `price` (Decimal/Float), `imageUrl` (nullable), `isVeg` (Boolean), `isAvailable` (Boolean, default: true), `displayOrder` (Int), `createdAt`.
- **MenuViewEvent**: `id` (UUID), `restaurantId` (FK to `Restaurant`), `source` (`QR` | `DIRECT`), `userAgent` (string, nullable), `timestamp` (DateTime, default: now).

#### 2. Restaurant Admin: Menu Builder API & UI
- **Backend CRUD APIs**:
  - Categories: `GET`, `POST`, `PUT`, `DELETE` under `/api/restaurants/:restaurantId/categories`.
  - Menu Items: `GET`, `POST`, `PUT`, `DELETE` under `/api/restaurants/:restaurantId/items` (or nested under categories).
  - Add simple image uploading using `multer` in `/backend` to store images locally in a `/public/uploads` folder. Return the relative image URL.
- **Frontend UI**:
  - Build a responsive Menu Builder page in the Restaurant Admin dashboard.
  - Allow the admin to add, edit, and delete categories (e.g., "Starters", "Mains").
  - Allow the admin to manage items within categories, upload item images, set prices, and toggle item availability (`isAvailable`).

#### 3. QR Code Generator Setup
- **Backend Service**:
  - Implement a route `GET /api/restaurants/:restaurantId/qrcode` that generates a QR code pointing to the public menu URL: `https://<frontend-domain>/menu/<restaurant-slug>?src=qr`.
  - Use the `qrcode` npm package on the server to generate an SVG or PNG data URL and return it in the API response.
- **Frontend UI**:
  - In the Restaurant Admin dashboard, show their unique public menu link.
  - Display their QR code with an option to download it as a PNG/SVG for printing.

#### 4. Customer: Mobile-First Public Menu Page
- **Backend API**:
  - `GET /api/public/menu/:slug`: Publicly accessible endpoint that fetches the active restaurant's details, categories, and available menu items.
  - `POST /api/public/menu/:restaurantId/view`: Endpoint that logs a `MenuViewEvent`. Accepts `source` (`QR` if `?src=qr` is present in the URL, else `DIRECT`) and optional device user-agent details.
- **Frontend UI**:
  - Implement the `/menu/:slug` route in React.
  - **Design Strategy**: Must be highly optimized for mobile devices (extremely clean, fast, and modern layout, easy vertical scrolling, category navigation tabs/pills, clear search/filter for veg/non-veg).
  - Add an automatic tracking trigger: When the page loads, make a background API call to `POST /api/public/menu/:restaurantId/view` to record the view event, parsing the `src` query param to determine the traffic source.

---

### Verification
Test the flow from end to end: Create categories and menu items in the dashboard, generate and view the QR code, click/scan the link, open the public menu page on a mobile viewport layout, and check the database to confirm `MenuViewEvent` records are correctly created with source `QR` or `DIRECT`.

---
---

## 🔴 PROMPT 3: Real-Time Ordering System (Phase 2) and Dashboards Analytics

### Goal
Add interactive functionalities to the platform. Build a digital ordering cart for customers that sends live, real-time notifications to the restaurant's kitchen/front-of-house dashboard using WebSockets. Finally, build the analytics dashboards for both the Restaurant Admins and the platform Super Admin.

---

### Instructions for Agent

#### 1. Database Schema Extension
Add the following models to your Prisma schema and execute the migration:
- **Order**: `id` (UUID), `restaurantId` (FK to `Restaurant`), `tableNumber` (string, nullable), `status` (`RECEIVED` | `PREPARING` | `SERVED` | `CANCELLED`, default: `RECEIVED`), `createdAt`, `updatedAt`.
- **OrderItem**: `id` (UUID), `orderId` (FK to `Order`), `menuItemId` (FK to `MenuItem`), `quantity` (Int), `priceAtOrder` (Decimal/Float), `notes` (string, nullable).

#### 2. Real-Time Order Management Setup
- **Backend Setup**:
  - Set up `socket.io` in `/backend` alongside your Express server.
  - When a restaurant admin connects, join them to a socket room named `restaurant_<restaurantId>`.
- **Customer Frontend UI**:
  - Enhance the public menu page: Add a shopping cart drawer. Customers can add items, choose quantities, write special notes, and enter a table number.
  - Add a checkout button labeled **"Place Order - Pay at Counter"**.
  - On checkout, make a `POST /api/public/menu/:slug/order` request.
- **Backend API & Notification**:
  - In `POST /api/public/menu/:slug/order`, save the order and items in the database.
  - Emit a WebSocket event `new_order` with the order payload to the room `restaurant_<restaurantId>`.
- **Restaurant Admin Dashboard UI**:
  - Build a "Live Orders" dashboard tab.
  - Connect to the WebSocket server using `socket.io-client`. Listen for the `new_order` event.
  - Display live order cards showing items, table numbers, timestamps, and order statuses.
  - Play an optional audio notification alert when a new order arrives.
  - Implement buttons on the order cards to update order status (`POST /api/orders/:orderId/status` -> "Preparing" -> "Served").

#### 3. Restaurant Admin Analytics Dashboard
- **Backend API**:
  - `GET /api/restaurants/:restaurantId/analytics`: Returns stats for the restaurant:
    - Total menu views and total QR scans.
    - View count trends (grouped by day/hour for the past 7 and 30 days).
    - Top 5 most viewed menu items.
    - Simple peak hours traffic analysis.
- **Frontend UI**:
  - Create an Analytics tab in the Restaurant Admin dashboard.
  - Display KPI cards (Scans, Views, QR Conversion Rate).
  - Use `recharts` or `chart.js` to render visual graphs showing views over time and item popularity.

#### 4. Super Admin Analytics Dashboard
- **Backend API**:
  - `GET /api/admin/analytics/platform`: Returns platform-wide insights (requires `SUPER_ADMIN` role):
    - Total restaurants registered, total menu views, and total QR scans across the entire system.
    - Active vs inactive restaurants count.
    - Growth trends (new restaurant signups over time).
    - Top performing cafes/restaurants list (by scans and total orders).
- **Frontend UI**:
  - In the Super Admin dashboard, render the platform analytics.
  - Use clean cards, a data table showing all registered cafes with toggle controls to activate/deactivate their subscription status, and platform growth charts.

---

### Verification
Verify that the ordering flow transmits data instantly via WebSockets without manual page reloads. Make sure the analytics dashboards fetch aggregated reports and display charts accurately based on seeded views and test orders.
