'use client';
import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', display_name: '', role: 'student', password: '' });
  const [saving, setSaving] = useState(false);
  const [editPw, setEditPw] = useState<{ id: string; pw: string } | null>(null);

  async function load() {
    const u = await fetch('/api/users').then(r => r.json());
    setUsers(u);
  }
  useEffect(() => { load(); }, []);

  async function createUser() {
    setSaving(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else setNewUser({ email: '', display_name: '', role: 'student', password: '' });
    setSaving(false);
    await load();
  }

  async function toggleActive(u: any) {
    await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, display_name: u.display_name, is_active: !u.is_active }),
    });
    await load();
  }

  async function resetPassword(id: string, pw: string) {
    const user = users.find(u => u.id === id);
    await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, display_name: user.display_name, is_active: user.is_active, password: pw }),
    });
    setEditPw(null);
    await load();
  }

  async function resetProgress(u: any) {
    if (!confirm(`Reset all progress for ${u.display_name}? This will clear their session progress, quiz attempts, and flashcard ratings.`)) return;
    await fetch(`/api/progress?userId=${u.id}`, { method: 'DELETE' });
    await load();
  }

  async function resetAllProgress() {
    const nonAdmins = users.filter(u => u.role !== 'admin');
    if (nonAdmins.length === 0) return;
    if (!confirm(`Reset sessions for ALL ${nonAdmins.length} student(s)? This will clear all session progress, quiz attempts, and flashcard ratings.`)) return;
    await Promise.all(nonAdmins.map(u => fetch(`/api/progress?userId=${u.id}`, { method: 'DELETE' })));
    await load();
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-ink text-paper',
    student: 'bg-cobalt-light text-cobalt',
    test: 'bg-gold/10 text-gold',
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-wider text-gold uppercase mb-1">Admin Panel</p>
        <h1 className="font-serif text-3xl font-bold text-ink">User Management</h1>
      </div>

      {/* Bulk actions */}
      <div className="flex justify-end mb-3">
        <button onClick={resetAllProgress} className="font-mono text-xs text-crimson hover:text-crimson/70 border border-crimson/30 hover:bg-crimson/5 px-3 py-1.5 rounded transition-colors">
          Reset All Sessions
        </button>
      </div>

      {/* Users table */}
      <div className="bg-paper-2 border border-rule rounded-xl overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="bg-ink">
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Name</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Email</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Role</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Status</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-white/60 uppercase tracking-wider font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-t border-rule ${i % 2 === 1 ? 'bg-paper' : ''}`}>
                <td className="px-5 py-3 font-sans text-sm text-ink font-medium">{u.display_name}</td>
                <td className="px-5 py-3 font-mono text-xs text-ink-3">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`font-mono text-xs px-2 py-0.5 rounded uppercase ${roleColors[u.role] || ''}`}>{u.role}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-mono text-xs ${u.is_active ? 'text-sage' : 'text-crimson'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 flex items-center gap-2">
                  <button onClick={() => toggleActive(u)} className="font-mono text-xs text-ink-4 hover:text-ink px-2 py-1 hover:bg-paper-3 rounded">
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setEditPw({ id: u.id, pw: '' })} className="font-mono text-xs text-cobalt hover:text-cobalt/70 px-2 py-1 hover:bg-cobalt-light rounded">
                    Reset PW
                  </button>
                  {u.role !== 'admin' && (
                    <button onClick={() => resetProgress(u)} className="font-mono text-xs text-crimson hover:text-crimson/70 px-2 py-1 hover:bg-crimson/5 rounded">
                      Reset Progress
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset PW modal */}
      {editPw && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4">
          <div className="bg-paper rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-serif text-lg font-semibold text-ink mb-4">Reset Password</h3>
            <input
              type="password"
              placeholder="New password"
              value={editPw.pw}
              onChange={e => setEditPw({ ...editPw, pw: e.target.value })}
              className="w-full px-3 py-2 border border-rule rounded-lg text-sm font-sans focus:outline-none focus:border-gold mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => editPw.pw && resetPassword(editPw.id, editPw.pw)}
                disabled={!editPw.pw}
                className="flex-1 bg-ink text-paper py-2 rounded-lg text-sm font-sans hover:bg-ink-2 transition-colors disabled:opacity-50">
                Save
              </button>
              <button onClick={() => setEditPw(null)} className="flex-1 bg-paper-3 text-ink py-2 rounded-lg text-sm font-sans hover:bg-rule transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add user form */}
      <div className="bg-paper-2 border border-rule rounded-xl p-5">
        <h2 className="font-serif text-lg font-semibold text-ink mb-4">Add New User</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input placeholder="Display name *" value={newUser.display_name}
            onChange={e => setNewUser({ ...newUser, display_name: e.target.value })}
            className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold" />
          <input placeholder="Email *" type="email" value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold" />
          <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold">
            <option value="student">Student</option>
            <option value="test">Test</option>
            <option value="admin">Admin</option>
          </select>
          <input placeholder="Password *" type="password" value={newUser.password}
            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
            className="px-3 py-2 border border-rule rounded-lg bg-paper text-ink text-sm font-sans focus:outline-none focus:border-gold" />
        </div>
        <button onClick={createUser} disabled={!newUser.email || !newUser.display_name || !newUser.password || saving}
          className="px-5 py-2 bg-ink text-paper rounded-lg text-sm font-sans hover:bg-ink-2 transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Create User'}
        </button>
      </div>
    </div>
  );
}
