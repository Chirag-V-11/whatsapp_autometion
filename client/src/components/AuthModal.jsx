import React, { useState } from 'react';
import { Lock, Mail, Building, Sparkles, ShieldCheck, X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, onOpenLegal }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [plan, setPlan] = useState('Pro');
  const [websiteHp, setWebsiteHp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (websiteHp) return; // Honeypot triggered
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password, website_hp: websiteHp } : { email, password, companyName, plan, website_hp: websiteHp };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('saas_token', data.token);
      alert(isLogin ? `Welcome back, ${data.user.companyName}!` : `Company account created! Subscribed to ${data.user.plan} plan.`);
      if (onAuthSuccess) onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-box" style={{ maxWidth: '440px', width: '90%', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #25D366, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#f8fafc' }}>{isLogin ? 'Company Account Login' : 'Start SaaS Free Trial'}</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Multi-Tenant Enterprise Portal</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', color: '#fda4af', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Honeypot Input (hidden from humans) */}
          <input type="text" name="website_hp" style={{ display: 'none' }} value={websiteHp} onChange={e => setWebsiteHp(e.target.value)} tabIndex="-1" autocomplete="off" />

          {!isLogin && (
            <>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Building size={14} /> Company Name:</label>
                <input type="text" className="input-control" placeholder="Acme Technologies Inc." value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              </div>

              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Select Subscription Plan:</label>
                <select className="input-control" value={plan} onChange={e => setPlan(e.target.value)}>
                  <option value="Starter">Starter Plan ($29/mo - 500 contacts)</option>
                  <option value="Pro">Pro Plan ($69/mo - 2,500 contacts)</option>
                  <option value="Enterprise">Enterprise Plan ($149/mo - Unlimited)</option>
                </select>
              </div>
            </>
          )}

          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={14} /> Business Email:</label>
            <input type="email" className="input-control" placeholder="admin@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Lock size={14} /> Password:</label>
            <input type="password" className="input-control" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In to Workspace' : 'Create Company Workspace')}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          {isLogin ? "Don't have a SaaS account? " : "Already registered? "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#25D366', fontWeight: '600', cursor: 'pointer' }}>
            {isLogin ? 'Register New Company' : 'Log In'}
          </button>
        </div>

        {onOpenLegal && (
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center', fontSize: '0.725rem', color: '#64748b' }}>
            By signing in, you agree to our{' '}
            <span onClick={() => onOpenLegal('terms')} style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>
            {' '}and{' '}
            <span onClick={() => onOpenLegal('privacy')} style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>.
          </div>
        )}
      </div>
    </div>
  );
}
