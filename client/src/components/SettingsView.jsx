import React, { useState, useEffect } from 'react';
import { ShieldCheck, Moon, LogOut, Save, Building, Palette, Sparkles } from 'lucide-react';

export default function SettingsView({ settings, status, onLogout, onRefresh }) {
  const [minDelay, setMinDelay] = useState(settings?.min_delay_ms ? settings.min_delay_ms / 1000 : 3);
  const [maxDelay, setMaxDelay] = useState(settings?.max_delay_ms ? settings.max_delay_ms / 1000 : 7);
  const [dailyCap, setDailyCap] = useState(settings?.max_daily_messages || 500);
  const [oooEnabled, setOooEnabled] = useState(settings?.out_of_office_enabled || false);
  const [oooMessage, setOooMessage] = useState(settings?.out_of_office_message || '');

  const [appName, setAppName] = useState('AutoWhatsApp');
  const [companyName, setCompanyName] = useState('We&You Automation');
  const [logoUrl, setLogoUrl] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.min_delay_ms) setMinDelay(settings.min_delay_ms / 1000);
      if (settings.max_delay_ms) setMaxDelay(settings.max_delay_ms / 1000);
      if (settings.max_daily_messages) setDailyCap(settings.max_daily_messages);
      if (settings.out_of_office_enabled !== undefined) setOooEnabled(Boolean(settings.out_of_office_enabled));
      if (settings.out_of_office_message) setOooMessage(settings.out_of_office_message);
    }

    fetch('/api/branding').then(r => r.json()).then(data => {
      if (data.app_name) setAppName(data.app_name);
      if (data.company_name) setCompanyName(data.company_name);
      if (data.logo_url) setLogoUrl(data.logo_url);
    }).catch(console.error);
  }, [settings]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            min_delay_ms: minDelay * 1000,
            max_delay_ms: maxDelay * 1000,
            max_daily_messages: Number(dailyCap),
            out_of_office_enabled: oooEnabled,
            out_of_office_message: oooMessage
          })
        }),
        fetch('/api/branding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_name: appName,
            company_name: companyName,
            logo_url: logoUrl
          })
        })
      ]);

      alert('All White-Label & System Settings Saved!');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSaveSettings}>
        {/* White-Label Company Branding Panel */}
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Building size={22} style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc' }}>White-Label Client Branding</h3>
            <span className="badge badge-green" style={{ marginLeft: 'auto' }}>SaaS Ready</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label>White-Label Software Name:</label>
              <input type="text" className="input-control" value={appName} onChange={e => setAppName(e.target.value)} placeholder="e.g. Acme Messenger Bot" required />
            </div>
            <div className="input-group">
              <label>Client Company / Tenant Name:</label>
              <input type="text" className="input-control" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp Inc." required />
            </div>
          </div>

          <div className="input-group">
            <label>Custom Brand Logo Image URL:</label>
            <input type="text" className="input-control" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
          </div>
        </div>

        {/* Out of Office Auto-Responder */}
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Moon size={22} style={{ color: '#8b5cf6' }} />
              <h3 style={{ fontSize: '1.2rem' }}>Out-of-Office Auto Responder</h3>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={oooEnabled} onChange={e => setOooEnabled(e.target.checked)} style={{ accentColor: '#25D366', width: '18px', height: '18px' }} />
              Enable Out-of-Office Mode
            </label>
          </div>

          <div className="input-group">
            <label>Out-of-Office Auto Reply Message:</label>
            <textarea className="input-control" rows={3} value={oooMessage} onChange={e => setOooMessage(e.target.value)} placeholder="Our office is currently closed..." />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '2rem' }} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save All Settings & White-Label Branding'}
        </button>
      </form>

      {/* Danger Zone / Disconnect */}
      <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#f43f5e', marginBottom: '0.25rem' }}>Logout & Wipe Device Session</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Disconnects the WhatsApp Web socket and clears local pairing credentials.</p>
          </div>
          <button className="btn btn-danger" onClick={onLogout} disabled={status !== 'connected'}>
            <LogOut size={16} /> Disconnect Device
          </button>
        </div>
      </div>
    </div>
  );
}
