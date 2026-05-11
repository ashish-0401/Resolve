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
        <h1>RESOLVE</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.firstName}</span>
          <button className="btn-secondary" onClick={logout} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
            Logout
          </button>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Your Groups</h2>
          <button
            className="btn btn-primary"
            style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
            onClick={() => setShowCreate(!showCreate)}
          >
            + New Group
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="card" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name (e.g. Barcelona Trip)"
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={creating} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
              {creating ? '...' : 'Create'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="spinner">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize: '32px' }}>👥</p>
            <p>No groups yet. Create one to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {groups.map((g) => (
              <Link key={g.id} to={`/groups/${g.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-dim)' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
