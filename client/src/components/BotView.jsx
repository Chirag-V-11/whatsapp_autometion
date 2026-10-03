import React, { useState } from 'react';
import { Bot, Plus, Trash2, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

export default function BotView({ rules, onRefresh }) {
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState('contains');
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!keyword || !responseText) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auto-responders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          match_type: matchType,
          response_text: responseText,
          is_active: 1
        })
      });

      if (!res.ok) throw new Error('Failed to create auto-responder rule');
      setKeyword('');
      setResponseText('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (id, currentActive) => {
    await fetch(`/api/auto-responders/${id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: currentActive ? 0 : 1 })
    });
    if (onRefresh) onRefresh();
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Are you sure you want to delete this chatbot rule?')) return;
    await fetch(`/api/auto-responders/${id}`, { method: 'DELETE' });
    if (onRefresh) onRefresh();
  };

  return (
    <div>
      {/* Create Rule Form */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Sparkles size={22} style={{ color: '#8b5cf6' }} />
          <h3 style={{ fontSize: '1.2rem' }}>Add New Chatbot Auto-Responder Rule</h3>
        </div>

        <form onSubmit={handleAddRule}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Trigger Keyword / Phrase:</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. price, hours, support, hello"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Matching Mode:</label>
              <select className="input-control" value={matchType} onChange={e => setMatchType(e.target.value)}>
                <option value="contains">Contains Keyword</option>
                <option value="exact">Exact Match Only</option>
                <option value="regex">Regular Expression (Regex)</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Automated Reply Message (Supports Spintax & Variables):</label>
            <textarea
              className="input-control"
              rows={3}
              placeholder="Hi {name}! Thank you for asking. Our pricing options are..."
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            <Plus size={18} />
            {loading ? 'Saving Rule...' : 'Save Chatbot Rule'}
          </button>
        </form>
      </div>

      {/* Rules List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Configured Auto-Responder Rules ({rules.length})</h3>
        {rules.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No rules configured yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rules.map(rule => (
              <div key={rule.id} style={{
                padding: '1.25rem',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span className="badge badge-violet" style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                      KEYWORD: "{rule.keyword}"
                    </span>
                    <span className="badge badge-cyan">
                      MATCH: {rule.match_type.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                    {rule.response_text}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    style={{ background: 'none', border: 'none', color: rule.is_active ? '#25D366' : '#64748b', cursor: 'pointer' }}
                    title={rule.is_active ? 'Rule Enabled' : 'Rule Disabled'}
                  >
                    {rule.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                    title="Delete Rule"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
