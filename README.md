# TrackCert Implementation

## Status
- **Client (Frontend)**: Fully functional PWA with Offline Queue & Map Interface.
  - URL: `http://localhost:5173` (or 5174)
  - **Demo Mode**: If Backend is down, use Campaign ID: `demo` to login.
- **Server (Backend)**: Code is ready. Requires PostgreSQL.

## How to Run

### 1. Database (Required for Backend)
You need a PostgreSQL instance running on `localhost:5432`.
Credentials expected: `postgres:postgres` (Edit `server/.env` if different).

Once DB is up, run:
```bash
cd server
npx prisma migrate dev --name init
```

### 2. Backend API
```bash
cd server
npm install
npm run dev
```
Runs on `http://localhost:3000`.

### 3. Client PWA
```bash
cd client
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## Features
- **PWA**: Installable on Mobile from Browser.
- **Offline Tracking**: Points are stored in `pendingLocations` (Zustand) if API fails.
- **Live Map**: React-Leaflet integration.
