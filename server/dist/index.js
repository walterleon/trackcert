"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
const io = new socket_io_1.Server(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});
// Make io accessible from controllers via req.app.get('io')
app.set('io', io);
app.use((0, cors_1.default)({ origin: allowedOrigins }));
app.use(express_1.default.json());
// Serve uploaded photos statically
app.use('/uploads', express_1.default.static(uploadsDir));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'RastreoYa API', timestamp: new Date().toISOString() });
});
const api_1 = __importDefault(require("./routes/api"));
app.use('/api', api_1.default);
// Serve React frontend static files (production)
const clientDistDir = path_1.default.join(__dirname, '../../client/dist');
if (fs_1.default.existsSync(clientDistDir)) {
    app.use(express_1.default.static(clientDistDir));
    // SPA fallback: serve index.html for all non-API routes
    app.use((_req, res) => {
        res.sendFile(path_1.default.join(clientDistDir, 'index.html'));
    });
}
// ─── Socket.io rooms ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[ws] connected: ${socket.id}`);
    // Company admin or public viewer joins a campaign room to receive live updates
    socket.on('join-campaign', (campaignId) => {
        if (typeof campaignId === 'string' && campaignId.length > 0) {
            socket.join(`campaign:${campaignId}`);
            console.log(`[ws] ${socket.id} joined campaign:${campaignId}`);
        }
    });
    socket.on('leave-campaign', (campaignId) => {
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
