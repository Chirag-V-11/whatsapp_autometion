import { db } from './db.js';
import { waClient } from './whatsapp.js';
import { formatMessageVariables } from './botEngine.js';

class CampaignManager {
  constructor() {
    this.activeCampaigns = new Map(); // campaignId -> status flag
  }

  async startCampaign(tenantId, campaignId, io) {
    const tId = tenantId || 'tenant_default';
    const campaigns = db.getCampaigns(tId);
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
      throw new Error('Campaign not found.');
    }

    if (waClient.connectionStatus !== 'connected') {
      throw new Error('WhatsApp is not connected. Connect via QR code first.');
    }

    this.activeCampaigns.set(campaignId, true);
    db.updateCampaignStatus(tId, campaignId, 'running');

    if (io) {
      io.emit('campaign_update', { id: campaignId, status: 'running' });
    }

    // Process campaign in async background runner
    this.processCampaignQueue(tId, campaign, io);

    return { status: 'running', message: 'Campaign broadcast started successfully.' };
  }

  pauseCampaign(tenantId, campaignId, io) {
    const tId = tenantId || 'tenant_default';
    this.activeCampaigns.set(campaignId, false);
    db.updateCampaignStatus(tId, campaignId, 'paused');
    if (io) {
      io.emit('campaign_update', { id: campaignId, status: 'paused' });
    }
    return { status: 'paused' };
  }

  async processCampaignQueue(tId, campaign, io) {
    const contacts = campaign.contacts || [];
    let sentCount = campaign.sent_count || 0;
    let failedCount = campaign.failed_count || 0;

    const minDelay = campaign.delay_min || 3000;
    const maxDelay = campaign.delay_max || 7000;

    for (let i = sentCount + failedCount; i < contacts.length; i++) {
      // Check if paused or stopped
      if (this.activeCampaigns.get(campaign.id) === false) {
        break;
      }

      const contact = contacts[i];
      const messageText = formatMessageVariables(campaign.message_template, contact);

      try {
        await waClient.sendMessage(contact.phone, messageText);
        sentCount++;

        db.addLog(tId, {
          recipient: contact.phone,
          message: messageText,
          type: 'broadcast',
          status: 'sent'
        });
      } catch (err) {
        failedCount++;

        db.addLog(tId, {
          recipient: contact.phone,
          message: messageText,
          type: 'broadcast',
          status: 'failed'
        });
      }

      db.updateCampaignStatus(tId, campaign.id, 'running', sentCount, failedCount);

      if (io) {
        io.emit('campaign_progress', {
          id: campaign.id,
          sent_count: sentCount,
          failed_count: failedCount,
          total_contacts: contacts.length,
          current_contact: contact.name || contact.phone
        });
      }

      // Anti-Ban Throttling: Humanized Random Delay between messages
      const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      await new Promise(res => setTimeout(res, randomDelay));
    }

    if (sentCount + failedCount >= contacts.length) {
      db.updateCampaignStatus(tId, campaign.id, 'completed', sentCount, failedCount);
      this.activeCampaigns.delete(campaign.id);
      if (io) {
        io.emit('campaign_update', { id: campaign.id, status: 'completed' });
      }
    }
  }
}

export const campaignManager = new CampaignManager();
