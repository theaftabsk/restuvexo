# RESTUVEXO - Multi-Tenant Restaurant Operating System (ROS) & SaaS Platform

This document serves as the primary system architectural guide, configuration reference, and operational handbook for all AI coding agents working on the RESTUVEXO repository.

---

## 🏗️ Architecture & Project Structure

The project is structured into 5 independent applications:

| Directory | Tech Stack | Port | Purpose |
| :--- | :--- | :--- | :--- |
| [**`backend`**](./backend) | NestJS 10, Prisma ORM, Socket.io, PostgreSQL | `5000` | Core API engine, real-time WebSocket broadcasting, authentication, billing, KDS sync |
| [**`restaurant`**](./restaurant) | Next.js 16 (App Router), React 19, TailwindCSS | `3000` | Restaurant management software (Owner Dashboard, POS Billing, Tables, QR, Staff, Menu) |
| [**`customer`**](./customer) | Next.js 16, React 19, TailwindCSS | `3001` | Customer self-service portal (QR code ordering, digital menu, real-time order tracking) |
| [**`super-admin`**](./super-admin) | Next.js 16, React 19, TailwindCSS | `3002` | SaaS platform management (Tenants, subscription tiers, addons, invoices, analytics) |
| [**`landing`**](./landing) | Next.js 16, React 19, TailwindCSS | `3003` | Standalone marketing website & customer lead acquisition |

---

## 🔑 Database & Test Login Credentials

### Database Connection (Local PostgreSQL)
- **Host**: `localhost:5432`
- **Database Name**: `restuvexo`
- **User**: `postgres`
- **Password**: `123456`
- **Prisma Connection String**: `postgresql://postgres:123456@localhost:5432/restuvexo?schema=public`

---

### Registered Accounts (After `node prisma/seed.js`)

#### 1. Restaurant Owner (Admin)
- **Login Portal**: `http://localhost:3000/auth/login`
- **Email**: `demo@restuvexo.shop`
- **Password**: `password123`
- **Manager Override PIN**: `0000`
- **Role**: `owner`

#### 2. Staff: Waiter Terminal
- **Login Portal**: `http://localhost:3000/auth/login`
- **Login ID**: `01700000000`
- **Password / PIN**: `0000`
- **Role**: `waiter`

#### 3. Staff: Kitchen Display System (KDS / Chef)
- **Login Portal**: `http://localhost:3000/auth/login`
- **Login ID**: `01800000000`
- **Password / PIN**: `0000`
- **Role**: `kitchen` (Directs to `/kds`)

#### 4. Super Admin Portal
- **Login Portal**: `http://localhost:3002`
- **Access Key**: `VexoSecretSuperAdminPasskey2026`

---

## 💻 Service Execution Commands

### 1. Database Migrations & Seeding
```powershell
cd backend
npx prisma generate
npx prisma db push
node prisma/seed.js
```

### 2. Run Backend API Server
```powershell
cd backend
npm run dev
# Running on http://localhost:5000
```

### 3. Run Restaurant Management Software
```powershell
cd restaurant
npm run dev
# Running on http://localhost:3000
```

### 4. Run Customer QR Ordering Portal
```powershell
cd customer
npm run dev
# Running on http://localhost:3001
```

### 5. Run Super Admin Portal
```powershell
cd super-admin
npm run dev
# Running on http://localhost:3002
```

### 6. Run Landing Website
```powershell
cd landing
npm run dev
# Running on http://localhost:3003
```

---

## 🛡️ Core Rules for Agents

1. **Authentication Strictness**:
   - The `restaurant` application is dedicated software. Unauthenticated requests to `/dashboard` must immediately verify JWT validity with `${BACKEND_URL}/api/auth/restaurant` and redirect to `/auth/login` if invalid.
   - Do not add hardcoded bypass buttons on production login pages.
2. **Real-time Sync**:
   - Live events (orders, kitchen ticket status, table status updates) are communicated via WebSockets (`Socket.io`). Do not replace WebSockets with aggressive polling intervals.
3. **Database Integrity**:
   - All schema changes must be declared in `backend/prisma/schema.prisma` and applied using Prisma CLI.
