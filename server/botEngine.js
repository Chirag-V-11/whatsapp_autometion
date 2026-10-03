import { db } from './db.js';

// Spintax Resolver: {Hi|Hello|Hey} -> Random choice
export function parseSpintax(text) {
  if (!text) return '';
  return text.replace(/\{([^{}]+)\}/g, (match, choices) => {
    const options = choices.split('|');
    return options[Math.floor(Math.random() * options.length)];
  });
}

// Variable Replacer: {name}, name, {company}, company, etc.
export function formatMessageVariables(text, contact = {}) {
  if (!text) return '';
  let result = parseSpintax(text);
  const recipientName = (contact.name && contact.name.trim()) ? contact.name.trim() : '';
  const recipientCompany = (contact.company && contact.company.trim()) ? contact.company.trim() : '';

  if (recipientName) {
    // Replace {name} or standalone word 'name' (e.g. "hi name," -> "hi CV,")
    result = result.replace(/\{name\}/gi, recipientName);
    result = result.replace(/\bname\b/gi, recipientName);
  } else {
    result = result.replace(/\{name\}/gi, '');
  }

  if (recipientCompany) {
    result = result.replace(/\{company\}/gi, recipientCompany);
    result = result.replace(/\bcompany\b/gi, recipientCompany);
  } else {
    result = result.replace(/\{company\}/gi, '');
  }

  result = result.replace(/\{phone\}/gi, contact.phone || '');
  result = result.replace(/\{email\}/gi, contact.email || '');
  return result;
}

// Auto-Responder logic
export async function handleIncomingMessage(waClient, remoteJid, text) {
  const settings = db.getSettings();
  const cleanedText = text.trim().toLowerCase();

  // Out of Office Check
  if (settings.out_of_office_enabled && settings.out_of_office_message) {
    const formatted = parseSpintax(settings.out_of_office_message);
    await waClient.sendMessage(remoteJid, formatted);
    db.addLog({
      recipient: remoteJid.replace('@s.whatsapp.net', ''),
      message: formatted,
      type: 'auto_reply',
      status: 'sent'
    });
    return;
  }

  // Active Auto-Responder Rules Check
  const rules = db.getAutoResponders().filter(r => Boolean(Number(r.is_active)) || r.is_active === true);

  // Fetch sender contact if in DB
  const senderPhone = remoteJid.replace(/\D/g, '');
  const last10 = senderPhone.slice(-10);
  const existingContact = db.getContacts().find(c => {
    const cPhone = c.phone.replace(/\D/g, '');
    return cPhone.slice(-10) === last10;
  });
  const senderContact = {
    phone: senderPhone,
    name: existingContact ? existingContact.name : '',
    company: existingContact ? existingContact.company : ''
  };

  for (const rule of rules) {
    let matched = false;
    const ruleKw = rule.keyword.toLowerCase();

    if (rule.match_type === 'exact') {
      matched = cleanedText === ruleKw;
    } else if (rule.match_type === 'contains') {
      matched = cleanedText.includes(ruleKw);
    } else if (rule.match_type === 'regex') {
      try {
        const rx = new RegExp(rule.keyword, 'i');
        matched = rx.test(cleanedText);
      } catch (e) {
        matched = false;
      }
    }

    if (matched) {
      const responseText = formatMessageVariables(rule.response_text, senderContact);
      console.log(`🤖 Auto-Responder Matched [${rule.keyword}]. Sending reply to ${remoteJid}`);

      // Small delay to feel human
      await new Promise(res => setTimeout(res, 800));

      await waClient.sendMessage(remoteJid, responseText);

      db.addLog({
        recipient: senderPhone,
        message: responseText,
        type: 'auto_reply',
        status: 'sent'
      });

      break; // Match first rule
    }
  }
}
