import React, { useState } from 'react';
import { FileText, Plus, Trash2, Tag, Copy } from 'lucide-react';

export default function TemplateView({ templates, onRefresh }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!name || !content) return;
    setLoading(true);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, category })
      });
      if (!res.ok) throw new Error('Failed to add template');
      setName('');
      setContent('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertTag = (tag) => {
    setContent(prev => prev + ' ' + tag);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (onRefresh) onRefresh();
  };

  return (
    <div>
      {/* Add Template */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <FileText size={22} style={{ color: '#06b6d4' }} />
          <h3 style={{ fontSize: '1.2rem' }}>Create Message Template</h3>
        </div>

        <form onSubmit={handleAddTemplate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Template Title:</label>
              <input type="text" className="input-control" placeholder="e.g. Welcome Series" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Category:</label>
              <input type="text" className="input-control" placeholder="General, Sales, Support" value={category} onChange={e => setCategory(e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label>Message Content:</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['{name}', '{company}', '{phone}', '{Hi|Hello}'].map(tag => (
                  <button key={tag} type="button" onClick={() => handleInsertTag(tag)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)', color: '#25D366', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea className="input-control" rows={4} placeholder="Hi {name}, thank you for reaching out..." value={content} onChange={e => setContent(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            <Plus size={18} />
            Save Message Template
          </button>
        </form>
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {templates.map(tpl => (
          <div key={tpl.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>{tpl.name}</h4>
                <span className="badge badge-cyan">{tpl.category}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {tpl.content}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button
                onClick={() => { navigator.clipboard.writeText(tpl.content); alert('Template copied!'); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
              >
                <Copy size={14} /> Copy
              </button>
              <button onClick={() => handleDelete(tpl.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
