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
import { birthdayManager } from './birthdayManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || CONFIG.CLIENT_ORIGIN === '*' || origin === CONFIG.CLIENT_ORIGIN || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security Headers & Anti-Abuse Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    },
    reportOnly: true
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Additional Headers (Hide version info & set Permissions-Policy)
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Force HTTPS in production
app.use((req, res, next) => {
  if (CONFIG.IS_PROD && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CONFIG.CLIENT_ORIGIN === '*' || origin === CONFIG.CLIENT_ORIGIN || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads route for uploaded contact photos
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

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

// Initialize Birthday Wish Manager & Scheduler
birthdayManager.init(io);

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
