import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { LayoutDashboard, Layers, Bot, Users, FileText, Settings, MessageSquare, QrCode, ShieldCheck, User, Mail, Cake, Shield, LogIn, CreditCard, Lock } from 'lucide-react';

import DashboardView from './components/DashboardView';
import CampaignView from './components/CampaignView';
import BotView from './components/BotView';
import ContactView from './components/ContactView';
import TemplateView from './components/TemplateView';
import SettingsView from './components/SettingsView';
import EmailView from './components/EmailView';
import BirthdayView from './components/BirthdayView';
import SuperAdminView from './components/SuperAdminView';
import PricingView from './components/PricingView';
import AuthModal from './components/AuthModal';
import QRModal from './components/QRModal';
import LegalModal from './components/LegalModal';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', marginBottom: '1rem' }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', marginBottom: '1.5rem' }}>An unexpected error occurred in the workspace dashboard interface. Please refresh the page or contact support.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh Console
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waQR, setWaQR] = useState(null);
  const [waUser, setWaUser] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('privacy');
  const [currentUser, setCurrentUser] = useState(null);

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('saas_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.user) setCurrentUser(data.user);
    } catch (e) {
      console.error('Auth check error:', e);
    }
  };

  // Fetch all app data from backend REST API
  const fetchAllData = async () => {
    const headers = getAuthHeaders();
    try {
      const [sRes, cRes, cmpRes, botRes, tplRes, setRes, logRes, emailCmpRes] = await Promise.all([
        fetch('/api/stats', { headers }).then(r => r.json()),
        fetch('/api/contacts', { headers }).then(r => r.json()),
        fetch('/api/campaigns', { headers }).then(r => r.json()),
        fetch('/api/auto-responders', { headers }).then(r => r.json()),
        fetch('/api/templates', { headers }).then(r => r.json()),
        fetch('/api/settings', { headers }).then(r => r.json()),
        fetch('/api/logs', { headers }).then(r => r.json()),
        fetch('/api/email-campaigns', { headers }).then(r => r.json())
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
    checkAuthStatus();
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
    localStorage.removeItem('saas_token');
    setCurrentUser(null);
    await fetch('/api/logout', { method: 'POST', headers: getAuthHeaders() });
    fetchAllData();
  };

  const openLegal = (tab) => {
    setLegalTab(tab);
    setIsLegalModalOpen(true);
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <MessageSquare size={26} style={{ flexShrink: 0 }} />
            <h2 className="sidebar-logo-text">SaaS AutoWhatsApp</h2>
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
            <li className={`nav-item ${activeTab === 'birthday' ? 'active' : ''}`} onClick={() => setActiveTab('birthday')} title="Birthday Wishes">
              <Cake size={20} style={{ flexShrink: 0 }} />
              <span className="nav-text">Birthday Wishes</span>
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
            <li className={`nav-item ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')} title="Pricing & Subscription Plans" style={{ color: '#ec4899' }}>
              <CreditCard size={20} style={{ flexShrink: 0 }} />
              <span className="nav-text">Pricing & Plans</span>
            </li>

            {/* Super Admin Panel */}
            {currentUser?.role === 'admin' && (
              <li className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')} title="Super Admin Panel" style={{ marginTop: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Shield size={20} style={{ flexShrink: 0 }} />
                <span className="nav-text">SaaS Super Admin</span>
              </li>
            )}
          </ul>

          {/* Legal Links Footer in Sidebar */}
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '0.75rem', justifyContent: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span onClick={() => openLegal('privacy')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>
            <span>•</span>
            <span onClick={() => openLegal('terms')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>
          </div>

          {/* User / SaaS Profile Card */}
          <div
            className="sidebar-footer-box"
            onClick={() => setIsAuthModalOpen(true)}
            title="Company Profile & Tenant Login"
            style={{
              marginTop: '0.25rem',
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
              background: currentUser ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: currentUser ? '#25D366' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.9rem',
              flexShrink: 0,
              border: `1px solid ${currentUser ? 'rgba(37, 211, 102, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`
            }}>
              {currentUser?.companyName ? currentUser.companyName.charAt(0).toUpperCase() : <LogIn size={18} />}
            </div>

            <div className="sidebar-footer-text">
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                {currentUser?.companyName || 'Sign In / Register'}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#25D366', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }} onClick={(e) => { e.stopPropagation(); setActiveTab('pricing'); }}>
                  {currentUser?.plan || 'Free Trial'}
                </span>
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
                {activeTab === 'birthday' && 'Automated Birthday Greetings'}
                {activeTab === 'bots' && 'Chatbot & Auto-Responders'}
                {activeTab === 'contacts' && 'Contact Directory'}
                {activeTab === 'templates' && 'Message Templates'}
                {activeTab === 'settings' && 'System & Security Settings'}
                {activeTab === 'pricing' && 'Pricing & Subscription Plans'}
                {activeTab === 'admin' && 'SaaS Super Admin Tenant Control'}
              </h1>
              <p>Multi-Tenant White-Label Automation Platform for Businesses</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setIsAuthModalOpen(true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                <LogIn size={14} /> {currentUser ? 'Switch Account' : 'Company Login'}
              </button>

              <div className="connection-pill" onClick={() => setIsQRModalOpen(true)}>
                <div className={`status-dot ${waStatus}`} />
                <span>
                  {waStatus === 'connected' ? 'WhatsApp Connected' : waStatus === 'qr_ready' ? 'Pair WhatsApp' : 'Disconnected'}
                </span>
              </div>
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
          {activeTab === 'birthday' && (
            <BirthdayView
              contacts={contacts}
              onRefresh={fetchAllData}
              status={waStatus}
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
          {activeTab === 'pricing' && (
            <PricingView
              currentUser={currentUser}
              onSelectPlan={(planId) => {
                if (!currentUser) {
                  setIsAuthModalOpen(true);
                } else {
                  alert(`Selected ${planId} Plan for ${currentUser.companyName}. Contact admin or integrate payment gateway for automated checkout.`);
                }
              }}
            />
          )}
          {activeTab === 'admin' && (
            <SuperAdminView />
          )}
        </main>

        {/* SaaS Auth Login / Register Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            fetchAllData();
          }}
          onOpenLegal={openLegal}
        />

        {/* QR Pairing Modal */}
        <QRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          status={waStatus}
          qr={waQR}
          user={waUser}
        />

        {/* Legal & Compliance Modal */}
        <LegalModal
          isOpen={isLegalModalOpen}
          onClose={() => setIsLegalModalOpen(false)}
          initialTab={legalTab}
        />
      </div>
    </ErrorBoundary>
  );
}
