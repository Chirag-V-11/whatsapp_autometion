import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';

// Ensure data directory exists
const dataDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-Memory / File-backed JSON DB engine with SQLite interface compatibility
class LocalDB {
  constructor(filePath) {
    this.filePath = CONFIG.JSON_DB_PATH;
    this.data = {
      contacts: [],
      campaigns: [],
      auto_responders: [
        {
          id: 1,
          keyword: 'hello',
          match_type: 'contains',
          response_text: 'Hi there! 👋 Welcome to our business support on WhatsApp. How can we help you today?\n\n1. Product Catalog\n2. Pricing Details\n3. Talk to Support',
          is_active: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          keyword: 'price',
          match_type: 'contains',
          response_text: 'Our pricing plans start from $19/mo. Visit our website or reply with "1" to request a callback from sales!',
          is_active: 1,
          created_at: new Date().toISOString()
        }
      ],
      templates: [
        {
          id: 1,
          name: 'Welcome Greeting',
          content: '{Hi|Hello|Hey} {name}, thank you for contacting {company}! We have received your query and will reply shortly.',
          category: 'General',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Order Confirmation',
          content: 'Hi {name}, your order #{order_id} has been confirmed and is being processed. Thank you for shopping with us!',
          category: 'Sales',
          created_at: new Date().toISOString()
        }
      ],
      logs: [],
      email_settings: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for 587
        user: '',
        pass: '',
        from_name: 'My Business Support',
        from_email: ''
      },
      email_campaigns: [],
      birthday_settings: {
        enabled: true,
        send_time: '09:00',
        default_template: '🎉 Happy Birthday {name}! 🎂 Wishing you a wonderful day filled with happiness, health, and great success! 🥳✨',
        send_whatsapp: true,
        send_email: true
      },
      settings: {
        min_delay_ms: CONFIG.DEFAULT_MIN_DELAY_MS,
        max_delay_ms: CONFIG.DEFAULT_MAX_DELAY_MS,
        max_daily_messages: CONFIG.DEFAULT_MAX_DAILY_MESSAGES,
        out_of_office_enabled: false,
        out_of_office_message: 'We are currently offline. Our business hours are Mon-Fri 9AM-6PM. We will reply first thing tomorrow!'
      }
    };
    this.load();
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
    } catch (err) {
      console.error('Error loading DB, initializing new:', err.message);
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving DB:', err.message);
    }
  }

  // --- Contacts CRUD ---
  getContacts() {
    return this.data.contacts;
  }

  addContact(contact) {
    let cleanPhone = contact.phone.replace(/\D/g, '');
    const defaultCc = this.data.settings?.default_country_code || CONFIG.DEFAULT_COUNTRY_CODE || '91';
    if (cleanPhone.length === 10) {
      cleanPhone = defaultCc + cleanPhone;
    }

    const newContact = {
      id: Date.now().toString(),
      phone: cleanPhone,
      name: contact.name || 'Customer',
      company: contact.company || '',
      email: contact.email || '',
      tags: contact.tags || 'General',
      dob: contact.dob || '', // YYYY-MM-DD or MM-DD
      image: contact.image || '', // Image URL or uploaded path
      custom_wish: contact.custom_wish || '', // Optional personalized message text
      last_wished_year: contact.last_wished_year || 0,
      created_at: new Date().toISOString()
    };
    // Check duplicate phone
    const existingIdx = this.data.contacts.findIndex(c => c.phone === newContact.phone);
    if (existingIdx >= 0) {
      this.data.contacts[existingIdx] = { ...this.data.contacts[existingIdx], ...newContact };
    } else {
      this.data.contacts.push(newContact);
    }
    this.save();
    return newContact;
  }

  updateContact(id, updated) {
    let cleanPhone = updated.phone ? updated.phone.replace(/\D/g, '') : '';
    const defaultCc = this.data.settings?.default_country_code || CONFIG.DEFAULT_COUNTRY_CODE || '91';
    if (cleanPhone.length === 10) {
      cleanPhone = defaultCc + cleanPhone;
    }

    const idx = this.data.contacts.findIndex(c => String(c.id) === String(id));
    if (idx >= 0) {
      this.data.contacts[idx] = {
        ...this.data.contacts[idx],
        phone: cleanPhone || this.data.contacts[idx].phone,
        name: updated.name !== undefined ? updated.name : this.data.contacts[idx].name,
        company: updated.company !== undefined ? updated.company : this.data.contacts[idx].company,
        email: updated.email !== undefined ? updated.email : this.data.contacts[idx].email,
        tags: updated.tags !== undefined ? updated.tags : this.data.contacts[idx].tags,
        dob: updated.dob !== undefined ? updated.dob : this.data.contacts[idx].dob,
        image: updated.image !== undefined ? updated.image : this.data.contacts[idx].image,
        custom_wish: updated.custom_wish !== undefined ? updated.custom_wish : this.data.contacts[idx].custom_wish,
        last_wished_year: updated.last_wished_year !== undefined ? updated.last_wished_year : this.data.contacts[idx].last_wished_year
      };
      this.save();
      return this.data.contacts[idx];
    }
    return null;
  }

  // --- Birthday Automation Methods ---
  getBirthdaySettings() {
    return this.data.birthday_settings || {
      enabled: true,
      send_time: '09:00',
      default_template: '🎉 Happy Birthday {name}! 🎂 Wishing you a wonderful day filled with happiness, health, and great success! 🥳✨',
      send_whatsapp: true,
      send_email: true
    };
  }

  updateBirthdaySettings(settings) {
    this.data.birthday_settings = { ...this.getBirthdaySettings(), ...settings };
    this.save();
    return this.data.birthday_settings;
  }

  markContactWished(contactId, year) {
    const contact = this.data.contacts.find(c => String(c.id) === String(contactId));
    if (contact) {
      contact.last_wished_year = year;
      this.save();
    }
  }

  deleteContact(id) {
    this.data.contacts = this.data.contacts.filter(c => c.id !== String(id));
    this.save();
  }

  // --- Auto-Responders CRUD ---
  getAutoResponders() {
    return this.data.auto_responders;
  }

  addAutoResponder(rule) {
    const newRule = {
      id: Date.now(),
      keyword: rule.keyword.trim().toLowerCase(),
      match_type: rule.match_type || 'contains', // exact | contains | regex
      response_text: rule.response_text,
      is_active: rule.is_active !== undefined ? Number(rule.is_active) : 1,
      created_at: new Date().toISOString()
    };
    this.data.auto_responders.push(newRule);
    this.save();
    return newRule;
  }

  toggleAutoResponder(id, isActive) {
    const rule = this.data.auto_responders.find(r => r.id === Number(id));
    if (rule) {
      rule.is_active = isActive ? 1 : 0;
      this.save();
    }
    return rule;
  }

  deleteAutoResponder(id) {
    this.data.auto_responders = this.data.auto_responders.filter(r => r.id !== Number(id));
    this.save();
  }

  // --- Templates CRUD ---
  getTemplates() {
    return this.data.templates;
  }

  addTemplate(tpl) {
    const newTpl = {
      id: Date.now(),
      name: tpl.name,
      content: tpl.content,
      category: tpl.category || 'General',
      created_at: new Date().toISOString()
    };
    this.data.templates.push(newTpl);
    this.save();
    return newTpl;
  }

  deleteTemplate(id) {
    this.data.templates = this.data.templates.filter(t => t.id !== Number(id));
    this.save();
  }

  // --- Campaigns CRUD ---
  getCampaigns() {
    return this.data.campaigns;
  }

  addCampaign(campaign) {
    const newCamp = {
      id: 'cmp_' + Date.now(),
      title: campaign.title,
      message_template: campaign.message_template,
      delay_min: campaign.delay_min || CONFIG.DEFAULT_MIN_DELAY_MS,
      delay_max: campaign.delay_max || CONFIG.DEFAULT_MAX_DELAY_MS,
      status: 'pending', // pending | running | paused | completed
      total_contacts: campaign.contacts ? campaign.contacts.length : 0,
      sent_count: 0,
      failed_count: 0,
      contacts: campaign.contacts || [],
      created_at: new Date().toISOString()
    };
    this.data.campaigns.unshift(newCamp);
    this.save();
    return newCamp;
  }

  updateCampaignStatus(id, status, sent_count, failed_count) {
    const camp = this.data.campaigns.find(c => c.id === id);
    if (camp) {
      if (status) camp.status = status;
      if (sent_count !== undefined) camp.sent_count = sent_count;
      if (failed_count !== undefined) camp.failed_count = failed_count;
      this.save();
    }
    return camp;
  }

  // --- Logs & Analytics ---
  addLog(log) {
    const entry = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      recipient: log.recipient,
      message: log.message,
      type: log.type || 'outgoing', // incoming | outgoing | auto_reply | broadcast
      status: log.status || 'sent', // sent | delivered | failed | received
      timestamp: new Date().toISOString()
    };
    this.data.logs.unshift(entry);
    // Keep max 500 logs
    if (this.data.logs.length > 500) {
      this.data.logs = this.data.logs.slice(0, 500);
    }
    this.save();
    return entry;
  }

  getLogs(limit = 100) {
    return this.data.logs.slice(0, limit);
  }

  // --- Email Settings & Campaigns ---
  getEmailSettings() {
    return this.data.email_settings || {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      from_name: 'My Business Support',
      from_email: ''
    };
  }

  updateEmailSettings(settings) {
    this.data.email_settings = { ...this.getEmailSettings(), ...settings };
    this.save();
    return this.data.email_settings;
  }

  getEmailCampaigns() {
    return this.data.email_campaigns || [];
  }

  addEmailCampaign(campaign) {
    if (!this.data.email_campaigns) this.data.email_campaigns = [];
    const newCamp = {
      id: 'email_cmp_' + Date.now(),
      title: campaign.title,
      subject: campaign.subject,
      body: campaign.body,
      is_html: campaign.is_html !== undefined ? campaign.is_html : true,
      delay_ms: campaign.delay_ms || 2000,
      status: 'pending', // pending | running | paused | completed
      total_contacts: campaign.contacts ? campaign.contacts.length : 0,
      sent_count: 0,
      failed_count: 0,
      contacts: campaign.contacts || [],
      created_at: new Date().toISOString()
    };
    this.data.email_campaigns.unshift(newCamp);
    this.save();
    return newCamp;
  }

  updateEmailCampaignStatus(id, status, sent_count, failed_count) {
    if (!this.data.email_campaigns) return null;
    const camp = this.data.email_campaigns.find(c => c.id === id);
    if (camp) {
      if (status) camp.status = status;
      if (sent_count !== undefined) camp.sent_count = sent_count;
      if (failed_count !== undefined) camp.failed_count = failed_count;
      this.save();
    }
    return camp;
  }

  // --- Settings ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  // --- Stats Dashboard ---
  getStats() {
    const totalContacts = this.data.contacts.length;
    const totalCampaigns = this.data.campaigns.length;
    const totalAutoResponders = this.data.auto_responders.filter(r => r.is_active).length;
    const totalSent = this.data.logs.filter(l => l.type === 'outgoing' || l.type === 'broadcast').length;
    const totalReceived = this.data.logs.filter(l => l.type === 'incoming').length;
    const totalAutoReplies = this.data.logs.filter(l => l.type === 'auto_reply').length;

    return {
      totalContacts,
      totalCampaigns,
      totalAutoResponders,
      totalSent,
      totalReceived,
      totalAutoReplies,
      recentLogs: this.data.logs.slice(0, 10)
    };
  }
}

export const db = new LocalDB();
