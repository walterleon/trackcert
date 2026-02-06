# IMPLMENTATION PLAN: TrackCert

## Phase 1: Foundation & Setup
- [ ] Initialize Monorepo Structure (`/client`, `/server`)
- [ ] **Server**: Setup Node.js + Express + TypeScript
- [ ] **Server**: Setup PostgreSQL connection (Prisma)
- [ ] **Client**: Setup React + Vite + TailwindCSS
- [ ] **Client**: Configure PWA (Manifest, Icons)

## Phase 2: Database & Core API
- [ ] Design Database Schema (Tenants, Users, Campaigns, Locations)
- [ ] Enable PostGIS extension
- [ ] API: Auth & Campaign/Driver Validation
- [ ] API: Ingest Location Data (WebSocket + REST)

## Phase 3: Driver PWA (Mobile)
- [ ] UI: Login Screen (Campaign Code)
- [ ] UI: Active Tracking Screen (Start/Stop)
- [ ] Logic: Implement Geolocation API (Foreground)
- [ ] Logic: Background Geolocation Handling
- [ ] Logic: Offline Queue (IndexedDB)
- [ ] Feature: Photo Upload with Metadata

## Phase 4: Admin Dashboard
- [ ] UI: Dashboard Layout
- [ ] UI: Map Component (Leaflet)
- [ ] Logic: Real-time Driver Markers (Socket.io)
- [ ] Logic: Heatmap Rendering
- [ ] Logic: Campaign Management (CRUD)

## Phase 5: Advanced Features
- [ ] Geofencing Alerts
- [ ] Public Share Links
- [ ] Super Admin Metrics
- [ ] Battery Optimization Tuning
