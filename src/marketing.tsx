import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Award,
  BarChart2,
  Building2,
  ChevronRight,
  Globe,
  Instagram,
  Lock,
  MapPin,
  Share2,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from './lib/utils';

export type TopLevelRoute =
  | 'home'
  | 'features'
  | 'format-americano'
  | 'format-mexicano'
  | 'format-match-play'
  | 'education-compare'
  | 'ranking-info'
  | 'faq-info'
  | 'blog'
  | 'app';

export type PublicTopLevelRoute = Exclude<TopLevelRoute, 'app' | 'blog'>;
type PublicNavRoute = PublicTopLevelRoute | 'blog';

export const ARCHIVE_BASE_PATH = '/archive';

export const TOP_LEVEL_PATHS: Record<TopLevelRoute, string> = {
  home: '/',
  features: '/fitur',
  'format-americano': '/format/americano',
  'format-mexicano': '/format/mexicano',
  'format-match-play': '/format/match-play',
  'education-compare': '/edukasi/perbedaan-americano-vs-mexicano',
  'ranking-info': '/ranking',
  'faq-info': '/faq',
  blog: '/blog',
  app: '/app',
};

const GLOBAL_MARKETING_NAV_PATHS: Record<PublicNavRoute, string> = {
  home: '/',
  features: '/#fitur',
  'format-americano': '/#format',
  'format-mexicano': '/#format',
  'format-match-play': '/#format',
  'education-compare': '/#format',
  'ranking-info': '/ranking',
  blog: '/blog/',
  'faq-info': '/faq',
};

const getGlobalMarketingNavPath = (route: PublicNavRoute) => GLOBAL_MARKETING_NAV_PATHS[route];

export const PUBLIC_NAV_ITEMS: { route: PublicNavRoute; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'features', label: 'Fitur' },
  { route: 'format-americano', label: 'Americano' },
  { route: 'format-mexicano', label: 'Mexicano' },
  { route: 'format-match-play', label: 'Match Play' },
  { route: 'ranking-info', label: 'Ranking' },
  { route: 'blog', label: 'Blog' },
  { route: 'faq-info', label: 'FAQ' },
];

export const PUBLIC_PAGE_META: Record<PublicTopLevelRoute, { title: string; description: string }> = {
  home: {
    title: 'FOM Play | Aplikasi Padel untuk Live Scoring, Klasemen, dan Ranking',
    description: 'FOM Play membantu host mengatur Americano, Mexicano, dan Match Play dari HP, dengan live scoring, klasemen otomatis, hasil yang siap dibagikan, dan ranking pemain.',
  },
  features: {
    title: 'Fitur FOM Play | Aplikasi Padel untuk Live Scoring, Klasemen, dan Ranking',
    description: 'Lihat fitur FOM Play untuk live scoring padel, klasemen otomatis, share hasil ke grup atau Story, dan ranking global maupun daerah.',
  },
  'format-americano': {
    title: 'Apa Itu Americano Padel? Cara Main, Aturan, dan Sistem Game',
    description: 'Pelajari apa itu Americano padel, cara bermain, sistem ronde, dan kapan format ini cocok dipakai untuk game komunitas atau club.',
  },
  'format-mexicano': {
    title: 'Apa Itu Mexicano Padel? Cara Main, Sistem Ranking, dan Format Game',
    description: 'Kenali format Mexicano padel, cara pairing dan ranking bekerja, plus kapan format ini cocok untuk game yang ingin terasa kompetitif.',
  },
  'format-match-play': {
    title: 'Match Play Padel | Format Pertandingan dan Sistem Scoring',
    description: 'Pahami format Match Play padel, sistem scoring, dan kapan format ini paling cocok dipakai untuk pertandingan yang lebih klasik.',
  },
  'education-compare': {
    title: 'Americano vs Mexicano Padel | Apa Bedanya dan Mana yang Cocok?',
    description: 'Bandingkan Americano dan Mexicano padel dari cara main, sistem ranking, suasana game, dan rekomendasi pemakaian untuk komunitas atau club.',
  },
  'ranking-info': {
    title: 'Ranking Padel Global dan Daerah | Lihat Performa Pemain di FOM Play',
    description: 'Lihat bagaimana ranking global dan daerah di FOM Play membantu pemain mengukur progres, konsistensi, dan level permainan.',
  },
  'faq-info': {
    title: 'FAQ FOM Play | Pertanyaan Umum tentang App, Format Game, dan Ranking',
    description: 'Temukan jawaban tentang cara kerja FOM Play, live scoring, sharing hasil, format game, dan ranking pemain.',
  },
};

export const PUBLIC_SOCIAL_IMAGE_PATH = '/login-background.jpg';

const ROUTE_LABELS: Record<PublicTopLevelRoute, string> = {
  home: 'Home',
  features: 'Fitur',
  'format-americano': 'Americano',
  'format-mexicano': 'Mexicano',
  'format-match-play': 'Match Play',
  'education-compare': 'Americano vs Mexicano',
  'ranking-info': 'Ranking',
  'faq-info': 'FAQ',
};

const ROUTE_HEADLINES: Record<PublicTopLevelRoute, string> = {
  home: 'Mabar padel makin seru dengan FOM Play.',
  features: 'Semua yang kamu butuhin buat ngejalanin game padel, dari awal sampai share hasil.',
  'format-americano': 'Apa itu Americano padel?',
  'format-mexicano': 'Apa itu Mexicano padel?',
  'format-match-play': 'Match Play padel untuk pertandingan yang lebih klasik.',
  'education-compare': 'Americano vs Mexicano: apa bedanya?',
  'ranking-info': 'Menang hari ini seru. Jadi yang konsisten, lebih seru lagi.',
  'faq-info': 'Pertanyaan umum tentang app, format game, dan ranking.',
};

const PAGE_KEYWORDS: Partial<Record<PublicTopLevelRoute, string[]>> = {
  features: ['aplikasi padel', 'live score padel', 'klasemen padel', 'ranking padel'],
  'format-americano': ['americano padel', 'apa itu americano padel', 'cara main americano padel'],
  'format-mexicano': ['mexicano padel', 'apa itu mexicano padel', 'cara main mexicano padel'],
  'format-match-play': ['match play padel', 'format pertandingan padel', 'scoring padel'],
  'education-compare': ['americano vs mexicano', 'perbedaan americano dan mexicano', 'format game padel'],
  'ranking-info': ['ranking padel', 'ranking pemain padel', 'ranking padel indonesia'],
  'faq-info': ['faq fom play', 'fitur fom play', 'format game padel'],
};

const FAQ_ENTRIES = [
  {
    question: 'FOM Play itu app untuk apa?',
    answer: 'FOM Play dipakai buat ngatur game padel, catat skor live, lihat klasemen, share hasil, dan pantau ranking pemain.',
  },
  {
    question: 'Siapa yang cocok memakai FOM Play?',
    answer: 'FOM Play cocok buat host komunitas, grup teman yang rutin main, club atau court, dan pemain yang suka tracking performa.',
  },
  {
    question: 'Apakah pemain lain harus login untuk melihat hasil?',
    answer: 'Tidak selalu. Tinggal share link ke grup, lalu pemain lain bisa ikut pantau tanpa harus masuk ke flow yang ribet.',
  },
  {
    question: 'Format apa saja yang didukung?',
    answer: 'FOM Play mendukung Americano, Mexicano, dan Match Play.',
  },
  {
    question: 'Apakah scoreboard bisa dibagikan ke Instagram Story?',
    answer: 'Ya. Hasil pertandingan sudah rapi buat langsung diposting ke Story atau dikirim ke grup.',
  },
  {
    question: 'Apa itu ranking global dan daerah?',
    answer: 'Ranking global dan daerah membantu pemain melihat posisi mereka di komunitas, kota, sampai skala nasional.',
  },
];

type ExploreCard = {
  route: PublicTopLevelRoute;
  title: string;
  body: string;
};

const normalizeTopLevelPath = (pathname: string) => {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.replace(/\/+$/, '') || '/';
};

const normalizeBasePath = (basePath = '') => {
  if (!basePath) return '';
  const normalized = normalizeTopLevelPath(basePath);
  return normalized === '/' ? '' : normalized;
};

const stripBasePath = (pathname: string, basePath = '') => {
  const normalizedPath = normalizeTopLevelPath(pathname);
  const normalizedBasePath = normalizeBasePath(basePath);
  if (!normalizedBasePath) return normalizedPath;
  if (normalizedPath === normalizedBasePath) return '/';
  if (normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    return normalizedPath.slice(normalizedBasePath.length) || '/';
  }
  return normalizedPath;
};

export const getTopLevelPath = (route: TopLevelRoute, basePath = '') => {
  const routePath = TOP_LEVEL_PATHS[route];
  const normalizedBasePath = normalizeBasePath(basePath);
  if (!normalizedBasePath || route === 'app') return routePath;
  return routePath === '/' ? normalizedBasePath : `${normalizedBasePath}${routePath}`;
};

