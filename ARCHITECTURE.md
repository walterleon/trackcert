# TrackCert - Architecture & Tech Stack

## Overview
TrackCert is a SaaS platform for "Distribution Transparency," enabling real-time GPS tracking and certification for distribution companies. The system verifies coverage and provides live reports.

## Core Modules

### 1. PWA Driver (Mobile First)
- **Target**: Delivery drivers/walkers.
- **Access**: Generic Campaign ID + Validation Code (No complex signup).
- **Key Features**:
  - Start/Stop Tracking.
  - Background Geolocation (Critical).
  - Offline Support (Store & Forward).
  - Proof of Life (Photo with Metadata).
  - Battery & Signal Monitoring.

### 2. Admin Panel (Client Company)
- **Target**: Distribution Company Managers.
- **Key Features**:
  - Live Map View (Leaflet + OSM).
  - Campaign Management.
  - Public Link Generation (for end clients).
  - Geofencing & Heatmaps.

### 3. Super Admin Dashboard
- **Target**: Platform Owner.
- **Key Features**:
  - Multi-tenancy management.
  - Global Metrics (Active drivers, API usage).

## Technical Stack

### Frontend (Client)
- **Framework**: React (Vite) - Single Application with Role-based Views.
- **Styling**: TailwindCSS (Modern, responsive, "Rich Aesthetics").
- **Maps**: 
  - `leaflet` & `react-leaflet`.
  - `OpenStreetMap` (Tiles).
- **PWA**: `vite-plugin-pwa` for manifest and service worker configuration.
- **State Management**: `zustand` (Lightweight, effective).
- **Data Fetching**: `tanstack-query` (react-query).

### Backend (Server)
- **Runtime**: Node.js.
- **Framework**: Express (or NestJS).
- **Real-time**: Socket.io (for tracking updates).
- **Database**: PostgreSQL with **PostGIS** extension.
- **ORM**: Prisma (Excellent TypeScript support & PostGIS raw queries).

### Infrastructure specifics
- **Database**: PostgreSQL + PostGIS (Required for spatial queries).
- **Maps**: Open Source Stack (Leaflet, OSM).
- **Offline Strategy**: `localStorage` or `IndexedDB` (idb) to queue coordinates when offline, sync via background worker or upon reconnection.

## Data Model (High Level)
- **Tenants**: Companies using the platform.
- **Campaigns**: Specific distribution jobs.
- **Drivers**: Workers (Transient or Registered).
- **Tracks/Points**: GPS coordinates (Lat, Lng, Timestamp, Accuracy, Battery).
- **Photos**: Proof of delivery (Lat, Lng, Time, Url).
