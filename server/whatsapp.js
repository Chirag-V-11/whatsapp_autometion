import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { db } from './db.js';
import { handleIncomingMessage } from './botEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppClient {
  constructor() {
    this.sock = null;
    this.qrCodeDataUrl = null;
    this.connectionStatus = 'disconnected';
    this.user = null;
    this.io = null;
  }

  setSocketIO(io) { this.io = io; }

  emitState() {
    if (this.io) {
      this.io.emit('wa_status', { status: this.connectionStatus, qr: this.qrCodeDataUrl, user: this.user });
    }
  }

  getJid(phone) {
    const str = String(phone).trim();
    if (str.endsWith('@s.whatsapp.net') || str.endsWith('@lid') || str.endsWith('@g.us')) return str;
    let cleaned = str.replace(/\D/g, '');
    const defaultCc = db.getSettings()?.default_country_code || CONFIG.DEFAULT_COUNTRY_CODE || '91';
    if (cleaned.length === 10) cleaned = defaultCc + cleaned;
    return cleaned + '@s.whatsapp.net';
  }

  async initialize() {
    try {
      this.connectionStatus = 'connecting';
      this.emitState();
      if (!fs.existsSync(CONFIG.SESSION_DIR)) fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
      this.sock = makeWASocket({ auth: state, printQRInTerminal: true, logger: pino({ level: 'silent' }), browser: ['WhatsApp Suite', 'Chrome', '1.0'] });
      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          this.connectionStatus = 'qr_ready';
          this.qrCodeDataUrl = await QRCode.toDataURL(qr);
          this.emitState();
        }
        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.connectionStatus = 'disconnected';
          this.qrCodeDataUrl = null;
          this.user = null;
          this.emitState();

          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 3000);
          } else {
            if (fs.existsSync(CONFIG.SESSION_DIR)) try { fs.rmSync(CONFIG.SESSION_DIR, { recursive: true, force: true }); } catch (e) {}
            setTimeout(() => this.initialize(), 1500);
          }
        } else if (connection === 'open') {
          this.connectionStatus = 'connected';
          this.qrCodeDataUrl = null;
          this.user = this.sock.user;
          this.emitState();
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe) continue;
          const remoteJid = msg.key.remoteJid;
          if (remoteJid.endsWith('@g.us')) continue;
          const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
          if (!body) continue;

          db.addLog({ recipient: remoteJid.replace('@s.whatsapp.net', ''), message: body, type: 'incoming', status: 'received' });
          if (this.io) this.io.emit('new_message', { from: remoteJid.replace('@s.whatsapp.net', ''), message: body, timestamp: new Date().toISOString() });
          await handleIncomingMessage(this, remoteJid, body);
        }
      });
    } catch (err) {
      console.error('Failed to init WA:', err.message);
      this.connectionStatus = 'disconnected';
      this.emitState();
    }
  }

  async sendMessage(phone, text) {
    if (this.connectionStatus !== 'connected' || !this.sock) throw new Error('WhatsApp not connected');
    const targetJid = this.getJid(phone);
    await this.sock.sendPresenceUpdate('composing', targetJid);
    await new Promise(res => setTimeout(res, 600));
    const result = await this.sock.sendMessage(targetJid, { text });
    await this.sock.sendPresenceUpdate('paused', targetJid);
    return result;
  }

  async sendImageMessage(phone, imageSource, caption) {
    if (this.connectionStatus !== 'connected' || !this.sock) throw new Error('WhatsApp not connected');
    const targetJid = this.getJid(phone);
    let payload = {}, localPath = imageSource;

    if (typeof imageSource === 'string' && imageSource.startsWith('/uploads/')) {
      localPath = path.join(__dirname, '../data', imageSource);
    }

    if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
      payload = { image: { url: imageSource }, caption: caption || '' };
    } else if (typeof localPath === 'string' && fs.existsSync(localPath)) {
      payload = { image: { url: localPath }, caption: caption || '' };
    } else if (typeof imageSource === 'string' && imageSource.startsWith('data:image')) {
      payload = { image: Buffer.from(imageSource.split(';base64,').pop(), 'base64'), caption: caption || '', mimetype: 'image/jpeg' };
    } else if (Buffer.isBuffer(imageSource)) {
      payload = { image: imageSource, caption: caption || '', mimetype: 'image/jpeg' };
    } else {
      payload = { text: caption || '' };
    }

    try {
      await this.sock.sendPresenceUpdate('composing', targetJid);
      await new Promise(res => setTimeout(res, 600));
      const result = await this.sock.sendMessage(targetJid, payload);
      await this.sock.sendPresenceUpdate('paused', targetJid);
      return result;
    } catch (err) {
      if (caption) return await this.sendMessage(phone, caption);
      throw err;
    }
  }

  async logout() {
    try { if (this.sock) await this.sock.logout(); } catch (e) {}
    finally {
      this.connectionStatus = 'disconnected';
      this.qrCodeDataUrl = null;
      this.user = null;
      if (fs.existsSync(CONFIG.SESSION_DIR)) fs.rmSync(CONFIG.SESSION_DIR, { recursive: true, force: true });
      this.emitState();
    }
  }
}

export const waClient = new WhatsAppClient();
