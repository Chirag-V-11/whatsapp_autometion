import { db } from './db.js';
import { waClient } from './whatsapp.js';
import { formatMessageVariables } from './botEngine.js';

class CampaignManager {
  constructor() {
    this.activeCampaigns = new Map(); // campaignId -> status flag
  }

  async startCampaign(campaignId, io) {
    const campaigns = db.getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
      throw new Error('Campaign not found.');
    }

    if (waClient.connectionStatus !== 'connected') {
      throw new Error('WhatsApp is not connected. Connect via QR code first.');
    }

    this.activeCampaigns.set(campaignId, true);
    db.updateCampaignStatus(campaignId, 'running');

    if (io) {
      io.emit('campaign_update', { id: campaignId, status: 'running' });
    }

    // Process campaign in async background runner
    this.processCampaignQueue(campaign, io);

    return { status: 'running', message: 'Campaign broadcast started successfully.' };
  }

  pauseCampaign(campaignId, io) {
    this.activeCampaigns.set(campaignId, false);
    db.updateCampaignStatus(campaignId, 'paused');
    if (io) {
      io.emit('campaign_update', { id: campaignId, status: 'paused' });
    }
    return { status: 'paused' };
  }

  async processCampaignQueue(campaign, io) {
    const contacts = campaign.contacts || [];
    let sentCount = campaign.sent_count || 0;
    let failedCount = campaign.failed_count || 0;

    const minDelay = campaign.delay_min || 3000;
    const maxDelay = campaign.delay_max || 7000;

    console.log(`🚀 Campaign [${campaign.title}] started processing for ${contacts.length} recipients...`);

    for (let i = sentCount + failedCount; i < contacts.length; i++) {
      // Check if paused or stopped
      if (this.activeCampaigns.get(campaign.id) === false) {
        console.log(`⏸️ Campaign [${campaign.title}] paused by user at contact index ${i}`);
        break;
      }

      const contact = contacts[i];
      const messageText = formatMessageVariables(campaign.message_template, contact);

      try {
        await waClient.sendMessage(contact.phone, messageText);
        sentCount++;

        db.addLog({
          recipient: contact.phone,
          message: messageText,
          type: 'broadcast',
          status: 'sent'
        });

        console.log(`✅ [${sentCount}/${contacts.length}] Broadcast sent to ${contact.name} (${contact.phone})`);
      } catch (err) {
        failedCount++;

        db.addLog({
          recipient: contact.phone,
          message: messageText,
          type: 'broadcast',
          status: 'failed'
        });

        console.error(`❌ Broadcast failed for ${contact.phone}:`, err.message);
      }

      db.updateCampaignStatus(campaign.id, 'running', sentCount, failedCount);

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
      db.updateCampaignStatus(campaign.id, 'completed', sentCount, failedCount);
      this.activeCampaigns.delete(campaign.id);
      if (io) {
        io.emit('campaign_update', { id: campaign.id, status: 'completed' });
      }
      console.log(`🎉 Campaign [${campaign.title}] Completed! Sent: ${sentCount}, Failed: ${failedCount}`);
    }
  }
}

export const campaignManager = new CampaignManager();
