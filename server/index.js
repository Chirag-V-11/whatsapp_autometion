import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { CONFIG } from './config.js';
import { createRouter } from './routes.js';
import { waClient } from './whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Security & Anti-Abuse Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for dashboard & QR images
}));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Bind API Routes
app.use('/api', createRouter(io));

// Serve Frontend Static Build if present
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  const indexHtml = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>WhatsApp Automation Backend Server</title></head>
        <body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc;">
          <h1>🚀 WhatsApp Automation API Server Running</h1>
          <p>Status: Active on port ${CONFIG.PORT}</p>
          <p>Open dashboard via Vite dev server or build frontend.</p>
        </body>
        </html>
      `);
    }
  });
});

// Socket.io Connection Setup
io.on('connection', (socket) => {
  console.log(`🔌 Web Dashboard Socket Connected: ${socket.id}`);
  
  // Emit current WhatsApp state to newly connected frontend dashboard
  socket.emit('wa_status', {
    status: waClient.connectionStatus,
    qr: waClient.qrCodeDataUrl,
    user: waClient.user
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Web Dashboard Socket Disconnected: ${socket.id}`);
  });
});

// Register Socket.io instance with WhatsApp client
waClient.setSocketIO(io);

// Start Server
server.listen(CONFIG.PORT, async () => {
  console.log(`
=====================================================
📱 WhatsApp Automation Suite Server Started!
🌐 Local Endpoint: http://localhost:${CONFIG.PORT}
🛡️ Security: High (AES Local Encrypted Auth, Anti-Ban Throttling)
=====================================================
  `);

  // Initialize WhatsApp connection
  await waClient.initialize();
});
