import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import { hashPassword } from './auth.js';

const dataDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

class LocalDB {
  constructor() {
    this.filePath = CONFIG.JSON_DB_PATH;
    this.data = {
      tenants: [
        {
          id: 'tenant_default',
          email: 'admin@automation.com',
          passwordHash: hashPassword('admin123'),
          companyName: 'We&You Business Suite',
          plan: 'Enterprise',
          maxContacts: 10000,
          role: 'admin',
          isActive: true,
          created_at: new Date().toISOString()
        }
      ],
      contacts: {},       // tenantId -> array of contacts
      campaigns: {},      // tenantId -> array of campaigns
      auto_responders: {}, // tenantId -> array of rules
      templates: {},      // tenantId -> array of templates
      logs: {},           // tenantId -> array of logs
      email_settings: {}, // tenantId -> settings obj
      email_campaigns: {},// tenantId -> array of campaigns
      birthday_settings: {}, // tenantId -> settings obj
      branding: {},       // tenantId -> branding obj
      settings: {}        // tenantId -> settings obj
    };
    this.load();
    this.ensureDefaults();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        this.data = { ...this.data, ...parsed };
      } else {
        this.save();
      }
    } catch (e) {
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {}
  }

  ensureDefaults(tenantId = 'tenant_default') {
    if (!this.data.contacts[tenantId]) this.data.contacts[tenantId] = [];
    if (!this.data.campaigns[tenantId]) this.data.campaigns[tenantId] = [];
    if (!this.data.auto_responders[tenantId]) {
      this.data.auto_responders[tenantId] = [
        { id: 1, keyword: 'hello', match_type: 'contains', response_text: 'Hi there! 👋 Welcome to our support.\n1. Catalog\n2. Pricing', is_active: 1, created_at: new Date().toISOString() }
      ];
    }
    if (!this.data.templates[tenantId]) {
      this.data.templates[tenantId] = [
        { id: 1, name: 'Welcome Greeting', content: '{Hi|Hello} {name}, thank you for contacting {company}!', category: 'General', created_at: new Date().toISOString() }
      ];
    }
    if (!this.data.logs[tenantId]) this.data.logs[tenantId] = [];
    if (!this.data.email_campaigns[tenantId]) this.data.email_campaigns[tenantId] = [];
    if (!this.data.email_settings[tenantId]) {
      this.data.email_settings[tenantId] = { host: 'smtp.gmail.com', port: 465, secure: true, user: '', pass: '', from_name: 'My Business', from_email: '' };
    }
    if (!this.data.birthday_settings[tenantId]) {
      this.data.birthday_settings[tenantId] = { enabled: true, send_time: '09:00', default_template: '🎉 Happy Birthday {name}! 🎂 Wishing you a wonderful day! 🥳✨', send_whatsapp: true, send_email: true };
    }
    if (!this.data.branding[tenantId]) {
      this.data.branding[tenantId] = { app_name: 'SaaS WhatsApp Suite', company_name: 'We&You Automation', logo_url: '', primary_color: '#25D366' };
    }
    if (!this.data.settings[tenantId]) {
      this.data.settings[tenantId] = { min_delay_ms: 3000, max_delay_ms: 7000, max_daily_messages: 500, out_of_office_enabled: false, out_of_office_message: 'We are currently offline.' };
    }
    this.save();
  }

  // --- Tenant Accounts CRUD ---
  getTenants() { return this.data.tenants || []; }
  getTenantById(id) { return this.getTenants().find(t => t.id === id); }
  getTenantByEmail(email) { return this.getTenants().find(t => t.email.toLowerCase() === String(email).toLowerCase()); }

  createTenant({ email, password, companyName, plan = 'Pro', maxContacts = 1000, role = 'client' }) {
    if (this.getTenantByEmail(email)) throw new Error('Company with this email already exists.');
    const tenantId = 'tenant_' + Date.now();
    const newTenant = {
      id: tenantId,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      companyName: companyName.trim(),
      plan,
      maxContacts,
      role,
      isActive: true,
      created_at: new Date().toISOString()
    };
    this.data.tenants.push(newTenant);
    this.ensureDefaults(tenantId);
    this.save();
    return newTenant;
  }

  updateTenant(tenantId, updates) {
    const t = this.getTenantById(tenantId);
    if (!t) return null;
    if (updates.companyName) t.companyName = updates.companyName;
    if (updates.plan) t.plan = updates.plan;
    if (updates.maxContacts) t.maxContacts = updates.maxContacts;
    if (updates.isActive !== undefined) t.isActive = updates.isActive;
    this.save();
    return t;
  }

  // --- Multi-Tenant Data Scoping Methods ---
  getContacts(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.contacts[tId] || []; }
  addContact(arg1, arg2) {
    let tId = 'tenant_default', contact = arg1;
    if (typeof arg1 === 'string') { tId = arg1; contact = arg2; }
    if (!contact) return null;
    this.ensureDefaults(tId);
    let phone = (contact.phone || '').replace(/\D/g, '');
    const cc = this.getSettings(tId)?.default_country_code || CONFIG.DEFAULT_COUNTRY_CODE || '91';
    if (phone.length === 10) phone = cc + phone;

    const newC = { id: Date.now().toString(), phone, name: contact.name || 'Customer', company: contact.company || '', email: contact.email || '', tags: contact.tags || 'General', dob: contact.dob || '', image: contact.image || '', custom_wish: contact.custom_wish || '', last_wished_year: contact.last_wished_year || 0, created_at: new Date().toISOString() };
    const list = this.data.contacts[tId];
    const idx = list.findIndex(c => c.phone === phone);
    if (idx >= 0) list[idx] = { ...list[idx], ...newC }; else list.push(newC);
    this.save(); return newC;
  }
  updateContact(tId = 'tenant_default', id, updated) {
    this.ensureDefaults(tId);
    const list = this.data.contacts[tId];
    const idx = list.findIndex(c => String(c.id) === String(id));
    if (idx < 0) return null;
    let phone = updated.phone ? updated.phone.replace(/\D/g, '') : list[idx].phone;
    if (phone.length === 10) phone = (this.getSettings(tId)?.default_country_code || '91') + phone;
    list[idx] = { ...list[idx], ...updated, phone };
    this.save(); return list[idx];
  }
  deleteContact(tId = 'tenant_default', id) {
    this.ensureDefaults(tId);
    this.data.contacts[tId] = (this.data.contacts[tId] || []).filter(c => String(c.id) !== String(id));
    this.save();
  }

  getBirthdaySettings(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.birthday_settings[tId]; }
  updateBirthdaySettings(tId = 'tenant_default', s) { this.ensureDefaults(tId); this.data.birthday_settings[tId] = { ...this.getBirthdaySettings(tId), ...s }; this.save(); return this.data.birthday_settings[tId]; }
  markContactWished(tId = 'tenant_default', id, year) { this.ensureDefaults(tId); const c = (this.data.contacts[tId] || []).find(x => String(x.id) === String(id)); if (c) { c.last_wished_year = year; this.save(); } }

  getAutoResponders(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.auto_responders[tId] || []; }
  addAutoResponder(arg1, arg2) {
    let tId = 'tenant_default', r = arg1;
    if (typeof arg1 === 'string') { tId = arg1; r = arg2; }
    if (!r) return null;
    this.ensureDefaults(tId);
    const rule = { id: Date.now(), keyword: (r.keyword || '').trim().toLowerCase(), match_type: r.match_type || 'contains', response_text: r.response_text || '', is_active: r.is_active !== undefined ? Number(r.is_active) : 1, created_at: new Date().toISOString() };
    this.data.auto_responders[tId].push(rule); this.save(); return rule;
  }
  toggleAutoResponder(tId = 'tenant_default', id, active) { this.ensureDefaults(tId); const r = (this.data.auto_responders[tId] || []).find(x => x.id === Number(id)); if (r) { r.is_active = active ? 1 : 0; this.save(); } return r; }
  deleteAutoResponder(tId = 'tenant_default', id) { this.ensureDefaults(tId); this.data.auto_responders[tId] = (this.data.auto_responders[tId] || []).filter(r => r.id !== Number(id)); this.save(); }

  getTemplates(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.templates[tId] || []; }
  addTemplate(arg1, arg2) {
    let tId = 'tenant_default', t = arg1;
    if (typeof arg1 === 'string') { tId = arg1; t = arg2; }
    if (!t) return null;
    this.ensureDefaults(tId);
    const tpl = { id: Date.now(), name: t.name, content: t.content, category: t.category || 'General', created_at: new Date().toISOString() };
    this.data.templates[tId].push(tpl); this.save(); return tpl;
  }
  deleteTemplate(tId = 'tenant_default', id) { this.ensureDefaults(tId); this.data.templates[tId] = (this.data.templates[tId] || []).filter(t => t.id !== Number(id)); this.save(); }

  getCampaigns(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.campaigns[tId] || []; }
  addCampaign(arg1, arg2) {
    let tId = 'tenant_default', c = arg1;
    if (typeof arg1 === 'string') { tId = arg1; c = arg2; }
    if (!c) return null;
    this.ensureDefaults(tId);
    const cmp = { id: 'cmp_' + Date.now(), title: c.title, message_template: c.message_template, delay_min: c.delay_min || 3000, delay_max: c.delay_max || 7000, status: 'pending', total_contacts: c.contacts ? c.contacts.length : 0, sent_count: 0, failed_count: 0, contacts: c.contacts || [], created_at: new Date().toISOString() };
    this.data.campaigns[tId].unshift(cmp); this.save(); return cmp;
  }
  updateCampaignStatus(tId = 'tenant_default', id, status, sent, failed) { this.ensureDefaults(tId); const c = (this.data.campaigns[tId] || []).find(x => x.id === id); if (c) { if (status) c.status = status; if (sent !== undefined) c.sent_count = sent; if (failed !== undefined) c.failed_count = failed; this.save(); } return c; }

  addLog(arg1, arg2) {
    let tId = 'tenant_default', l = arg1;
    if (typeof arg1 === 'string') { tId = arg1; l = arg2; }
    if (!l) return null;
    this.ensureDefaults(tId);
    const entry = { id: 'log_' + Date.now() + '_' + Math.floor(Math.random()*1000), recipient: l.recipient || '', message: l.message || '', type: l.type || 'outgoing', status: l.status || 'sent', timestamp: new Date().toISOString() };
    this.data.logs[tId].unshift(entry);
    if (this.data.logs[tId].length > 500) this.data.logs[tId] = this.data.logs[tId].slice(0, 500);
    this.save(); return entry;
  }
  getLogs(tId = 'tenant_default', limit = 100) { this.ensureDefaults(tId); return (this.data.logs[tId] || []).slice(0, limit); }

  getEmailSettings(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.email_settings[tId]; }
  updateEmailSettings(tId = 'tenant_default', s) { this.ensureDefaults(tId); this.data.email_settings[tId] = { ...this.getEmailSettings(tId), ...s }; this.save(); return this.data.email_settings[tId]; }
  getEmailCampaigns(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.email_campaigns[tId] || []; }
  addEmailCampaign(tId = 'tenant_default', c) { this.ensureDefaults(tId); const cmp = { id: 'email_cmp_' + Date.now(), title: c.title, subject: c.subject, body: c.body, is_html: c.is_html !== undefined ? c.is_html : true, delay_ms: c.delay_ms || 2000, status: 'pending', total_contacts: c.contacts ? c.contacts.length : 0, sent_count: 0, failed_count: 0, contacts: c.contacts || [], created_at: new Date().toISOString() }; this.data.email_campaigns[tId].unshift(cmp); this.save(); return cmp; }

  getBranding(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.branding[tId]; }
  updateBranding(tId = 'tenant_default', b) { this.ensureDefaults(tId); this.data.branding[tId] = { ...this.getBranding(tId), ...b }; this.save(); return this.data.branding[tId]; }

  getSettings(tId = 'tenant_default') { this.ensureDefaults(tId); return this.data.settings[tId]; }
  updateSettings(tId = 'tenant_default', s) { this.ensureDefaults(tId); this.data.settings[tId] = { ...this.data.settings[tId], ...s }; this.save(); return this.data.settings[tId]; }

  getStats(tId = 'tenant_default') {
    this.ensureDefaults(tId);
    const logs = this.data.logs[tId] || [];
    return {
      totalContacts: (this.data.contacts[tId] || []).length,
      totalCampaigns: (this.data.campaigns[tId] || []).length,
      totalAutoResponders: (this.data.auto_responders[tId] || []).filter(r => r.is_active).length,
      totalSent: logs.filter(l => l.type === 'outgoing' || l.type === 'broadcast').length,
      totalReceived: logs.filter(l => l.type === 'incoming').length,
      totalAutoReplies: logs.filter(l => l.type === 'auto_reply').length,
      recentLogs: logs.slice(0, 10)
    };
  }
}

export const db = new LocalDB();
