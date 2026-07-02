import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatMmrDelta, type MMRSessionHistoryGroup } from './mmrHistoryUtils';
import { formatDisplayMmr } from './rankUtils';

export const MMRSessionHistoryCard = ({ session, defaultOpen = false }: { session: MMRSessionHistoryGroup; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-[20px] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.07)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-[18px] py-[15px] text-left active:bg-[#f2f2f5]"
      >
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-[#fff6ef] text-primary" aria-hidden="true">
          <Activity size={18} strokeWidth={2.6} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-[#111827]">{session.name}</p>
          <p className="mt-0.5 text-[12px] text-[#9ca3af]">{session.items.length} matches · {session.date}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-[18px] font-black leading-none tracking-tight tabular-nums', session.net >= 0 ? 'text-[#18a486]' : 'text-[#ef4444]')}>
            {formatMmrDelta(session.net)}
          </p>
          <div className="mt-1 flex justify-end gap-1">
            <span className="rounded-full bg-[#f0fdf9] px-2 py-0.5 text-[10px] font-bold text-[#18a486]">{session.wins}W</span>
            <span className="rounded-full bg-[#fff5f5] px-2 py-0.5 text-[10px] font-bold text-[#ef4444]">{session.losses}L</span>
            {session.draws > 0 && (
              <span className="rounded-full bg-[#fff6ef] px-2 py-0.5 text-[10px] font-bold text-primary">{session.draws}D</span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className={cn('shrink-0 text-[#9ca3af] transition-transform duration-300', open ? 'rotate-90' : '')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-[18px] h-px bg-black/5" />
            {session.items.map((entry) => {
              const delta = Number(entry.deltaMmr || 0);
              const isPositive = delta >= 0;
              const result = entry.result === 'loss' ? 'loss' : entry.result === 'draw' ? 'draw' : 'win';
              const resultTone = result === 'win'
                ? 'bg-[#f0fdf9] text-[#18a486]'
                : result === 'draw'
                  ? 'bg-[#fff6ef] text-primary'
                  : 'bg-[#fff5f5] text-[#ef4444]';
              const scoreLabel = Number.isFinite(Number(entry.scoreFor)) && Number.isFinite(Number(entry.scoreAgainst))
                ? `${Number(entry.scoreFor)}-${Number(entry.scoreAgainst)}`
                : 'No score';
              const mmrBefore = Number(entry.mmrBefore);
              const mmrAfter = Number(entry.mmrAfter);
              const hasMmrSnapshot = Number.isFinite(mmrBefore) && Number.isFinite(mmrAfter);
              const typeLabel = entry.modifierLabel
                ? `${entry.baseReasonLabel || entry.reasonLabel || 'Standard'} · ${entry.modifierLabel}`
                : entry.reasonLabel || entry.baseReasonLabel || 'Standard';

              return (
                <div key={entry.id} className="flex items-start gap-3 border-b border-black/[0.04] px-[18px] py-3.5 last:border-b-0">
                  <div className={cn(
                    'flex w-11 shrink-0 flex-col items-center justify-center rounded-[10px] border px-1 py-2',
                    isPositive ? 'border-[#18a486]/15 bg-[#f0fdf9]' : 'border-[#ef4444]/15 bg-[#fff5f5]'
                  )}>
                    <p className={cn('text-[15px] font-black leading-none tracking-tight tabular-nums', isPositive ? 'text-[#18a486]' : 'text-[#ef4444]')}>
                      {formatMmrDelta(delta)}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold tracking-[0.04em] text-[#9ca3af]">MMR</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[18px] font-black leading-none tracking-tight text-[#111827] tabular-nums">{scoreLabel}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.02em]',
                        resultTone
                      )}>
                        {result === 'win' ? 'Win' : result === 'draw' ? 'Draw' : 'Loss'}
                      </span>
                    </div>
                    <p className="mb-1 text-[12px] font-semibold leading-snug text-[#374151]">
                      {entry.teamSummary || 'Your team'} <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#9ca3af]">vs</span> {entry.opponentSummary || 'Opponent'}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('min-w-0 truncate text-[11px] font-medium text-[#9ca3af]', entry.modifierLabel && 'text-primary')}>
                        {typeLabel}
                      </p>
                      {hasMmrSnapshot && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#f2f2f5] px-2 py-0.5 text-[10px] font-bold text-[#6b7280]">
                          {formatDisplayMmr(mmrBefore)} <span className="text-[9px] text-[#9ca3af]">→</span> {formatDisplayMmr(mmrAfter)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