export const resolveTopLevelRoute = (pathname: string, forceAppShell: boolean, basePath = ''): TopLevelRoute => {
  if (forceAppShell) return 'app';
  const normalizedPath = stripBasePath(pathname, basePath);
  const matchedEntry = Object.entries(TOP_LEVEL_PATHS).find(([, path]) => path === normalizedPath);
  return (matchedEntry?.[0] as TopLevelRoute | undefined) || 'home';
};

export const getCanonicalUrlForRoute = (route: PublicTopLevelRoute, basePath = '') => {
  const routePath = getTopLevelPath(route, basePath);
  if (typeof window === 'undefined') return routePath;
  return `${window.location.origin}${routePath}`;
};

export const getPublicStructuredData = (route: PublicTopLevelRoute, basePath = '') => {
  const origin = typeof window === 'undefined' ? 'https://fomplay.asia' : window.location.origin;
  const canonicalUrl = getCanonicalUrlForRoute(route, basePath);
  const sharedSoftwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FOM Play',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web, iOS, Android',
    url: canonicalUrl,
    description: PUBLIC_PAGE_META[route].description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FOM Play',
    url: origin,
    logo: `${origin}/favicon.png`,
  };

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: PUBLIC_PAGE_META[route].title,
    description: PUBLIC_PAGE_META[route].description,
    url: canonicalUrl,
    inLanguage: 'id',
    isPartOf: {
      '@type': 'WebSite',
      name: 'FOM Play',
      url: origin,
    },
  };

  const breadcrumbItems =
    route === 'home'
      ? null
      : {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${origin}${getTopLevelPath('home', basePath)}`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: ROUTE_LABELS[route],
              item: canonicalUrl,
            },
          ],
        };

  const articleLikeRoutes: PublicTopLevelRoute[] = [
    'format-americano',
    'format-mexicano',
    'format-match-play',
    'education-compare',
    'ranking-info',
  ];

  const articleSchema = articleLikeRoutes.includes(route)
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: ROUTE_HEADLINES[route],
        description: PUBLIC_PAGE_META[route].description,
        url: canonicalUrl,
        author: {
          '@type': 'Organization',
          name: 'FOM Play',
        },
        publisher: {
          '@type': 'Organization',
          name: 'FOM Play',
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/favicon.png`,
          },
        },
        mainEntityOfPage: canonicalUrl,
        inLanguage: 'id',
        keywords: PAGE_KEYWORDS[route]?.join(', '),
      }
    : null;

  const collectionPageSchema =
    route === 'features'
      ? {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: PUBLIC_PAGE_META[route].title,
          description: PUBLIC_PAGE_META[route].description,
          url: canonicalUrl,
          inLanguage: 'id',
        }
      : null;

  const websiteSchema =
    route === 'home'
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'FOM Play',
          url: origin,
          inLanguage: 'id',
        }
      : null;

  if (route === 'faq-info') {
    return [
      organization,
      sharedSoftwareApplication,
      webPage,
      breadcrumbItems,
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ENTRIES.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: entry.answer,
          },
        })),
      },
    ].filter(Boolean);
  }

  return [
    organization,
    sharedSoftwareApplication,
    webPage,
    breadcrumbItems,
    websiteSchema,
    collectionPageSchema,
    articleSchema,
  ].filter(Boolean);
};

