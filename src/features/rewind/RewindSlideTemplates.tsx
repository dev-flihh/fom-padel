import { Fragment, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { RewindPlayerRef, RewindSlide } from './rewindData';

// FOM Rewind slide templates — mockup v2 design system.
// Rendered at 360×640 in the DOM, exported at 1080×1920 (3× canvas) via the
// existing html-to-image pipeline. One layout system for every slide:
// eyebrow on top, content centered, consistent brand footer (logo + link).

// New brand logotypes (whitespace-trimmed): "dark" = for dark backgrounds
// (white FOM + orange Play), "light" = for light backgrounds (navy FOM + orange Play).
const LOGO_ON_DARK = '/assets/fom-play-logo-dark-cropped.png';
const LOGO_ON_LIGHT = '/assets/fom-play-logo-light-cropped.png';

const formatDiff = (value: number) => (value > 0 ? `+${value}` : String(value));

const diffColorDark = (value: number) => (value > 0 ? 'text-[#1FB65A]' : value < 0 ? 'text-[#FF6B66]' : 'text-white/60');
const diffColorLight = (value: number) => (value > 0 ? 'text-[#1E8E3E]' : value < 0 ? 'text-[#E5484D]' : 'text-ios-gray');

const Avatar = ({ player, size, className, gold }: { player: RewindPlayerRef; size: number; className?: string; gold?: boolean }) => (
  <div
    className={cn(
      'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black text-white',
      gold ? 'bg-[linear-gradient(135deg,#E8C45A,#B7861F)] text-[#16110a]' : 'bg-[#E65E14]',
      className,
    )}
    style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
  >
    {player.avatar ? (
      <img className="h-full w-full object-cover" src={player.avatar} alt="" referrerPolicy="no-referrer" />
    ) : (
      <span>{player.initials}</span>
    )}
  </div>
);

const Footer = ({ light, shortLink }: { light?: boolean; shortLink: string }) => (
  <div className="relative flex shrink-0 items-center justify-between">
    <img src={light ? LOGO_ON_LIGHT : LOGO_ON_DARK} alt="FOM Play" className="h-[21px] w-auto object-contain" />
    <span className={cn('text-[10.5px] font-bold', light ? 'text-ios-gray/70' : 'text-white/50')}>{shortLink}</span>
  </div>
);

const Eyebrow = ({ children, gold }: { children: ReactNode; gold?: boolean }) => (
  <p className={cn('relative text-[12px] font-black uppercase leading-none tracking-[0.24em]', gold ? 'text-[#E8C45A]' : 'text-[#E65E14]')}>
    {children}
  </p>
);

const Headline = ({ children, gold }: { children: ReactNode; gold?: boolean }) => (
  <h2 className={cn('relative mt-2.5 text-[21px] font-extrabold leading-[1.2] tracking-[-0.02em]', gold ? 'text-[#F3E3B5]' : 'text-white')}>
    {children}
  </h2>
);

const OrbAndConfetti = ({ gold, strong }: { gold?: boolean; strong?: boolean }) => (
  <>
    <div
      className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 rounded-full"
      style={{
        width: 264,
        height: 264,
        background: gold ? 'rgba(183,134,31,0.26)' : `rgba(230,94,20,${strong ? 0.28 : 0.2})`,
        filter: 'blur(56px)',
      }}
    />
    <div className={cn('pointer-events-none absolute left-[13%] top-[15%] h-[12px] w-[6px] rounded-[2px] rotate-[24deg]', gold ? 'bg-[#E8C45A]' : 'bg-[#E65E14]')} />
    <div className={cn('pointer-events-none absolute right-[14%] top-[22%] h-[12px] w-[6px] rounded-[2px] -rotate-[28deg]', gold ? 'bg-[#B7861F]' : 'bg-[#E8C45A]')} />
    <div className="pointer-events-none absolute left-[23%] top-[46%] h-[10px] w-[5px] rounded-[2px] rotate-[52deg] bg-white/50" />
    <div className={cn('pointer-events-none absolute right-[21%] top-[12%] h-[10px] w-[5px] rounded-[2px] -rotate-[40deg]', gold ? 'bg-[#F3E3B5]/60' : 'bg-[#FF7A33]')} />
  </>
);

const StatStrip = ({ items, gold }: { gold?: boolean; items: Array<{ label: string; value: string; className?: string }> }) => (
  <div className={cn('mt-6 flex w-full border-y py-4', gold ? 'border-[#E8C45A]/25' : 'border-white/15')}>
    {items.map((item, index) => (
      <div key={item.label} className={cn('flex-1', index > 0 && 'pl-4', index < items.length - 1 && cn('border-r', gold ? 'border-[#E8C45A]/25' : 'border-white/15'))}>
        <p className={cn('text-[8.5px] font-black uppercase leading-none tracking-[0.18em]', gold ? 'text-[#E8C45A]/55' : 'text-white/40')}>{item.label}</p>
        <p className={cn('mt-1.5 text-[22px] font-extrabold leading-none tabular-nums', item.className || (gold ? 'text-[#F3E3B5]' : 'text-white'))}>{item.value}</p>
      </div>
    ))}
  </div>
);

const Disclaimer = () => (
  <p className="relative pb-2 text-center text-[9px] text-white/35">
    All roasts are about this match only. Jangan baper, ya.
  </p>
);

// ---------------------------------------------------------------------------
// Per-slide renders
// ---------------------------------------------------------------------------

const CoverSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'cover' }> }) => (
  <div className="relative h-full w-full overflow-hidden bg-[#111111]">
    {slide.photoUrl ? (
      <img src={slide.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_75%_-10%,rgba(230,94,20,0.4),rgba(230,94,20,0)_60%),linear-gradient(180deg,#1a1410,#111111)]" />
    )}
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.05)_32%,rgba(0,0,0,0.84)_100%)]" />
    <div className="absolute left-7 right-7 top-6 flex items-center justify-between">
      <img src={LOGO_ON_DARK} alt="FOM Play" className="h-[21px] w-auto object-contain" />
      {slide.durationLabel && (
        <span className="rotate-[4deg] rounded-full bg-[#E65E14] px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white">
          {slide.durationLabel} nonstop
        </span>
      )}
    </div>
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-7">
      <p className="text-[11.5px] font-black uppercase leading-none tracking-[0.24em] text-[#FF7A33]">
        FOM Rewind{slide.dateLabel ? ` · ${slide.dateLabel}` : ''}
      </p>
      <h1 className="text-[34px] font-extrabold leading-[1.02] tracking-[-0.02em] text-white">{slide.matchName}</h1>
      {slide.subline && <p className="text-[14.5px] font-semibold leading-[1.45] text-white/85">{slide.subline}</p>}
      <div className="mt-2 flex border-t border-white/25 pt-3.5">
        {[
          { label: 'Venue', value: slide.venue || '—' },
          { label: 'Format', value: slide.format || '—' },
          { label: 'Players', value: String(slide.playerCount) },
        ].map((item, index) => (
          <div key={item.label} className={cn('flex-1', index > 0 && 'pl-3.5', index < 2 && 'border-r border-white/25')}>
            <p className="text-[8px] font-black uppercase leading-none tracking-[0.16em] text-white/55">{item.label}</p>
            <p className="mt-1 truncate text-[12.5px] font-bold leading-tight text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NumbersSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'numbers' }> }) => {
  const wideStats = slide.stats.filter((stat) => stat.wide);
  const smallStats = slide.stats.filter((stat) => !stat.wide);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#111111] p-7">
      <div className="pointer-events-none absolute -right-12 -top-12 h-[216px] w-[216px] rounded-full bg-[rgba(230,94,20,0.18)]" style={{ filter: 'blur(48px)' }} />
      <div className="pointer-events-none absolute left-[18%] top-[24%] h-[11px] w-[6px] rotate-[24deg] rounded-[2px] bg-[#E65E14]" />
      <div className="pointer-events-none absolute right-[14%] top-[38%] h-[11px] w-[6px] -rotate-[18deg] rounded-[2px] bg-[#E8C45A]" />
      <div className="pointer-events-none absolute left-[10%] top-[58%] h-[10px] w-[5px] rotate-[40deg] rounded-[2px] bg-white/50" />
      <Eyebrow>The Numbers</Eyebrow>
      <Headline>{slide.headline}</Headline>
      <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-4">
        {wideStats[0] && (
          <div className="border-b border-white/10 pb-3.5">
            <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-white/40">{wideStats[0].label}</p>
            <div className="flex items-baseline gap-3">
              <p className="text-[60px] font-extrabold leading-[1.05] tracking-[-0.03em] tabular-nums text-white">{wideStats[0].value}</p>
              {wideStats[0].kicker && <p className="min-w-0 text-[11.5px] font-semibold leading-snug text-white/50">{wideStats[0].kicker}</p>}
            </div>
          </div>
        )}
        {smallStats.length > 0 && (
          <div className="flex gap-5 border-b border-white/10 pb-3.5">
            {smallStats.map((stat) => (
              <div key={stat.key} className="flex-1">
                <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-white/40">{stat.label}</p>
                <p className="mt-1 text-[37px] font-extrabold leading-[1.05] tracking-[-0.03em] tabular-nums text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
        {wideStats.slice(1).map((stat, index, list) => (
          <div key={stat.key} className={cn(index < list.length - 1 && 'border-b border-white/10 pb-3.5')}>
            <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-white/40">{stat.label}</p>
            <div className="flex items-baseline gap-3">
              <p className={cn('mt-1 text-[37px] font-extrabold leading-[1.05] tracking-[-0.03em] tabular-nums', stat.accent ? 'text-[#E65E14]' : 'text-white')}>{stat.value}</p>
              {stat.kicker && <p className="min-w-0 text-[11.5px] font-semibold leading-snug text-white/50">{stat.kicker}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PodiumSlide = ({ slide, gold }: { slide: Extract<RewindSlide, { type: 'podium' | 'podium-cupu' }>; gold?: boolean }) => {
  const [first, second, third] = slide.players;
  const bar = (player: (typeof slide.players)[number] | undefined, order: 0 | 1 | 2) => {
    if (!player) return null;
    const isKing = order === 0;
    const barHeight = order === 0 ? 158 : order === 1 ? 115 : 82;
    return (
      <div className={cn('flex flex-col items-center gap-2.5', isKing ? 'flex-[1.1]' : 'flex-1')}>
        <div className="relative">
          <Avatar player={player} size={isKing ? 72 : 58} gold={gold && isKing} className={cn(!gold && isKing && 'border-[3px] border-[#E65E14] bg-[#101010]', !isKing && 'border-2 border-white/25 bg-white/15')} />
          {isKing && <span className="absolute -top-5 left-1/2 -translate-x-1/2 -rotate-[8deg] text-[24px]">👑</span>}
        </div>
        <div className="text-center">
          <p className={cn('max-w-[104px] truncate text-[14px] font-extrabold', gold ? 'text-[#F3E3B5]' : 'text-white')}>{player.name.split(' ')[0] || player.name}</p>
          <p className={cn('mt-0.5 text-[10.5px] font-bold tabular-nums', isKing ? (gold ? 'text-[#E5484D]' : 'text-[#FF9A66]') : gold ? 'text-[#E8C45A]/60' : 'text-white/50')}>
            {player.pts} PTS · {formatDiff(player.diff)}
          </p>
        </div>
        <div
          className={cn(
            'flex w-full items-start justify-center rounded-t-[14px] pt-2.5 font-extrabold tabular-nums',
            isKing
              ? gold
                ? 'bg-[linear-gradient(180deg,#E8C45A,#B7861F)] text-[26px] text-[#16110a]/75'
                : 'bg-[#E65E14] text-[30px] text-white/85'
              : gold
                ? 'border border-b-0 border-[#E8C45A]/20 bg-[#E8C45A]/10 text-[26px] text-[#E8C45A]/45'
                : 'bg-white/[0.08] text-[26px] text-white/35',
          )}
          style={{ height: barHeight }}
        >
          {String(player.rank).padStart(2, '0')}
        </div>
      </div>
    );
  };
  return (
    <div className={cn('relative flex h-full w-full flex-col overflow-hidden p-7', gold ? 'bg-[linear-gradient(180deg,#16110a_0%,#111111_60%)]' : 'bg-[#111111]')}>
      <OrbAndConfetti gold={gold} />
      <Eyebrow gold={gold}>{gold ? 'Podium Cupu' : 'The Podium'}</Eyebrow>
      <Headline gold={gold}>{slide.headline}</Headline>
      <div className="relative flex min-h-0 flex-1 items-end gap-2.5 pb-4">
        {bar(second, 1)}
        {bar(first, 0)}
        {bar(third, 2)}
      </div>
      {slide.type === 'podium-cupu' && slide.subline && (
        <p className="relative pb-3 text-center text-[11.5px] italic text-[#F3E3B5]/60">{slide.subline}</p>
      )}
      {slide.type === 'podium' && slide.subline && (
        <p className="relative pb-3 text-center text-[11.5px] italic text-white/55">{slide.subline}</p>
      )}
    </div>
  );
};

const ChampionSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'champion' }> }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#111111] p-7">
    <OrbAndConfetti strong />
    <div className="relative flex items-center justify-between">
      <Eyebrow>{slide.headline}</Eyebrow>
      <span className="rounded-full border border-[#E65E14]/40 bg-[#E65E14]/15 px-3 py-1.5 text-[9.5px] font-black tracking-[0.12em] text-[#FF9A66]">
        {slide.rankLabel}
      </span>
    </div>
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <div className="relative flex">
        {slide.players.map((player, index) => (
          <div key={player.id} className={cn('relative', index > 0 && '-ml-7')}>
            <Avatar player={player} size={slide.players.length > 1 ? 108 : 134} className="border-[3px] border-white/30" />
            {index === 0 && <span className="absolute -top-6 right-0 rotate-[16deg] text-[36px]">👑</span>}
          </div>
        ))}
      </div>
      <p className="mt-5 max-w-full px-2 text-[38px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
        {slide.players.map((player) => player.name).join(' & ')}
      </p>
      {slide.quote && (
        <p className="mt-3 max-w-[280px] text-[13.5px] italic leading-[1.45] text-white/65">“{slide.quote}”</p>
      )}
      <StatStrip
        items={[
          { label: 'Record', value: slide.record },
          { label: 'Diff', value: formatDiff(slide.diff), className: diffColorDark(slide.diff) },
          { label: 'Pts', value: String(slide.pts) },
        ]}
      />
    </div>
  </div>
);

const DreamTeamSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'dream-team' }> }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#111111] p-7">
    <OrbAndConfetti />
    <Eyebrow>Dream Team</Eyebrow>
    <Headline>{slide.headline}</Headline>
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <div className="flex">
        {slide.players.map((player, index) => (
          <Fragment key={player.id}><Avatar player={player} size={104} className={cn('border-[3px] border-[#111111]', index > 0 && '-ml-6', index === 0 && 'bg-[#8E8E93]')} /></Fragment>
        ))}
      </div>
      <p className="mt-5 text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white">{slide.pairName}</p>
      {slide.quote && <p className="mt-2 text-[13.5px] italic text-white/65">“{slide.quote}”</p>}
      <StatStrip
        items={[
          { label: 'Main Bareng', value: String(slide.played) },
          { label: 'Menang', value: String(slide.wins), className: 'text-[#E65E14]' },
          { label: 'Diff', value: formatDiff(slide.diff), className: diffColorDark(slide.diff) },
        ]}
      />
    </div>
  </div>
);

const MatchOfTheNightSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'match-of-the-night' }> }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#111111] p-7">
    <div className="pointer-events-none absolute left-1/2 top-[42%] h-[190px] w-[288px] -translate-x-1/2 rounded-full bg-[rgba(230,94,20,0.18)]" style={{ filter: 'blur(56px)' }} />
    <Eyebrow>Match of the Night</Eyebrow>
    <Headline>{slide.headline}</Headline>
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex">
          {slide.teamAPlayers.map((player, index) => (
            <Fragment key={player.id}><Avatar player={player} size={46} className={cn('border-2 border-[#111111]', index > 0 && '-ml-3')} /></Fragment>
          ))}
        </div>
        <p className="text-[16px] font-extrabold text-white">{slide.teamAName}</p>
      </div>
      <div className="flex items-center gap-5">
        <span className="text-[74px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-[#E65E14]">{slide.scoreA}</span>
        <span className="text-[28px] font-extrabold text-white/30">–</span>
        <span className="text-[74px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-white">{slide.scoreB}</span>
      </div>
      <div className="flex flex-col items-center gap-2.5">
        <p className="text-[16px] font-extrabold text-white">{slide.teamBName}</p>
        <div className="flex">
          {slide.teamBPlayers.map((player, index) => (
            <Fragment key={player.id}><Avatar player={player} size={46} className={cn('border-2 border-[#111111] bg-[#8E8E93]', index > 0 && '-ml-3')} /></Fragment>
          ))}
        </div>
      </div>
      {slide.kicker && (
        <span className="rounded-full border border-white/12 bg-white/[0.07] px-5 py-2 text-[11.5px] font-bold text-white/70">
          {slide.kicker}
        </span>
      )}
    </div>
  </div>
);

const PhotosSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'photos' }> }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#111111] p-7">
    <Eyebrow>The Scenes</Eyebrow>
    <Headline>{slide.headline}</Headline>
    <div className="my-4 grid min-h-0 flex-1 grid-cols-2 gap-2.5" style={{ gridTemplateRows: '1.5fr 1fr' }}>
      <div className="relative col-span-2 min-h-0 overflow-hidden rounded-[18px]">
        <img src={slide.photoUrls[0]} alt="" className="block h-full w-full object-cover" />
        {slide.sticker && (
          <span className="absolute bottom-3 left-3 -rotate-2 rounded-full bg-black/55 px-3 py-1.5 text-[9.5px] font-black uppercase tracking-[0.1em] text-white">
            {slide.sticker}
          </span>
        )}
      </div>
      {slide.photoUrls.slice(1, 3).map((url) => (
        <div key={url.slice(-24)} className="min-h-0 overflow-hidden rounded-[18px]">
          <img src={url} alt="" className="block h-full w-full object-cover" />
        </div>
      ))}
    </div>
  </div>
);

const CupuSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'cupu' }> }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#16110a_0%,#111111_55%)] p-7">
    <OrbAndConfetti gold />
    <div className="relative flex items-center justify-between">
      <p className="text-[12px] font-black uppercase leading-none tracking-[0.26em] text-[#E8C45A]">The Cupu D&apos;Or {new Date().getFullYear()}</p>
      <span className="rounded-full border border-[#E8C45A]/35 bg-[#E8C45A]/10 px-3 py-1.5 text-[9.5px] font-black tracking-[0.12em] text-[#E8C45A]">
        {slide.rankLabel}
      </span>
    </div>
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <div className="relative flex">
        {slide.players.map((player, index) => (
          <div key={player.id} className={cn('relative', index > 0 && '-ml-7')}>
            <Avatar player={player} size={slide.players.length > 1 ? 104 : 130} gold className="border-[3px] border-[#E8C45A]/45" />
            {index === 0 && <span className="absolute -top-6 -right-2 rotate-[20deg] text-[38px]">👑</span>}
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-full px-2 font-serif text-[36px] font-bold italic leading-[1.1] tracking-[-0.01em] text-[#F3E3B5] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
        {slide.players.map((player) => player.name).join(' & ')}
      </p>
      <p className="mt-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#E8C45A]/65">{slide.title}</p>
      <StatStrip
        gold
        items={[
          { label: 'Record', value: slide.record },
          { label: 'Diff', value: formatDiff(slide.diff), className: diffColorDark(slide.diff) },
          { label: 'Pts', value: String(slide.pts) },
        ]}
      />
      {slide.quote && (
        <p className="mt-4 max-w-[290px] text-[13.5px] italic leading-[1.5] text-[#F3E3B5]/75">“{slide.quote}”</p>
      )}
      <p className="mt-3 text-[9px] text-white/35">All roasts are about this match only. Jangan baper, ya.</p>
    </div>
  </div>
);

const AwardsSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'awards' }> }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#111111] p-7">
    <div className="pointer-events-none absolute -right-12 -top-9 h-[204px] w-[204px] rounded-full bg-[rgba(183,134,31,0.2)]" style={{ filter: 'blur(52px)' }} />
    <Eyebrow gold>Toxic Awards</Eyebrow>
    <Headline>{slide.headline}</Headline>
    <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-3">
      {slide.awards.map((award) => (
        <div key={award.id} className="rounded-[18px] border border-[#E8C45A]/18 bg-[#E8C45A]/[0.07] px-4 py-3.5">
          <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.16em] text-[#E8C45A]">
            {award.label}{award.emoji ? ` ${award.emoji}` : ''}{award.players.length > 1 ? ' · PAIR' : ''}
          </p>
          <div className="mt-1.5 flex items-center gap-2.5">
            {award.players.length > 1 && (
              <div className="flex">
                {award.players.map((player, index) => (
                  <Fragment key={player.id}><Avatar player={player} size={26} gold={index > 0} className={cn('border-2 border-[#111111]', index > 0 && '-ml-2', index === 0 && 'bg-[#8E8E93]')} /></Fragment>
                ))}
              </div>
            )}
            <p className="truncate text-[17px] font-extrabold text-white">{award.playerNames}</p>
          </div>
          {award.note && <p className="mt-1 text-[11.5px] italic leading-snug text-white/55">{award.note}</p>}
        </div>
      ))}
    </div>
    <Disclaimer />
  </div>
);

