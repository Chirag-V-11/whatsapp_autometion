import React, { useState, useEffect } from 'react';
import { Cake, Sparkles, Send, Calendar, CheckCircle2, RefreshCw, Image, Mail, MessageSquare, AlertCircle, Clock, Save } from 'lucide-react';

export default function BirthdayView({ contacts, onRefresh, status }) {
  const [bSettings, setBSettings] = useState({
    enabled: true,
    send_time: '09:00',
    default_template: '🎉 Happy Birthday {name}! 🎂 Wishing you a wonderful day filled with happiness, health, and great success! 🥳✨',
    send_whatsapp: true,
    send_email: true
  });

  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [scanMessage, setScanMessage] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchBirthdayData = async () => {
    try {
      const [sRes, tRes, uRes] = await Promise.all([
        fetch('/api/birthday/settings').then(r => r.json()),
        fetch('/api/birthday/today').then(r => r.json()),
        fetch('/api/birthday/upcoming?days=7').then(r => r.json())
      ]);

      setBSettings(sRes);
      setTodayBirthdays(tRes);
      setUpcomingBirthdays(uRes);
    } catch (err) {
      console.error('Error loading birthday view data:', err);
    }
  };

  useEffect(() => {
    fetchBirthdayData();
  }, [contacts]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/birthday/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bSettings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      alert('Birthday Automation Settings Saved Successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleManualTrigger = async () => {
    setLoading(true);
    setScanMessage('');
    try {
      const res = await fetch('/api/birthday/trigger', { method: 'POST' });
      const data = await res.json();
      setScanMessage('✅ Scan completed! Birthday wishes delivered to today\'s contacts.');
      fetchBirthdayData();
      if (onRefresh) onRefresh();
    } catch (err) {
      setScanMessage('❌ Error scanning birthdays: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSingleWish = async (contactId) => {
    setSendingId(contactId);
    try {
      const res = await fetch(`/api/birthday/send/${contactId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send wish');

      alert(`🎂 Birthday Wish sent successfully to ${data.contact.name}!`);
      fetchBirthdayData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('❌ Send failed: ' + err.message);
    } finally {
      setSendingId(null);
    }
  };

  const insertVariable = (varName) => {
    setBSettings(prev => ({
      ...prev,
      default_template: prev.default_template + ` ${varName}`
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Hero Banner */}
      <div className="glass-panel" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(168, 85, 247, 0.3)' }}>
              <Cake size={28} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Automated Birthday Wishes <Sparkles size={20} style={{ color: '#f59e0b' }} />
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                Send personalized WhatsApp & Email birthday greetings with custom text & photos automatically!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleManualTrigger}
              className="btn btn-primary"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              {loading ? 'Scanning & Sending...' : 'Scan & Wish Today'}
            </button>
          </div>
        </div>

        {scanMessage && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', fontSize: '0.875rem' }}>
            {scanMessage}
          </div>
        )}
      </div>

      {/* Stats Quick Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cake size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc' }}>{todayBirthdays.length}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Today's Birthdays</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc' }}>{upcomingBirthdays.length}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Next 7 Days Birthdays</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: bSettings.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: bSettings.enabled ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: bSettings.enabled ? '#10b981' : '#ef4444' }}>
              {bSettings.enabled ? 'Auto-Wish Active' : 'Auto-Wish Paused'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Daily Scan & Deliver</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Settings + Today's List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Template & Automation Settings */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: '#a855f7' }} />
            Birthday Wish Configuration
          </h3>

          <form onSubmit={handleSaveSettings}>
            {/* Auto-Wish Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
              <div>
                <strong style={{ color: '#f8fafc', display: 'block', fontSize: '0.9rem' }}>Enable Automated Daily Wishes</strong>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Scans contact birthdays daily and delivers wishes automatically</span>
              </div>
              <input
                type="checkbox"
                checked={bSettings.enabled}
                onChange={e => setBSettings({ ...bSettings, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#a855f7' }}
              />
            </div>

            {/* Delivery Channels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={bSettings.send_whatsapp}
                  onChange={e => setBSettings({ ...bSettings, send_whatsapp: e.target.checked })}
                  style={{ accentColor: '#25D366' }}
                />
                <MessageSquare size={16} style={{ color: '#25D366' }} /> WhatsApp
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={bSettings.send_email}
                  onChange={e => setBSettings({ ...bSettings, send_email: e.target.checked })}
                  style={{ accentColor: '#3b82f6' }}
                />
                <Mail size={16} style={{ color: '#3b82f6' }} /> Email
              </label>
            </div>

            {/* Default Message Template */}
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label>Default Birthday Wish Text Template:</label>
              <textarea
                className="input-control"
                rows={4}
                value={bSettings.default_template}
                onChange={e => setBSettings({ ...bSettings, default_template: e.target.value })}
                placeholder="Enter default wish message..."
                required
              />
            </div>

            {/* Dynamic Variable Chips */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                Click to insert personalization tags:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <button type="button" onClick={() => insertVariable('{name}')} className="badge badge-green" style={{ cursor: 'pointer', border: 'none' }}>+ {'{name}'}</button>
                <button type="button" onClick={() => insertVariable('{company}')} className="badge badge-blue" style={{ cursor: 'pointer', border: 'none' }}>+ {'{company}'}</button>
                <button type="button" onClick={() => insertVariable('{age}')} className="badge" style={{ cursor: 'pointer', border: 'none', background: 'rgba(236,72,153,0.2)', color: '#f472b6' }}>+ {'{age}'}</button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={savingSettings}>
              <Save size={16} />
              {savingSettings ? 'Saving Settings...' : 'Save Birthday Settings'}
            </button>
          </form>
        </div>

        {/* Today's Birthday Contacts List */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cake size={18} style={{ color: '#ec4899' }} />
            Today's Birthdays ({todayBirthdays.length})
          </h3>

          {todayBirthdays.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todayBirthdays.map(c => (
                <div key={c.id} style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Photo Thumbnail */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {c.image ? (
                      <img src={c.image} alt={c.name} style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ec4899' }} />
                    ) : (
                      <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.2rem' }}>
                        {c.name ? c.name.charAt(0).toUpperCase() : '🎂'}
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#ec4899', borderRadius: '50%', padding: '2px' }}>
                      <Cake size={12} style={{ color: '#ffffff' }} />
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      📱 {c.phone} {c.company ? `• ${c.company}` : ''}
                    </div>
                    {c.custom_wish && (
                      <div style={{ fontSize: '0.75rem', color: '#ec4899', fontStyle: 'italic', marginTop: '0.2rem' }}>
                        Custom Wish Set ✨
                      </div>
                    )}
                  </div>

                  {/* Instant Send Wish Button */}
                  <button
                    onClick={() => handleSendSingleWish(c.id)}
                    className="btn btn-secondary"
                    disabled={sendingId === c.id}
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(236,72,153,0.15)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)' }}
                  >
                    <Send size={14} className={sendingId === c.id ? 'spin' : ''} />
                    {sendingId === c.id ? 'Sending...' : 'Wish Now'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
              <Cake size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p>No contacts have birthdays today.</p>
              <span style={{ fontSize: '0.75rem' }}>Add Date of Birth (DOB) to contacts in the Contact Directory!</span>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Birthdays Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} style={{ color: '#3b82f6' }} />
          Upcoming Birthdays (Next 7 Days)
        </h3>

        {upcomingBirthdays.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contact Photo</th>
                  <th>Name</th>
                  <th>Phone Number</th>
                  <th>Date of Birth (DOB)</th>
                  <th>Custom Image / Text</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBirthdays.map(c => (
                  <tr key={c.id}>
                    <td>
                      {c.image ? (
                        <img src={c.image} alt={c.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                          {c.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td><strong style={{ color: '#f8fafc' }}>{c.name}</strong></td>
                    <td>{c.phone}</td>
                    <td><span className="badge badge-blue">{c.dob}</span></td>
                    <td>
                      {c.image ? <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Photo Attached</span> : <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Default Text</span>}
                    </td>
                    <td>
                      <button
                        onClick={() => handleSendSingleWish(c.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        Send Wish Early
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
            No upcoming birthdays found in the next 7 days.
          </div>
        )}
      </div>
    </div>
  );
}
