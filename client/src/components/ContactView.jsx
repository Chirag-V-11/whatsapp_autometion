import React, { useState } from 'react';
import { Users, UserPlus, Upload, Trash2, Search, Filter, Pencil, X } from 'lucide-react';

export default function ContactView({ contacts, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [tag, setTag] = useState('VIP');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);

    try {
      const endpoint = editingId ? `/api/contacts/${editingId}` : '/api/contacts';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, company, email, tags: tag })
      });

      if (!res.ok) throw new Error(editingId ? 'Failed to update contact' : 'Failed to add contact');
      
      resetForm();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setPhone(c.phone || '');
    setName(c.name || '');
    setCompany(c.company || '');
    setEmail(c.email || '');
    setTag(c.tags || 'VIP');
  };

  const resetForm = () => {
    setEditingId(null);
    setPhone('');
    setName('');
    setCompany('');
    setEmail('');
    setTag('VIP');
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/);
      const parsedContacts = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (i === 0 && line.toLowerCase().includes('phone')) continue;

        const p = parts[0]?.replace(/\D/g, '');
        if (p) {
          parsedContacts.push({
            phone: p,
            name: parts[1] || 'Customer',
            company: parts[2] || '',
            email: parts[3] || '',
            tags: parts[4] || 'Imported'
          });
        }
      }

      if (parsedContacts.length > 0) {
        await fetch('/api/contacts/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: parsedContacts })
        });
        alert(`Successfully imported ${parsedContacts.length} contacts!`);
        if (onRefresh) onRefresh();
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    if (onRefresh) onRefresh();
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesTag = selectedTagFilter === 'All' || c.tags === selectedTagFilter;
    return matchesSearch && matchesTag;
  });

  const availableTags = ['All', ...new Set(contacts.map(c => c.tags).filter(Boolean))];

  return (
    <div>
      {/* Top Controls: Add/Edit Contact & CSV Import */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Contact Form */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingId ? <Pencil size={20} style={{ color: '#06b6d4' }} /> : <UserPlus size={20} style={{ color: '#25D366' }} />}
              <h3 style={{ fontSize: '1.1rem' }}>{editingId ? 'Edit Contact Details' : 'Add New Contact'}</h3>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <X size={14} /> Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveContact}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="input-group">
                <label>Phone Number (10-Digit Mobile):</label>
                <input type="text" className="input-control" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Full Name:</label>
                <input type="text" className="input-control" placeholder="Alice Smith" value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="input-group">
                <label>Company:</label>
                <input type="text" className="input-control" placeholder="Acme Corp" value={company} onChange={e => setCompany(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Tag / Segment:</label>
                <input type="text" className="input-control" placeholder="VIP, Lead" value={tag} onChange={e => setTag(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {editingId ? 'Update Contact Details' : 'Save Contact'}
            </button>
          </form>
        </div>

        {/* CSV Import Box */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <Upload size={36} style={{ color: '#06b6d4', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Bulk CSV File Import</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Upload a <code>.csv</code> file formatted as: <code>phone,name,company,email,tags</code>
          </p>
          <label className="btn btn-secondary" style={{ width: 'fit-content', margin: '0 auto', cursor: 'pointer' }}>
            Choose CSV File
            <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Contacts List Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Contact Directory ({filteredContacts.length})</h3>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
              <input
                type="text"
                className="input-control"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
                placeholder="Search phone or name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="input-control"
              style={{ height: '36px', fontSize: '0.85rem', padding: '0 0.75rem' }}
              value={selectedTagFilter}
              onChange={e => setSelectedTagFilter(e.target.value)}
            >
              {availableTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Phone Number</th>
                <th>Company</th>
                <th>Tag</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ color: '#f8fafc' }}>{c.name}</strong>
                    </td>
                    <td>{c.phone}</td>
                    <td>{c.company || '-'}</td>
                    <td>
                      <span className="badge badge-green">{c.tags}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleEdit(c)}
                          style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer' }}
                          title="Edit Contact"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                          title="Delete Contact"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                    No contacts match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
