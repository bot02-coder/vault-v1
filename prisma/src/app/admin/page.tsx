'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [form, setForm] = useState({ name: '', description: '', tags: '', coverUrl: '', destUrl: '', adminPass: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/admin/save', {
      method: 'POST',
      body: JSON.stringify({ ...form, tags: form.tags.split(',') }),
    });
    setLoading(false);
    if (res.ok) alert('Successfully Posted to @hi0anime!');
    else alert('Error: Check your password or Bot settings.');
  };

  return (
    <div style={{backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '40px', fontFamily: 'sans-serif'}}>
      <div style={{maxWidth: '500px', margin: '0 auto', border: '1px solid #333', padding: '20px', borderRadius: '10px'}}>
        <h1 style={{fontSize: '24px', marginBottom: '20px'}}>Manga Post Panel</h1>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
          <input style={{padding: '10px', background: '#111', border: '1px solid #444', color: '#fff'}} placeholder="Manga Title" onChange={e => setForm({...form, name: e.target.value})} required />
          <textarea style={{padding: '10px', background: '#111', border: '1px solid #444', color: '#fff', height: '100px'}} placeholder="Short Summary" onChange={e => setForm({...form, description: e.target.value})} required />
          <input style={{padding: '10px', background: '#111', border: '1px solid #444', color: '#fff'}} placeholder="Tags (fantasy, romance, etc)" onChange={e => setForm({...form, tags: e.target.value})} required />
          <input style={{padding: '10px', background: '#111', border: '1px solid #444', color: '#fff'}} placeholder="Cover Image Link" onChange={e => setForm({...form, coverUrl: e.target.value})} required />
          <input style={{padding: '10px', background: '#111', border: '1px solid #444', color: '#fff'}} placeholder="Final Manga Link (Telegraph)" onChange={e => setForm({...form, destUrl: e.target.value})} required />
          <input type="password" style={{padding: '10px', background: '#111', border: '1px solid #444', color: '#fff'}} placeholder="Admin Password" onChange={e => setForm({...form, adminPass: e.target.value})} required />
          <button type="submit" disabled={loading} style={{padding: '15px', background: '#fff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}>
            {loading ? 'Sending to Telegram...' : 'POST TO CHANNEL'}
          </button>
        </form>
      </div>
    </div>
  );
}
