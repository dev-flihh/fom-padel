import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { type Player } from '../../types';
import { MANUAL_PLAYER_ID_PREFIX } from '../players/playerUtils';

export const AddPlayerModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (p: Player) => void }) => {
  const [name, setName] = useState('');
  const [modalBottomOffset, setModalBottomOffset] = useState(24);

  useEffect(() => {
    if (!isOpen) return;

    const updateModalOffset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setModalBottomOffset(24);
        return;
      }
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setModalBottomOffset(Math.max(24, keyboardHeight + 18));
    };

    updateModalOffset();
    window.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('scroll', updateModalOffset);
    return () => {
      window.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('scroll', updateModalOffset);
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newPlayer: Player = {
      id: `${MANUAL_PLAYER_ID_PREFIX}${Math.random().toString(36).slice(2, 11)}`,
      name,
      rating: 0,
      source: 'manual',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };

    // Close first so UX feels instant on mobile, even if parent state updates right after.
    onClose();
    onAdd(newPlayer);
    setName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
        style={{ marginBottom: modalBottomOffset }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold tracking-tight">Add New Player</h3>
            <button onClick={onClose} className="p-2 bg-ios-gray/10 rounded-full tap-target">
              <X size={20} className="text-on-surface" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ios-gray px-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Example: Falih Hermon"
                  className="w-full h-14 bg-ios-gray/5 border border-ios-gray/10 rounded-2xl px-4 font-semibold focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 tap-target mt-4"
            >
              Save Player
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
