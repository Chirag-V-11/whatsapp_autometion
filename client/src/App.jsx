import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { LayoutDashboard, Layers, Bot, Users, FileText, Settings, MessageSquare, QrCode, ShieldCheck, User, Mail } from 'lucide-react';

import DashboardView from './components/DashboardView';
import CampaignView from './components/CampaignView';
import BotView from './components/BotView';
import ContactView from './components/ContactView';
import TemplateView from './components/TemplateView';
import SettingsView from './components/SettingsView';
import EmailView from './components/EmailView';
import QRModal from './components/QRModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waQR, setWaQR] = useState(null);
  const [waUser, setWaUser] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // App Data State
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [emailCampaigns, setEmailCampaigns] = useState([]);
  const [autoResponders, setAutoResponders] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [socketInst, setSocketInst] = useState(null);

  // Fetch all app data from backend REST API
  const fetchAllData = async () => {
    try {
      const [sRes, cRes, cmpRes, botRes, tplRes, setRes, logRes, emailCmpRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/contacts').then(r => r.json()),
        fetch('/api/campaigns').then(r => r.json()),
        fetch('/api/auto-responders').then(r => r.json()),
        fetch('/api/templates').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
        fetch('/api/email-campaigns').then(r => r.json())
      ]);

      setStats(sRes);
      setContacts(cRes);
      setCampaigns(cmpRes);
      setAutoResponders(botRes);
      setTemplates(tplRes);
      setSettings(setRes);
      setLogs(logRes);
      setEmailCampaigns(emailCmpRes);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Socket.io Real-time connection
    const socket = io();
    setSocketInst(socket);

    socket.on('wa_status', (data) => {
      setWaStatus(data.status);
      setWaQR(data.qr);
      setWaUser(data.user);
      if (data.status === 'qr_ready') {
        setIsQRModalOpen(true);
      }
    });

    socket.on('new_message', () => fetchAllData());
    socket.on('campaign_progress', () => fetchAllData());
    socket.on('campaign_update', () => fetchAllData());
    socket.on('email_campaign_progress', () => fetchAllData());
    socket.on('email_campaign_update', () => fetchAllData());

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    fetchAllData();
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <MessageSquare size={26} style={{ flexShrink: 0 }} />
          <h2 className="sidebar-logo-text">AutoWhatsApp</h2>
        </div>

        <ul className="nav-list">
          <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard">
            <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
            <span className="nav-text">Dashboard</span>
          </li>
          <li className={`nav-item ${activeTab === 'campaigns' ? 'active' : ''}`} onClick={() => setActiveTab('campaigns')} title="Broadcast Campaigns">
            <Layers size={20} style={{ flexShrink: 0 }} />
            <span className="nav-text">Broadcast Campaigns</span>
          </li>
          <li className={`nav-item ${activeTab === 'email' ? 'active' : ''}`} onClick={() => setActiveTab('email')} title="Email Automation">
            <Mail size={20} style={{ flexShrink: 0 }} />
            <span className="nav-text">Email Automation</span>
          </li>
          <li className={`nav-item ${activeTab === 'bots' ? 'active' : ''}`} onClick={() => setActiveTab('bots')} title="Auto-Responders">
            <Bot size={20} style={{ flexShrink: 0 }} />
            <span className="nav-text">Auto-Responders</span>
          </li>
          <li className={`nav-item ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')} title="Contacts & Tags">
            <Users size={20} style={{ flexShrink: 0 }} />
            <span className="nav-text">Contacts & Tags</span>
          </li>
          <li className={`nav-item ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')} title="Message Templates">
            <FileText size={20} style={{ flexShrink: 0 }} />
            <span className="nav-text">Message Templates</span>
          </li>
          <li className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title="Security Settings">
            <Settings size={20} style={{ flexShrink: 0 }} />
            <span className="nav-text">Security Settings</span>
          </li>
        </ul>

        {/* User Profile Card */}
        <div
          className="sidebar-footer-box"
          onClick={() => setIsQRModalOpen(true)}
          title="User Profile & Session Details"
          style={{
            marginTop: 'auto',
            padding: '0.65rem 0.5rem',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: waStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: waStatus === 'connected' ? '#10b981' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.9rem',
            flexShrink: 0,
            border: `1px solid ${waStatus === 'connected' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`
          }}>
            {waUser?.name ? waUser.name.charAt(0).toUpperCase() : <User size={18} />}
          </div>

          <div className="sidebar-footer-text">
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {waUser?.name || (waUser?.id ? waUser.id.split(':')[0] : 'Profile Unlinked')}
            </div>
            <div style={{ fontSize: '0.725rem', color: waStatus === 'connected' ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className={`status-dot ${waStatus}`} style={{ width: '6px', height: '6px' }} />
              {waStatus === 'connected' ? 'Connected' : 'Offline'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-title">
            <h1>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'campaigns' && 'Broadcast Campaigns'}
              {activeTab === 'email' && 'Email Automation & Bulk Mailer'}
              {activeTab === 'bots' && 'Chatbot & Auto-Responders'}
              {activeTab === 'contacts' && 'Contact Directory'}
              {activeTab === 'templates' && 'Message Templates'}
              {activeTab === 'settings' && 'System & Security Settings'}
            </h1>
            <p>Enterprise Multi-Channel Automation Suite for Businesses</p>
          </div>

          <div className="connection-pill" onClick={() => setIsQRModalOpen(true)}>
            <div className={`status-dot ${waStatus}`} />
            <span>
              {waStatus === 'connected' ? 'WhatsApp Connected' : waStatus === 'qr_ready' ? 'Pair WhatsApp' : 'Disconnected'}
            </span>
          </div>
        </header>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            status={waStatus}
            user={waUser}
            logs={logs}
            onOpenQR={() => setIsQRModalOpen(true)}
            onRefresh={fetchAllData}
          />
        )}
        {activeTab === 'campaigns' && (
          <CampaignView
            contacts={contacts}
            campaigns={campaigns}
            templates={templates}
            status={waStatus}
            onRefresh={fetchAllData}
          />
        )}
        {activeTab === 'email' && (
          <EmailView
            contacts={contacts}
            emailCampaigns={emailCampaigns}
            onRefresh={fetchAllData}
            socket={socketInst}
          />
        )}
        {activeTab === 'bots' && (
          <BotView rules={autoResponders} onRefresh={fetchAllData} />
        )}
        {activeTab === 'contacts' && (
          <ContactView contacts={contacts} onRefresh={fetchAllData} />
        )}
        {activeTab === 'templates' && (
          <TemplateView templates={templates} onRefresh={fetchAllData} />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            status={waStatus}
            onLogout={handleLogout}
            onRefresh={fetchAllData}
          />
        )}
      </main>

      {/* QR Pairing Modal */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        status={waStatus}
        qr={waQR}
        user={waUser}
      />
    </div>
  );
}
