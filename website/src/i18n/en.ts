// Copy bahasa Inggris (default locale). Angka di proof strip masih placeholder
// — ganti dengan data asli sebelum cutover produksi (lihat docs/BLOG_REVAMP_PLAN.md §3).
const en = {
  meta: {
    title: 'FOM Play — Padel Live Scoring, Global Ranking & Toxic Mode',
    description:
      'FOM Play keeps score, sorts the standings, and ranks every player. Live scoring, global MMR ranking, FOM Rewind recaps, and a Toxic Mode that makes losing very public.',
  },
  nav: {
    features: 'Features',
    toxicMode: 'Toxic Mode',
    ranking: 'Ranking',
    formats: 'Formats',
    blog: 'Blog',
    openApp: 'Open App',
  },
  hero: {
    eyebrow: 'Built for padel game nights',
    title1: 'Score the game.',
    title2: 'Climb the ranks.',
    title3: 'Roast your friends.',
    subtitle:
      'FOM keeps score, does the standings math, and tracks everyone’s ranking. You just play. And if you turn on Toxic Mode, losing gets a lot more public.',
    callouts: ['Live scoring', 'Auto standings', 'Global ranking', 'Toxic Mode'],
    ctaPrimary: 'Start free',
    ctaSecondary: 'See Toxic Mode',
    trust: 'Free. Your friends can watch scores without an account.',
    phoneLive: 'LIVE',
    phoneStandings: 'Standings',
    phoneRound: 'Round 5 of 8',
  },
  proof: {
    items: [
      { value: '12,000+', label: 'matches scored' },
      { value: '3,500+', label: 'players on the ladder' },
      { value: '25+', label: 'cities represented' },
      { value: '8,000+', label: 'rewinds shared' },
    ],
  },
  toxic: {
    eyebrow: 'Toxic Mode',
    title: 'Losing has never been this entertaining.',
    body: 'Flip it on and FOM starts keeping receipts. Loss streaks, byes, that 11–2 scoreline — everything gets logged, roasted, and shown to everyone. Live.',
    levels: [
      {
        name: 'Mild',
        desc: 'Light banter. A little nudge for whoever keeps losing.',
        sample: '“Rough night for Budi. Tomorrow’s a new day. Probably.”',
      },
      {
        name: 'Medium',
        desc: 'Proper roasts. This is where the screenshots start.',
        sample: '“Budi has now donated points to every team on court. Generous.”',
      },
      {
        name: 'Savage',
        desc: 'Full Hall of Shame, awards ceremony included. Nobody’s safe.',
        sample: '“0 wins, 4 byes, still asking for a rematch. The Cupu D’Or is basically his.”',
      },
    ],
    tickerLabel: 'Zona Cupu — live',
    tickerItems: [
      'Budi drops to P8 after a 3-loss streak',
      'Andi enters the shame zone: 0 wins, 4 byes',
      'Biggest defeat tonight: 11–2. We won’t say who. (Raka.)',
    ],
    trophyTitle: 'The Cupu D’Or',
    trophyDesc:
      'One trophy a night, for the most tragic performance on court. Your group will never let it go.',
    ethics: 'It’s all banter between friends. Pick a level, or turn it off whenever.',
    cta: 'See how Toxic Mode works',
  },
  ranking: {
    eyebrow: 'Global ranking',
    title: 'Every match counts. Everyone can see it.',
    body: 'Win, and your MMR goes up. Lose, well. Seven tiers from Rookie to Legend, one ladder for everyone — or filter down to your city and settle it locally.',
    tiers: ['Rookie', 'Amateur', 'Challenger', 'Elite', 'Master', 'Grandmaster', 'Legend'],
    toggleGlobal: 'Global',
    toggleCity: 'Jakarta',
    boardTitle: 'Top players',
    mmrLabel: 'MMR',
    cta: 'How ranking works',
  },
  bento: {
    title: 'The boring parts, handled.',
    subtitle: 'Everything a host normally juggles, running quietly in the background.',
    cards: {
      liveScoring: {
        title: 'Live scoring',
        desc: 'Tap in scores court by court while everyone plays.',
      },
      standings: {
        title: 'Standings that sort themselves',
        desc: 'Wins, losses, point diff. Updated the second a match ends.',
      },
      share: {
        title: 'One link for everyone',
        desc: 'Friends open a link and watch live. No account, no install.',
      },
      rewind: {
        title: 'FOM Rewind',
        desc: 'A wrapped-style recap of the night, ready for your Story.',
      },
      rooms: {
        title: 'Rooms & split bill',
        desc: 'Set the schedule, track who’s in, split the court fee fairly.',
      },
      formats: {
        title: 'Three formats',
        desc: 'Americano, Mexicano, Match Play. Pairing handled automatically.',
      },
    },
  },
  rewind: {
    eyebrow: 'FOM Rewind',
    title: 'The night ends. The recap lives on.',
    body: 'When the last match wraps, FOM turns the whole session into slides: the podium, the dream team, the best match — and one very unlucky Cupu D’Or winner.',
    slides: {
      numbers: 'The Numbers',
      podium: 'The Podium',
      dreamTeam: 'Dream Team',
      cupu: 'Cupu D’Or',
      photos: 'Photo Dump',
    },
  },
  how: {
    title: 'Three steps, and you’re playing.',
    steps: [
      {
        name: 'Set up',
        desc: 'Pick a format, add your players, set the courts.',
      },
      {
        name: 'Play',
        desc: 'Score as you go. FOM handles rounds and pairings.',
      },
      {
        name: 'Flex',
        desc: 'Share the recap and watch your ranking move.',
      },
    ],
  },
  formats: {
    title: 'Pick tonight’s format.',
    cards: [
      {
        name: 'Americano',
        desc: 'Everyone plays with everyone. Social, but the scoreboard still matters.',
      },
      {
        name: 'Mexicano',
        desc: 'Winners face winners. Every round gets closer and spicier.',
      },
      {
        name: 'Match Play',
        desc: 'Fixed teams, head to head. For when it’s personal.',
      },
    ],
    cta: 'More about formats',
  },
  testimonials: {
    title: 'Hosts swear by it. Players swear at it.',
    items: [
      {
        quote: 'I used to spend half the night doing pairing math. Now I press start and play.',
        name: 'Placeholder — community host',
        role: 'Host, Jakarta',
      },
      {
        quote: 'Toxic Mode announced the Cupu D’Or and our group chat didn’t sleep.',
        name: 'Placeholder — player',
        role: 'Player, Bandung',
      },
      {
        quote: 'Nobody asks me “skor berapa?” anymore. That alone is worth it.',
        name: 'Placeholder — community host',
        role: 'Host, Surabaya',
      },
    ],
  },
  blogPreview: {
    title: 'From the blog',
    subtitle: 'Guides, updates, and stories from the FOM community.',
    readMore: 'Read article',
    viewAll: 'View all articles',
    comingSoon: 'Coming soon',
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What is FOM Play?',
        a: 'A free padel app for running game nights. It handles live scoring, standings, and player rankings, plus extras like Toxic Mode and FOM Rewind.',
      },
      {
        q: 'Do my friends need accounts to watch the scores?',
        a: 'No. You share one link and everyone can follow the standings live from their own phone.',
      },
      {
        q: 'Can I turn Toxic Mode off?',
        a: 'Anytime, even mid-session. It’s off by default — the host decides if and how hard it roasts.',
      },
      {
        q: 'How does the ranking work?',
        a: 'Your MMR moves up or down after every session, automatically. There are seven tiers from Rookie to Legend, and you can view the ladder globally or by city.',
      },
      {
        q: 'Which formats are supported?',
        a: 'Americano, Mexicano, and Match Play, with rotating or fixed partners. FOM does the pairing for every round.',
      },
      {
        q: 'Is FOM Play free?',
        a: 'Yes. Hosting, scoring, rankings, and Rewind are all free.',
      },
    ],
  },
  finalCta: {
    title: 'Your friends are already on the leaderboard.',
    subtitle: 'One session is all it takes to get ranked. Tonight counts.',
    cta: 'Open FOM Play',
  },
  footer: {
    tagline: 'The padel app for game nights.',
    product: 'Product',
    formats: 'Formats',
    resources: 'Resources',
    language: 'Language',
    links: {
      features: 'Features',
      toxicMode: 'Toxic Mode',
      ranking: 'Ranking',
      rewind: 'FOM Rewind',
      americano: 'Americano',
      mexicano: 'Mexicano',
      matchPlay: 'Match Play',
      blog: 'Blog',
      faq: 'FAQ',
      openApp: 'Open App',
    },
    copyright: '© 2026 FOM Play. All rights reserved.',
  },
  langSwitch: {
    label: 'EN',
    other: 'ID',
    otherUrl: '/id/',
  },
};

export default en;
export type Dict = typeof en;
