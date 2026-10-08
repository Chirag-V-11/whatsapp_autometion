import { db } from './db.js';
import { waClient } from './whatsapp.js';
import { emailManager } from './emailManager.js';
import { formatMessageVariables } from './botEngine.js';

class BirthdayManager {
  constructor() { this.io = null; }

  init(io) {
    this.io = io;
    setTimeout(() => this.checkAndSendBirthdayWishes(), 5000);
    setInterval(() => this.checkAndSendBirthdayWishes(), 60 * 60 * 1000);
  }

  parseDob(dobStr) {
    if (!dobStr) return null;
    const parts = dobStr.split(/[-/]/).map(p => parseInt(p, 10));
    if (parts.length === 3) {
      const isYMD = parts[0] > 1000;
      return { year: isYMD ? parts[0] : parts[2], month: isYMD ? parts[1] - 1 : parts[0] - 1, day: isYMD ? parts[2] : parts[1] };
    }
    return parts.length === 2 ? { year: null, month: parts[0] - 1, day: parts[1] } : null;
  }

  isTodayBirthday(dobStr) {
    const d = this.parseDob(dobStr), now = new Date();
    return Boolean(d && d.month === now.getMonth() && d.day === now.getDate());
  }

  getTodayBirthdays(tId = 'tenant_default') {
    return db.getContacts(tId).filter(c => this.isTodayBirthday(c.dob));
  }

  getUpcomingBirthdays(tId = 'tenant_default', days = 7) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return db.getContacts(tId).filter(c => {
      const d = this.parseDob(c.dob);
      if (!d) return false;
      const target = new Date(today.getFullYear(), d.month, d.day);
      if (target < today) target.setFullYear(today.getFullYear() + 1);
      const diff = Math.ceil((target - today) / 86400000);
      return diff >= 0 && diff <= days;
    });
  }

  calculateAge(dobStr) {
    const d = this.parseDob(dobStr), currentYear = new Date().getFullYear();
    return d && d.year && d.year > 1900 && d.year < currentYear ? currentYear - d.year : null;
  }

  async sendWishToContact(tId = 'tenant_default', contactId) {
    const contact = db.getContacts(tId).find(c => String(c.id) === String(contactId));
    if (!contact) throw new Error('Contact not found');

    const bSettings = db.getBirthdaySettings(tId), currentYear = new Date().getFullYear();
    const rawTpl = (contact.custom_wish && contact.custom_wish.trim()) || bSettings.default_template || '🎉 Happy Birthday {name}! 🎂';
    const age = this.calculateAge(contact.dob);
    const wishText = formatMessageVariables(rawTpl, { ...contact, age: age ? String(age) : '' });

    let waSuccess = false, emailSuccess = false;

    if (bSettings.send_whatsapp && contact.phone) {
      if (contact.image && contact.image.trim()) {
        await waClient.sendImageMessage(contact.phone, contact.image.trim(), wishText);
      } else {
        await waClient.sendMessage(contact.phone, wishText);
      }
      waSuccess = true;
      db.addLog(tId, { recipient: contact.phone, message: `🎂 Birthday Wish: ${wishText}`, type: 'outgoing', status: 'sent' });
    }

    if (bSettings.send_email && contact.email && contact.email.trim()) {
      try {
        const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:2rem;text-align:center;color:#fff;"><h1 style="margin:0;">🎂 Happy Birthday, ${contact.name}! 🎁</h1></div>
          <div style="padding:2rem;background:#fff;color:#334155;">${contact.image ? `<div style="text-align:center;margin-bottom:1.5rem;"><img src="${contact.image}" style="max-width:100%;max-height:280px;border-radius:12px;" alt="${contact.name}"></div>` : ''}<p style="font-size:1.1rem;white-space:pre-line;">${wishText}</p></div></div>`;
        await emailManager.sendEmail({ to: contact.email, subject: `🎉 Happy Birthday ${contact.name}! 🎂`, html });
        emailSuccess = true;
      } catch (e) { console.error('Email error:', e.message); }
    }

    db.markContactWished(tId, contact.id, currentYear);
    if (this.io) this.io.emit('birthday_wish_sent', { contactId: contact.id, name: contact.name });
    return { success: true, contact, waSuccess, emailSuccess, sentText: wishText };
  }

  async checkAndSendBirthdayWishes(tId = 'tenant_default') {
    const bSettings = db.getBirthdaySettings(tId);
    if (!bSettings || !bSettings.enabled) return;
    const currentYear = new Date().getFullYear();
    for (const contact of this.getTodayBirthdays(tId)) {
      if (contact.last_wished_year === currentYear) continue;
      try { await this.sendWishToContact(tId, contact.id); } catch (err) { console.error('Auto wish failed:', err.message); }
    }
  }
}

export const birthdayManager = new BirthdayManager();
