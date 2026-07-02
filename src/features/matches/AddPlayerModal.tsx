import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { type Player } from '../../types';
import { MANUAL_PLAYER_ID_PREFIX } from '../players/playerUtils';

export const AddPlayerModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (p: Player) => void }) => {
  const [name, setName] = useState('');
  const [modalBottomOffset, setModalBottomOffset] = useState(24);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateModalOffset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setModalBottomOffset((current) => current === 24 ? current : 24);
        return;
      }
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      const nextOffset = Math.max(24, keyboardHeight + 18);
      setModalBottomOffset((current) => current === nextOffset ? current : nextOffset);
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
    const trimmedName = name.trim();
    if (!trimmedName) return;

    nameInputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    const initials = trimmedName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newPlayer: Player = {
      id: `${MANUAL_PLAYER_ID_PREFIX}${Math.random().toString(36).slice(2, 11)}`,
      name: trimmedName,
      rating: 0,
      source: 'manual',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };

    onClose();
    onAdd(newPlayer);
    setName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center px-0 pt-4 sm:items-center sm:px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/38 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 310 }}
        className="relative w-full max-w-md overflow-hidden rounded-t-[28px] bg-white shadow-[0_-18px_52px_rgba(15,23,42,0.22)] sm:rounded-[28px]"
        style={{ marginBottom: Math.max(0, modalBottomOffset - 18) }}
      >
        <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-ios-gray/20" />
        <div className="px-6 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[21px] font-display font-bold leading-none tracking-[-0.03em] text-on-surface">Add player</h3>
              <p className="mt-1.5 text-[12px] font-semibold leading-none text-ios-gray">Manual player for this match.</p>
            </div>
            <button onClick={onClose} className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray/10">
              <X size={18} className="text-on-surface" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div>
                <label className="block text-[10px] font-black uppercase leading-none tracking-[0.15em] text-ios-gray/72">Full Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Example: Falih Hermon"
                  className="mt-3 h-12 w-full rounded-[14px] border border-ios-gray/16 bg-ios-gray/[0.035] px-4 text-[16px] font-extrabold text-on-surface outline-none transition-colors focus:border-primary focus:bg-white"
                  required
                />
            </div>

            <button
              type="submit"
              className="tap-target mt-5 h-11 w-full rounded-[14px] bg-primary text-[14px] font-extrabold text-white shadow-[0_8px_18px_rgba(230,94,20,0.18)]"
            >
              Save player
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
