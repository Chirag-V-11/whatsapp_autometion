import express from 'express';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { waClient } from './whatsapp.js';
import { campaignManager } from './campaignManager.js';
import { emailManager } from './emailManager.js';
import { birthdayManager } from './birthdayManager.js';
import { formatMessageVariables } from './botEngine.js';
import { authMiddleware, generateToken, verifyPassword } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../data/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Rate Limiters for Sensitive Operations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const sendDirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Message rate limit exceeded. Please slow down.' }
});

// Sanitization & Validation Helpers
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function createRouter(io) {
  const router = express.Router();

  // --- Authentication Routes (Public) ---
  router.post('/auth/register', authLimiter, (req, res) => {
    try {
      const { email, password, companyName, plan, website_hp } = req.body;
      if (website_hp) { // Honeypot check
        return res.status(400).json({ error: 'Spam detected' });
      }

      const cleanEmail = sanitizeString(email).toLowerCase();
      const cleanCompany = sanitizeString(companyName);

      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      if (!cleanCompany) {
        return res.status(400).json({ error: 'Company name is required.' });
      }

      const tenant = db.createTenant({ email: cleanEmail, password, companyName: cleanCompany, plan: sanitizeString(plan) || 'Pro' });
      const token = generateToken({ tenantId: tenant.id, email: tenant.email, role: tenant.role, companyName: tenant.companyName });
      res.json({ success: true, token, user: { id: tenant.id, email: tenant.email, companyName: tenant.companyName, plan: tenant.plan, role: tenant.role } });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/auth/login', authLimiter, (req, res) => {
    const { email, password, website_hp } = req.body;
    if (website_hp) { // Honeypot check
      return res.status(400).json({ error: 'Spam detected' });
    }

    const cleanEmail = sanitizeString(email).toLowerCase();
    if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password required' });

    const tenant = db.getTenantByEmail(cleanEmail);
    if (!tenant || !verifyPassword(password, tenant.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!tenant.isActive) return res.status(403).json({ error: 'Your company subscription account is currently disabled. Contact admin.' });

    const token = generateToken({ tenantId: tenant.id, email: tenant.email, role: tenant.role, companyName: tenant.companyName });
    res.json({ success: true, token, user: { id: tenant.id, email: tenant.email, companyName: tenant.companyName, plan: tenant.plan, role: tenant.role } });
  });

  // Apply Auth Middleware to all tenant endpoints
  router.use(authMiddleware);

  router.get('/auth/me', (req, res) => {
    const tenant = db.getTenantById(req.user.tenantId);
    if (!tenant) return res.json({ user: req.user });
    res.json({ user: { id: tenant.id, email: tenant.email, companyName: tenant.companyName, plan: tenant.plan, role: tenant.role, isActive: tenant.isActive } });
  });

  // --- Super Admin Tenant Management Routes ---
  router.get('/admin/tenants', (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Super Admin access required' });
    const tenants = db.getTenants().map(t => ({ id: t.id, email: t.email, companyName: t.companyName, plan: t.plan, maxContacts: t.maxContacts, role: t.role, isActive: t.isActive, created_at: t.created_at }));
    res.json(tenants);
  });

  router.post('/admin/tenants', (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const newT = db.createTenant(req.body);
      res.json(newT);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/admin/tenants/:id', (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Super Admin access required' });
    const updated = db.updateTenant(req.params.id, req.body);
    res.json(updated);
  });

  // --- Multi-Tenant Data Routes (Scoped by req.user.tenantId) ---
  router.get('/status', (req, res) => res.json({ status: waClient.connectionStatus, qr: waClient.qrCodeDataUrl, user: waClient.user }));
  router.post('/logout', async (req, res) => { await waClient.logout(); res.json({ success: true }); });
  router.post('/reconnect', async (req, res) => { try { await waClient.initialize(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

  // Safe Image Upload Route
  router.post('/upload-image', (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64 || typeof imageBase64 !== 'string') return res.status(400).json({ error: 'imageBase64 required' });

      // Max 5MB payload limit check
      if (imageBase64.length > 7 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }

      const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      let ext = matches ? matches[1].toLowerCase() : 'jpg', data = matches ? matches[2] : imageBase64;
      if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) ext = 'jpg';

      const filename = `img_${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
      const filePath = path.resolve(uploadsDir, filename);

      if (!filePath.startsWith(uploadsDir)) {
        return res.status(400).json({ error: 'Invalid target path' });
      }

      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      res.json({ success: true, url: `/uploads/${filename}`, filename });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Stats, Contacts & Auto Responders
  router.get('/stats', (req, res) => res.json(db.getStats(req.user.tenantId)));
  router.get('/contacts', (req, res) => res.json(db.getContacts(req.user.tenantId)));
  router.post('/contacts', (req, res) => res.json(db.addContact(req.user.tenantId, req.body)));
  router.post('/contacts/bulk', (req, res) => res.json({ success: true, addedCount: (req.body.contacts || []).map(c => db.addContact(req.user.tenantId, c)).length }));
  router.put('/contacts/:id', (req, res) => res.json(db.updateContact(req.user.tenantId, req.params.id, req.body) || { error: 'Not found' }));
  router.delete('/contacts/:id', (req, res) => { db.deleteContact(req.user.tenantId, req.params.id); res.json({ success: true }); });

  router.get('/auto-responders', (req, res) => res.json(db.getAutoResponders(req.user.tenantId)));
  router.post('/auto-responders', (req, res) => res.json(db.addAutoResponder(req.user.tenantId, req.body)));
  router.put('/auto-responders/:id/toggle', (req, res) => res.json(db.toggleAutoResponder(req.user.tenantId, req.params.id, req.body.is_active)));
  router.delete('/auto-responders/:id', (req, res) => { db.deleteAutoResponder(req.user.tenantId, req.params.id); res.json({ success: true }); });

  // Templates & Campaigns
  router.get('/templates', (req, res) => res.json(db.getTemplates(req.user.tenantId)));
  router.post('/templates', (req, res) => res.json(db.addTemplate(req.user.tenantId, req.body)));
  router.delete('/templates/:id', (req, res) => { db.deleteTemplate(req.user.tenantId, req.params.id); res.json({ success: true }); });

  router.get('/campaigns', (req, res) => res.json(db.getCampaigns(req.user.tenantId)));
  router.post('/campaigns', (req, res) => res.json(db.addCampaign(req.user.tenantId, req.body)));
  router.post('/campaigns/:id/start', async (req, res) => { try { res.json(await campaignManager.startCampaign(req.user.tenantId, req.params.id, io)); } catch (e) { res.status(400).json({ error: e.message }); } });
  router.post('/campaigns/:id/pause', (req, res) => res.json(campaignManager.pauseCampaign(req.user.tenantId, req.params.id, io)));

  // Direct Message with Rate Limiting
  router.post('/send-direct', sendDirectLimiter, async (req, res) => {
    const { phone, message, name, image } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'Phone and message required' });
    try {
      let clean = phone.replace(/\D/g, '');
      if (clean.length === 10) clean = (db.getSettings(req.user.tenantId).default_country_code || '91') + clean;
      const exist = db.getContacts(req.user.tenantId).find(c => c.phone.replace(/\D/g, '').slice(-10) === clean.slice(-10));
      const formatted = formatMessageVariables(message, { phone: clean, name: name || exist?.name || '', company: exist?.company || '' });

      if (image && image.trim()) await waClient.sendImageMessage(clean, image.trim(), formatted);
      else await waClient.sendMessage(clean, formatted);

      db.addLog(req.user.tenantId, { recipient: clean, message: formatted, type: 'outgoing', status: 'sent' });
      res.json({ success: true, sentText: formatted });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Birthday Automation
  router.get('/birthday/settings', (req, res) => res.json(db.getBirthdaySettings(req.user.tenantId)));
  router.post('/birthday/settings', (req, res) => res.json(db.updateBirthdaySettings(req.user.tenantId, req.body)));
  router.get('/birthday/today', (req, res) => res.json(birthdayManager.getTodayBirthdays(req.user.tenantId)));
  router.get('/birthday/upcoming', (req, res) => res.json(birthdayManager.getUpcomingBirthdays(req.user.tenantId, parseInt(req.query.days || '7', 10))));
  router.post('/birthday/trigger', async (req, res) => { try { await birthdayManager.checkAndSendBirthdayWishes(req.user.tenantId); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
  router.post('/birthday/send/:id', async (req, res) => { try { res.json(await birthdayManager.sendWishToContact(req.user.tenantId, req.params.id)); } catch (e) { res.status(400).json({ error: e.message }); } });

  // Branding
  router.get('/branding', (req, res) => res.json(db.getBranding(req.user.tenantId)));
  router.post('/branding', (req, res) => res.json(db.updateBranding(req.user.tenantId, req.body)));

  // Logs & Settings & Email
  router.get('/logs', (req, res) => res.json(db.getLogs(req.user.tenantId)));
  router.get('/settings', (req, res) => res.json(db.getSettings(req.user.tenantId)));
  router.post('/settings', (req, res) => res.json(db.updateSettings(req.user.tenantId, req.body)));

  router.get('/email-settings', (req, res) => res.json(db.getEmailSettings(req.user.tenantId)));
  router.post('/email-settings', (req, res) => res.json(db.updateEmailSettings(req.user.tenantId, req.body)));
  router.post('/test-email', async (req, res) => { try { res.json(await emailManager.testConnection(req.body?.host ? req.body : null)); } catch (e) { res.status(400).json({ error: e.message }); } });
  router.get('/email-campaigns', (req, res) => res.json(db.getEmailCampaigns(req.user.tenantId)));
  router.post('/email-campaigns', (req, res) => res.json(db.addEmailCampaign(req.user.tenantId, req.body)));
  router.post('/email-campaigns/:id/start', async (req, res) => { try { res.json(await emailManager.startEmailCampaign(req.user.tenantId, req.params.id, io)); } catch (e) { res.status(400).json({ error: e.message }); } });
  router.post('/email-campaigns/:id/pause', (req, res) => res.json(emailManager.pauseEmailCampaign(req.user.tenantId, req.params.id, io)));

  return router;
}
