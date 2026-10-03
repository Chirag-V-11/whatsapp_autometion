import React, { useState } from 'react';
import { Users, Send, Bot, Layers, QrCode, Search, Filter, Activity, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function DashboardView({ stats, status, user, logs = [], onOpenQR, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAll, setShowAll] = useState(false);

  // Filter logs to ONLY display messages dispatched through this software (broadcast, outgoing, auto_reply)
  const rawLogs = logs && logs.length > 0 ? logs : (stats?.recentLogs || []);
  const sentOnlyLogs = rawLogs.filter(log => log.type !== 'incoming');

  const filteredLogs = sentOnlyLogs.filter((log) => {
    const matchesSearch =
      (log.recipient && log.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'All' || log.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const displayedLogs = showAll ? filteredLogs : filteredLogs.slice(0, 10);

  return (
    <div>
      {/* Connection Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div className={`status-dot ${status}`} />
            <h3 style={{ fontSize: '1.1rem' }}>
              WhatsApp Status: {status === 'connected' ? 'Connected & Active' : status === 'qr_ready' ? 'Scan QR Code' : 'Disconnected'}
            </h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {status === 'connected' ? `Logged in as ${user?.name || user?.id?.split(':')[0] || 'Business Account'}` : 'Pair your business WhatsApp account using QR scanner.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={onOpenQR}>
          <QrCode size={18} />
          {status === 'connected' ? 'Session Device Info' : 'Scan QR Code'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h3>{stats?.totalContacts || 0}</h3>
            <p>Total Contacts</p>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
            <Send size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats?.totalSent || 0}</h3>
            <p>Messages Dispatched</p>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Bot size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats?.totalAutoResponders || 0}</h3>
            <p>Active Chatbots</p>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Layers size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats?.totalCampaigns || 0}</h3>
            <p>Total Campaigns</p>
          </div>
        </div>
      </div>

      {/* Total Activities with Filters Section */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={24} style={{ color: '#25D366' }} />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Total Sent Activities</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Logs of messages dispatched through this software ({filteredLogs.length} total)</p>
            </div>
          </div>

          {/* Filter Bar Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="text"
                className="input-control"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', width: '200px' }}
                placeholder="Search phone or text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Filter size={14} style={{ color: '#94a3b8' }} />
              <select
                className="input-control"
                style={{ height: '36px', fontSize: '0.85rem', padding: '0 0.75rem' }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Sent Types</option>
                <option value="broadcast">Broadcast</option>
                <option value="outgoing">Direct Sent</option>
                <option value="auto_reply">Auto Reply</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              className="input-control"
              style={{ height: '36px', fontSize: '0.85rem', padding: '0 0.75rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Recipient / Phone</th>
                <th>Message Content</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.length > 0 ? (
                displayedLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                    </td>
                    <td>
                      <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{log.recipient}</strong>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.message}>
                        {log.message}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        log.type === 'incoming' ? 'badge-cyan' : log.type === 'auto_reply' ? 'badge-violet' : 'badge-green'
                      }`}>
                        {log.type === 'auto_reply' ? 'Auto Reply' : log.type === 'broadcast' ? 'Broadcast' : log.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '600', color: log.status === 'failed' ? '#f43f5e' : '#25D366' }}>
                        {log.status === 'failed' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem' }}>
                    No message activity found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Show More / Show Less Button */}
        {filteredLogs.length > 10 && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAll(!showAll)}
              style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
            >
              {showAll ? 'Show Less (Top 10)' : `Show More (${filteredLogs.length - 10} more activities)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