const StandingsSlide = ({ slide }: { slide: Extract<RewindSlide, { type: 'standings' }> }) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-white p-7">
    <p className="text-[12px] font-black uppercase leading-none tracking-[0.24em] text-[#E65E14]">Final Standings</p>
    <h2 className="mt-2.5 text-[23px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#101010]">{slide.headline}</h2>
    {slide.metaLabel && <p className="mt-1.5 text-[11.5px] font-semibold text-ios-gray/75">{slide.metaLabel}</p>}
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      {slide.rows.map((row, index) => {
        const isLastRowHighlight = slide.hasGap && index === slide.rows.length - 1;
        return (
          <Fragment key={row.id}>
            {isLastRowHighlight && (
              <p className="py-2 text-center text-[18px] font-extrabold text-[#C5C5CA]">⋯</p>
            )}
            <div
              className={cn(
                'flex items-center gap-3.5 py-4',
                !isLastRowHighlight && index < slide.rows.length - 1 && 'border-b border-black/[0.08]',
                isLastRowHighlight && '-mx-2 rounded-[16px] bg-[linear-gradient(90deg,rgba(232,196,90,0.12),transparent)] px-2',
              )}
            >
              <span className={cn('w-[44px] text-[28px] font-extrabold tabular-nums', row.rank === 1 ? 'text-[#E65E14]' : isLastRowHighlight ? 'text-[#B7861F]' : 'text-[#C5C5CA]')}>
                {String(row.rank).padStart(2, '0')}
              </span>
              <Avatar player={row} size={44} gold={isLastRowHighlight} className={cn(row.rank !== 1 && !isLastRowHighlight && 'bg-[#8E8E93]', row.rank === 1 && 'bg-[#101010]')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16.5px] font-extrabold text-[#101010]">{row.name}</p>
                {row.badge && (
                  <p className={cn('mt-0.5 text-[10px] font-black uppercase tracking-[0.1em]', row.rank === 1 ? 'text-[#E65E14]' : 'text-[#B7861F]')}>
                    {row.badge}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[20px] font-extrabold leading-none tabular-nums text-[#101010]">{row.pts}</p>
                <p className={cn('mt-0.5 text-[11.5px] font-bold tabular-nums', diffColorLight(row.diff))}>{formatDiff(row.diff)}</p>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  </div>
);

const OutroSlide = ({ slide, shortLink, qrDataUrl }: { slide: Extract<RewindSlide, { type: 'outro' }>; shortLink: string; qrDataUrl?: string }) => (
  <div className="relative h-full w-full overflow-hidden bg-[#111111]">
    {slide.photoUrl ? (
      <img src={slide.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_25%_-10%,rgba(230,94,20,0.38),rgba(230,94,20,0)_60%),linear-gradient(180deg,#1a1410,#111111)]" />
    )}
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.15)_28%,rgba(0,0,0,0.9)_100%)]" />
    <div className="absolute left-7 top-6">
      <img src={LOGO_ON_DARK} alt="FOM Play" className="h-[21px] w-auto object-contain" />
    </div>
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-7 text-center">
      <p className="text-[11.5px] font-black uppercase leading-none tracking-[0.24em] text-[#FF7A33]">Sampai Jumpa</p>
      <h2 className="text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white" style={{ textWrap: 'balance' }}>{slide.headline}</h2>
      <p className="text-[12.5px] text-white/70">Hosted with FOM Play — skor live, klasemen otomatis, gratis.</p>
      <div className="mt-1.5 flex items-center gap-3.5 rounded-[18px] border border-white/18 bg-white/10 px-4 py-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR link match" className="h-[52px] w-[52px] shrink-0 rounded-[9px] bg-white" />
        ) : (
          <div className="grid h-[52px] w-[52px] shrink-0 grid-cols-4 grid-rows-4 gap-[2px] rounded-[9px] bg-white p-[6px]">
            {[1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1].map((filled, index) => (
              <div key={index} className={filled ? 'bg-[#101010]' : undefined} />
            ))}
          </div>
        )}
        <div className="text-left">
          <p className="text-[10px] font-black uppercase leading-none tracking-[0.12em] text-white/60">Tonton match-nya</p>
          <p className="mt-1 text-[13.5px] font-bold text-white">{shortLink}</p>
        </div>
      </div>
      <span className="mt-1 rounded-full bg-[#E65E14] px-8 py-3.5 text-[14.5px] font-bold text-white">
        Start your own match — free
      </span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------

export const RewindSlideView = ({ slide, shortLink, qrDataUrl }: { slide: RewindSlide; shortLink: string; qrDataUrl?: string }) => {
  const body = (() => {
    switch (slide.type) {
      case 'cover': return <CoverSlide slide={slide} />;
      case 'numbers': return <NumbersSlide slide={slide} />;
      case 'podium': return <PodiumSlide slide={slide} />;
      case 'podium-cupu': return <PodiumSlide slide={slide} gold />;
      case 'champion': return <ChampionSlide slide={slide} />;
      case 'dream-team': return <DreamTeamSlide slide={slide} />;
      case 'match-of-the-night': return <MatchOfTheNightSlide slide={slide} />;
      case 'photos': return <PhotosSlide slide={slide} />;
      case 'cupu': return <CupuSlide slide={slide} />;
      case 'awards': return <AwardsSlide slide={slide} />;
      case 'standings': return <StandingsSlide slide={slide} />;
      case 'outro': return <OutroSlide slide={slide} shortLink={shortLink} qrDataUrl={qrDataUrl} />;
      default: return null;
    }
  })();

  // Cover & Outro are full-bleed photo slides with their own branding; every
  // other slide gets the consistent brand footer strip (logo + link).
  const hasOwnFooter = slide.type === 'cover' || slide.type === 'outro';
  const isLight = slide.type === 'standings';

  return (
    <div className={cn('relative flex h-full w-full flex-col overflow-hidden', isLight ? 'bg-white' : 'bg-[#111111]')}>
      <div className="min-h-0 flex-1">{body}</div>
      {!hasOwnFooter && (
        <div className="shrink-0 px-7 pb-6">
          <Footer light={isLight} shortLink={shortLink} />
        </div>
      )}
    </div>
  );
};
