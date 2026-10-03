import express from 'express';
import { db } from './db.js';
import { waClient } from './whatsapp.js';
import { campaignManager } from './campaignManager.js';
import { emailManager } from './emailManager.js';
import { formatMessageVariables } from './botEngine.js';

export function createRouter(io) {
  const router = express.Router();

  // --- Session & Status ---
  router.get('/status', (req, res) => {
    res.json({
      status: waClient.connectionStatus,
      qr: waClient.qrCodeDataUrl,
      user: waClient.user
    });
  });

  router.post('/logout', async (req, res) => {
    await waClient.logout();
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  router.post('/reconnect', async (req, res) => {
    try {
      await waClient.initialize();
      res.json({ success: true, message: 'Reconnecting WhatsApp socket...' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Stats Dashboard ---
  router.get('/stats', (req, res) => {
    res.json(db.getStats());
  });

  // --- Contacts ---
  router.get('/contacts', (req, res) => {
    res.json(db.getContacts());
  });

  router.post('/contacts', (req, res) => {
    const contact = db.addContact(req.body);
    res.json(contact);
  });

  router.post('/contacts/bulk', (req, res) => {
    const list = req.body.contacts || [];
    const added = list.map(c => db.addContact(c));
    res.json({ success: true, addedCount: added.length });
  });

  router.put('/contacts/:id', (req, res) => {
    const updated = db.updateContact(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Contact not found' });
    res.json(updated);
  });

  router.delete('/contacts/:id', (req, res) => {
    db.deleteContact(req.params.id);
    res.json({ success: true });
  });

  // --- Auto-Responders ---
  router.get('/auto-responders', (req, res) => {
    res.json(db.getAutoResponders());
  });

  router.post('/auto-responders', (req, res) => {
    const rule = db.addAutoResponder(req.body);
    res.json(rule);
  });

  router.put('/auto-responders/:id/toggle', (req, res) => {
    const updated = db.toggleAutoResponder(req.params.id, req.body.is_active);
    res.json(updated);
  });

  router.delete('/auto-responders/:id', (req, res) => {
    db.deleteAutoResponder(req.params.id);
    res.json({ success: true });
  });

  // --- Templates ---
  router.get('/templates', (req, res) => {
    res.json(db.getTemplates());
  });

  router.post('/templates', (req, res) => {
    const tpl = db.addTemplate(req.body);
    res.json(tpl);
  });

  router.delete('/templates/:id', (req, res) => {
    db.deleteTemplate(req.params.id);
    res.json({ success: true });
  });

  // --- Campaigns ---
  router.get('/campaigns', (req, res) => {
    res.json(db.getCampaigns());
  });

  router.post('/campaigns', (req, res) => {
    const campaign = db.addCampaign(req.body);
    res.json(campaign);
  });

  router.post('/campaigns/:id/start', async (req, res) => {
    try {
      const result = await campaignManager.startCampaign(req.params.id, io);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/campaigns/:id/pause', (req, res) => {
    const result = campaignManager.pauseCampaign(req.params.id, io);
    res.json(result);
  });

  // --- Send Direct Single Message ---
  router.post('/send-direct', async (req, res) => {
    const { phone, message, name } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required.' });
    }

    try {
      // Clean phone number for lookup
      let cleanPhone = phone.replace(/\D/g, '');
      const settings = db.getSettings();
      const defaultCc = settings.default_country_code || '91';
      if (cleanPhone.length === 10) {
        cleanPhone = defaultCc + cleanPhone;
      }

      // Lookup contact from DB using last 10 digits
      const last10 = cleanPhone.slice(-10);
      const existingContact = db.getContacts().find(c => {
        const cPhone = c.phone.replace(/\D/g, '');
        return cPhone.slice(-10) === last10;
      });

      const contactObj = {
        phone: cleanPhone,
        name: (name && name.trim()) ? name.trim() : (existingContact ? existingContact.name : ''),
        company: existingContact ? existingContact.company : ''
      };

      // Replace {name}, {company}, and Spintax
      const formattedText = formatMessageVariables(message, contactObj);

      await waClient.sendMessage(cleanPhone, formattedText);
      db.addLog({
        recipient: cleanPhone,
        message: formattedText,
        type: 'outgoing',
        status: 'sent'
      });
      res.json({ success: true, message: 'Message sent successfully.', sentText: formattedText });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Logs & Audit ---
  router.get('/logs', (req, res) => {
    res.json(db.getLogs());
  });

  // --- Settings ---
  router.get('/settings', (req, res) => {
    res.json(db.getSettings());
  });

  router.post('/settings', (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });

  // --- Email Automation ---
  router.get('/email-settings', (req, res) => {
    res.json(db.getEmailSettings());
  });

  router.post('/email-settings', (req, res) => {
    const updated = db.updateEmailSettings(req.body);
    res.json(updated);
  });

  router.post('/test-email', async (req, res) => {
    try {
      const customSettings = req.body && req.body.host ? req.body : null;
      const result = await emailManager.testConnection(customSettings);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/email-campaigns', (req, res) => {
    res.json(db.getEmailCampaigns());
  });

  router.post('/email-campaigns', (req, res) => {
    const campaign = db.addEmailCampaign(req.body);
    res.json(campaign);
  });

  router.post('/email-campaigns/:id/start', async (req, res) => {
    try {
      const result = await emailManager.startEmailCampaign(req.params.id, io);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/email-campaigns/:id/pause', (req, res) => {
    const result = emailManager.pauseEmailCampaign(req.params.id, io);
    res.json(result);
  });

  return router;
}
