import { Fragment, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { RewindPlayerRef, RewindRatio, RewindSlide } from './rewindData';

// FOM Rewind slide templates — mockup v2 design system.
// Rendered at 360-wide in the DOM (×640 story / ×480 feed), exported at 3×
// canvas (1080×1920 / 1080×1440) via the existing html-to-image pipeline.
// One layout system for every slide: eyebrow on top, content centered,
// consistent brand footer (logo + link). Rasio 'feed' merender varian
// `compact` — tinggi konten berkurang 160pt, jadi avatar/tipografi/jarak
// vertikal dirapatkan supaya tidak ada konten terpotong.

// New brand logotypes (whitespace-trimmed): "dark" = for dark backgrounds
// (white FOM + orange Play), "light" = for light backgrounds (navy FOM + orange Play).
const LOGO_ON_DARK = '/assets/fom-play-logo-dark-cropped.png';
const LOGO_ON_LIGHT = '/assets/fom-play-logo-light-cropped.png';

const formatDiff = (value: number) => (value > 0 ? `+${value}` : String(value));

const getShortName = (name = '') => name.trim().split(/\s+/)[0] || name;

const diffColorDark = (value: number) => (value > 0 ? 'text-[#1FB65A]' : value < 0 ? 'text-[#FF6B66]' : 'text-white/60');

const Avatar = ({ player, size, className, gold }: { player: RewindPlayerRef; size: number; className?: string; gold?: boolean }) => {
  const renderFace = (avatar: string | undefined, initials: string | undefined, faceSize: number, extraClassName?: string) => (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black text-white',
        gold ? 'bg-[linear-gradient(135deg,#E8C45A,#B7861F)] text-[#16110a]' : 'bg-[#E65E14]',
        className,
        extraClassName,
      )}
      style={{ width: faceSize, height: faceSize, fontSize: Math.round(faceSize * 0.34) }}
    >
      {avatar ? (
        <img className="h-full w-full object-cover" src={avatar} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span>{initials || '?'}</span>
      )}
    </div>
  );
  // Mode fixed: ref tim membawa wajah partner → kedua wajah tampil sejajar
  // dan sama besar (diperkecil supaya pasangan tetap muat di kolom yang sama).
  const hasPartner = Boolean(player.partnerAvatar || player.partnerInitials);
  if (!hasPartner) return renderFace(player.avatar, player.initials, size);
  const pairSize = Math.max(30, Math.round(size * 0.74));
  return (
    <div className="flex shrink-0 items-center -space-x-2">
      {renderFace(player.avatar, player.initials, pairSize)}
      {renderFace(player.partnerAvatar, player.partnerInitials, pairSize, 'ring-2 ring-[#111111]')}
    </div>
  );
};

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

const Headline = ({ children, gold, compact }: { children: ReactNode; gold?: boolean; compact?: boolean }) => (
  <h2 className={cn('relative font-extrabold leading-[1.2] tracking-[-0.02em]', compact ? 'mt-2 text-[19px]' : 'mt-2.5 text-[21px]', gold ? 'text-[#F3E3B5]' : 'text-white')}>
    {children}
  </h2>
);

// Posisi confetti dituning untuk kanvas 640; di kanvas 480 (compact/feed)
// persentase yang sama jatuh tepat di zona headline/konten dan terlihat
// menabrak teks. Compact memindahkan semua kepingan ke gutter padding
// kiri/kanan (x < 24px dari tepi) yang selalu kosong di semua slide.
const OrbAndConfetti = ({ gold, strong, compact }: { gold?: boolean; strong?: boolean; compact?: boolean }) => (
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
    <div className={cn('pointer-events-none absolute h-[12px] w-[6px] rounded-[2px] rotate-[24deg]', compact ? 'left-[10px] top-[34%]' : 'left-[13%] top-[15%]', gold ? 'bg-[#E8C45A]' : 'bg-[#E65E14]')} />
    <div className={cn('pointer-events-none absolute h-[12px] w-[6px] rounded-[2px] -rotate-[28deg]', compact ? 'right-[9px] top-[24%]' : 'right-[14%] top-[22%]', gold ? 'bg-[#B7861F]' : 'bg-[#E8C45A]')} />
    <div className={cn('pointer-events-none absolute h-[10px] w-[5px] rounded-[2px] rotate-[52deg] bg-white/50', compact ? 'left-[12px] top-[58%]' : 'left-[23%] top-[46%]')} />
    <div className={cn('pointer-events-none absolute h-[10px] w-[5px] rounded-[2px] -rotate-[40deg]', compact ? 'right-[11px] top-[50%]' : 'right-[21%] top-[12%]', gold ? 'bg-[#F3E3B5]/60' : 'bg-[#FF7A33]')} />
  </>
);

