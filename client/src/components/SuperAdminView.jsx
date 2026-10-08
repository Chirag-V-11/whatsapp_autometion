import React, { useState, useEffect } from 'react';
import { Shield, Building, Plus, CheckCircle, Power, UserCheck, Search, DollarSign } from 'lucide-react';

export default function SuperAdminView() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [plan, setPlan] = useState('Pro');

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setTenants(data);
    } catch (e) {
      console.error('Failed to load tenants:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email, password, companyName, plan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create tenant');
      alert(`Client Account created for ${companyName}!`);
      setEmail(''); setPassword(''); setCompanyName('');
      fetchTenants();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (tenantId, currentStatus) => {
    try {
      const token = localStorage.getItem('saas_token');
      await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchTenants();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Admin Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15))', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f8fafc', marginBottom: '0.2rem' }}>
              Super Admin SaaS Control Panel
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
              Manage subscriber client companies, multi-tenant billing accounts & active subscriptions.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Create Client Account Form */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} style={{ color: '#f59e0b' }} /> Add New Subscriber Company
          </h3>

          <form onSubmit={handleCreateTenant}>
            <div className="input-group" style={{ marginBottom: '0.85rem' }}>
              <label>Company / Organization Name:</label>
              <input type="text" className="input-control" placeholder="Acme Logistics Ltd" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>

            <div className="input-group" style={{ marginBottom: '0.85rem' }}>
              <label>Client Admin Email:</label>
              <input type="email" className="input-control" placeholder="client@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="input-group" style={{ marginBottom: '0.85rem' }}>
              <label>Initial Password:</label>
              <input type="password" className="input-control" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label>Subscription Tier & Currency:</label>
              <select className="input-control" value={plan} onChange={e => setPlan(e.target.value)}>
                <option value="Starter">Starter (₹1,499/mo / $19/mo)</option>
                <option value="Pro">Pro (₹2,999/mo / $39/mo)</option>
                <option value="Business">Business (₹5,999/mo / $79/mo)</option>
                <option value="Enterprise">Enterprise (₹11,999/mo / $149/mo)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Create Subscriber Account
            </button>
          </form>
        </div>

        {/* Tenant Accounts List */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Active Client Accounts ({filteredTenants.length})</h3>
            <input
              type="text"
              className="input-control"
              style={{ width: '180px', height: '34px', fontSize: '0.8rem' }}
              placeholder="Search companies..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Admin Email</th>
                  <th>Subscription</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(t => (
                  <tr key={t.id}>
                    <td><strong style={{ color: '#f8fafc' }}>{t.companyName}</strong></td>
                    <td>{t.email}</td>
                    <td><span className="badge badge-blue">{t.plan}</span></td>
                    <td>
                      <span className={`badge ${t.isActive ? 'badge-green' : 'badge-red'}`}>
                        {t.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(t.id, t.isActive)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        <Power size={12} /> {t.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
