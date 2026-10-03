import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle2, Play, Pause, Server, Key, AlertCircle, Sparkles, RefreshCw, Calendar, Eye } from 'lucide-react';

export default function EmailView({ contacts, emailCampaigns, onRefresh, socket }) {
  // SMTP Config State
  const [smtp, setSmtp] = useState({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    from_name: 'My Business Support',
    from_email: ''
  });
  const [saveSmtpLoading, setSaveSmtpLoading] = useState(false);
  const [testSmtpLoading, setTestSmtpLoading] = useState(false);
  const [smtpStatusMessage, setSmtpStatusMessage] = useState(null);

  // Campaign Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isHtml, setIsHtml] = useState(true);
  const [delaySec, setDelaySec] = useState(2);
  const [selectedTag, setSelectedTag] = useState('All');
  const [launchLoading, setLaunchLoading] = useState(false);
  const [spintaxPreview, setSpintaxPreview] = useState('');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [dateFilter, setDateFilter] = useState('');

  // Fetch initial SMTP settings
  useEffect(() => {
    fetch('/api/email-settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.host) {
          setSmtp(data);
        }
      })
      .catch(console.error);
  }, []);

  // Socket listener for live progress
  useEffect(() => {
    if (!socket) return;
    const handleProgress = () => {
      if (onRefresh) onRefresh();
    };
    const handleUpdate = () => {
      if (onRefresh) onRefresh();
    };

    socket.on('email_campaign_progress', handleProgress);
    socket.on('email_campaign_update', handleUpdate);

    return () => {
      socket.off('email_campaign_progress', handleProgress);
      socket.off('email_campaign_update', handleUpdate);
    };
  }, [socket, onRefresh]);

  // Extract unique contact tags
  const availableTags = ['All', ...new Set(contacts.map(c => c.tags).filter(Boolean))];

  // Filter contacts by tag that have an email address
  const contactsWithEmail = contacts.filter(c => c.email && c.email.includes('@'));
  const targetContacts = selectedTag === 'All'
    ? contactsWithEmail
    : contactsWithEmail.filter(c => c.tags === selectedTag);

  // Preset Selector Helper
  const applyPreset = (preset) => {
    if (preset === 'gmail') {
      setSmtp(prev => ({
        ...prev,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true
      }));
    } else if (preset === 'outlook') {
      setSmtp(prev => ({
        ...prev,
        host: 'smtp.office365.com',
        port: 587,
        secure: false
      }));
    } else if (preset === 'ses') {
      setSmtp(prev => ({
        ...prev,
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 465,
        secure: true
      }));
    } else if (preset === 'brevo') {
      setSmtp(prev => ({
        ...prev,
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false
      }));
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSaveSmtpLoading(true);
    setSmtpStatusMessage(null);
    try {
      const res = await fetch('/api/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtp)
      });
      if (!res.ok) throw new Error('Failed to save SMTP settings');
      setSmtpStatusMessage({ type: 'success', text: '✅ SMTP Configuration saved successfully!' });
    } catch (err) {
      setSmtpStatusMessage({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setSaveSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestSmtpLoading(true);
    setSmtpStatusMessage(null);
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtp)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SMTP Test failed');
      setSmtpStatusMessage({ type: 'success', text: `🎉 ${data.message} Sent test email to ${smtp.from_email || smtp.user}` });
    } catch (err) {
      setSmtpStatusMessage({ type: 'error', text: `❌ ${err.message}` });
    } finally {
      setTestSmtpLoading(false);
    }
  };

  const handleTestSpintax = () => {
    if (!body) return;
    const resolvedBody = body.replace(/\{([^{}]+)\}/g, (match, choices) => {
      const options = choices.split('|');
      return options[Math.floor(Math.random() * options.length)];
    });
    setSpintaxPreview(resolvedBody.replace(/\{name\}/gi, 'John Doe').replace(/\{company\}/gi, 'Acme Inc'));
  };

  const handleLaunchEmailCampaign = async (e) => {
    e.preventDefault();
    if (!title || !subject || !body || targetContacts.length === 0) return;
    setLaunchLoading(true);

    try {
      // 1. Create Email Campaign
      const res = await fetch('/api/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject,
          body,
          is_html: isHtml,
          delay_ms: delaySec * 1000,
          contacts: targetContacts
        })
      });

      const campaign = await res.json();
      if (!res.ok) throw new Error(campaign.error || 'Failed to create email campaign');

      // 2. Start Email Campaign
      const startRes = await fetch(`/api/email-campaigns/${campaign.id}/start`, { method: 'POST' });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Failed to start email campaign');

      setTitle('');
      setSubject('');
      setBody('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLaunchLoading(false);
    }
  };

  const handleToggleCampaign = async (id, currentStatus) => {
    const action = currentStatus === 'running' ? 'pause' : 'start';
    await fetch(`/api/email-campaigns/${id}/${action}`, { method: 'POST' });
    if (onRefresh) onRefresh();
  };

  // Filter campaigns by date
  const filteredCampaigns = (emailCampaigns || []).filter(cmp => {
    if (!dateFilter) return true;
    const cmpDate = new Date(cmp.created_at).toISOString().split('T')[0];
    return cmpDate === dateFilter;
  });

  return (
    <div>
      {/* 1. SMTP Server Configuration Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={22} style={{ color: '#38bdf8' }} />
            <h3 style={{ fontSize: '1.2rem' }}>SMTP Server & Email Dispatch Configuration</h3>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Presets:</span>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => applyPreset('gmail')}>Gmail</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => applyPreset('outlook')}>Outlook</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => applyPreset('brevo')}>Brevo</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => applyPreset('ses')}>AWS SES</button>
          </div>
        </div>

        <form onSubmit={handleSaveSmtp}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label>SMTP Host Server:</label>
              <input
                type="text"
                className="input-control"
                placeholder="smtp.gmail.com"
                value={smtp.host}
                onChange={e => setSmtp({ ...smtp, host: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label>Port:</label>
              <input
                type="number"
                className="input-control"
                placeholder="465 or 587"
                value={smtp.port}
                onChange={e => setSmtp({ ...smtp, port: Number(e.target.value) })}
                required
              />
            </div>

            <div className="input-group">
              <label>Security Mode:</label>
              <select
                className="input-control"
                value={smtp.secure ? 'ssl' : 'starttls'}
                onChange={e => setSmtp({ ...smtp, secure: e.target.value === 'ssl' })}
              >
                <option value="ssl">SSL / TLS (Port 465)</option>
                <option value="starttls">STARTTLS (Port 587)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Sender Display Name:</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Acme Sales Team"
                value={smtp.from_name}
                onChange={e => setSmtp({ ...smtp, from_name: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label>SMTP Username / Email:</label>
              <input
                type="email"
                className="input-control"
                placeholder="your.email@gmail.com"
                value={smtp.user}
                onChange={e => setSmtp({ ...smtp, user: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label>SMTP Password / App Password:</label>
              <input
                type="password"
                className="input-control"
                placeholder="••••••••••••••••"
                value={smtp.pass}
                onChange={e => setSmtp({ ...smtp, pass: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                For Gmail: Use a 16-digit <strong>Gmail App Password</strong> (from Google Account → Security).
              </span>
            </div>
          </div>

          {smtpStatusMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              background: smtpStatusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: smtpStatusMessage.type === 'success' ? '#10b981' : '#f43f5e',
              border: `1px solid ${smtpStatusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
            }}>
              {smtpStatusMessage.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saveSmtpLoading}>
              <CheckCircle2 size={16} />
              {saveSmtpLoading ? 'Saving Settings...' : 'Save SMTP Settings'}
            </button>

            <button type="button" className="btn btn-secondary" onClick={handleTestSmtp} disabled={testSmtpLoading}>
              <Server size={16} />
              {testSmtpLoading ? 'Testing SMTP Connection...' : '⚡ Test SMTP Connection'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Create Bulk Email Broadcast Campaign */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Mail size={22} style={{ color: '#38bdf8' }} />
          <h3 style={{ fontSize: '1.2rem' }}>Create Bulk Email Campaign</h3>
        </div>

        <form onSubmit={handleLaunchEmailCampaign}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Campaign Title:</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. November Product Newsletter"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Target Audience Tag:</label>
              <select
                className="input-control"
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
              >
                {availableTags.map(tag => {
                  const tagCount = tag === 'All'
                    ? contactsWithEmail.length
                    : contactsWithEmail.filter(c => c.tags === tag).length;
                  return (
                    <option key={tag} value={tag}>
                      {tag} ({tagCount} valid email recipients)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="input-group">
              <label>Delay per Email (Seconds):</label>
              <input
                type="number"
                min="0"
                max="60"
                className="input-control"
                value={delaySec}
                onChange={e => setDelaySec(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Email Subject Line (Supports `{`{name}`}` & `{`{company}`}` & Spintax):</label>
            <input
              type="text"
              className="input-control"
              placeholder="{Exclusive Offer|Special Update} for {name} from {company}"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label>Email Body Content (HTML or Plain Text):</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={isHtml} onChange={e => setIsHtml(e.target.checked)} />
                  Format as HTML Email
                </label>
                <button type="button" onClick={handleTestSpintax} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem' }}>
                  ⚡ Test Spintax Variation
                </button>
              </div>
            </div>

            <textarea
              className="input-control"
              rows={6}
              placeholder={`<p>Hi <strong>{name}</strong>,</p>\n<p>{We are excited to share|Check out} our new products for {company}!</p>\n<p>Best regards,<br/>Sales Team</p>`}
              value={body}
              onChange={e => setBody(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Use <code>{`{name}`}</code>, <code>{`{company}`}</code> for dynamic tags and <code>{`{Hi|Hello}`}</code> for spintax variations.
            </span>
          </div>

          {spintaxPreview && (
            <div style={{ padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#38bdf8' }}>
              <strong>Preview Content Variation:</strong>
              <div style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: spintaxPreview }} />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={launchLoading || targetContacts.length === 0}>
            <Send size={18} />
            {launchLoading ? 'Launching Email Broadcast...' : `Launch Email Campaign to ${targetContacts.length} Recipients`}
          </button>
        </form>
      </div>

      {/* 3. Email Campaigns List & Live Monitor */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Email Campaigns & Delivery Progress</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tracking live SMTP email dispatches ({filteredCampaigns.length} total)</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} style={{ color: '#94a3b8' }} />
            <input
              type="date"
              className="input-control"
              style={{ height: '34px', fontSize: '0.8rem', padding: '0 0.5rem' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' }}>
            No email campaigns created yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredCampaigns.map(cmp => {
              const progressPct = cmp.total_contacts > 0
                ? Math.round(((cmp.sent_count + cmp.failed_count) / cmp.total_contacts) * 100)
                : 0;

              return (
                <div key={cmp.id} style={{
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>{cmp.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Subject: "{cmp.subject}"</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Created: {new Date(cmp.created_at).toLocaleString()}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={`badge ${
                        cmp.status === 'completed' ? 'badge-green' : cmp.status === 'running' ? 'badge-cyan' : 'badge-amber'
                      }`}>
                        {cmp.status.toUpperCase()}
                      </span>

                      {cmp.status !== 'completed' && (
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleToggleCampaign(cmp.id, cmp.status)}>
                          {cmp.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                          {cmp.status === 'running' ? 'Pause' : 'Resume'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', height: '10px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 100%)', height: '100%', transition: 'width 0.3s' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span>Sent: {cmp.sent_count} / {cmp.total_contacts} ({progressPct}%)</span>
                    <span>Failed: {cmp.failed_count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
