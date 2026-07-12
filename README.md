# Multi-Tenant Digital Menu & QR Ordering Platform - Phase 1

This repository contains Phase 1 of the multi-tenant digital menu SaaS platform for cafes and restaurants.

## Project Structure
- `/backend`: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL.
- `/frontend`: React + Vite + TypeScript + Tailwind CSS.
- `docker-compose.yml`: Launches PostgreSQL, Backend, and Frontend containers concurrently.

## Local Development Setup

### Prerequisite: Docker
Make sure Docker and Docker Compose are installed on your system.

### Running with Docker Compose
1. Ensure ports `5432` (PostgreSQL), `5000` (Backend API), and `5173` (Frontend Web) are free.
2. In the root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Once all containers start:
   - Database migrations will apply automatically.
   - The database will be seeded.
   - Frontend will be available at [http://localhost:5173](http://localhost:5173).
   - Backend API will be running at [http://localhost:5000](http://localhost:5000).

### Seeded Credentials
During development, the database is seeded with a default Super Admin account:
- **Email:** `admin@qrmenu.com`
- **Password:** `AdminPassword123`

### Manual Execution (Without Docker)
If you prefer running individual services locally on your machine:

#### 1. PostgreSQL Database
Ensure you have a PostgreSQL server running locally, create a database named `qrmenudb`, and grab the connection URL.

#### 2. Backend Setup
1. Change directory to `/backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment template:
   ```bash
   cp .env.example .env
   ```
   Modify the `DATABASE_URL` in `.env` to point to your local PostgreSQL instance.
4. Run migrations and seed script:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

#### 3. Frontend Setup
1. Change directory to `/frontend`:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
