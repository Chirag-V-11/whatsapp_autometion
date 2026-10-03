import React, { useState, useEffect } from 'react';
import { Send, Play, Pause, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw, Layers, Calendar } from 'lucide-react';

export default function CampaignView({ contacts, campaigns, templates, status, onRefresh }) {
  const [title, setTitle] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [minDelay, setMinDelay] = useState(3);
  const [maxDelay, setMaxDelay] = useState(7);
  const [selectedTag, setSelectedTag] = useState('All');
  const [loading, setLoading] = useState(false);
  const [spintaxPreview, setSpintaxPreview] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

  // Filter campaigns by date
  const filteredCampaigns = campaigns.filter(cmp => {
    if (!dateFilter) return true;
    const cmpDate = new Date(cmp.created_at).toISOString().split('T')[0];
    return cmpDate === dateFilter;
  });

  const displayedCampaigns = showAllCampaigns ? filteredCampaigns : filteredCampaigns.slice(0, 10);

  // Extract unique tags from contacts
  const availableTags = ['All', ...new Set(contacts.map(c => c.tags).filter(Boolean))];

  // Calculate matching contacts
  const targetContacts = selectedTag === 'All'
    ? contacts
    : contacts.filter(c => c.tags === selectedTag);

  const handleTestSpintax = () => {
    if (!templateText) return;
    const resolved = templateText.replace(/\{([^{}]+)\}/g, (match, choices) => {
      const options = choices.split('|');
      return options[Math.floor(Math.random() * options.length)];
    });
    setSpintaxPreview(resolved.replace(/\{name\}/gi, 'John Doe').replace(/\{company\}/gi, 'Acme Inc'));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!title || !templateText || targetContacts.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message_template: templateText,
          delay_min: minDelay * 1000,
          delay_max: maxDelay * 1000,
          contacts: targetContacts
        })
      });

      const campaign = await res.json();
      if (!res.ok) throw new Error(campaign.error || 'Failed to create campaign');

      // Auto start created campaign
      await fetch(`/api/campaigns/${campaign.id}/start`, { method: 'POST' });

      setTitle('');
      setTemplateText('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCampaign = async (id, currentStatus) => {
    const action = currentStatus === 'running' ? 'pause' : 'start';
    await fetch(`/api/campaigns/${id}/${action}`, { method: 'POST' });
    if (onRefresh) onRefresh();
  };

  return (
    <div>
      {/* Create New Campaign Wizard */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Layers size={22} style={{ color: '#25D366' }} />
          <h3 style={{ fontSize: '1.2rem' }}>Create Bulk Broadcast Campaign</h3>
        </div>

        <form onSubmit={handleCreateCampaign}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Campaign Title:</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Autumn Promo 2026"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Target Contact Tag:</label>
              <select
                className="input-control"
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
              >
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag} ({tag === 'All' ? contacts.length : contacts.filter(c => c.tags === tag).length} contacts)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label>Message Content (Supports Spintax & Variables):</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {templates && templates.length > 0 && (
                  <select
                    className="input-control"
                    style={{ height: '32px', fontSize: '0.8rem', padding: '0 0.5rem', background: 'rgba(255,255,255,0.08)' }}
                    defaultValue=""
                    onChange={(e) => {
                      const selected = templates.find(t => String(t.id) === e.target.value);
                      if (selected) setTemplateText(selected.content);
                    }}
                  >
                    <option value="" disabled>Select Template</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                )}

                <button type="button" onClick={handleTestSpintax} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: '0.8rem' }}>
                  ⚡ Test Spintax Variation
                </button>
              </div>
            </div>
            <textarea
              className="input-control"
              rows={4}
              placeholder="{Hi|Hello|Greetings} {name}, we have an exclusive offer for you from {company}!"
              value={templateText}
              onChange={e => setTemplateText(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Use <code>{`{Hi|Hello}`}</code> for spintax variation and <code>{`{name}`}</code>, <code>{`{company}`}</code> for personalization.
            </span>
          </div>

          {spintaxPreview && (
            <div style={{ padding: '0.75rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#06b6d4' }}>
              <strong>Preview Variation:</strong> "{spintaxPreview}"
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || status !== 'connected' || targetContacts.length === 0}>
            <Send size={18} />
            {loading ? 'Launching Broadcast...' : `Launch Broadcast to ${targetContacts.length} Recipients`}
          </button>
        </form>
      </div>

      {/* Campaigns List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Campaign History & Live Monitors</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tracking broadcast dispatches and live delivery progress ({filteredCampaigns.length} total)</p>
          </div>

          {/* Date Filter Control */}
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
            {dateFilter ? 'No campaigns found for the selected date.' : 'No campaigns created yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayedCampaigns.map(cmp => {
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
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Created: {new Date(cmp.created_at).toLocaleString()}</p>
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
                    <div style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)', height: '100%', transition: 'width 0.3s' }} />
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

        {/* Show More / Show Less Toggle Button */}
        {filteredCampaigns.length > 10 && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAllCampaigns(!showAllCampaigns)}
              style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
            >
              {showAllCampaigns ? 'Show Less (Top 10)' : `Show More (${filteredCampaigns.length - 10} more campaigns)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
