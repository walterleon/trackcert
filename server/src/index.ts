import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// Make io accessible from controllers via req.app.get('io')
app.set('io', io);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Serve uploaded photos statically
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'RastreoYa API', timestamp: new Date().toISOString() });
});

import apiRoutes from './routes/api';
app.use('/api', apiRoutes);

// Serve React frontend static files (production)
const clientDistDir = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// ─── Socket.io rooms ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[ws] connected: ${socket.id}`);

  // Company admin or public viewer joins a campaign room to receive live updates
  socket.on('join-campaign', (campaignId: string) => {
    if (typeof campaignId === 'string' && campaignId.length > 0) {
      socket.join(`campaign:${campaignId}`);
      console.log(`[ws] ${socket.id} joined campaign:${campaignId}`);
    }
  });

  socket.on('leave-campaign', (campaignId: string) => {
    socket.leave(`campaign:${campaignId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[ws] disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`RastreoYa API running on port ${PORT}`);
});
