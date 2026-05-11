import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User } from 'lucide-react';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-violet-500/30"
      >
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-violet-500/20 text-violet-300 text-sm font-bold">
            {user.firstName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-56 rounded-xl border border-zinc-800/60 bg-zinc-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-zinc-800/60">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-violet-500/20 text-violet-300 font-bold">
                    {user.firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-zinc-100 truncate">{user.firstName}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-zinc-500" />
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
