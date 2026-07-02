import { type MatchFormat, type TournamentHistory } from '../../types';

export const getDefaultMatchThemeColorId = (format: MatchFormat) => (
  format === 'Americano' ? 'green' : format === 'Match Play' ? 'blue' : 'orange'
);

export const MATCH_THEME_COLORS = [
  {
    id: 'orange',
    label: 'Orange',
    swatch: 'bg-[#E65E14]',
    badge: 'border-primary/15 bg-primary/10 text-primary',
    chip: 'border-primary/10 bg-primary/[0.06] text-primary',
    accent: 'text-primary',
    accentSoft: 'text-primary/72',
    accentBg: 'bg-primary/12',
    accentBorder: 'border-primary/25',
    accentSolid: 'bg-primary',
    accentSolidShadow: 'shadow-[0_10px_22px_rgba(230,94,20,0.24)]',
    bg: 'from-[#E65E14] via-[#F26A2A] to-[#FF8A4C]',
    shadow: 'shadow-[0_14px_30px_rgba(230,94,20,0.35)]',
    ring: 'bg-[#1F2937]/18',
    topBg: 'bg-primary/92 supports-[backdrop-filter]:bg-primary/82',
    topBorder: 'border-[#b8480f]/35',
    surface: 'bg-[linear-gradient(135deg,rgba(255,85,1,0.10)_0%,rgba(255,255,255,0.98)_72%)]',
    pageBase: 'bg-[linear-gradient(175deg,#fff3e7_0%,#ffe8d8_40%,#fff5ec_100%)]',
    photoBlend: 'bg-[linear-gradient(180deg,rgba(33,19,12,0.22)_0%,rgba(78,35,14,0.12)_16%,rgba(156,74,28,0.06)_32%,rgba(255,243,231,0.04)_44%,rgba(255,243,231,0.18)_58%,rgba(255,243,231,0.42)_72%,rgba(255,243,231,0.62)_86%,rgba(255,245,236,1)_100%)]',
    systemBar: '#2b160d'
  },
  {
    id: 'green',
    label: 'Green',
    swatch: 'bg-[#18A486]',
    badge: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700',
    chip: 'border-emerald-500/10 bg-emerald-500/[0.06] text-emerald-700',
    accent: 'text-emerald-700',
    accentSoft: 'text-emerald-700/72',
    accentBg: 'bg-[#18A486]/12',
    accentBorder: 'border-[#18A486]/25',
    accentSolid: 'bg-[#18A486]',
    accentSolidShadow: 'shadow-[0_10px_22px_rgba(24,164,134,0.26)]',
    bg: 'from-[#12806A] via-[#18A486] to-[#4FC3A1]',
    shadow: 'shadow-[0_14px_30px_rgba(18,128,106,0.32)]',
    ring: 'bg-[#0F2A2A]/18',
    topBg: 'bg-[#12806A]/92 supports-[backdrop-filter]:bg-[#12806A]/82',
    topBorder: 'border-[#0d5f4e]/35',
    surface: 'bg-[linear-gradient(135deg,rgba(16,185,129,0.11)_0%,rgba(255,255,255,0.98)_72%)]',
    pageBase: 'bg-[linear-gradient(175deg,#e9faf6_0%,#d8f3eb_42%,#f5fffb_100%)]',
    photoBlend: 'bg-[linear-gradient(180deg,rgba(10,28,24,0.22)_0%,rgba(11,46,37,0.12)_16%,rgba(28,96,80,0.06)_32%,rgba(233,250,246,0.04)_44%,rgba(233,250,246,0.18)_58%,rgba(233,250,246,0.42)_72%,rgba(233,250,246,0.62)_86%,rgba(245,255,251,1)_100%)]',
    systemBar: '#0f2a2a'
  },
  {
    id: 'blue',
    label: 'Blue',
    swatch: 'bg-[#2F6FE4]',
    badge: 'border-blue-500/15 bg-blue-500/10 text-blue-700',
    chip: 'border-blue-500/10 bg-blue-500/[0.06] text-blue-700',
    accent: 'text-blue-700',
    accentSoft: 'text-blue-700/72',
    accentBg: 'bg-[#2F6FE4]/12',
    accentBorder: 'border-[#2F6FE4]/25',
    accentSolid: 'bg-[#2F6FE4]',
    accentSolidShadow: 'shadow-[0_10px_22px_rgba(47,111,228,0.26)]',
    bg: 'from-[#2248B5] via-[#2F6FE4] to-[#56A3F7]',
    shadow: 'shadow-[0_14px_30px_rgba(34,72,181,0.32)]',
    ring: 'bg-[#0F1E3A]/18',
    topBg: 'bg-[#2F6FE4]/92 supports-[backdrop-filter]:bg-[#2F6FE4]/82',
    topBorder: 'border-[#1f4ca8]/35',
    surface: 'bg-[linear-gradient(135deg,rgba(59,130,246,0.10)_0%,rgba(255,255,255,0.98)_72%)]',
    pageBase: 'bg-[linear-gradient(175deg,#edf3ff_0%,#dce9ff_42%,#f6f9ff_100%)]',
    photoBlend: 'bg-[linear-gradient(180deg,rgba(8,24,45,0.24)_0%,rgba(14,44,82,0.14)_16%,rgba(37,92,171,0.06)_32%,rgba(237,243,255,0.04)_44%,rgba(237,243,255,0.18)_58%,rgba(237,243,255,0.42)_72%,rgba(237,243,255,0.62)_86%,rgba(246,249,255,1)_100%)]',
    systemBar: '#0f1e3a'
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: 'bg-[#0891B2]',
    badge: 'border-cyan-600/15 bg-cyan-600/10 text-cyan-700',
    chip: 'border-cyan-600/10 bg-cyan-600/[0.06] text-cyan-700',
    accent: 'text-cyan-700',
    accentSoft: 'text-cyan-700/72',
    accentBg: 'bg-[#0891B2]/12',
    accentBorder: 'border-[#0891B2]/25',
    accentSolid: 'bg-[#0891B2]',
    accentSolidShadow: 'shadow-[0_10px_22px_rgba(8,145,178,0.24)]',
    bg: 'from-[#0E7490] via-[#0891B2] to-[#22D3EE]',
    shadow: 'shadow-[0_14px_30px_rgba(8,145,178,0.30)]',
    ring: 'bg-[#0E2F38]/18',
    topBg: 'bg-[#0891B2]/92 supports-[backdrop-filter]:bg-[#0891B2]/82',
    topBorder: 'border-[#0e7490]/35',
    surface: 'bg-[linear-gradient(135deg,rgba(8,145,178,0.10)_0%,rgba(255,255,255,0.98)_72%)]',
    pageBase: 'bg-[linear-gradient(175deg,#e8fbff_0%,#d8f4fb_42%,#f6fdff_100%)]',
    photoBlend: 'bg-[linear-gradient(180deg,rgba(8,47,56,0.22)_0%,rgba(14,116,144,0.12)_16%,rgba(8,145,178,0.06)_32%,rgba(232,251,255,0.04)_44%,rgba(232,251,255,0.18)_58%,rgba(232,251,255,0.42)_72%,rgba(232,251,255,0.62)_86%,rgba(246,253,255,1)_100%)]',
    systemBar: '#0e2f38'
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: 'bg-[#E11D48]',
    badge: 'border-rose-600/15 bg-rose-600/10 text-rose-700',
    chip: 'border-rose-600/10 bg-rose-600/[0.06] text-rose-700',
    accent: 'text-rose-700',
    accentSoft: 'text-rose-700/72',
    accentBg: 'bg-[#E11D48]/12',
    accentBorder: 'border-[#E11D48]/25',
    accentSolid: 'bg-[#E11D48]',
    accentSolidShadow: 'shadow-[0_10px_22px_rgba(225,29,72,0.22)]',
    bg: 'from-[#BE123C] via-[#E11D48] to-[#FB7185]',
    shadow: 'shadow-[0_14px_30px_rgba(225,29,72,0.26)]',
    ring: 'bg-[#3B0A16]/18',
    topBg: 'bg-[#E11D48]/92 supports-[backdrop-filter]:bg-[#E11D48]/82',
    topBorder: 'border-[#be123c]/35',
    surface: 'bg-[linear-gradient(135deg,rgba(225,29,72,0.09)_0%,rgba(255,255,255,0.98)_72%)]',
    pageBase: 'bg-[linear-gradient(175deg,#fff0f3_0%,#ffe0e7_42%,#fff7f9_100%)]',
    photoBlend: 'bg-[linear-gradient(180deg,rgba(59,10,22,0.22)_0%,rgba(159,18,57,0.12)_16%,rgba(225,29,72,0.06)_32%,rgba(255,240,243,0.04)_44%,rgba(255,240,243,0.18)_58%,rgba(255,240,243,0.42)_72%,rgba(255,240,243,0.62)_86%,rgba(255,247,249,1)_100%)]',
    systemBar: '#3b0a16'
  }
] as const;

export const getMatchThemeColor = (format: MatchFormat, themeColorId?: string | null) => {
  const defaultId = getDefaultMatchThemeColorId(format);
  return MATCH_THEME_COLORS.find((theme) => theme.id === (themeColorId || defaultId)) || MATCH_THEME_COLORS.find((theme) => theme.id === defaultId) || MATCH_THEME_COLORS[0];
};

export const getHistoryFormatTheme = (format: TournamentHistory['format'], themeColorId?: string | null) => {
  const theme = getMatchThemeColor(format, themeColorId);
  return {
    badge: theme.badge,
    chip: theme.chip,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    surface: theme.surface
  };
};
