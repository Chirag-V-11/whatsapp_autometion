import React, { useState } from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-box" style={{ maxWidth: '640px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={22} style={{ color: '#25D366' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0 }}>Legal & Compliance Center</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            className={`btn ${activeTab === 'privacy' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('privacy')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            Privacy Policy
          </button>
          <button
            className={`btn ${activeTab === 'terms' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('terms')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            Terms of Service
          </button>
        </div>

        {/* Policy Content */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          {activeTab === 'privacy' ? (
            <div>
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', color: '#fde047', fontSize: '0.75rem', marginBottom: '1rem' }}>
                ⚠️ DRAFT LEGAL TEXT — SUBJECT TO FINAL LEGAL REVIEW BY COMPANY COUNSEL BEFORE PUBLIC DEPLOYMENT.
              </div>
              <h4 style={{ color: '#f8fafc', marginTop: 0 }}>1. Information We Collect</h4>
              <p>We&You Automation ("Company", "We") collects account details (email, company name, phone number) and contact lists uploaded by subscribers to facilitate automated WhatsApp and Email customer communications.</p>

              <h4 style={{ color: '#f8fafc' }}>2. Data Storage & Privacy</h4>
              <p>Customer data, contact lists, and message templates are isolated per tenant workspace and encrypted in local database storage. We do not sell, license, or transmit your customer data to third-party ad networks.</p>

              <h4 style={{ color: '#f8fafc' }}>3. WhatsApp & Messaging Policy Compliance</h4>
              <p>Users of this platform must comply with Meta's WhatsApp Business Messaging Policy, Indian Telecom Regulatory Authority (TRAI) DND guidelines, and regional spam laws. Users are solely responsible for obtaining explicit consent before sending communications.</p>

              <h4 style={{ color: '#f8fafc' }}>4. Business Identifiers</h4>
              <p><strong>Entity Name:</strong> We&You Business Suite (India)</p>
              <p><strong>GST/TAX ID Placeholder:</strong> 29AAAAA0000A1Z5 (Pending Verification)</p>
              <p><strong>Support Contact:</strong> support@automation.com</p>
            </div>
          ) : (
            <div>
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', color: '#fde047', fontSize: '0.75rem', marginBottom: '1rem' }}>
                ⚠️ DRAFT LEGAL TEXT — SUBJECT TO FINAL LEGAL REVIEW BY COMPANY COUNSEL BEFORE PUBLIC DEPLOYMENT.
              </div>
              <h4 style={{ color: '#f8fafc', marginTop: 0 }}>1. Acceptable Use & Anti-Spam Policy</h4>
              <p>By subscribing to SaaS AutoWhatsApp, you agree not to send unsolicited bulk spam messages, promotional content without opt-in consent, or prohibited material. Violation of Meta policies or spam reports may result in account termination.</p>

              <h4 style={{ color: '#f8fafc' }}>2. Service Level & Disclaimers</h4>
              <p>WhatsApp functionality depends on third-party API availability and official session pairing. The platform provides automated delay throttling and spintax randomization to reduce ban risk, but cannot guarantee zero account restrictions if messaging policies are violated.</p>

              <h4 style={{ color: '#f8fafc' }}>3. Limitation of Liability</h4>
              <p>We&You Automation shall not be liable for any indirect, incidental, or consequential damages arising from WhatsApp account suspensions, missed messages, or network disruptions.</p>

              <h4 style={{ color: '#f8fafc' }}>4. Governing Law</h4>
              <p>These terms shall be governed by and construed in accordance with the laws of India. Jurisdiction: Bengaluru, Karnataka, India.</p>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.75rem', marginTop: '1rem', textAlign: 'right' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.8rem' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