// Sel di-center supaya Record/Diff/Pts simetris di bawah hero.
const StatStrip = ({ items, gold, compact }: { gold?: boolean; compact?: boolean; items: Array<{ label: string; value: string; className?: string }> }) => (
  <div className={cn('flex w-full border-y', compact ? 'mt-4 py-3' : 'mt-6 py-4', gold ? 'border-[#E8C45A]/25' : 'border-white/15')}>
    {items.map((item, index) => (
      <div key={item.label} className={cn('flex-1 px-2 text-center', index < items.length - 1 && cn('border-r', gold ? 'border-[#E8C45A]/25' : 'border-white/15'))}>
        <p className={cn('text-[8.5px] font-black uppercase leading-none tracking-[0.18em]', gold ? 'text-[#E8C45A]/55' : 'text-white/40')}>{item.label}</p>
        <p className={cn('mt-1.5 font-extrabold leading-none tabular-nums', compact ? 'text-[19px]' : 'text-[22px]', item.className || (gold ? 'text-[#F3E3B5]' : 'text-white'))}>{item.value}</p>
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
    {/* Scrim hanya di area teks: strip atas untuk header, gradient bawah untuk judul+meta. Tengah foto dibiarkan bersih. */}
    <div className="absolute inset-x-0 top-0 h-[96px] bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_100%)]" />
    <div className="absolute left-7 right-7 top-6 flex items-center justify-between">
      <img src={LOGO_ON_DARK} alt="FOM Play" className="h-[21px] w-auto object-contain" />
      {slide.durationLabel && (
        <span className="rotate-[4deg] rounded-full bg-[#E65E14] px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white">
          {slide.durationLabel} nonstop
        </span>
      )}
    </div>
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-7 pb-5 pt-14 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_32%,rgba(0,0,0,0.88)_100%)]">
      <p className="text-[10.5px] font-black uppercase leading-none tracking-[0.24em] text-[#FF7A33]">
        FOM Rewind{slide.dateLabel ? ` · ${slide.dateLabel}` : ''}
      </p>
      <h1 className="text-[27px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white">{slide.matchName}</h1>
      {slide.subline && <p className="text-[12.5px] font-semibold leading-[1.35] text-white/85">{slide.subline}</p>}
      <div className="mt-1.5 flex border-t border-white/25 pt-2.5">
        {[
          { label: 'Venue', value: slide.venue || '—' },
          { label: 'Format', value: slide.format || '—' },
          { label: 'Players', value: String(slide.playerCount) },
        ].map((item, index) => (
          <div key={item.label} className={cn('flex-1', index > 0 && 'pl-3.5', index < 2 && 'border-r border-white/25')}>
            <p className="text-[8px] font-black uppercase leading-none tracking-[0.16em] text-white/55">{item.label}</p>
            <p className="mt-1 truncate text-[11.5px] font-bold leading-tight text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NumbersSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'numbers' }>; compact?: boolean }) => {
  const wideStats = slide.stats.filter((stat) => stat.wide);
  const smallStats = slide.stats.filter((stat) => !stat.wide);
  const rowPad = compact ? 'pb-2.5' : 'pb-3.5';
  const midSize = compact ? 'text-[29px]' : 'text-[37px]';
  return (
    <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[#111111]', compact ? 'p-6' : 'p-7')}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-[216px] w-[216px] rounded-full bg-[rgba(230,94,20,0.18)]" style={{ filter: 'blur(48px)' }} />
      {/* Compact: kepingan pindah ke gutter kanan/kiri — baris stat full-width
          membuat posisi % lama menabrak angka di kanvas 480. */}
      <div className={cn('pointer-events-none absolute h-[11px] w-[6px] rotate-[24deg] rounded-[2px] bg-[#E65E14]', compact ? 'right-[9px] top-[28%]' : 'left-[18%] top-[24%]')} />
      <div className={cn('pointer-events-none absolute h-[11px] w-[6px] -rotate-[18deg] rounded-[2px] bg-[#E8C45A]', compact ? 'right-[11px] top-[52%]' : 'right-[14%] top-[38%]')} />
      <div className={cn('pointer-events-none absolute h-[10px] w-[5px] rotate-[40deg] rounded-[2px] bg-white/50', compact ? 'left-[9px] top-[68%]' : 'left-[10%] top-[58%]')} />
      <Eyebrow>The Numbers</Eyebrow>
      <Headline compact={compact}>{slide.headline}</Headline>
      <div className={cn('relative flex min-h-0 flex-1 flex-col justify-center', compact ? 'gap-2.5' : 'gap-4')}>
        {wideStats[0] && (
          <div className={cn('border-b border-white/10', rowPad)}>
            <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-white/40">{wideStats[0].label}</p>
            <div className="flex items-baseline gap-3">
              <p className={cn('font-extrabold leading-[1.05] tracking-[-0.03em] tabular-nums text-white', compact ? 'text-[46px]' : 'text-[60px]')}>{wideStats[0].value}</p>
              {wideStats[0].kicker && <p className="min-w-0 text-[11.5px] font-semibold leading-snug text-white/50">{wideStats[0].kicker}</p>}
            </div>
          </div>
        )}
        {smallStats.length > 0 && (
          <div className={cn('flex gap-5 border-b border-white/10', rowPad)}>
            {smallStats.map((stat) => (
              <div key={stat.key} className="flex-1">
                <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-white/40">{stat.label}</p>
                <p className={cn('mt-1 font-extrabold leading-[1.05] tracking-[-0.03em] tabular-nums text-white', midSize)}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}
        {wideStats.slice(1).map((stat, index, list) => (
          <div key={stat.key} className={cn(index < list.length - 1 && cn('border-b border-white/10', rowPad))}>
            <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-white/40">{stat.label}</p>
            <div className="flex items-baseline gap-3">
              <p className={cn('mt-1 font-extrabold leading-[1.05] tracking-[-0.03em] tabular-nums', midSize, stat.accent ? 'text-[#E65E14]' : 'text-white')}>{stat.value}</p>
              {stat.kicker && <p className="min-w-0 text-[11.5px] font-semibold leading-snug text-white/50">{stat.kicker}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PodiumSlide = ({ slide, gold, compact }: { slide: Extract<RewindSlide, { type: 'podium' | 'podium-cupu' }>; gold?: boolean; compact?: boolean }) => {
  const [first, second, third] = slide.players;
  const bar = (player: (typeof slide.players)[number] | undefined, order: 0 | 1 | 2) => {
    if (!player) return null;
    const isKing = order === 0;
    const barHeight = compact
      ? (order === 0 ? 104 : order === 1 ? 76 : 54)
      : (order === 0 ? 158 : order === 1 ? 115 : 82);
    // Mode fixed: baris tim → dua wajah sejajar (Avatar pair) + kedua nama
    // depan ("Syarif & Rafi"), bukan cuma nama anchor.
    const isPair = Boolean(player.partnerAvatar || player.partnerInitials) || player.name.includes(' & ');
    const displayName = player.name.includes(' & ')
      ? player.name.split(' & ').map((part) => getShortName(part)).join(' & ')
      : (player.name.split(' ')[0] || player.name);
    // Topper per posisi — mengikuti podium shame di Klasemen: official semua
    // dapat mahkota beneran (juara 1 paling besar); podium cupu memarodikannya
    // (raja 👑, runner-up 🧢 miring, peringkat 3 🩴).
    const topper = isKing
      ? { emoji: '👑', className: '-top-5 left-1/2 -translate-x-1/2 -rotate-[8deg] text-[24px]' }
      : gold
        ? order === 1
          ? { emoji: '🧢', className: '-top-2.5 -left-2 -rotate-[24deg] -scale-x-100 text-[16px]' }
          : { emoji: '🩴', className: '-top-2.5 -right-2 rotate-[30deg] text-[16px]' }
        : order === 1
          ? { emoji: '👑', className: '-top-3.5 left-1/2 -translate-x-1/2 -rotate-[10deg] text-[17px]' }
          : { emoji: '👑', className: '-top-3.5 left-1/2 -translate-x-1/2 rotate-[10deg] text-[15px]' };
    return (
      <div className={cn('flex flex-col items-center', compact ? 'gap-1.5' : 'gap-2.5', isKing ? 'flex-[1.1]' : 'flex-1')}>
        <div className="relative">
          <Avatar player={player} size={compact ? (isKing ? 60 : 48) : (isKing ? 72 : 58)} gold={gold && isKing} className={cn(!gold && isKing && 'border-[3px] border-[#E65E14] bg-[#101010]', !isKing && 'border-2 border-white/25 bg-white/15')} />
          <span className={cn('absolute leading-none', topper.className)} aria-hidden="true">{topper.emoji}</span>
        </div>
        <div className="w-full text-center">
          <p className={cn('mx-auto max-w-full truncate px-0.5 font-extrabold', isPair ? 'text-[11.5px]' : 'text-[14px]', gold ? 'text-[#F3E3B5]' : 'text-white')}>{displayName}</p>
          {/* Record W-L(-D) jadi info utama; PTS & diff turun jadi sekunder. Slide lama tanpa record tetap tampil PTS. */}
          <p className={cn('mt-0.5 text-[11.5px] font-extrabold tabular-nums', isKing ? (gold ? 'text-[#E5484D]' : 'text-[#FF9A66]') : gold ? 'text-[#E8C45A]/70' : 'text-white/65')}>
            {player.record || `${player.pts} PTS · ${formatDiff(player.diff)}`}
          </p>
          {player.record && (
            <p className={cn('mt-0.5 text-[8.5px] font-bold tabular-nums', gold ? 'text-[#E8C45A]/45' : 'text-white/40')}>
              {player.pts} PTS · {formatDiff(player.diff)}
            </p>
          )}
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
    <div className={cn('relative flex h-full w-full flex-col overflow-hidden', compact ? 'p-6' : 'p-7', gold ? 'bg-[linear-gradient(180deg,#16110a_0%,#111111_60%)]' : 'bg-[#111111]')}>
      <OrbAndConfetti gold={gold} compact={compact} />
      <Eyebrow gold={gold}>{gold ? 'Podium Cupu' : 'The Podium'}</Eyebrow>
      <Headline gold={gold} compact={compact}>{slide.headline}</Headline>
      <div className={cn('relative flex min-h-0 flex-1 items-end gap-2.5', compact ? 'pb-2.5' : 'pb-4')}>
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

const ChampionSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'champion' }>; compact?: boolean }) => (
  <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[#111111]', compact ? 'p-6' : 'p-7')}>
    <OrbAndConfetti strong compact={compact} />
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
            <Avatar player={player} size={compact ? (slide.players.length > 1 ? 84 : 102) : (slide.players.length > 1 ? 108 : 134)} className="border-[3px] border-white/30" />
            {index === 0 && <span className={cn('absolute -top-6 right-0 rotate-[16deg]', compact ? 'text-[28px]' : 'text-[36px]')}>👑</span>}
          </div>
        ))}
      </div>
      <p className={cn('max-w-full px-2 font-extrabold leading-[1.05] tracking-[-0.02em] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden', compact ? 'mt-3.5 text-[30px]' : 'mt-5 text-[38px]')}>
        {slide.players.map((player) => player.name).join(' & ')}
      </p>
      {slide.quote && (
        <p className={cn('max-w-[280px] text-[13.5px] italic leading-[1.45] text-white/65', compact ? 'mt-2' : 'mt-3')}>“{slide.quote}”</p>
      )}
      <StatStrip
        compact={compact}
        items={[
          { label: 'Record', value: slide.record },
          { label: 'Diff', value: formatDiff(slide.diff), className: diffColorDark(slide.diff) },
          { label: 'Pts', value: String(slide.pts) },
        ]}
      />
    </div>
  </div>
);

const DreamTeamSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'dream-team' }>; compact?: boolean }) => (
  <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[#111111]', compact ? 'p-6' : 'p-7')}>
    <OrbAndConfetti compact={compact} />
    <Eyebrow>Dream Team</Eyebrow>
    <Headline compact={compact}>{slide.headline}</Headline>
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <div className="flex">
        {slide.players.map((player, index) => (
          <Fragment key={player.id}><Avatar player={player} size={compact ? 82 : 104} className={cn('border-[3px] border-[#111111]', index > 0 && '-ml-6', index === 0 && 'bg-[#8E8E93]')} /></Fragment>
        ))}
      </div>
      <p className={cn('font-extrabold leading-[1.15] tracking-[-0.02em] text-white', compact ? 'mt-3.5 text-[25px]' : 'mt-5 text-[30px]')}>{slide.pairName}</p>
      {slide.quote && <p className="mt-2 text-[13.5px] italic text-white/65">“{slide.quote}”</p>}
      <StatStrip
        compact={compact}
        items={[
          { label: 'Main Bareng', value: String(slide.played) },
          { label: 'Menang', value: String(slide.wins), className: 'text-[#E65E14]' },
          { label: 'Diff', value: formatDiff(slide.diff), className: diffColorDark(slide.diff) },
        ]}
      />
    </div>
  </div>
);

const MatchOfTheNightSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'match-of-the-night' }>; compact?: boolean }) => (
  <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[#111111]', compact ? 'p-6' : 'p-7')}>
    <div className="pointer-events-none absolute left-1/2 top-[42%] h-[190px] w-[288px] -translate-x-1/2 rounded-full bg-[rgba(230,94,20,0.18)]" style={{ filter: 'blur(56px)' }} />
    <Eyebrow>Match of the Night</Eyebrow>
    <Headline compact={compact}>{slide.headline}</Headline>
    <div className={cn('relative flex min-h-0 flex-1 flex-col items-center justify-center', compact ? 'gap-3.5' : 'gap-6')}>
      <div className={cn('flex flex-col items-center', compact ? 'gap-1.5' : 'gap-2.5')}>
        <div className="flex">
          {slide.teamAPlayers.map((player, index) => (
            <Fragment key={player.id}><Avatar player={player} size={compact ? 40 : 46} className={cn('border-2 border-[#111111]', index > 0 && '-ml-3')} /></Fragment>
          ))}
        </div>
        <p className={cn('font-extrabold text-white', compact ? 'text-[14px]' : 'text-[16px]')}>{slide.teamAName}</p>
      </div>
      <div className="flex items-center gap-5">
        <span className={cn('font-extrabold leading-none tracking-[-0.04em] tabular-nums text-[#E65E14]', compact ? 'text-[56px]' : 'text-[74px]')}>{slide.scoreA}</span>
        <span className={cn('font-extrabold text-white/30', compact ? 'text-[22px]' : 'text-[28px]')}>–</span>
        <span className={cn('font-extrabold leading-none tracking-[-0.04em] tabular-nums text-white', compact ? 'text-[56px]' : 'text-[74px]')}>{slide.scoreB}</span>
      </div>
      <div className={cn('flex flex-col items-center', compact ? 'gap-1.5' : 'gap-2.5')}>
        <p className={cn('font-extrabold text-white', compact ? 'text-[14px]' : 'text-[16px]')}>{slide.teamBName}</p>
        <div className="flex">
          {slide.teamBPlayers.map((player, index) => (
            <Fragment key={player.id}><Avatar player={player} size={compact ? 40 : 46} className={cn('border-2 border-[#111111] bg-[#8E8E93]', index > 0 && '-ml-3')} /></Fragment>
          ))}
        </div>
      </div>
      {slide.kicker && (
        <span className={cn('rounded-full border border-white/12 bg-white/[0.07] px-5 text-[11.5px] font-bold text-white/70', compact ? 'py-1.5' : 'py-2')}>
          {slide.kicker}
        </span>
      )}
    </div>
  </div>
);

const PhotosSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'photos' }>; compact?: boolean }) => (
  <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[#111111]', compact ? 'p-6' : 'p-7')}>
    <Eyebrow>The Scenes</Eyebrow>
    <Headline compact={compact}>{slide.headline}</Headline>
    <div className={cn('grid min-h-0 flex-1 grid-cols-2 gap-2.5', compact ? 'my-3' : 'my-4')} style={{ gridTemplateRows: '1.5fr 1fr' }}>
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

const CupuSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'cupu' }>; compact?: boolean }) => {
  const winnerName = slide.players.map((player) => player.name).join(' & ');
  return (
  <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#16110a_0%,#111111_55%)]', compact ? 'p-6' : 'p-7')}>
    <OrbAndConfetti gold compact={compact} />
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
            <Avatar player={player} size={compact ? (slide.players.length > 1 ? 76 : 90) : (slide.players.length > 1 ? 104 : 130)} gold className="border-[3px] border-[#E8C45A]/45" />
            {index === 0 && <span className={cn('absolute -top-6 -right-2 rotate-[20deg]', compact ? 'text-[30px]' : 'text-[38px]')}>👑</span>}
          </div>
        ))}
      </div>
      {/* Compact: nama panjang (2 baris) sempat terpotong & ketimpa subtitle —
          font mengecil dinamis dan elemen dilarang menyusut (shrink-0). */}
      <p
        className={cn('max-w-full shrink-0 px-2 font-serif font-bold italic leading-[1.1] tracking-[-0.01em] text-[#F3E3B5] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden', compact ? 'mt-2.5' : 'mt-4 text-[36px]')}
        style={compact ? { fontSize: winnerName.length > 16 ? 22 : 28 } : undefined}
      >
        {winnerName}
      </p>
      <p className={cn('text-[11px] font-black uppercase tracking-[0.16em] text-[#E8C45A]/65', compact ? 'mt-2' : 'mt-2.5')}>{slide.title}</p>
      <StatStrip
        gold
        compact={compact}
        items={[
          { label: 'Record', value: slide.record },
          { label: 'Diff', value: formatDiff(slide.diff), className: diffColorDark(slide.diff) },
          { label: 'Pts', value: String(slide.pts) },
        ]}
      />
      {slide.quote && (
        <p className={cn('max-w-[290px] text-[13.5px] italic leading-[1.5] text-[#F3E3B5]/75', compact ? 'mt-3' : 'mt-4')}>“{slide.quote}”</p>
      )}
      <p className={cn('text-[9px] text-white/35', compact ? 'mt-2' : 'mt-3')}>All roasts are about this match only. Jangan baper, ya.</p>
    </div>
  </div>
  );
};

const AwardsSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'awards' }>; compact?: boolean }) => (
  <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[#111111]', compact ? 'p-6' : 'p-7')}>
    <div className="pointer-events-none absolute -right-12 -top-9 h-[204px] w-[204px] rounded-full bg-[rgba(183,134,31,0.2)]" style={{ filter: 'blur(52px)' }} />
    <Eyebrow gold>Toxic Awards</Eyebrow>
    <Headline compact={compact}>{slide.headline}</Headline>
    <div className={cn('relative flex min-h-0 flex-1 flex-col justify-center', compact ? 'gap-2' : 'gap-3')}>
      {slide.awards.map((award) => (
        <div key={award.id} className={cn('rounded-[18px] border border-[#E8C45A]/18 bg-[#E8C45A]/[0.07] px-4', compact ? 'py-2.5' : 'py-3.5')}>
          <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.16em] text-[#E8C45A]">
            {award.label}{award.emoji ? ` ${award.emoji}` : ''}{award.players.length > 1 ? ' · PAIR' : ''}
          </p>
          <div className={cn('flex items-center gap-2.5', compact ? 'mt-1' : 'mt-1.5')}>
            {award.players.length > 1 && (
              <div className="flex">
                {award.players.map((player, index) => (
                  <Fragment key={player.id}><Avatar player={player} size={compact ? 22 : 26} gold={index > 0} className={cn('border-2 border-[#111111]', index > 0 && '-ml-2', index === 0 && 'bg-[#8E8E93]')} /></Fragment>
                ))}
              </div>
            )}
            <p className={cn('truncate font-extrabold text-white', compact ? 'text-[15px]' : 'text-[17px]')}>{award.playerNames}</p>
          </div>
          {award.note && <p className={cn('italic leading-snug text-white/55', compact ? 'mt-0.5 text-[10.5px]' : 'mt-1 text-[11.5px]')}>{award.note}</p>}
        </div>
      ))}
    </div>
    <Disclaimer />
  </div>
);

// Sertifikat Cupu — adaptasi 9:16 dari kartu sertifikat krem/emas Klasemen.
// Punya branding sendiri (logo + ornamen), jadi tanpa brand footer standar.
const CertificateSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'certificate' }>; compact?: boolean }) => (
  <div className="relative h-full w-full overflow-hidden bg-[#FBF7EC] p-[16px] text-[#101010]">
    <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-8%,rgba(201,161,74,0.24),rgba(251,247,236,0)_54%),linear-gradient(135deg,rgba(255,255,255,0.56),rgba(245,226,175,0.28))]" />
    <div className="absolute inset-[12px] rounded-lg border-2 border-[#C9A14A]" />
    <div className="absolute inset-[17px] rounded-[5px] border border-[#C9A14A]/45" />
    <div className="absolute inset-0 opacity-[0.035] bg-[url('/assets/fom-logomark-app.png')] bg-[length:44px_44px] rotate-[-10deg] scale-125" />

    <div className={cn('relative flex h-full flex-col items-center px-7 text-center', compact ? 'pb-5 pt-6' : 'pb-9 pt-10')}>
      {/* shrink-0 di logo + baris bawah: saat konten tengah mepet, keduanya
          tidak boleh menyusut/tertimpa (sempat "SERTIFIKAT" menimpa logo). */}
      <img src={LOGO_ON_LIGHT} alt="FOM Play" className={cn('w-auto shrink-0 object-contain', compact ? 'h-[20px]' : 'h-[24px]')} />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <p className={cn('text-[10px] font-black uppercase leading-none tracking-[0.30em] text-[#B7861F]', compact && 'mt-1')}>Sertifikat</p>
        <h2 className={cn('font-ceremony mt-2 font-normal leading-[1.04] text-[#101010]', compact ? 'text-[24px]' : 'text-[36px]')}>{slide.title}</h2>

        <p className={cn('font-medium leading-[1.5] text-[#6E6E73]', compact ? 'mt-2 max-w-[276px] text-[10.5px]' : 'mt-5 max-w-[262px] text-[12px]')}>
          Dengan ini menyatakan secara sah dan tidak bisa diganggu gugat bahwa
        </p>

        <p
          className={cn('font-ceremony max-w-[288px] border-b border-[#C9A14A]/55 px-4 font-normal italic leading-[1.1] text-[#8A6A1F]', compact ? 'mt-1.5 pb-1.5' : 'mt-3 pb-2')}
          style={{
            fontSize: (slide.recipientName.length > 36 ? 26 : slide.recipientName.length > 25 ? 30 : 35) - (compact ? 8 : 0),
          }}
        >
          {slide.recipientName}
        </p>

        <p className={cn('font-medium leading-[1.5] text-[#6E6E73]', compact ? 'mt-2 max-w-[290px] text-[10.5px]' : 'mt-4 max-w-[276px] text-[12px]')}>
          {slide.bodyCopy}
        </p>

        {slide.note && (
          <div className={cn('w-full rounded-2xl border border-[#C9A14A]/35 bg-white/52 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.70)]', compact ? 'mt-2.5 py-2' : 'mt-5 py-3')}>
            <p className="text-[8px] font-black uppercase leading-none tracking-[0.15em] text-[#B7861F]">Reason</p>
            <p className={cn('font-bold italic leading-snug text-[#6B5A38]', compact ? 'mt-1 text-[10px]' : 'mt-2 text-[11px]')}>{slide.note}</p>
          </div>
        )}
      </div>

      <div className={cn('grid w-full shrink-0 items-end gap-3', compact ? 'mt-2 grid-cols-[84px_minmax(0,1fr)_54px]' : 'grid-cols-[92px_minmax(0,1fr)_68px]')}>
        <div className="min-w-0 text-left">
          <p className={cn('font-ceremony font-normal italic leading-none text-[#101010]', compact ? 'text-[16px]' : 'text-[19px]')}>Panitia Mabar</p>
          <p className={cn('mt-1.5 border-t border-black/30 pt-1.5 text-[8px] font-black uppercase leading-none tracking-[0.12em] text-[#9A9AA0]', compact ? 'w-[80px]' : 'w-[90px]')}>
            {slide.witnessCount} saksi mata
          </p>
        </div>

        <div className={cn('justify-self-center rounded-2xl border border-[#C9A14A]/60 bg-[#101010] px-4 text-center rotate-[-1.5deg]', compact ? 'py-2.5' : 'py-3.5')}>
          <p className={cn('max-w-[116px] font-black uppercase leading-tight text-[#E8C45A]', compact ? 'text-[11px]' : 'text-[13px]')}>{slide.title} {slide.emoji || '👑'}</p>
          <p className={cn('font-black uppercase leading-none tracking-[0.14em] text-[#E8C45A]/55', compact ? 'mt-1 text-[6.5px]' : 'mt-1.5 text-[7px]')}>Penobatan Sah</p>
        </div>

        <div className={cn('relative shrink-0 justify-self-end', compact ? 'h-[54px] w-[54px]' : 'h-[68px] w-[68px]')}>
          <div className="absolute inset-0 rotate-[-14deg] rounded-full border-2 border-[#B7861F]/65" />
          <div className={cn('absolute rotate-[-14deg] rounded-full border border-[#B7861F]/50', compact ? 'inset-[6px]' : 'inset-[8px]')} />
          <div className={cn('absolute flex rotate-[-14deg] items-center justify-center text-center font-black uppercase tracking-[0.10em] text-[#8A6A1F]', compact ? 'inset-[6px] text-[5.5px] leading-[1.4]' : 'inset-[8px] text-[6.5px] leading-[1.5]')}>
            Certified<br />Cupu<br />{new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// My Card — slide personal pemain yang login. Cover photo (kalau ada) jadi
// background full-bleed; tanpa foto pakai orb + confetti standar Rewind.
const MyCardSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'my-card' }>; compact?: boolean }) => (
  <div className={cn('relative flex h-full w-full flex-col overflow-hidden bg-[#111111]', compact ? 'p-6' : 'p-7')}>
    {slide.photoUrl ? (
      <>
        <img src={slide.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.52)_0%,rgba(0,0,0,0.28)_38%,rgba(0,0,0,0.88)_100%)]" />
      </>
    ) : (
      <OrbAndConfetti compact={compact} />
    )}
    <div className="relative flex items-center justify-between">
      <Eyebrow>My Card</Eyebrow>
      {slide.officialRank > 0 && (
        <span className="rounded-full border border-[#E65E14]/40 bg-[#E65E14]/15 px-3 py-1.5 text-[9.5px] font-black tracking-[0.12em] text-[#FF9A66]">
          #{slide.officialRank} OF {slide.playerCount}
        </span>
      )}
    </div>
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <Avatar player={slide.player} size={compact ? 78 : 116} className="border-[3px] border-white/30" />
      {/* Compact: nama panjang (2 baris) sempat ketimpa baris nama match —
          font mengecil dinamis dan elemen dilarang menyusut (shrink-0). */}
      <p
        className={cn('max-w-full shrink-0 px-2 font-extrabold leading-[1.08] tracking-[-0.02em] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden', compact ? 'mt-2.5' : 'mt-4 text-[32px]')}
        style={compact ? { fontSize: slide.player.name.length > 16 ? 21 : 26 } : undefined}
      >
        {slide.player.name}
      </p>
      <p className="mt-1.5 max-w-[280px] shrink-0 truncate text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
        {slide.matchName}{slide.dateLabel ? ` · ${slide.dateLabel}` : ''}
      </p>
      <StatStrip
        compact={compact}
        items={[
          { label: 'Record', value: slide.record },
          { label: 'Diff', value: formatDiff(slide.diff), className: diffColorDark(slide.diff) },
          { label: 'Pts', value: String(slide.pts) },
        ]}
      />
      {typeof slide.toxicRank === 'number' && (
        <div className={cn('w-full rounded-[18px] border border-[#E8C45A]/25 bg-[#E8C45A]/[0.08] px-4 text-left backdrop-blur-[2px]', compact ? 'mt-3.5 py-2.5' : 'mt-5 py-3.5')}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.16em] text-[#E8C45A]">
              Hall of Shame · #{slide.toxicRank}
            </p>
            {slide.intensityLabel && (
              <span className="rounded-full bg-[linear-gradient(135deg,#E8C45A,#B7861F)] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#16110a]">
                {slide.intensityLabel}
              </span>
            )}
          </div>
          {slide.roast && (
            <p className="mt-2 text-[12px] italic leading-snug text-[#F3E3B5]/80">“{slide.roast}”</p>
          )}
        </div>
      )}
    </div>
  </div>
);

