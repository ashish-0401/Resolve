import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Group } from '../api';
import { useAuth } from '../context/AuthContext';

export function GroupsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.getGroups().then(({ groups }) => {
      setGroups(groups);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { group } = await api.createGroup(newName.trim());
      setGroups((prev) => [{ ...group, memberCount: 1 }, ...prev]);
      setNewName('');
      setShowCreate(false);
      navigate(`/groups/${group.id}`);
    } catch {
      // handle error
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="header">
        <h1 style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          RESOLVE
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="avatar"
            style={{ width: '32px', height: '32px', fontSize: '13px', background: 'var(--primary-glow)', color: 'var(--primary)' }}
          >
            {user?.firstName?.charAt(0)}
          </div>
          <button
            className="btn-secondary"
            onClick={logout}
            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>Your Groups</h2>
          <button
            className="btn btn-primary"
            style={{ width: 'auto', padding: '10px 18px', fontSize: '13px' }}
            onClick={() => setShowCreate(!showCreate)}
          >
            + New
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="card animate-in"
            style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}
          >
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Trip name..."
              autoFocus
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={creating}
              style={{ width: 'auto', whiteSpace: 'nowrap', padding: '14px 20px' }}
            >
              {creating ? '...' : 'Create'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="spinner">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize: '48px' }}>🏔️</p>
            <p style={{ fontSize: '15px', fontWeight: 500, marginTop: '12px' }}>No trips yet</p>
            <p style={{ color: 'var(--text-dim)' }}>Create a group to start splitting expenses</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {groups.map((g, i) => (
              <Link key={g.id} to={`/groups/${g.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', animationDelay: `${i * 60}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'var(--primary-glow)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      🏔️
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{g.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '16px' }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
