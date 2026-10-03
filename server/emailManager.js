import { db } from './db.js';
import { sendSmtpEmail } from './smtpClient.js';
import { formatMessageVariables } from './botEngine.js';

class EmailManager {
  constructor() {
    this.activeEmailCampaigns = new Map(); // campaignId -> active boolean
  }

  async testConnection(customSettings) {
    const settings = customSettings || db.getEmailSettings();
    if (!settings.host || !settings.user || !settings.pass) {
      throw new Error('Incomplete SMTP configuration. Please fill in Host, Username, and Password.');
    }

    // Send test email to user's own email
    const recipient = settings.from_email || settings.user;
    return await sendSmtpEmail({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      user: settings.user,
      pass: settings.pass,
      fromName: settings.from_name || 'Automation Suite Test',
      fromEmail: settings.from_email || settings.user,
      to: recipient,
      subject: '✅ SMTP Configuration Test Successful',
      body: `<h3>SMTP Connection Verified!</h3><p>Your email automation server is configured and ready to send bulk campaigns.</p><p>Time: ${new Date().toLocaleString()}</p>`,
      isHtml: true
    });
  }

  async startEmailCampaign(campaignId, io) {
    const campaigns = db.getEmailCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
      throw new Error('Email campaign not found.');
    }

    const settings = db.getEmailSettings();
    if (!settings.host || !settings.user || !settings.pass) {
      throw new Error('SMTP connection is not configured. Please save SMTP settings first.');
    }

    this.activeEmailCampaigns.set(campaignId, true);
    db.updateEmailCampaignStatus(campaignId, 'running');

    if (io) {
      io.emit('email_campaign_update', { id: campaignId, status: 'running' });
    }

    // Run queue in background
    this.processEmailQueue(campaign, settings, io);

    return { status: 'running', message: 'Email campaign broadcast started.' };
  }

  pauseEmailCampaign(campaignId, io) {
    this.activeEmailCampaigns.set(campaignId, false);
    db.updateEmailCampaignStatus(campaignId, 'paused');
    if (io) {
      io.emit('email_campaign_update', { id: campaignId, status: 'paused' });
    }
    return { status: 'paused' };
  }

  async processEmailQueue(campaign, settings, io) {
    const contacts = campaign.contacts || [];
    let sentCount = campaign.sent_count || 0;
    let failedCount = campaign.failed_count || 0;
    const delayMs = campaign.delay_ms || 2000;

    console.log(`📧 Email Campaign [${campaign.title}] started processing for ${contacts.length} recipients...`);

    for (let i = sentCount + failedCount; i < contacts.length; i++) {
      // Check if campaign was paused
      if (this.activeEmailCampaigns.get(campaign.id) === false) {
        console.log(`⏸️ Email Campaign [${campaign.title}] paused at contact index ${i}`);
        break;
      }

      const contact = contacts[i];
      const targetEmail = contact.email ? contact.email.trim() : '';

      if (!targetEmail || !targetEmail.includes('@')) {
        console.log(`⚠️ Skipping contact ${contact.name}: No valid email address.`);
        failedCount++;
        db.updateEmailCampaignStatus(campaign.id, 'running', sentCount, failedCount);
        continue;
      }

      const formattedSubject = formatMessageVariables(campaign.subject, contact);
      const formattedBody = formatMessageVariables(campaign.body, contact);

      try {
        await sendSmtpEmail({
          host: settings.host,
          port: settings.port,
          secure: settings.secure,
          user: settings.user,
          pass: settings.pass,
          fromName: settings.from_name || 'My Business',
          fromEmail: settings.from_email || settings.user,
          to: targetEmail,
          subject: formattedSubject,
          body: formattedBody,
          isHtml: campaign.is_html !== false
        });

        sentCount++;
        db.addLog({
          recipient: targetEmail,
          message: `Subject: ${formattedSubject}`,
          type: 'email_broadcast',
          status: 'sent'
        });

        console.log(`✅ [${sentCount}/${contacts.length}] Email sent to ${contact.name} (${targetEmail})`);
      } catch (err) {
        failedCount++;
        db.addLog({
          recipient: targetEmail,
          message: `Subject: ${formattedSubject} | Error: ${err.message}`,
          type: 'email_broadcast',
          status: 'failed'
        });

        console.error(`❌ Email failed for ${targetEmail}:`, err.message);
      }

      db.updateEmailCampaignStatus(campaign.id, 'running', sentCount, failedCount);

      if (io) {
        io.emit('email_campaign_progress', {
          id: campaign.id,
          sent_count: sentCount,
          failed_count: failedCount,
          total_contacts: contacts.length,
          current_contact: contact.name || targetEmail
        });
      }

      // Throttling delay between emails
      if (delayMs > 0) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    if (sentCount + failedCount >= contacts.length) {
      db.updateEmailCampaignStatus(campaign.id, 'completed', sentCount, failedCount);
      this.activeEmailCampaigns.delete(campaign.id);
      if (io) {
        io.emit('email_campaign_update', { id: campaign.id, status: 'completed' });
      }
      console.log(`🎉 Email Campaign [${campaign.title}] Completed! Sent: ${sentCount}, Failed: ${failedCount}`);
    }
  }
}

export const emailManager = new EmailManager();