const MarketingLink = ({
  href,
  onClick,
  className,
  children,
}: {
  key?: React.Key;
  href: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    onClick={(event) => {
      event.preventDefault();
      onClick();
    }}
    className={className}
  >
    {children}
  </a>
);

const MarketingHeader = ({
  currentRoute,
  onNavigate,
  onOpenApp,
  isLoggedIn,
}: {
  currentRoute: PublicTopLevelRoute;
  onNavigate: (route: PublicNavRoute) => void;
  onOpenApp: () => void;
  isLoggedIn: boolean;
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const primaryCtaLabel = 'Coba Gratis';
  const navItems: { label: string; route: PublicNavRoute }[] = [
    { label: 'Fitur', route: 'features' },
    { label: 'Format', route: 'format-americano' },
    { label: 'Ranking', route: 'ranking-info' },
    { label: 'Blog', route: 'blog' },
    { label: 'FAQ', route: 'faq-info' },
  ];
  const isFormatRoute = currentRoute === 'format-americano' || currentRoute === 'format-mexicano' || currentRoute === 'format-match-play' || currentRoute === 'education-compare';
  const isActive = (item: { label: string; route: PublicNavRoute }) => (
    item.label === 'Format' ? isFormatRoute : currentRoute === item.route
  );
  const handleHeaderNav = (route: PublicNavRoute) => {
    window.location.assign(getGlobalMarketingNavPath(route));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/6 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-6">
        <MarketingLink
          href={TOP_LEVEL_PATHS.home}
          onClick={() => window.location.assign('/')}
          aria-label="FOM Play home"
          className="flex items-center gap-2"
        >
          <img src="/assets/fom-logomark-color.png" alt="" aria-hidden="true" className="h-[36px] w-[47px] object-contain" />
          <span className="font-display text-[29px] font-extrabold leading-none tracking-normal text-[#111827]">
            FOM<span className="text-[#ff5500]">Play</span>
          </span>
        </MarketingLink>

        <div className="hidden items-center gap-1.5 md:flex">
          <nav className="flex items-center gap-1.5 text-[14px] font-semibold text-[#374151]">
            {navItems.map((item) => (
              <MarketingLink
                key={item.route}
              href={getGlobalMarketingNavPath(item.route)}
                onClick={() => handleHeaderNav(item.route)}
                className={cn(
                  'rounded-lg px-3 py-1.5 transition hover:bg-black/[0.04] hover:text-[#111827]',
                  isActive(item) && 'text-[#111827]'
                )}
              >
                {item.label}
              </MarketingLink>
            ))}
          </nav>

          <button
            onClick={onOpenApp}
            className="ml-2 inline-flex h-[38px] items-center rounded-[10px] bg-[#ff5500] px-[18px] text-[14px] font-bold text-white shadow-[0_2px_10px_rgba(230,94,20,0.22)] transition active:scale-[0.98]"
          >
            {primaryCtaLabel}
          </button>
        </div>

        <button
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Buka menu"
          className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-black/8 bg-black/[0.04] px-3 text-[13px] font-bold text-[#111827] md:hidden"
        >
          {menuOpen ? 'Tutup' : 'Menu'}
        </button>
      </div>
      {menuOpen ? (
        <div className="border-t border-black/6 bg-white px-5 pb-[18px] pt-3 md:hidden">
          <div className="grid gap-2.5">
            {navItems.map((item) => (
              <button
                key={item.route}
                onClick={() => {
                  setMenuOpen(false);
                  handleHeaderNav(item.route);
                }}
                className="h-11 rounded-xl border border-black/6 bg-white px-3.5 text-left text-[14px] font-bold text-[#111827]"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenApp();
              }}
              className="h-[46px] rounded-xl bg-[#ff5500] text-[14px] font-extrabold text-white shadow-[0_8px_20px_rgba(230,94,20,0.25)]"
            >
              {primaryCtaLabel}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
};

const MarketingFooter = ({
  onNavigate,
  onOpenApp,
}: {
  onNavigate: (route: PublicNavRoute) => void;
  onOpenApp: () => void;
}) => (
  <footer className="border-t border-white/5 bg-[#0d0d14] px-5 py-14 text-white sm:px-6">
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/assets/fom-logomark-app.png?v=20260421-logo2" alt="FOM" className="h-8 w-8 object-contain" />
            <span className="text-[16px] font-extrabold text-white">FOM Play</span>
          </div>
          <p className="mt-4 max-w-[280px] text-[14px] leading-[1.65] text-white/35">
            Aplikasi padel untuk live scoring, klasemen, dan ranking. Gratis, langsung jalan.
          </p>
        </div>
        {[
          {
            title: 'Produk',
            links: [
              ['Fitur', 'features'],
              ['Format Americano', 'format-americano'],
              ['Format Mexicano', 'format-mexicano'],
              ['Match Play', 'format-match-play'],
              ['Ranking', 'ranking-info'],
            ],
          },
          {
            title: 'Belajar',
            links: [
              ['Blog', 'blog'],
              ['Tutorial', 'blog'],
              ['FAQ', 'faq-info'],
              ['Apa itu Padel?', 'format-americano'],
            ],
          },
          {
            title: 'Tentang',
            links: [
              ['FOM Play', 'home'],
              ['Kontak', 'home'],
              ['Instagram', 'blog'],
              ['TikTok', 'blog'],
            ],
          },
        ].map((column) => (
          <div key={column.title}>
            <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.08em] text-white/35">{column.title}</p>
            <div className="flex flex-col gap-2.5">
              {column.links.map(([label, route]) => (
                <button
                  key={label}
                  onClick={() => {
                    window.location.assign(getGlobalMarketingNavPath(route as PublicNavRoute));
                  }}
                  className="text-left text-[14px] font-medium text-white/55 transition hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col gap-2 border-t border-white/6 pt-6 text-[13px] text-white/25 md:flex-row md:items-center md:justify-between">
        <div>© 2026 FOM Play · Friends of Motion</div>
        <button onClick={onOpenApp} className="text-left text-[13px] font-semibold text-white/35 transition hover:text-white md:text-right">
          fomplay.asia
        </button>
      </div>
    </div>
  </footer>
);

const PublicPageShell = ({
  currentRoute,
  onNavigate,
  onOpenApp,
  isLoggedIn,
  children,
}: {
  currentRoute: PublicTopLevelRoute;
  onNavigate: (route: PublicNavRoute) => void;
  onOpenApp: () => void;
  isLoggedIn: boolean;
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-white text-[#111827] [font-family:'Plus_Jakarta_Sans','Helvetica_Neue',Arial,sans-serif]">
    <MarketingHeader
      currentRoute={currentRoute}
      onNavigate={onNavigate}
      onOpenApp={onOpenApp}
      isLoggedIn={isLoggedIn}
    />
    <main>{children}</main>
    <MarketingFooter onNavigate={onNavigate} onOpenApp={onOpenApp} />
  </div>
);

const ExploreMoreSection = ({
  title = 'Lanjut baca',
  body = 'Halaman berikutnya membantu visitor memahami fitur, format, dan konteks kompetitif FOM Play dengan lebih cepat.',
  cards,
  onNavigate,
}: {
  title?: string;
  body?: string;
  cards: ExploreCard[];
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => (
  <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
    <div className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
      <div className="max-w-2xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Internal Links</p>
        <h2 className="mt-3 text-[30px] font-black tracking-[-0.04em] text-on-surface">{title}</h2>
        <p className="mt-3 text-[15px] leading-7 text-on-surface/68">{body}</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.route}
            onClick={() => onNavigate(card.route)}
            className="group rounded-[24px] bg-[#fff8f2] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(17,24,39,0.08)]"
          >
            <p className="text-[16px] font-black leading-6 text-on-surface">{card.title}</p>
            <p className="mt-3 text-[14px] leading-6 text-on-surface/66">{card.body}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-primary">
              Buka halaman
              <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  </section>
);

const MarketingHomePage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => {
  const primaryCtaLabel = 'Buka App';

  return (
    <PublicPageShell currentRoute="home" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(230,94,20,0.18),_transparent_44%),radial-gradient(circle_at_bottom_right,_rgba(255,197,145,0.35),_transparent_40%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.18em] text-primary">
              <Zap size={14} />
              PWA • Jalan di HP
            </div>
            <h1 className="mt-5 max-w-3xl text-[40px] font-black leading-[0.94] tracking-[-0.05em] text-on-surface sm:text-[54px]">
              Mabar padel makin seru dengan FOM Play.
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-7 text-on-surface/72 sm:text-[18px]">
              Atur format dan ronde, nikmati live score real-time, dan bagikan klasemen langsung ke Instagram Story tanpa ribet, langsung jadi.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onOpenApp}
                className="cta-shimmer rounded-2xl bg-primary px-6 py-4 text-[15px] font-bold text-white shadow-[0_18px_38px_rgba(230,94,20,0.24)] transition active:scale-[0.98]"
              >
                {primaryCtaLabel}
              </button>
              <button
                onClick={() => onNavigate('features')}
                className="rounded-2xl border border-black/8 bg-white px-6 py-4 text-[15px] font-bold text-on-surface transition active:scale-[0.98]"
              >
                Lihat Fitur
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-2 text-[13px] font-semibold text-on-surface/70">
              {['Americano', 'Mexicano', 'Match Play', 'Ranking Global & Daerah'].map((item) => (
                <span key={item} className="rounded-full border border-black/8 bg-white/92 px-3 py-2">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative mx-auto w-full max-w-[430px]"
          >
            <div className="absolute -left-6 top-8 h-28 w-28 rounded-full bg-[#ffd5bf] blur-3xl" />
            <div className="absolute -right-8 bottom-8 h-36 w-36 rounded-full bg-[#ffe9d8] blur-3xl" />
            <div className="relative overflow-hidden rounded-[34px] border border-black/6 bg-[#181818] p-3 shadow-[0_30px_60px_rgba(17,24,39,0.22)]">
              <div className="rounded-[28px] bg-[linear-gradient(180deg,#fff7f1_0%,#ffffff_48%,#fff3eb_100%)] p-4">
                <div className="rounded-[22px] bg-[#1f2937] p-4 text-white shadow-[0_14px_34px_rgba(17,24,39,0.3)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Live Scoring</p>
                      <h2 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-white">Court 1</h2>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/88">Round 3</div>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[20px] bg-white/6 p-4">
                    <div>
                      <p className="text-sm font-bold">Ari / Bimo</p>
                      <p className="mt-1 text-[12px] text-white/60">Jakarta Selatan</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[32px] font-black tracking-[-0.04em] text-[#ff9d6c]">6 - 4</p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Live</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">Dito / Ezra</p>
                      <p className="mt-1 text-[12px] text-white/60">Jakarta Barat</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-black/6 bg-white p-4 shadow-[0_12px_28px_rgba(17,24,39,0.06)]">
                    <div className="flex items-center gap-2 text-primary">
                      <Share2 size={16} />
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">Shared View</p>
                    </div>
                    <p className="mt-3 text-sm font-bold text-on-surface">Kasih link ke grup. Yang lain bisa pantau skor langsung, nggak perlu install apa-apa.</p>
                  </div>
                  <div className="rounded-[22px] border border-black/6 bg-[#fff3ea] p-4 shadow-[0_12px_28px_rgba(230,94,20,0.08)]">
                    <div className="flex items-center gap-2 text-primary">
                      <Instagram size={16} />
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">Story-Ready</p>
                    </div>
                    <p className="mt-3 text-sm font-bold text-on-surface">Scoreboard-nya udah cakep apa adanya. Screenshot, langsung naik ke Story.</p>
                  </div>
                </div>

                <div className="mt-3 rounded-[22px] border border-black/6 bg-white p-4 shadow-[0_12px_28px_rgba(17,24,39,0.06)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <Globe size={16} />
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]">Ranking</p>
                    </div>
                    <span className="rounded-full bg-primary/8 px-3 py-1 text-[11px] font-bold text-primary">Global & Daerah</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      ['1', 'Falih Harman', '2,940'],
                      ['2', 'Ari Pratama', '2,810'],
                      ['3', 'Bimo Hanif', '2,760'],
                    ].map(([rank, name, score]) => (
                      <div key={rank} className="flex items-center justify-between rounded-2xl bg-[#fff8f3] px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                            {rank}
                          </div>
                          <p className="text-sm font-bold text-on-surface">{name}</p>
                        </div>
                        <p className="text-sm font-black text-primary">{score}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-3 rounded-[28px] border border-black/6 bg-white p-4 shadow-[0_16px_34px_rgba(17,24,39,0.06)] sm:grid-cols-3 sm:p-5">
          {[
            { icon: BarChart2, title: 'Live scoring', body: 'Skor diketik di HP, semua pemain kebaca real-time.' },
            { icon: Share2, title: 'Shareable scoreboard', body: 'Satu tap, hasil jadi gambar yang tinggal share ke grup atau Story.' },
            { icon: Globe, title: 'Ranking global & daerah', body: 'Lihat posisi kamu di kota, regional, atau Indonesia.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[22px] bg-[#fff8f2] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-on-surface">{title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-on-surface/66">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Why FOM Play</p>
          <h2 className="mt-3 text-[32px] font-black tracking-[-0.04em] text-on-surface sm:text-[40px]">
            Begitu pemainnya makin banyak, papan tulis mulai nggak cukup.
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-on-surface/70">
            Jadi host bukan cuma bagi court. Kamu juga yang dikejar pemain soal skor ronde tadi,
            yang ngabarin siapa main sama siapa, dan yang di-tag di grup pas orang nanyain klasemen.
            FOM Play ngambil bagian itu biar kamu bisa balik main.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['Pairing dan rotasi makan waktu, padahal kamu juga mau main', Users, ''],
            ['Pemain nanya klasemen di tengah ronde, dan jawabnya nggak gampang', Trophy, ''],
            ['Semua ngandelin satu orang, begitu dia sibuk alurnya macet', Building2, ''],
            ['App lain minta semua pemain login dulu, dan nggak semua mau repot', Lock, ''],
            ['Screenshot hasil turnamen suka jelek di grup atau Story', Instagram, ''],
            ['Susah tahu kamu level berapa dibanding pemain di kota atau nasional', Award, ''],
          ].map(([text, Icon]) => (
            <div key={text} className="rounded-[26px] border border-black/6 bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.05)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3ea] text-primary">
                <Icon size={20} />
              </div>
              <p className="mt-4 text-[16px] font-bold leading-6 text-on-surface">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="rounded-[32px] bg-[#171717] px-5 py-8 text-white sm:px-8">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/55">Core Features</p>
            <h2 className="mt-3 text-[30px] font-black tracking-[-0.04em] text-white sm:text-[38px]">
              Semua yang kamu butuhin buat ngejalanin game padel, dari awal sampai share hasil.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ['Live Scoring', 'Skor dicatat sekali, semua langsung kebaca.', Trophy],
              ['Klasemen Otomatis', 'Urutan pemain update sendiri tiap kali ada match beres.', BarChart2],
              ['Shared Match View', 'Share satu link, pemain lain bisa pantau tanpa install app.', Share2],
              ['Story-Ready Scoreboard', 'Screenshot hasil game langsung enak dipajang.', Instagram],
              ['Ranking Global & Daerah', 'Cek posisi kamu di kota, daerah, dan nasional.', Globe],
              ['Format Lengkap', 'Americano, Mexicano, atau Match Play, pilih satu, flow-nya udah disiapin.', Zap],
            ].map(([title, body, Icon]) => (
              <div key={title} className="rounded-[24px] border border-white/8 bg-white/6 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#ffb188]">
                  <Icon size={20} />
                </div>
                <p className="mt-4 text-[16px] font-black text-white">{title}</p>
                <p className="mt-2 text-[14px] leading-6 text-white/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">How It Works</p>
          <h2 className="mt-3 text-[32px] font-black tracking-[-0.04em] text-on-surface sm:text-[40px]">
            Mulai game dalam tiga langkah.
          </h2>
        </div>
        <div className="space-y-4">
          {[
            ['01', 'Pilih format, masukin pemain, bagi court.'],
            ['02', 'Skor jalan live sepanjang game.'],
            ['03', 'Klasemen muncul sendiri, hasil tinggal share ke grup.'],
          ].map(([step, body]) => (
            <div key={step} className="flex gap-4 rounded-[24px] border border-black/6 bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.05)]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                {step}
              </div>
              <p className="pt-1 text-[16px] font-semibold leading-6 text-on-surface">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Format Game</p>
            <h2 className="mt-3 text-[32px] font-black tracking-[-0.04em] text-on-surface sm:text-[40px]">
              Mau main format apa hari ini?
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            ['Americano', 'Format padel paling sosial. Pasangan ganti tiap ronde, jadi semua orang main sama semua orang. Pas buat main sama komunitas atau teman baru.', 'format-americano'],
            ['Mexicano', 'Format padel yang dinamis. Ronde berikutnya disusun dari hasil ronde sebelumnya, yang menang lawan yang menang, jadi kompetisinya makin tajam.', 'format-mexicano'],
            ['Match Play', 'Format klasik head-to-head dengan scoring tenis 0, 15, 30, 40. Cocok buat yang mau pertandingan beneran, bukan cuma fun game.', 'format-match-play'],
          ].map(([title, body, route]) => (
            <div key={title} className="rounded-[28px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
              <p className="text-[24px] font-black tracking-[-0.03em] text-on-surface">{title}</p>
              <p className="mt-3 text-[15px] leading-7 text-on-surface/68">{body}</p>
              <button onClick={() => onNavigate(route as PublicTopLevelRoute)} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
                Pelajari format game
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div className="rounded-[30px] bg-[linear-gradient(135deg,#181818_0%,#2a2a2a_100%)] p-6 text-white shadow-[0_22px_50px_rgba(17,24,39,0.16)]">
          <div className="flex items-center gap-2 text-[#ffb188]">
            <Instagram size={18} />
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/58">Sharing & Story</p>
          </div>
          <h2 className="mt-4 max-w-md text-[30px] font-black tracking-[-0.04em] text-white">
            Hasil game nggak cuma di HP host.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-white/72">
            Begitu game jalan, tiap pemain bisa pantau skor dari HP-nya sendiri lewat link yang kamu share.
            Beres game, scoreboard-nya udah bentukan yang enak buat naik Story atau dipajang di grup,
            nggak perlu diedit dulu di Canva.
          </p>
        </div>
        <div className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
          <div className="flex items-center gap-2 text-primary">
            <Globe size={18} />
            <p className="text-[12px] font-bold uppercase tracking-[0.2em]">Ranking</p>
          </div>
          <h2 className="mt-4 max-w-md text-[30px] font-black tracking-[-0.04em] text-on-surface">
            Menang hari ini seru. Jadi yang konsisten, lebih seru lagi.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-on-surface/70">
            Ranking global dan daerah bikin tiap match ada taruhannya. Kamu tahu posisi kamu di komunitas,
            di kota, dan di skala nasional, terus lihat sendiri gimana poinnya gerak tiap kali main.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['Global', 'Lihat posisi kamu di peta padel Indonesia.'],
              ['Daerah', 'Saingan sama pemain di kota kamu sendiri, lebih kebawa.'],
              ['Progress', 'Track MMR kamu tiap minggu, bukan cuma di momen turnamen.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[22px] bg-[#fff6ef] p-4">
                <p className="text-sm font-black text-on-surface">{title}</p>
                <p className="mt-2 text-[13px] leading-6 text-on-surface/66">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="rounded-[32px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Edukasi</p>
              <h2 className="mt-3 text-[30px] font-black tracking-[-0.04em] text-on-surface">
                Pengen ngerti format padel dari dalam?
              </h2>
            </div>
            <button onClick={onOpenApp} className="text-left text-sm font-bold text-primary">
              Buka App
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Apa itu Americano padel', 'Format paling populer di komunitas, begini cara kerjanya.'],
              ['Apa itu Mexicano padel', 'Kenapa Mexicano dibilang paling seru dibanding Americano?'],
              ['Perbedaan Americano vs Mexicano', 'Dua-duanya rotasi pasangan, tapi beda cara ngaturnya.'],
              ['Cara membuat game padel yang rapi untuk komunitas', 'Checklist buat host komunitas, dari bagi court sampai publish hasil.'],
            ].map(([title, subtitle], index) => (
              <button
                key={title}
                onClick={() => {
                  if (index === 0) onNavigate('format-americano');
                  else if (index === 1) onNavigate('format-mexicano');
                  else if (index === 2) onNavigate('education-compare');
                  else onNavigate('features');
                }}
                className="rounded-[24px] bg-[#fff8f2] p-5 text-left"
              >
                <p className="text-[15px] font-bold leading-6 text-on-surface">{title}</p>
                <p className="mt-2 text-[13px] leading-5 text-on-surface/66">{subtitle}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-[13px] font-bold text-primary">
                  Baca selengkapnya
                  <ChevronRight size={15} />
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="mt-3 text-[32px] font-black tracking-[-0.04em] text-on-surface sm:text-[40px]">
            Jawaban singkat untuk pertanyaan yang paling sering muncul.
          </h2>
        </div>
        <div className="mt-8 space-y-4">
          {[
            ['FOM Play itu app untuk apa?', 'Buat ngatur game padel, catat skor live, lihat klasemen, share hasil, dan pantau ranking pemain.'],
            ['Apakah pemain lain harus login untuk melihat hasil?', 'Tidak selalu. Tinggal share link ke grup, lalu pemain lain bisa ikut pantau tanpa flow yang merepotkan.'],
            ['Apakah FOM Play bisa dipakai di HP?', 'Ya. FOM Play dirancang mobile-first agar nyaman dipakai saat game berjalan.'],
            ['Format apa saja yang didukung?', 'Americano, Mexicano, dan Match Play.'],
            ['Apakah scoreboard bisa dibagikan?', 'Ya. Hasil pertandingan bisa langsung di-share ke grup atau Story tanpa ribet edit ulang.'],
            ['Apa manfaat ranking global dan daerah?', 'Biar pemain tahu posisi mereka di komunitas, kota, sampai level nasional.'],
          ].map(([question, answer]) => (
            <div key={question} className="rounded-[26px] border border-black/6 bg-white p-5 shadow-[0_14px_30px_rgba(17,24,39,0.05)]">
              <p className="text-[16px] font-black text-on-surface">{question}</p>
              <p className="mt-3 text-[15px] leading-7 text-on-surface/68">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">
        <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#e65e14_0%,#ff8843_100%)] px-6 py-8 text-white shadow-[0_24px_60px_rgba(230,94,20,0.24)] sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/68">Final CTA</p>
            <h2 className="mt-3 text-[34px] font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-[44px]">
              Buka game-nya di court, bukan ribetnya di grup.
            </h2>
            <p className="mt-4 max-w-2xl text-[16px] leading-7 text-white/82">
              FOM Play bantu host ngerapiin skor, klasemen, dan hasil share tanpa bikin kamu jadi admin penuh waktu.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onOpenApp}
                className="rounded-2xl bg-white px-6 py-4 text-[15px] font-black text-primary transition active:scale-[0.98]"
              >
                {primaryCtaLabel}
              </button>
              <button
                onClick={() => onNavigate('format-americano')}
                className="rounded-2xl border border-white/24 px-6 py-4 text-[15px] font-bold text-white transition active:scale-[0.98]"
              >
                Pelajari Format Game
              </button>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
};

const MarketingFeaturesPage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => (
  <PublicPageShell currentRoute="features" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-18">
      <div className="max-w-3xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Fitur FOM Play</p>
        <h1 className="mt-3 text-[38px] font-black leading-[0.95] tracking-[-0.05em] text-on-surface sm:text-[52px]">
          Semua yang kamu butuhin buat ngejalanin game padel, dari awal sampai share hasil.
        </h1>
        <p className="mt-5 text-[17px] leading-7 text-on-surface/70">
          FOM Play ngerapiin jalannya game dari setup sampai hasil akhir. Skor masuk live, klasemen update sendiri,
          lalu hasilnya tinggal share ke grup atau Story.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Live scoring yang kebaca semua orang.', 'Skor diketik di HP host, lalu pemain lain bisa lihat update-nya real-time tanpa nunggu rekap akhir.', Trophy],
          ['Klasemen yang update sendiri.', 'Begitu satu match selesai, urutan pemain langsung berubah tanpa hitung manual di papan atau chat.', BarChart2],
          ['Hasil gampang dibagi ke pemain.', 'Share satu link ke grup, lalu semua orang bisa pantau jalannya game tanpa perlu install app.', Share2],
          ['Scoreboard yang enak dipajang.', 'Hasilnya sudah cukup rapi buat langsung naik ke Story atau dikirim ke grup komunitas.', Instagram],
          ['Ranking global dan daerah.', 'Pemain bisa cek posisi mereka di komunitas, kota, sampai skala nasional.', Globe],
          ['Dibuat buat format padel nyata.', 'Americano, Mexicano, dan Match Play sudah disiapkan dalam flow yang familiar buat host padel.', Zap],
        ].map(([title, body, Icon]) => (
          <article key={title} className="rounded-[28px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3ea] text-primary">
              <Icon size={20} />
            </div>
            <h2 className="mt-4 text-[20px] font-black tracking-[-0.03em] text-on-surface">{title}</h2>
            <p className="mt-3 text-[15px] leading-7 text-on-surface/68">{body}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[30px] bg-[#171717] p-6 text-white shadow-[0_22px_50px_rgba(17,24,39,0.16)]">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/58">Nilai utama</p>
          <h2 className="mt-4 text-[30px] font-black tracking-[-0.04em] text-white">
            Buat host, kerjaannya bukan cuma nyatet skor.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-white/74">
            Kamu juga yang ditanya klasemen, dimintain update hasil, dan disuruh share scoreboard ke grup.
            FOM Play ngambil bagian itu biar flow game tetap jalan dan kamu nggak ketahan jadi admin terus.
          </p>
        </div>
        <div className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Lanjut eksplorasi</p>
          <div className="mt-4 grid gap-3">
            {[
              ['Pelajari Americano', 'format-americano'],
              ['Pelajari Mexicano', 'format-mexicano'],
              ['Pelajari Match Play', 'format-match-play'],
              ['Bandingkan format', 'education-compare'],
            ].map(([label, route]) => (
              <button
                key={label}
                onClick={() => onNavigate(route as PublicTopLevelRoute)}
                className="flex items-center justify-between rounded-[22px] bg-[#fff8f2] px-4 py-4 text-left"
              >
                <span className="text-[15px] font-bold text-on-surface">{label}</span>
                <ChevronRight size={18} className="text-primary" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>

    <ExploreMoreSection
      title="Lanjut eksplorasi FOM Play"
      body="Setelah melihat fitur utama, visitor biasanya ingin tahu format game yang didukung dan bagaimana ranking memberi konteks yang lebih panjang."
      onNavigate={onNavigate}
      cards={[
        {
          route: 'format-americano',
          title: 'Apa itu Americano padel?',
          body: 'Pelajari format sosial-kompetitif yang cocok untuk komunitas dengan banyak rotasi.',
        },
        {
          route: 'format-mexicano',
          title: 'Apa itu Mexicano padel?',
          body: 'Lihat bagaimana ronde berikutnya disusun dari hasil sebelumnya dan bikin game makin kompetitif.',
        },
        {
          route: 'ranking-info',
          title: 'Kenapa ranking penting?',
          body: 'Pahami bagaimana ranking global dan daerah bikin tiap match terasa ada taruhannya.',
        },
      ]}
    />

    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#e65e14_0%,#ff8843_100%)] px-6 py-8 text-white shadow-[0_24px_60px_rgba(230,94,20,0.24)] sm:px-8 sm:py-10">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/68">CTA</p>
        <h2 className="mt-3 text-[34px] font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-[42px]">
          Kalau game ingin terasa lebih rapi, mulainya dari sini.
        </h2>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={onOpenApp} className="rounded-2xl bg-white px-6 py-4 text-[15px] font-black text-primary">
            Buka App
          </button>
          <button onClick={() => onNavigate('home')} className="rounded-2xl border border-white/24 px-6 py-4 text-[15px] font-bold text-white">
            Kembali ke Home
          </button>
        </div>
      </div>
    </section>
  </PublicPageShell>
);

const MarketingAmericanoPage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => (
  <PublicPageShell currentRoute="format-americano" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-18">
      <div className="max-w-3xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Format Game</p>
        <h1 className="mt-3 text-[38px] font-black leading-[0.95] tracking-[-0.05em] text-on-surface sm:text-[52px]">
          Apa itu Americano padel?
        </h1>
        <p className="mt-5 text-[17px] leading-7 text-on-surface/70">
          Americano adalah format padel paling sosial. Pasangan ganti tiap ronde, jadi semua orang main sama semua orang
          sambil tetap ngumpulin poin. Cocok buat komunitas yang pengen ramai, tapi tetap ada serunya.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {[
          ['Cara kerja Americano', 'Di tiap ronde, pasangan dan lawan berubah. Jadi semua orang kebagian main dengan kombinasi yang beda-beda, lalu poinnya dikumpulin sampai akhir.', Users],
          ['Kenapa populer', 'Format ini enak buat komunitas karena pemain baru tetap kebawa, pemain lama tetap kompetitif, dan suasananya nggak terlalu kaku.', Star],
          ['Tantangan manual', 'Begitu pemain makin banyak, pairing, rotasi, dan klasemen cepat bikin host sibuk sendiri sambil yang lain nanya ronde berikutnya.', AlertTriangle],
        ].map(([title, body, Icon]) => (
          <article key={title} className="rounded-[28px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3ea] text-primary">
              <Icon size={20} />
            </div>
            <h2 className="mt-4 text-[20px] font-black tracking-[-0.03em] text-on-surface">{title}</h2>
            <p className="mt-3 text-[15px] leading-7 text-on-surface/68">{body}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2">
      <div className="rounded-[30px] bg-[#171717] p-6 text-white shadow-[0_22px_50px_rgba(17,24,39,0.16)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/58">Cocok untuk siapa</p>
        <div className="mt-5 space-y-3">
          {[
            'Komunitas mingguan',
            'Game sosial dengan banyak pemain',
            'Host yang pengen semua orang kebagian rotasi',
            'Sesi main yang tetap kompetitif tanpa berasa kayak turnamen resmi',
          ].map((item) => (
            <div key={item} className="rounded-[22px] bg-white/8 px-4 py-3 text-[15px] font-semibold text-white">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Cara menjalankan di FOM Play</p>
        <p className="mt-4 text-[15px] leading-7 text-on-surface/70">
          Pilih Americano, masukin pemain, bagi court, lalu jalanin ronde sambil update skor live. Klasemen bakal gerak sendiri,
          jadi kamu nggak perlu hitung ulang atau jelasin posisi pemain satu-satu di grup.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={onOpenApp} className="rounded-2xl bg-primary px-6 py-4 text-[15px] font-black text-white">
            Buka App
          </button>
          <button onClick={() => onNavigate('format-mexicano')} className="rounded-2xl border border-black/8 bg-[#fff8f2] px-6 py-4 text-[15px] font-bold text-on-surface">
            Lihat Mexicano
          </button>
          <button onClick={() => onNavigate('education-compare')} className="rounded-2xl border border-black/8 bg-white px-6 py-4 text-[15px] font-bold text-on-surface">
            Bandingkan format
          </button>
        </div>
      </div>
    </section>

    <ExploreMoreSection
      title="Baca format terkait"
      body="Americano paling sering dibandingkan dengan Mexicano dan Match Play. Tiga halaman ini membantu host memilih format yang paling pas untuk game mereka."
      onNavigate={onNavigate}
      cards={[
        {
          route: 'format-mexicano',
          title: 'Lihat Mexicano',
          body: 'Cocok kalau kamu pengen ronde berikutnya makin kompetitif karena disusun dari hasil sebelumnya.',
        },
        {
          route: 'education-compare',
          title: 'Bandingkan Americano vs Mexicano',
          body: 'Ringkasan cepat buat nentuin mau game yang lebih sosial atau yang lebih tajam persaingannya.',
        },
        {
          route: 'format-match-play',
          title: 'Lihat Match Play',
          body: 'Pilihan buat pertandingan head-to-head yang lebih klasik dan nggak pakai rotasi pasangan.',
        },
      ]}
    />
  </PublicPageShell>
);

const MarketingMexicanoPage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => (
  <PublicPageShell currentRoute="format-mexicano" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-18">
      <div className="max-w-3xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Format Game</p>
        <h1 className="mt-3 text-[38px] font-black leading-[0.95] tracking-[-0.05em] text-on-surface sm:text-[52px]">
          Apa itu Mexicano padel?
        </h1>
        <p className="mt-5 text-[17px] leading-7 text-on-surface/70">
          Mexicano adalah format padel yang dinamis. Ronde berikutnya disusun dari hasil ronde sebelumnya,
          jadi yang menang ketemu yang menang dan kompetisinya makin tajam seiring game jalan.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {[
          ['Cara kerja Mexicano', 'Setelah satu ronde selesai, posisi pemain berubah. Dari situ ronde berikutnya disusun lagi berdasarkan hasil barusan, bukan random.', TrendingUp],
          ['Bedanya dengan Americano', 'Kalau Americano lebih kuat di variasi rotasi, Mexicano lebih kerasa di pergerakan posisi dan siapa naik siapa turun.', Trophy],
          ['Tantangan manual', 'Kalau masih manual, ranking dan pairing ronde berikutnya cepat bikin host keteteran karena semuanya harus diurut lagi tiap selesai match.', AlertTriangle],
        ].map(([title, body, Icon]) => (
          <article key={title} className="rounded-[28px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3ea] text-primary">
              <Icon size={20} />
            </div>
            <h2 className="mt-4 text-[20px] font-black tracking-[-0.03em] text-on-surface">{title}</h2>
            <p className="mt-3 text-[15px] leading-7 text-on-surface/68">{body}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2">
      <div className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Kenapa host suka Mexicano</p>
        <p className="mt-4 text-[15px] leading-7 text-on-surface/70">
          Mexicano enak kalau kamu mau game yang kerasa naik tensinya. Pemain nggak cuma main ronde demi ronde,
          tapi juga tahu hasil barusan bakal ngaruh ke lawan berikutnya.
        </p>
        <div className="mt-5 space-y-3">
          {[
            'Ranking terus berubah sepanjang game',
            'Pemain langsung kebayang siapa lagi naik',
            'Cocok kalau mau level pemain lebih kebaca',
          ].map((item) => (
            <div key={item} className="rounded-[22px] bg-[#fff8f2] px-4 py-3 text-[15px] font-semibold text-on-surface">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[30px] bg-[#171717] p-6 text-white shadow-[0_22px_50px_rgba(17,24,39,0.16)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/58">Cara menjalankan di FOM Play</p>
        <p className="mt-4 text-[15px] leading-7 text-white/74">
          Di FOM Play, host tinggal update skor. Posisi pemain dan ronde berikutnya ikut kebentuk dari hasil yang masuk,
          jadi kamu nggak perlu repot nyusun ulang semuanya habis tiap match.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={onOpenApp} className="rounded-2xl bg-white px-6 py-4 text-[15px] font-black text-primary">
            Buka App
          </button>
          <button onClick={() => onNavigate('format-americano')} className="rounded-2xl border border-white/18 px-6 py-4 text-[15px] font-bold text-white">
            Lihat Americano
          </button>
          <button onClick={() => onNavigate('education-compare')} className="rounded-2xl border border-white/18 px-6 py-4 text-[15px] font-bold text-white">
            Bandingkan format
          </button>
        </div>
      </div>
    </section>

    <ExploreMoreSection
      title="Lanjut ke format lain"
      body="Visitor yang membaca Mexicano biasanya juga ingin melihat pembanding sosial-kompetitifnya dan opsi format yang lebih klasik."
      onNavigate={onNavigate}
      cards={[
        {
          route: 'format-americano',
          title: 'Lihat Americano',
          body: 'Format yang lebih santai dan kuat di rotasi pasangan kalau kamu pengen suasana komunitas tetap cair.',
        },
        {
          route: 'education-compare',
          title: 'Bandingkan Americano vs Mexicano',
          body: 'Ringkasan cepat buat milih antara format yang lebih sosial atau yang lebih nendang kompetisinya.',
        },
        {
          route: 'ranking-info',
          title: 'Lihat halaman Ranking',
          body: 'Pahami kenapa Mexicano cocok kalau kamu pengen tiap ronde berasa ngubah posisi pemain.',
        },
      ]}
    />
  </PublicPageShell>
);

const MarketingMatchPlayPage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => (
  <PublicPageShell currentRoute="format-match-play" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-18">
      <div className="max-w-3xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Format Game</p>
        <h1 className="mt-3 text-[38px] font-black leading-[0.95] tracking-[-0.05em] text-on-surface sm:text-[52px]">
          Match Play padel untuk pertandingan yang lebih klasik.
        </h1>
        <p className="mt-5 text-[17px] leading-7 text-on-surface/70">
          Match Play adalah format klasik head-to-head dengan scoring tenis 0, 15, 30, 40. Cocok buat yang pengen
          pertandingan beneran, bukan format rotasi yang santai.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {[
          ['Scoring yang familiar', 'Kalau pemain sudah biasa main tenis atau padel kompetitif, format ini paling gampang dipahami karena alurnya sudah akrab.', Trophy],
          ['Cocok untuk pertandingan fokus', 'Pilihan ini pas saat satu matchup memang mau dijaga serius, bukan dibikin muter ke banyak pasangan dan ronde.', Zap],
          ['Lebih rapi saat live', 'Dengan live scoring, poin sampai hasil akhir tetap kebaca jelas tanpa host perlu teriak-teriak update ke pinggir court.', BarChart2],
        ].map(([title, body, Icon]) => (
          <article key={title} className="rounded-[28px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3ea] text-primary">
              <Icon size={20} />
            </div>
            <h2 className="mt-4 text-[20px] font-black tracking-[-0.03em] text-on-surface">{title}</h2>
            <p className="mt-3 text-[15px] leading-7 text-on-surface/68">{body}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2">
      <div className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Kapan memilih Match Play</p>
        <div className="mt-5 space-y-3">
          {[
            'Saat ingin pertandingan head-to-head terasa jelas',
            'Saat pemain lebih nyaman dengan scoring klasik',
            'Saat host ingin flow yang sederhana namun tetap kompetitif',
          ].map((item) => (
            <div key={item} className="rounded-[22px] bg-[#fff8f2] px-4 py-3 text-[15px] font-semibold text-on-surface">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[30px] bg-[#171717] p-6 text-white shadow-[0_22px_50px_rgba(17,24,39,0.16)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/58">Cara pakai di FOM Play</p>
        <p className="mt-4 text-[15px] leading-7 text-white/74">
          Pilih Match Play saat setup, lalu jalanin pertandingan sambil update skor live dari HP. Hasil akhirnya tinggal share,
          jadi penonton atau pemain lain nggak perlu nunggu recap manual sesudah game.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={onOpenApp} className="rounded-2xl bg-white px-6 py-4 text-[15px] font-black text-primary">
            Buka App
          </button>
          <button onClick={() => onNavigate('format-americano')} className="rounded-2xl border border-white/18 px-6 py-4 text-[15px] font-bold text-white">
            Lihat Americano
          </button>
          <button onClick={() => onNavigate('format-mexicano')} className="rounded-2xl border border-white/18 px-6 py-4 text-[15px] font-bold text-white">
            Lihat Mexicano
          </button>
        </div>
      </div>
    </section>

    <ExploreMoreSection
      title="Format lain yang bisa dibandingkan"
      body="Match Play lebih mudah dipahami jika visitor juga melihat format rotasi seperti Americano dan Mexicano."
      onNavigate={onNavigate}
      cards={[
        {
          route: 'format-americano',
          title: 'Pelajari Americano',
          body: 'Kalau kamu lebih butuh format sosial dengan rotasi pasangan yang terus ganti.',
        },
        {
          route: 'format-mexicano',
          title: 'Pelajari Mexicano',
          body: 'Kalau kamu pengen posisi pemain terus berubah dan kompetisinya naik tiap ronde.',
        },
        {
          route: 'features',
          title: 'Lihat fitur FOM Play',
          body: 'Balik ke ringkasan fitur buat lihat live scoring, share hasil, dan ranking dalam satu halaman.',
        },
      ]}
    />
  </PublicPageShell>
);

const MarketingCompareFormatsPage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => (
  <PublicPageShell currentRoute="education-compare" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-18">
      <div className="max-w-3xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Edukasi</p>
        <h1 className="mt-3 text-[38px] font-black leading-[0.95] tracking-[-0.05em] text-on-surface sm:text-[52px]">
          Americano vs Mexicano: apa bedanya?
        </h1>
        <p className="mt-5 text-[17px] leading-7 text-on-surface/70">
          Dua-duanya sama-sama format padel berbasis ronde, tapi rasanya beda. Americano lebih kuat di rotasi dan suasana sosial,
          sementara Mexicano lebih kuat di persaingan karena ronde berikutnya dipengaruhi hasil sebelumnya.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Americano</p>
          <h2 className="mt-3 text-[28px] font-black tracking-[-0.04em] text-on-surface">Lebih sosial, lebih cair, dan rotasinya lebih berasa.</h2>
          <div className="mt-5 space-y-3">
            {[
              'Pasangan dan lawan lebih sering ganti',
              'Semua pemain cenderung tetap kebagian interaksi',
              'Cocok buat komunitas yang pengen ramai tanpa terlalu tegang',
            ].map((item) => (
              <div key={item} className="rounded-[22px] bg-[#fff8f2] px-4 py-3 text-[15px] font-semibold text-on-surface">
                {item}
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-[30px] bg-[#171717] p-6 text-white shadow-[0_22px_50px_rgba(17,24,39,0.16)]">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/58">Mexicano</p>
          <h2 className="mt-3 text-[28px] font-black tracking-[-0.04em] text-white">Lebih tajam, karena posisi pemain terus berubah.</h2>
          <div className="mt-5 space-y-3">
            {[
              'Hasil satu ronde langsung ngaruh ke ronde berikutnya',
              'Pemain lebih gampang ngerasa siapa lagi naik dan siapa turun',
              'Cocok kalau host pengen game yang lebih kompetitif',
            ].map((item) => (
              <div key={item} className="rounded-[22px] bg-white/8 px-4 py-3 text-[15px] font-semibold text-white">
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>

    <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
      <div className="rounded-[30px] border border-black/6 bg-white p-6 shadow-[0_16px_34px_rgba(17,24,39,0.06)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Ringkasan cepat</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            'Americano lebih menekankan variasi rotasi',
            'Mexicano lebih menekankan pergerakan posisi',
            'Americano cocok buat komunitas yang pengen semua orang tetap kebagian main',
            'Mexicano cocok kalau kamu mau tiap ronde berasa lebih penting',
          ].map((item) => (
            <div key={item} className="rounded-[22px] bg-[#fff8f2] px-4 py-4 text-[15px] font-semibold text-on-surface">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => onNavigate('format-americano')} className="rounded-2xl bg-primary px-6 py-4 text-[15px] font-black text-white">
            Lihat Americano
          </button>
          <button onClick={() => onNavigate('format-mexicano')} className="rounded-2xl border border-black/8 bg-white px-6 py-4 text-[15px] font-bold text-on-surface">
            Lihat Mexicano
          </button>
          <button onClick={() => onNavigate('format-match-play')} className="rounded-2xl border border-black/8 bg-[#fff8f2] px-6 py-4 text-[15px] font-bold text-on-surface">
            Lihat Match Play
          </button>
          <button onClick={onOpenApp} className="rounded-2xl border border-black/8 bg-white px-6 py-4 text-[15px] font-bold text-on-surface">
            Buka App
          </button>
        </div>
      </div>
    </section>

    <ExploreMoreSection
      title="Buka halaman pendukung"
      body="Setelah membaca perbandingan, langkah terbaik biasanya adalah melihat detail format atau langsung memahami bagaimana fitur dan ranking bekerja di FOM Play."
      onNavigate={onNavigate}
      cards={[
        {
          route: 'format-americano',
          title: 'Detail Americano',
          body: 'Lihat kenapa format ini cocok buat komunitas dan gimana rotasinya jalan dari ronde ke ronde.',
        },
        {
          route: 'format-mexicano',
          title: 'Detail Mexicano',
          body: 'Pahami kenapa format ini kuat kalau kamu mau hasil tiap ronde langsung ngaruh ke ronde berikutnya.',
        },
        {
          route: 'features',
          title: 'Lihat fitur lengkap',
          body: 'Pelajari gimana FOM Play bantu dari setup game sampai hasil akhirnya siap di-share.',
        },
      ]}
    />
  </PublicPageShell>
);

const MarketingRankingPage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => {
  const rankingPillars = [
    {
      icon: Globe,
      title: 'Ranking global',
      body: 'Lihat posisi kamu di peta padel Indonesia, bukan cuma di satu grup main.',
    },
    {
      icon: MapPin,
      title: 'Ranking daerah',
      body: 'Bandingin performa dengan pemain di kota dan komunitas yang lebih dekat.',
    },
    {
      icon: TrendingUp,
      title: 'Progress MMR',
      body: 'Track naik turunnya rating dari minggu ke minggu setiap selesai game.',
    },
    {
      icon: Trophy,
      title: 'Hasil yang kebaca',
      body: 'Setiap skor yang masuk bantu bikin klasemen dan peringkat terasa hidup.',
    },
    {
      icon: Users,
      title: 'Rivalitas sehat',
      body: 'Pemain punya konteks baru buat ngobrol, rematch, dan balik main lagi.',
    },
    {
      icon: Award,
      title: 'Level pemain',
      body: 'Bantu pemain ngerti posisi mereka tanpa harus menebak dari satu match saja.',
    },
  ];

  const leaders = [
    ['1', 'Andi Pratama', 'Jakarta Selatan', '2,940', '+42'],
    ['2', 'Cika Maharani', 'Bandung', '2,875', '+28'],
    ['3', 'Bimo Hanif', 'Surabaya', '2,810', '+16'],
    ['4', 'Dani Putra', 'Bali', '2,760', '+9'],
  ];

  return (
    <PublicPageShell currentRoute="ranking-info" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
      <section className="bg-white px-5 py-14 sm:px-6 md:py-20">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em] text-[#ff5500]">Ranking</p>
              <h1 className="max-w-3xl text-[clamp(32px,8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#111827]">
                Ranking global dan daerah di FOM Play.
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-[#6b7280] md:text-[18px]">
                Bukan cuma rekap siapa menang hari ini. Ranking membantu pemain melihat posisi, progress MMR, dan konsistensi mereka dari game ke game.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onOpenApp}
                  className="h-12 rounded-xl bg-[#ff5500] px-6 text-[15px] font-extrabold text-white shadow-[0_4px_20px_rgba(230,94,20,0.22)] transition active:scale-[0.98]"
                >
                  Buka App
                </button>
                <button
                  onClick={() => {
                    window.location.assign('/#fitur');
                  }}
                  className="h-12 rounded-xl border border-black/8 bg-white px-6 text-[15px] font-bold text-[#111827] transition active:scale-[0.98]"
                >
                  Lihat fitur dulu
                </button>
              </div>

              <div className="mt-8 rounded-[24px] border border-black/[0.05] bg-[#f7f7fa] p-5">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8e8e93]">Cara ranking bergerak</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {[
                    ['01', 'Skor masuk live'],
                    ['02', 'MMR dihitung'],
                    ['03', 'Ranking update'],
                  ].map(([step, label]) => (
                    <div key={step} className="rounded-2xl bg-white p-4 shadow-[0_4px_14px_rgba(17,24,39,0.04)]">
                      <p className="text-[12px] font-extrabold text-[#ff5500]">{step}</p>
                      <p className="mt-2 text-[14px] font-bold leading-5 text-[#111827]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-black/[0.05] bg-[#f7f7fa] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8e8e93]">MMR kamu</p>
                  <span className="rounded-full bg-[#18a486]/10 px-2.5 py-1 text-[11px] font-bold text-[#18a486]">+42</span>
                </div>
                <div className="mt-5 flex items-end gap-2">
                  <p className="text-[42px] font-extrabold tracking-[-0.04em] text-[#111827]">2,940</p>
                  <p className="pb-2 text-[13px] font-semibold text-[#6b7280]">Elite</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/6">
                  <div className="h-full w-[72%] rounded-full bg-[#ff5500]" />
                </div>
                <p className="mt-3 text-[13px] leading-6 text-[#6b7280]">Butuh 260 poin lagi untuk masuk Master.</p>
              </div>

              <div className="rounded-[24px] bg-[#111827] p-5 text-white">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/40">Posisi sekarang</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ['Global', '#18'],
                    ['Jakarta', '#3'],
                    ['Bulan ini', '+6'],
                    ['Match', '24'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/8 p-3">
                      <p className="text-[22px] font-extrabold tracking-[-0.03em] text-white">{value}</p>
                      <p className="mt-1 text-[11px] font-semibold text-white/45">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-black/[0.05] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.05)] sm:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#ff5500]">Leaderboard preview</p>
                    <h2 className="mt-1 text-[22px] font-extrabold tracking-[-0.025em] text-[#111827]">Top pemain minggu ini</h2>
                  </div>
                  <span className="rounded-full bg-[#ff5500]/10 px-3 py-1 text-[11px] font-bold text-[#ff5500]">Live</span>
                </div>
                <div className="mt-5 divide-y divide-black/[0.06]">
                  {leaders.slice(0, 3).map(([rank, name, city, score, delta], index) => (
                    <div key={name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold',
                        index === 0 ? 'bg-[#ff5500] text-white' : 'bg-[#ff5500]/8 text-[#ff5500]'
                      )}>
                        {rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-[#111827]">{name}</p>
                        <p className="mt-0.5 text-[12px] text-[#8e8e93]">{city}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-extrabold text-[#111827]">{score}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-[#18a486]">{delta}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7fa] px-5 py-14 sm:px-6 md:py-18">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="mb-8 md:mb-10">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em] text-[#ff5500]">Kenapa ranking?</p>
            <h2 className="max-w-2xl text-[clamp(26px,8vw,38px)] font-extrabold leading-[1.12] tracking-[-0.025em] text-[#111827]">
              Bukan cuma menang kalah. Progress-nya ikut kelihatan.
            </h2>
            <p className="mt-4 max-w-[560px] text-[15px] leading-[1.65] text-[#6b7280] md:text-[17px]">
              Dari live score sampai MMR, FOM Play bantu komunitas punya data yang rapi tanpa bikin host kerja dua kali.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rankingPillars.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-[20px] border border-black/[0.04] bg-[#f7f7fa] p-6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_30px_rgba(17,24,39,0.08)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff5500]/8 text-[#ff5500]">
                  <Icon size={19} />
                </div>
                <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#111827] md:text-[17px]">{title}</h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-[#6b7280]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-6 md:py-20">
        <div className="mx-auto grid w-full max-w-[1120px] gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] bg-[#111827] p-6 text-white shadow-[0_20px_48px_rgba(17,24,39,0.16)] md:p-8">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/40">Untuk pemain</p>
            <h2 className="mt-3 text-[28px] font-extrabold leading-[1.12] tracking-[-0.025em] text-white md:text-[38px]">
              Ada alasan buat balik main minggu depan.
            </h2>
            <div className="mt-6 space-y-3">
              {[
                'Lihat MMR naik turun dari minggu ke minggu',
                'Tahu posisi kamu di komunitas, kota, dan nasional',
                'Punya target baru setelah setiap sesi main',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/8 px-4 py-3 text-[14px] font-semibold leading-6 text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-black/[0.04] bg-white p-6 shadow-[0_8px_30px_rgba(17,24,39,0.05)] md:p-8">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#ff5500]">Untuk host dan komunitas</p>
            <h2 className="mt-3 text-[28px] font-extrabold leading-[1.12] tracking-[-0.025em] text-[#111827] md:text-[38px]">
              Game terasa lebih hidup saat hasilnya punya cerita.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-[#6b7280]">
              Ranking bikin scoreboard tidak berhenti di rekap akhir. Pemain bisa lihat siapa lagi naik, siapa mengejar, dan kenapa next game terasa worth it.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['Engagement', 'Bahan obrolan setelah main.'],
                ['Retention', 'Pemain punya target balik lagi.'],
                ['Fair play', 'Level kebaca lewat data.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl bg-[#fff6ef] p-4">
                  <p className="text-[14px] font-bold text-[#111827]">{title}</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#6b7280]">{body}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onOpenApp}
                className="h-12 rounded-xl bg-[#ff5500] px-6 text-[15px] font-extrabold text-white shadow-[0_4px_20px_rgba(230,94,20,0.22)] transition active:scale-[0.98]"
              >
                Coba Gratis
              </button>
              <button
                onClick={() => {
                  window.location.assign('/#format');
                }}
                className="h-12 rounded-xl border border-black/8 bg-white px-6 text-[15px] font-bold text-[#111827] transition active:scale-[0.98]"
              >
                Lihat Mexicano
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 md:pb-24">
        <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[24px] bg-[#ff5500] p-6 text-white shadow-[0_18px_40px_rgba(230,94,20,0.22)] md:p-10">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/72">Mulai dari satu game</p>
          <h2 className="mt-3 max-w-3xl text-[30px] font-extrabold leading-[1.08] tracking-[-0.025em] text-white md:text-[44px]">
            Jalankan game berikutnya, biarkan ranking ikut update.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-white/78 md:text-[16px]">
            Buka app, pilih format, masukkan pemain, lalu update skor live dari HP. Klasemen dan progress pemain jadi lebih rapi.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onOpenApp}
              className="h-12 rounded-xl bg-white px-6 text-[15px] font-extrabold text-[#ff5500] transition active:scale-[0.98]"
            >
              Buka App
            </button>
            <button
              onClick={() => {
                window.location.assign('/#fitur');
              }}
              className="h-12 rounded-xl border border-white/24 px-6 text-[15px] font-bold text-white transition active:scale-[0.98]"
            >
              Lihat fitur dulu
            </button>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
};

const MarketingFaqPage = ({
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: PublicTopLevelRoute) => void;
}) => {
  return (
    <PublicPageShell currentRoute="faq-info" onNavigate={onNavigate} onOpenApp={onOpenApp} isLoggedIn={isLoggedIn}>
      <section className="bg-white px-5 py-14 sm:px-6 md:py-20">
        <div className="mx-auto w-full max-w-[920px]">
          <div className="mb-10 md:mb-12">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em] text-[#ff5500]">FAQ</p>
            <h1 className="max-w-3xl text-[clamp(32px,8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#111827]">
              Pertanyaan umum tentang FOM Play.
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-[#6b7280] md:text-[18px]">
              Jawaban singkat tentang app, format game, live scoring, share hasil, dan ranking pemain.
            </p>
          </div>

          <div className="grid gap-4">
            {FAQ_ENTRIES.map(({ question, answer }) => (
              <article key={question} className="rounded-[20px] border border-black/[0.05] bg-[#f7f7fa] p-5 md:p-6">
                <h2 className="text-[16px] font-bold tracking-[-0.01em] text-[#111827] md:text-[18px]">{question}</h2>
                <p className="mt-3 text-[14px] leading-[1.7] text-[#6b7280] md:text-[15px]">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 md:pb-24">
        <div className="mx-auto w-full max-w-[920px] overflow-hidden rounded-[24px] bg-[#ff5500] p-6 text-white shadow-[0_18px_40px_rgba(230,94,20,0.22)] md:p-9">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/72">Coba FOM Play</p>
          <h2 className="mt-3 max-w-2xl text-[28px] font-extrabold leading-[1.08] tracking-[-0.025em] text-white md:text-[40px]">
            Mau langsung coba flow live scoring dan klasemen otomatis?
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-white/78">
            Buka app, pilih format, masukin pemain, lalu mulai game dari HP.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onOpenApp}
              className="h-12 rounded-xl bg-white px-6 text-[15px] font-extrabold text-[#ff5500] transition active:scale-[0.98]"
            >
              Buka App
            </button>
            <button
              onClick={() => {
                window.location.assign('/#fitur');
              }}
              className="h-12 rounded-xl border border-white/24 px-6 text-[15px] font-bold text-white transition active:scale-[0.98]"
            >
              Lihat fitur dulu
            </button>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
};

export const PublicMarketingRouter = ({
  route,
  isLoggedIn,
  onOpenApp,
  onNavigate,
}: {
  route: PublicTopLevelRoute;
  isLoggedIn: boolean;
  onOpenApp: () => void;
  onNavigate: (route: TopLevelRoute) => void;
}) => {
  const safeNavigate = (nextRoute: PublicNavRoute) => onNavigate(nextRoute);

  if (route === 'features') {
    return <MarketingFeaturesPage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
  }
  if (route === 'format-americano') {
    return <MarketingAmericanoPage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
  }
  if (route === 'format-mexicano') {
    return <MarketingMexicanoPage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
  }
  if (route === 'format-match-play') {
    return <MarketingMatchPlayPage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
  }
  if (route === 'education-compare') {
    return <MarketingCompareFormatsPage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
  }
  if (route === 'ranking-info') {
    return <MarketingRankingPage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
  }
  if (route === 'faq-info') {
    return <MarketingFaqPage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
  }
  return <MarketingHomePage isLoggedIn={isLoggedIn} onOpenApp={onOpenApp} onNavigate={safeNavigate} />;
};
