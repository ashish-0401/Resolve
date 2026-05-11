import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Group } from '../api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { GlowCard } from '@/components/ui/glow-card';
import { ProfileMenu } from '@/components/ProfileMenu';
import { motion } from 'framer-motion';
import { Plus, ChevronRight, Mountain } from 'lucide-react';

export function GroupsPage() {
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
    <div className="max-w-md mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between py-5">
        <TextShimmer className="text-xl font-black">RESOLVE</TextShimmer>
        <ProfileMenu />
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Your Trips</h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-5">
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={handleCreate} className="flex gap-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Trip name..."
                  autoFocus
                />
                <Button type="submit" disabled={creating} className="shrink-0">
                  {creating ? '...' : 'Create'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Groups list */}
      {loading ? (
        <div className="text-center pt-12 text-zinc-500">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="text-center pt-16">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Mountain className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-300 font-semibold">No trips yet</p>
            <p className="text-zinc-500 text-sm mt-1">Create a group to start splitting expenses</p>
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g, i) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="no-underline">
              <GlowCard delay={i * 0.05} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Mountain className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-[15px] text-zinc-100">{g.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </GlowCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