const MetaStrip = ({ cells, gold }: { cells: Array<{ label: string; value: string }>; gold?: boolean }) => (
  <div className={cn('relative mt-3 flex border-y py-2.5', gold ? 'border-[#E8C45A]/20' : 'border-black/10')}>
    {cells.map((cell, index) => (
      <div key={cell.label} className={cn('min-w-0 flex-1', index > 0 && cn('border-l pl-2.5', gold ? 'border-[#E8C45A]/20' : 'border-black/10'))}>
        <p className={cn('text-[6.5px] font-black uppercase tracking-[0.14em]', gold ? 'text-[#E8C45A]/50' : 'text-ios-gray')}>{cell.label}</p>
        <p className={cn('mt-0.5 truncate text-[9.5px] font-bold', gold ? 'text-[#F3E3B5]' : 'text-[#101010]')}>{cell.value}</p>
      </div>
    ))}
  </div>
);

// Shared full-standings row (official & toxic share the same dense layout;
// only the palette differs). Rows distribute with justify-between so 4–14
// players fit one 9:16 slide.
const FullStandingsSlide = ({
  slide,
  gold,
  eyebrow,
  headerTint,
  compact,
}: {
  slide: Extract<RewindSlide, { type: 'standings' | 'standings-toxic' }>;
  gold?: boolean;
  eyebrow: string;
  headerTint: string;
  compact?: boolean;
}) => {
  // Density mengikuti jumlah baris di halaman ini: sedikit baris → baris lebih
  // tinggi + tipografi lebih besar dengan pembatas halus (bukan direnggangkan
  // justify-between yang bikin 4-6 baris terlihat kosong); banyak baris →
  // padat seperti semula. Di atas 12 baris (story) / 9 baris (feed) data layer
  // memecah jadi beberapa halaman; ambang density feed ikut turun karena
  // tinggi kanvasnya berkurang.
  const rowCount = slide.rows.length;
  const density = compact
    ? (rowCount <= 5 ? 'roomy' : rowCount <= 7 ? 'medium' : 'dense')
    : (rowCount <= 6 ? 'roomy' : rowCount <= 9 ? 'medium' : 'dense');
  const nameSize = density === 'roomy' ? 'text-[13.5px]' : density === 'medium' ? 'text-[12px]' : 'text-[10.5px]';
  const subLabelSize = density === 'roomy' ? 'text-[7.5px]' : 'text-[6.5px]';
  const rankSize = density === 'roomy' ? 'text-[14px]' : 'text-[12px]';
  const statSize = density === 'roomy' ? 'text-[11.5px]' : 'text-[10px]';
  const ptsSize = density === 'roomy' ? 'text-[14px]' : 'text-[12px]';
  const rowPad = density === 'roomy' ? 'py-3' : density === 'medium' ? 'py-2' : 'py-1';
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden px-6 pb-5 pt-6',
        gold ? 'bg-[linear-gradient(180deg,#16110a_0%,#111111_45%)]' : 'bg-white',
      )}
    >
      {gold && (
        <>
          <div className="pointer-events-none absolute -right-10 -top-8 h-[170px] w-[170px] rounded-full bg-[rgba(183,134,31,0.22)]" style={{ filter: 'blur(44px)' }} />
          <div className={cn('pointer-events-none absolute h-[9px] w-[5px] rotate-[24deg] rounded-[2px] bg-[#E8C45A]', compact ? 'left-[8px] top-[12%]' : 'left-[12%] top-[9%]')} />
          <div className={cn('pointer-events-none absolute h-[8px] w-[4px] -rotate-[30deg] rounded-[2px] bg-[#B7861F]', compact ? 'right-[8px] top-[18%]' : 'right-[20%] top-[6%]')} />
        </>
      )}
      <div className="relative flex items-center justify-between">
        <p className={cn('text-[10px] font-black uppercase leading-none tracking-[0.22em]', headerTint)}>{eyebrow}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {Boolean(slide.pageCount && slide.pageCount > 1) && (
            <span className={cn('rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] tabular-nums', gold ? 'border-[#E8C45A]/30 text-[#E8C45A]' : 'border-black/[0.12] text-[#101010]/60')}>
              {slide.page}/{slide.pageCount}
            </span>
          )}
          <span className={cn('rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em]', gold ? 'bg-[linear-gradient(135deg,#E8C45A,#B7861F)] text-[#16110a]' : 'bg-[#101010] text-white')}>Final</span>
        </div>
      </div>
      <h2 className={cn('relative mt-2 text-[19px] font-extrabold leading-[1.14] tracking-[-0.02em]', gold ? 'text-[#F3E3B5]' : 'text-[#101010]')} style={{ textWrap: 'balance' }}>
        {slide.headline}
      </h2>
      <MetaStrip cells={slide.meta} gold={gold} />
      {/* Header kolom digabung satu blok dengan baris supaya saat baris sedikit
          (blok di-center) header tetap menempel di atas tabel, tidak
          menggantung sendirian di atas. */}
      <div className={cn('relative flex min-h-0 flex-1 flex-col', density !== 'dense' && 'justify-center')}>
      <div className={cn('flex items-center gap-2 pb-1 pt-2 text-[7px] font-black uppercase tracking-[0.1em]', gold ? 'text-[#E8C45A]/45' : 'text-[#C5C5CA]')}>
        <span className="w-[18px]" />
        <span className="flex-1">Player</span>
        <span className="w-[20px] text-center">W</span>
        <span className="w-[20px] text-center">L</span>
        <span className="w-[20px] text-center">D</span>
        <span className="w-[30px] text-right">PTS</span>
      </div>
      <div className={cn(
        'flex flex-col',
        density === 'dense'
          ? 'min-h-0 flex-1 justify-between'
          : cn(gold ? 'divide-y divide-[#E8C45A]/12' : 'divide-y divide-black/[0.06]'),
      )}>
        {slide.rows.map((row) => (
          <div
            key={row.id}
            className={cn(
              'flex items-center gap-2',
              rowPad,
              row.muted && 'opacity-55',
              row.highlight && (gold
                ? '-mx-1.5 rounded-[10px] border border-[#E8C45A]/25 bg-[linear-gradient(90deg,rgba(232,196,90,0.16),transparent)] px-1.5'
                : '-mx-1.5 rounded-[10px] bg-[linear-gradient(90deg,rgba(230,94,20,0.1),transparent)] px-1.5'),
            )}
          >
            <span className={cn('w-[18px] font-extrabold tabular-nums', rankSize, row.highlight ? (gold ? 'text-[#E8C45A]' : 'text-[#E65E14]') : gold ? 'text-[#E8C45A]/40' : 'text-[#C5C5CA]')}>
              {String(row.rank).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate font-bold', nameSize, row.highlight ? 'font-extrabold' : '', gold ? 'text-[#F3E3B5]' : 'text-[#101010]')}>
                {row.name}{row.isChampion && !gold ? ' 👑' : ''}
              </p>
              {row.subLabel && (
                <p className={cn('truncate font-black uppercase tracking-[0.1em]', subLabelSize, gold ? 'text-[#E8C45A]' : 'text-[#E65E14]')}>{row.subLabel}</p>
              )}
            </div>
            <span className={cn('w-[20px] text-center', statSize, gold ? 'font-semibold text-[#F3E3B5]/50' : 'font-bold text-[#1E8E3E]')}>{row.w}</span>
            <span className={cn('w-[20px] text-center font-bold', statSize, gold ? 'text-[#E5484D]' : 'text-ios-gray')}>{row.l}</span>
            <span className={cn('w-[20px] text-center font-semibold', statSize, gold ? 'text-[#F3E3B5]/50' : 'text-ios-gray')}>{row.d}</span>
            <span className={cn('w-[30px] text-right font-extrabold tabular-nums', ptsSize, row.highlight ? (gold ? 'text-[#E8C45A]' : 'text-[#E65E14]') : gold ? 'text-[#F3E3B5]' : 'text-[#101010]')}>{row.pts}</span>
          </div>
        ))}
      </div>
      </div>
      {gold && (
        <p className="relative pt-2 text-center text-[7.5px] text-white/35">All roasts are about this match only. Jangan baper, ya.</p>
      )}
    </div>
  );
};

const StandingsSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'standings' }>; compact?: boolean }) => (
  <FullStandingsSlide slide={slide} compact={compact} eyebrow="Full Standings" headerTint="text-[#E65E14]" />
);

const ToxicStandingsSlide = ({ slide, compact }: { slide: Extract<RewindSlide, { type: 'standings-toxic' }>; compact?: boolean }) => (
  <FullStandingsSlide slide={slide} compact={compact} gold eyebrow="Hall of Shame · Full List" headerTint="text-[#E8C45A]" />
);

const OutroSlide = ({ slide, shortLink, qrDataUrl }: { slide: Extract<RewindSlide, { type: 'outro' }>; shortLink: string; qrDataUrl?: string }) => (
  <div className="relative h-full w-full overflow-hidden bg-[#111111]">
    {slide.photoUrl ? (
      <img src={slide.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_25%_-10%,rgba(230,94,20,0.38),rgba(230,94,20,0)_60%),linear-gradient(180deg,#1a1410,#111111)]" />
    )}
    {/* Scrim hanya di area teks: strip atas untuk logo, gradient bawah untuk CTA. Tengah foto dibiarkan bersih. */}
    <div className="absolute inset-x-0 top-0 h-[96px] bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_100%)]" />
    <div className="absolute left-7 top-6">
      <img src={LOGO_ON_DARK} alt="FOM Play" className="h-[21px] w-auto object-contain" />
    </div>
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-7 pb-6 pt-14 text-center bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_30%,rgba(0,0,0,0.92)_100%)]">
      <p className="text-[10.5px] font-black uppercase leading-none tracking-[0.24em] text-[#FF7A33]">Sampai Jumpa</p>
      <h2 className="text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white" style={{ textWrap: 'balance' }}>{slide.headline}</h2>
      <p className="text-[11.5px] text-white/70">Hosted with FOM Play — skor live, klasemen otomatis, gratis.</p>
      <div className="mt-1 flex items-center gap-3.5 rounded-[18px] border border-white/18 bg-white/10 px-4 py-2.5">
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
      <span className="mt-1 rounded-full bg-[#E65E14] px-7 py-3 text-[13.5px] font-bold text-white">
        Start your own match — free
      </span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------

