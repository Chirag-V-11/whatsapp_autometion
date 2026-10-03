import React from 'react';
import { QrCode, X, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

export default function QRModal({ isOpen, onClose, status, qr, user }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode style={{ color: '#25D366' }} size={24} />
            <h3 style={{ fontSize: '1.2rem' }}>WhatsApp Web Pairing</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {status === 'connected' ? (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <CheckCircle2 size={64} style={{ color: '#25D366', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>WhatsApp Connected!</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Connected as: <strong>{user?.name || user?.id?.split(':')[0] || 'Business Account'}</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#25D366', background: 'rgba(37, 211, 102, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
              <ShieldCheck size={18} />
              Session Auth Encrypted & Saved Locally
            </div>
          </div>
        ) : status === 'qr_ready' && qr ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Open WhatsApp on your phone &gt; Linked Devices &gt; <strong>Link a Device</strong> and scan the code below:
            </p>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', display: 'inline-block', boxShadow: '0 0 25px rgba(37,211,102,0.3)', marginBottom: '1.25rem' }}>
              <img src={qr} alt="WhatsApp Pairing QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              ⚡ QR Code refreshes automatically every 20 seconds
            </p>
          </div>
        ) : (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <RefreshCw size={40} className="spin" style={{ color: '#10b981', margin: '0 auto 1rem' }} />
            <p style={{ color: '#94a3b8', marginBottom: '1.25rem' }}>Generating secure QR code stream...</p>
            <button
              className="btn btn-primary"
              style={{ margin: '0 auto' }}
              onClick={async () => {
                await fetch('/api/reconnect', { method: 'POST' });
              }}
            >
              <RefreshCw size={16} /> Generate / Refresh QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
