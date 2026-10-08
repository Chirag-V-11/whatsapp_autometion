import { db } from './db.js';
import { waClient } from './whatsapp.js';
import { emailManager } from './emailManager.js';
import { formatMessageVariables } from './botEngine.js';

class BirthdayManager {
  constructor() {
    this.intervalId = null;
    this.io = null;
  }

  init(io) {
    this.io = io;
    // Run initial scan on server boot
    setTimeout(() => this.checkAndSendBirthdayWishes(), 5000);
    // Check every hour automatically
    this.intervalId = setInterval(() => this.checkAndSendBirthdayWishes(), 60 * 60 * 1000);
  }

  // Helper to parse contact DOB month and day
  isTodayBirthday(dobStr) {
    if (!dobStr) return false;
    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = String(today.getDate()).padStart(2, '0');

    // DOB can be YYYY-MM-DD, MM-DD, or MM/DD/YYYY
    const parts = dobStr.split(/[-/]/);
    let month, day;

    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
      } else { // MM-DD-YYYY or DD-MM-YYYY (assuming standard YYYY-MM-DD or MM-DD)
        month = parts[0].padStart(2, '0');
        day = parts[1].padStart(2, '0');
      }
    } else if (parts.length === 2) { // MM-DD
      month = parts[0].padStart(2, '0');
      day = parts[1].padStart(2, '0');
    }

    return month === currentMonth && day === currentDay;
  }

  // Get contacts whose birthday is today
  getTodayBirthdays() {
    const contacts = db.getContacts();
    return contacts.filter(c => c.dob && this.isTodayBirthday(c.dob));
  }

  // Get contacts whose birthday is coming up in next N days
  getUpcomingBirthdays(days = 7) {
    const contacts = db.getContacts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contacts.filter(c => {
      if (!c.dob) return false;
      const parts = c.dob.split(/[-/]/);
      let month, day;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          month = parseInt(parts[0], 10) - 1;
          day = parseInt(parts[1], 10);
        }
      } else if (parts.length === 2) {
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
      } else {
        return false;
      }

      const targetDate = new Date(today.getFullYear(), month, day);
      if (targetDate < today) {
        targetDate.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = targetDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    });
  }

  // Calculate age if birth year is present
  calculateAge(dobStr) {
    if (!dobStr) return null;
    const parts = dobStr.split(/[-/]/);
    if (parts.length === 3) {
      const year = parts[0].length === 4 ? parseInt(parts[0], 10) : parseInt(parts[2], 10);
      if (year && year > 1900 && year < new Date().getFullYear()) {
        return new Date().getFullYear() - year;
      }
    }
    return null;
  }

  // Single Contact Wish Trigger
  async sendWishToContact(contactId) {
    const contact = db.getContacts().find(c => String(c.id) === String(contactId));
    if (!contact) throw new Error('Contact not found');

    const bSettings = db.getBirthdaySettings();
    const currentYear = new Date().getFullYear();

    // Use custom wish text if specified for contact, otherwise use default template
    const rawTemplate = (contact.custom_wish && contact.custom_wish.trim()) 
      ? contact.custom_wish.trim() 
      : (bSettings.default_template || '🎉 Happy Birthday {name}! 🎂 Wishing you a fabulous year ahead!');

    const age = this.calculateAge(contact.dob);
    let wishText = formatMessageVariables(rawTemplate, {
      ...contact,
      age: age ? String(age) : ''
    });

    let waSuccess = false;
    let emailSuccess = false;

    // Send via WhatsApp
    if (bSettings.send_whatsapp && contact.phone) {
      if (contact.image && contact.image.trim()) {
        // Send image message with caption
        await waClient.sendImageMessage(contact.phone, contact.image.trim(), wishText);
      } else {
        // Send text message
        await waClient.sendMessage(contact.phone, wishText);
      }
      waSuccess = true;

      db.addLog({
        recipient: contact.phone,
        message: `🎂 Birthday Wish Sent: ${wishText}`,
        type: 'outgoing',
        status: 'sent'
      });
    }

    // Send via Email if enabled and email address exists
    if (bSettings.send_email && contact.email && contact.email.trim()) {
      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 2rem; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 2rem;">🎂 Happy Birthday, ${contact.name}! 🎁</h1>
            </div>
            <div style="padding: 2rem; background: #ffffff; color: #334155; line-height: 1.6;">
              ${contact.image ? `<div style="text-align:center; margin-bottom: 1.5rem;"><img src="${contact.image}" style="max-width: 100%; max-height: 280px; border-radius: 12px; object-fit: cover;" alt="${contact.name}"></div>` : ''}
              <p style="font-size: 1.1rem; white-space: pre-line;">${wishText}</p>
            </div>
          </div>
        `;
        await emailManager.sendEmail({
          to: contact.email,
          subject: `🎉 Happy Birthday ${contact.name}! 🎂`,
          html: htmlBody
        });
        emailSuccess = true;
      } catch (eErr) {
        console.error(`Failed to send birthday email to ${contact.email}:`, eErr.message);
      }
    }

    // Mark as wished for this year
    db.markContactWished(contact.id, currentYear);

    if (this.io) {
      this.io.emit('birthday_wish_sent', { contactId: contact.id, name: contact.name, time: new Date().toISOString() });
    }

    return { success: true, contact, waSuccess, emailSuccess, sentText: wishText };
  }

  // Automatic Daily Scanner
  async checkAndSendBirthdayWishes() {
    const bSettings = db.getBirthdaySettings();
    if (!bSettings.enabled) return;

    const currentYear = new Date().getFullYear();
    const todayContacts = this.getTodayBirthdays();

    for (const contact of todayContacts) {
      // Check if contact was already wished this year
      if (contact.last_wished_year === currentYear) continue;

      try {
        console.log(`🎂 Automated Birthday Wish trigger for ${contact.name} (${contact.phone})`);
        await this.sendWishToContact(contact.id);
      } catch (err) {
        console.error(`Failed to send automated birthday wish to ${contact.name}:`, err.message);
      }
    }
  }
}

export const birthdayManager = new BirthdayManager();
