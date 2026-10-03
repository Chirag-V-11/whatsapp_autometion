import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import { db } from './db.js';
import { handleIncomingMessage } from './botEngine.js';

class WhatsAppClient {
  constructor() {
    this.sock = null;
    this.qrCodeDataUrl = null;
    this.connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
    this.user = null;
    this.io = null; // Socket.io reference
  }

  setSocketIO(io) {
    this.io = io;
  }

  emitState() {
    if (this.io) {
      this.io.emit('wa_status', {
        status: this.connectionStatus,
        qr: this.qrCodeDataUrl,
        user: this.user
      });
    }
  }

  async initialize() {
    try {
      this.connectionStatus = 'connecting';
      this.emitState();

      if (!fs.existsSync(CONFIG.SESSION_DIR)) {
        fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['WhatsApp Automation Suite', 'Chrome', '1.0.0']
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.connectionStatus = 'qr_ready';
          this.qrCodeDataUrl = await QRCode.toDataURL(qr);
          console.log('⚡ New WhatsApp QR Code generated for Web Dashboard');
          this.emitState();
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`🔌 WhatsApp Connection Closed (Status Code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

          this.connectionStatus = 'disconnected';
          this.qrCodeDataUrl = null;
          this.user = null;
          this.emitState();

          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 3000);
          } else {
            console.log('🔒 Logged out from WhatsApp. Clear session folder to re-scan.');
          }
        } else if (connection === 'open') {
          this.connectionStatus = 'connected';
          this.qrCodeDataUrl = null;
          this.user = this.sock.user;
          console.log('✅ WhatsApp Successfully Connected!', this.sock.user);
          this.emitState();
        }
      });

      // Handle Incoming Messages for Auto-Responder
      this.sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const remoteJid = msg.key.remoteJid;
          if (remoteJid.endsWith('@g.us')) continue; // Skip group messages by default for privacy & compliance

          const body = msg.message.conversation ||
                     msg.message.extendedTextMessage?.text ||
                     msg.message.imageMessage?.caption || '';

          if (!body) continue;

          console.log(`📩 Incoming message from ${remoteJid}: ${body}`);
          
          // Log incoming message
          db.addLog({
            recipient: remoteJid.replace('@s.whatsapp.net', ''),
            message: body,
            type: 'incoming',
            status: 'received'
          });

          if (this.io) {
            this.io.emit('new_message', {
              from: remoteJid.replace('@s.whatsapp.net', ''),
              message: body,
              timestamp: new Date().toISOString()
            });
          }

          // Trigger Auto-Responder Bot
          await handleIncomingMessage(this, remoteJid, body);
        }
      });

    } catch (err) {
      console.error('Failed to initialize WhatsApp Socket:', err.message);
      this.connectionStatus = 'disconnected';
      this.emitState();
    }
  }

  async sendMessage(phone, text) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp is not connected. Please scan QR code first.');
    }

    let targetJid;
    const phoneStr = String(phone).trim();

    if (phoneStr.endsWith('@s.whatsapp.net') || phoneStr.endsWith('@lid') || phoneStr.endsWith('@g.us')) {
      targetJid = phoneStr;
    } else {
      let cleaned = phoneStr.replace(/\D/g, '');
      const settings = db.getSettings();
      const defaultCc = settings.default_country_code || CONFIG.DEFAULT_COUNTRY_CODE || '91';
      if (cleaned.length === 10) {
        cleaned = defaultCc + cleaned;
      }
      targetJid = cleaned + '@s.whatsapp.net';
    }

    try {
      // Humanized typing presence simulation
      await this.sock.sendPresenceUpdate('composing', targetJid);
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 800) + 600));

      const result = await this.sock.sendMessage(targetJid, { text });
      await this.sock.sendPresenceUpdate('paused', targetJid);

      return result;
    } catch (err) {
      console.error(`Failed to send message to ${phone}:`, err.message);
      throw err;
    }
  }

  async sendImageMessage(phone, imageSource, caption) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp is not connected. Please scan QR code first.');
    }

    let targetJid;
    const phoneStr = String(phone).trim();

    if (phoneStr.endsWith('@s.whatsapp.net') || phoneStr.endsWith('@lid') || phoneStr.endsWith('@g.us')) {
      targetJid = phoneStr;
    } else {
      let cleaned = phoneStr.replace(/\D/g, '');
      const settings = db.getSettings();
      const defaultCc = settings.default_country_code || CONFIG.DEFAULT_COUNTRY_CODE || '91';
      if (cleaned.length === 10) {
        cleaned = defaultCc + cleaned;
      }
      targetJid = cleaned + '@s.whatsapp.net';
    }

    try {
      await this.sock.sendPresenceUpdate('composing', targetJid);
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 800) + 600));

      let messagePayload = {};
      
      if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
        messagePayload = { image: { url: imageSource }, caption: caption || '' };
      } else if (typeof imageSource === 'string' && fs.existsSync(imageSource)) {
        messagePayload = { image: fs.readFileSync(imageSource), caption: caption || '' };
      } else if (typeof imageSource === 'string' && imageSource.startsWith('data:image')) {
        const base64Data = imageSource.split(';base64,').pop();
        const buffer = Buffer.from(base64Data, 'base64');
        messagePayload = { image: buffer, caption: caption || '' };
      } else if (Buffer.isBuffer(imageSource)) {
        messagePayload = { image: imageSource, caption: caption || '' };
      } else {
        // Fallback to text message if image is invalid
        messagePayload = { text: caption || '' };
      }

      const result = await this.sock.sendMessage(targetJid, messagePayload);
      await this.sock.sendPresenceUpdate('paused', targetJid);

      return result;
    } catch (err) {
      console.error(`Failed to send image message to ${phone}:`, err.message);
      // Fallback: try sending text if image fails
      if (caption) {
        return await this.sendMessage(phone, caption);
      }
      throw err;
    }
  }

  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      this.connectionStatus = 'disconnected';
      this.qrCodeDataUrl = null;
      this.user = null;
      if (fs.existsSync(CONFIG.SESSION_DIR)) {
        fs.rmSync(CONFIG.SESSION_DIR, { recursive: true, force: true });
      }
      this.emitState();
    }
  }
}

export const waClient = new WhatsAppClient();
