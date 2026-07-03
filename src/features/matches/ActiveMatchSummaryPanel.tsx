import { AlertTriangle, ChevronDown, Lock, Share2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat } from '../../types';
import { AppLogo } from '../../components/app/AppLogo';
import { formatElapsedForStat } from './matchTimeUtils';

type StatsSyncBadge = {
  tone: string;
  title: string;
  message: string;
} | null;

export const ActiveMatchSummaryPanel = ({
  isSharedViewer,
  statsSyncBadge,
  infoShadowClass,
  matchName,
  locationDateLabel,
  totalElapsed,
  format,
  totalPlayerCount,
  completedRounds,
  totalRounds,
  isReadOnly,
  needsRegenerateFromRound,
  onOpenSettings,
  onShareMatch,
}: {
  isSharedViewer: boolean;
  statsSyncBadge: StatsSyncBadge;
  infoShadowClass: string;
  navIconClass: string;
  navBorderClass: string;
  matchName: string;
  locationDateLabel: string;
  totalElapsed: string;
  format: MatchFormat;
  activePlayerCount: number;
  totalPlayerCount: number;
  courts: number;
  completedRounds: number;
  totalRounds: number;
  isReadOnly: boolean;
  needsRegenerateFromRound: number | null;
  onOpenFomPlay: () => void;
  onOpenSettings: () => void;
  onOpenStandings: () => void;
  onShareMatch: () => void;
}) => (
  (() => {
    const currentRoundLabel = totalRounds > 0
      ? Math.min(totalRounds, completedRounds + (completedRounds < totalRounds ? 1 : 0))
      : completedRounds;
    const progressPercent = totalRounds > 0 ? Math.min(100, Math.round((currentRoundLabel / totalRounds) * 100)) : 0;
    const statusLabel = completedRounds >= totalRounds && totalRounds > 0 ? 'Ended' : 'Live';
    const metaParts = locationDateLabel
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);
    const datePart = metaParts.length > 0 ? metaParts[metaParts.length - 1] : '';
    const placeParts = metaParts.slice(0, -1);
    const detailLineOne = [
      ...placeParts,
      datePart,
    ].filter(Boolean);
    const totalElapsedStat = totalElapsed && totalElapsed !== '00:00'
      ? formatElapsedForStat(totalElapsed)
      : '';
    const detailLineTwo = [
      format,
      totalPlayerCount > 0 ? `${totalPlayerCount} players` : '',
      statusLabel === 'Ended'
        ? `${totalRounds} rounds`
        : `Round ${currentRoundLabel}/${totalRounds || 0}`,
      totalElapsedStat,
    ].filter(Boolean);

    return (
  <>
    {/* Owner's finished/saved match tidak lagi menampilkan chip read-only;
        hanya guest lewat share link yang perlu tahu halaman ini view-only. */}
    {isSharedViewer && (
      <section className="rounded-[18px] border border-black/[0.06] bg-ios-gray/[0.035] px-3.5 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ios-gray shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]">
            <Lock size={15} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase leading-none tracking-[0.14em] text-on-surface/72">
              Read-only shared match
            </p>
            <p className="mt-1 text-[11.5px] font-semibold leading-snug text-on-surface/52">
              Host controls are off. Scores update from the match link.
            </p>
          </div>
        </div>
      </section>
    )}

    {statsSyncBadge && (
      <section className="-mt-1">
        <div className={cn('w-full rounded-2xl px-4 py-3 border backdrop-blur-md flex items-start gap-3', statsSyncBadge.tone)}>
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-tight">{statsSyncBadge.title}</p>
            <p className="mt-1 text-[12px] leading-snug font-medium">
              {statsSyncBadge.message}
            </p>
          </div>
        </div>
      </section>
    )}

    <section
      className={cn(
        'relative standings-summary-section rounded-[18px] transition-colors',
        !isReadOnly && 'cursor-pointer active:bg-black/[0.018]'
      )}
      role={!isReadOnly ? 'button' : undefined}
      tabIndex={!isReadOnly ? 0 : undefined}
      aria-label={!isReadOnly ? 'Open manage match' : undefined}
      onClick={!isReadOnly ? onOpenSettings : undefined}
      onKeyDown={!isReadOnly ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenSettings();
        }
      } : undefined}
    >
      <h2 className="sr-only">Match summary</h2>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-1.5 rounded-full border-0 bg-transparent p-0">
          <AppLogo className="standings-header-logo h-5 w-[26px] shrink-0" />
          <span className="font-display text-[16px] font-extrabold leading-none text-on-surface">
            FOM<span className="text-primary">Play</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShareMatch();
            }}
            className="tap-target inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/[0.08] text-primary"
            aria-label="Share match"
          >
            <Share2 size={15} strokeWidth={2.2} />
          </button>
          <span
            className={cn(
              'mt-0.5 inline-flex h-[23px] shrink-0 items-center justify-center rounded-full px-2.5 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em]',
              statusLabel === 'Live'
                ? 'bg-[#E65E14] text-white'
                : 'bg-[#111111] text-white'
            )}
          >
            {statusLabel === 'Live' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />}
            <span>{statusLabel}</span>
          </span>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <h1 className="min-w-0 truncate text-[22px] font-display font-bold leading-[1.16] tracking-[-0.028em] text-on-surface">
          {matchName || '-'}
        </h1>
        {!isReadOnly && (
          <span className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-black/[0.045] pl-2 pr-1.5 text-ios-gray/80" aria-hidden="true">
            <span className="text-[9px] font-black uppercase leading-none tracking-[0.1em]">Manage</span>
            <ChevronDown size={12} strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-0.5 text-[9.5px] font-extrabold uppercase leading-[1.5] tracking-[0.12em] text-ios-gray/68">
        {detailLineOne.length > 0 && <p>{detailLineOne.join(' · ')}</p>}
        {detailLineTwo.length > 0 && <p>{detailLineTwo.join(' · ')}</p>}
      </div>

      <div className="mt-4.5 h-1 overflow-hidden rounded-full bg-black/[0.045]">
        <div
          className="h-full rounded-full bg-[#E65E14]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </section>

    {!isReadOnly && needsRegenerateFromRound !== null && (
      <section className="-mt-2">
        <div className="w-full rounded-2xl px-4 py-3 border border-amber-200 bg-amber-50/95 backdrop-blur-md flex items-center gap-3">
          <div className="min-w-0 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] leading-snug text-amber-900 font-medium">
              Older round scores changed. Open the action menu and regenerate from round {needsRegenerateFromRound}+.
            </p>
          </div>
        </div>
      </section>
    )}
  </>
    );
  })()
);