export const RewindSlideView = ({ slide, shortLink, qrDataUrl, ratio = 'story' }: { slide: RewindSlide; shortLink: string; qrDataUrl?: string; ratio?: RewindRatio }) => {
  // 'feed' (3:4) kehilangan 160pt tinggi vs 'story' — slide dengan konten
  // vertikal padat merender varian compact. Cover & Outro absolut-positioned
  // dari tepi, jadi otomatis menyesuaikan tanpa varian.
  const compact = ratio === 'feed';
  const body = (() => {
    switch (slide.type) {
      case 'cover': return <CoverSlide slide={slide} />;
      case 'numbers': return <NumbersSlide slide={slide} compact={compact} />;
      case 'podium': return <PodiumSlide slide={slide} compact={compact} />;
      case 'podium-cupu': return <PodiumSlide slide={slide} gold compact={compact} />;
      case 'champion': return <ChampionSlide slide={slide} compact={compact} />;
      case 'dream-team': return <DreamTeamSlide slide={slide} compact={compact} />;
      case 'match-of-the-night': return <MatchOfTheNightSlide slide={slide} compact={compact} />;
      case 'photos': return <PhotosSlide slide={slide} compact={compact} />;
      case 'cupu': return <CupuSlide slide={slide} compact={compact} />;
      case 'awards': return <AwardsSlide slide={slide} compact={compact} />;
      case 'certificate': return <CertificateSlide slide={slide} compact={compact} />;
      case 'standings': return <StandingsSlide slide={slide} compact={compact} />;
      case 'standings-toxic': return <ToxicStandingsSlide slide={slide} compact={compact} />;
      case 'my-card': return <MyCardSlide slide={slide} compact={compact} />;
      case 'outro': return <OutroSlide slide={slide} shortLink={shortLink} qrDataUrl={qrDataUrl} />;
      default: return null;
    }
  })();

  // Cover, Outro & Sertifikat are full-bleed slides with their own branding;
  // every other slide gets the consistent brand footer strip (logo + link).
  const hasOwnFooter = slide.type === 'cover' || slide.type === 'outro' || slide.type === 'certificate';
  const isLight = slide.type === 'standings';

  return (
    <div className={cn('relative flex h-full w-full flex-col overflow-hidden', isLight ? 'bg-white' : slide.type === 'certificate' ? 'bg-[#FBF7EC]' : 'bg-[#111111]')}>
      <div className="min-h-0 flex-1">{body}</div>
      {!hasOwnFooter && (
        <div className="shrink-0 px-7 pb-6">
          <Footer light={isLight} shortLink={shortLink} />
        </div>
      )}
    </div>
  );
};
