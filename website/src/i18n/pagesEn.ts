// Konten halaman turunan (EN). Copy ditulis natural — bukan gaya AI.
const pagesEn = {
  features: {
    meta: {
      title: 'Features — Everything FOM Play Does | Padel Live Scoring & Ranking',
      description:
        'Live scoring, automatic standings, global MMR ranking, shareable links, FOM Rewind, Rooms with bill splitting, and Toxic Mode. Here’s everything FOM Play handles for your padel night.',
    },
    eyebrow: 'Features',
    title: 'One app for the whole game night.',
    subtitle:
      'You show up to play. FOM takes care of the scoring, the standings, the ranking, and the bragging rights. Here’s the full list.',
    groups: [
      {
        title: 'Running the game',
        cards: [
          { icon: 'zap', title: 'Live scoring', desc: 'Tap in scores court by court while everyone plays. No pen, no paper, no arguments.' },
          { icon: 'bar-chart', title: 'Automatic standings', desc: 'Wins, losses, and point difference recalculate the second a match ends.' },
          { icon: 'shuffle', title: 'Smart pairing', desc: 'Americano, Mexicano, and Match Play, with rotating or fixed partners. FOM builds every round for you.' },
          { icon: 'target', title: 'Golden point or advantage', desc: 'Score it your way. Pick the system before you start and FOM keeps up.' },
        ],
      },
      {
        title: 'Sharing the night',
        cards: [
          { icon: 'link', title: 'One link, no logins', desc: 'Everyone watches the live standings from their own phone. No account, no install.' },
          { icon: 'camera', title: 'FOM Rewind', desc: 'A wrapped-style recap of the session: podium, dream team, best match, and the Cupu D’Or.' },
          { icon: 'flame', title: 'Toxic Mode', desc: 'An optional Hall of Shame that roasts whoever’s losing. Three levels, off by default.' },
        ],
      },
      {
        title: 'Keeping it going',
        cards: [
          { icon: 'trending-up', title: 'Global & city ranking', desc: 'Seven MMR tiers from Rookie to Legend. See where you stand worldwide or in your city.' },
          { icon: 'calendar', title: 'Rooms', desc: 'Schedule sessions, track who’s coming, and keep your regular crew in one place.' },
          { icon: 'coins', title: 'Split the bill', desc: 'Court and ball costs divided fairly across everyone who showed up.' },
          { icon: 'users', title: 'Friends & profiles', desc: 'Add your squad, see their stats, and pull them into a match in two taps.' },
        ],
      },
    ],
    cta: {
      title: 'That’s a lot. Good thing it’s free.',
      subtitle: 'Open FOM Play and run tonight’s game with all of it.',
      button: 'Open FOM Play',
    },
  },

  ranking: {
    meta: {
      title: 'Padel Ranking & MMR — How FOM Play Ranks Players',
      description:
        'FOM Play gives every player an MMR that moves after each session. Climb seven tiers from Rookie to Legend, and see the leaderboard globally or by city.',
    },
    eyebrow: 'Ranking',
    title: 'Every match leaves a mark.',
    subtitle:
      'Win and your MMR climbs. Lose and it dips. It’s the same rating system serious games use, made for your weekly mabar — so there’s always something on the line.',
    tiersTitle: 'Seven tiers to climb',
    tiersBody:
      'Everyone starts as a Rookie. Keep winning and you’ll work your way up. The higher you go, the harder each step gets.',
    tiers: [
      { name: 'Rookie', desc: 'Just getting started.' },
      { name: 'Amateur', desc: 'Finding your footing.' },
      { name: 'Challenger', desc: 'Winning more than you lose.' },
      { name: 'Elite', desc: 'A name people recognise.' },
      { name: 'Master', desc: 'Top of your local scene.' },
      { name: 'Grandmaster', desc: 'Barely anyone above you.' },
      { name: 'Legend', desc: 'The ceiling. Good luck.' },
    ],
    how: {
      title: 'How it works',
      steps: [
        { name: 'Play a session', desc: 'Any format works. Just play through a match night with FOM keeping score.' },
        { name: 'Your MMR adjusts', desc: 'When the session ends, your rating moves based on how you did against who.' },
        { name: 'You show up on the ladder', desc: 'Check the global board, or filter to your city and settle who’s really the best in town.' },
      ],
    },
    faq: [
      { q: 'How do I get ranked?', a: 'Just play one full session with FOM keeping score. That’s enough to get you on the ladder.' },
      { q: 'Does losing hurt my rank?', a: 'A little, yes. That’s the point — it keeps every match meaningful. Win more than you lose and you’ll climb.' },
      { q: 'Global or city ranking?', a: 'Both. See where you stand worldwide, or filter down to your city to see who’s really running the local scene.' },
    ],
    cta: {
      title: 'Your city has a #1. Is it you?',
      subtitle: 'Play a session and find out where you land.',
      button: 'Open FOM Play',
    },
  },

  formats: {
    meta: {
      title: 'Padel Formats — Americano, Mexicano & Match Play | FOM Play',
      description: 'The three formats FOM Play runs: Americano, Mexicano, and Match Play. What each one is, how it plays, and when to pick it.',
    },
    common: {
      howLabel: 'How it plays',
      bestForLabel: 'Best for',
      scoringLabel: 'Scoring',
      otherFormats: 'Other formats',
      ctaTitle: 'Ready to run one?',
      ctaButton: 'Start a match',
    },
    items: {
      americano: {
        slugEn: 'americano',
        slugId: 'americano',
        name: 'Americano',
        tagline: 'Everyone plays with everyone.',
        metaTitle: 'What Is Americano Padel? Rules, Scoring & How to Play | FOM Play',
        metaDesc: 'Americano is the social padel format where partners rotate every round and everyone plays with everyone. Here’s how it works and how to run it in FOM Play.',
        intro:
          'Americano is the friendliest way to run a padel night. Partners rotate every round, so you end up playing with — and against — everyone in the group. Points follow you personally, not your team, so it stays fair even when the pairings keep changing.',
        how: [
          'Everyone’s added to one pool of players.',
          'Each round, FOM pairs you with a different partner against a different pair.',
          'You play to a set number of points, then rotate.',
          'Your personal points carry across every round — the standings are individual, not team-based.',
        ],
        bestFor: [
          'Mixed-ability groups where you want everyone involved',
          'Social nights that still keep a scoreboard',
          'Meeting new people at an open session',
        ],
        scoring: 'Points-based. Play each round to a target (e.g. 24 or 32 points), and your individual total decides the standings.',
      },
      mexicano: {
        slugEn: 'mexicano',
        slugId: 'mexicano',
        name: 'Mexicano',
        tagline: 'Winners face winners.',
        metaTitle: 'What Is Mexicano Padel? Rules, Scoring & How to Play | FOM Play',
        metaDesc: 'Mexicano is the padel format where results decide the next pairings, so every round stays close. Here’s how it works and how to run it in FOM Play.',
        intro:
          'Mexicano is Americano with a competitive edge. Instead of fixed rotations, the standings decide who plays who next — the top players get matched against each other, and so do the ones at the bottom. Every round tightens up, and the games stay close right to the end.',
        how: [
          'The first round is seeded or random.',
          'After each round, FOM re-pairs everyone based on the current standings.',
          'Leaders play leaders, so nobody runs away with it.',
          'Personal points still decide the final ranking.',
        ],
        bestFor: [
          'Groups who want games to stay competitive',
          'Players of similar-ish level who want a real test',
          'Nights where you want the ranking to feel alive',
        ],
        scoring: 'Points-based, like Americano, but the next round’s pairings come from the live standings.',
      },
      'match-play': {
        slugEn: 'match-play',
        slugId: 'match-play',
        name: 'Match Play',
        tagline: 'Fixed teams, head to head.',
        metaTitle: 'Match Play Padel — Format, Rules & Scoring | FOM Play',
        metaDesc: 'Match Play is the classic fixed-team padel format for head-to-head games. Here’s how it works and how to run it in FOM Play.',
        intro:
          'Match Play is the classic one. You lock in your partner and play proper head-to-head matches — the format for when the teams are set and it’s personal. Golden point or advantage scoring, your call.',
        how: [
          'You pick fixed pairs that stay together all night.',
          'Teams face off in scheduled head-to-head matches.',
          'Choose golden point for speed, or advantage for the traditional feel.',
          'Standings track team results across the session.',
        ],
        bestFor: [
          'Regular partners who play together',
          'Small groups and rematches',
          'Nights where the rivalry is already set',
        ],
        scoring: 'Traditional match scoring. Pick golden point (sudden death at deuce) or advantage (win by two).',
      },
    },
  },

  faq: {
    meta: {
      title: 'FAQ — Common Questions About FOM Play',
      description: 'Answers to the common questions about FOM Play: what it does, how ranking works, whether friends need accounts, Toxic Mode, formats, and pricing.',
    },
    title: 'Questions, answered.',
    subtitle: 'Everything people usually ask before their first game night.',
    groups: [
      {
        category: 'The basics',
        items: [
          { q: 'What is FOM Play?', a: 'A free padel app for running game nights. It handles live scoring, standings, and player rankings, plus extras like Toxic Mode and FOM Rewind.' },
          { q: 'Is it free?', a: 'Yes. Hosting, scoring, rankings, and Rewind are all free to use.' },
          { q: 'Which devices does it work on?', a: 'Any phone with a browser. FOM Play runs on the web and installs like an app on iOS and Android.' },
        ],
      },
      {
        category: 'Playing & sharing',
        items: [
          { q: 'Do my friends need accounts to watch the scores?', a: 'No. You share one link and everyone follows the standings live from their own phone — no login, no install.' },
          { q: 'Which formats are supported?', a: 'Americano, Mexicano, and Match Play, with rotating or fixed partners. FOM does the pairing for every round.' },
          { q: 'What’s FOM Rewind?', a: 'A wrapped-style recap of your session — the numbers, the podium, the dream team, and the Cupu D’Or — ready to share to your Story.' },
        ],
      },
      {
        category: 'Ranking & Toxic Mode',
        items: [
          { q: 'How does the ranking work?', a: 'Your MMR moves up or down after every session, automatically. There are seven tiers from Rookie to Legend, and you can view the ladder globally or by city.' },
          { q: 'Can I turn Toxic Mode off?', a: 'Anytime, even mid-session. It’s off by default — the host decides if and how hard it roasts.' },
          { q: 'Is Toxic Mode mean?', a: 'It roasts tonight’s performance, never the person. You pick how spicy it gets, and Mild really is mild.' },
        ],
      },
    ],
  },

  toxic: {
    meta: {
      title: 'Toxic Mode — Losing Has Never Been This Entertaining | FOM Play',
      description:
        'Toxic Mode turns your padel night into a roast show: a live Hall of Shame, the Zona Cupu ticker, toxic awards, and the Cupu D’Or — the trophy nobody wants.',
    },
    heroEyebrow: 'Toxic Mode',
    heroTitle1: 'Winning gets you glory.',
    heroTitle2: 'Losing gets you the Cupu D’Or.',
    heroBody:
      'Flip it on and FOM keeps the receipts: a live Hall of Shame, a shame-zone ticker, roasts written from real results, and an awards ceremony your group chat will replay for weeks.',
    ctaTonight: 'Try it tonight',
    ctaPoison: 'Pick your poison',
    tickerLabel: 'Zona Cupu — live',
    tickerItems: [
      'Budi drops to P8 after a 3-loss streak',
      'Andi enters the shame zone: 0 wins, 4 byes',
      'Biggest defeat tonight: 11–2. (We see you, Raka.)',
    ],
    screensNote:
      'Real screens from a real game night. The Cupu D’Or is decided by actual results — no way to bribe your way out.',
    levelsTitle: 'Three levels. Pick how much your friendship can take.',
    levels: [
      {
        name: 'Mild',
        tagline: 'Light banter',
        desc: 'A little nudge for whoever keeps losing. Safe for new groups, mixed company, and coworkers you still need to face on Monday.',
        samples: ['“Rough night for Budi. Tomorrow’s a new day. Probably.”', '“Sasha is saving her best padel for another day.”'],
      },
      {
        name: 'Medium',
        tagline: 'Proper roasts',
        desc: 'The sweet spot. Sharp enough to sting, friendly enough to laugh at. This is where the screenshots start.',
        samples: ['“Budi has now donated points to every team on court. Generous.”', '“Yoga’s strategy tonight: psychological warfare via disappointment.”'],
      },
      {
        name: 'Savage',
        tagline: 'Full Hall of Shame',
        desc: 'Nobody’s safe. A live shame ticker, a full awards ceremony, and the Cupu D’Or handed out with maximum drama. For groups with thick skin.',
        samples: ['“0 wins, 4 byes, still asking for a rematch. The Cupu D’Or is basically his.”', '“Scientists are studying how Raka lost 11–2 with a better racket.”'],
      },
    ],
    awardsTitle: 'The awards ceremony nobody asked for.',
    awardsBody:
      'At Savage level, the night ends with a full ceremony. Spotlights, confetti, and categories built for maximum embarrassment.',
    awards: [
      { icon: 'trophy', name: 'Cupu D’Or', desc: 'The night’s most tragic performance. One winner, zero glory.' },
      { icon: 'trending-up', name: 'MVP — Minus Value Player', desc: 'Impressive numbers. Wrong direction.' },
      { icon: 'clock', name: 'King of Bye', desc: 'Sat out the most rounds. Technically undefeated while seated.' },
      { icon: 'target', name: 'Biggest Defeat', desc: 'The scoreline we all agreed to never bring up again. (11–2.)' },
    ],
    ethicsTitle: 'Roast the game, not the person.',
    ethicsBody:
      'Roasts target tonight’s performance — never looks, identity, or anything personal. The host picks the level, and one tap turns it all off. Mid-session included.',
    faqs: [
      { q: 'Can I turn it off?', a: 'Anytime, even mid-session. It’s off by default — the host decides if it goes on, and at which level.' },
      { q: 'Who sees the roasts?', a: 'Everyone watching the match. That’s kind of the point. They show up in live standings, the shame ticker, and the FOM Rewind recap.' },
      { q: 'Is it actually mean?', a: 'It roasts tonight’s performance, never the person. You pick how spicy it gets, and Mild really is mild.' },
    ],
    ctaTitle1: 'Someone in your group is',
    ctaTitleEm: 'this close',
    ctaTitle2: 'to the Cupu D’Or.',
    ctaSub: 'Run tonight’s game with Toxic Mode on and find out who.',
    ctaButton: 'Open FOM Play',
  },
};

export default pagesEn;
export type Pages = typeof pagesEn;
