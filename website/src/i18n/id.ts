import type { Dict } from './en';

// Copy bahasa Indonesia. Angka proof strip placeholder — samakan dengan en.ts.
const id: Dict = {
  meta: {
    title: 'FOM Play — Live Scoring Padel, Ranking Global & Toxic Mode',
    description:
      'FOM Play yang nyatet skor, ngitung klasemen, dan ngurus ranking pemain. Live scoring, ranking MMR global, recap FOM Rewind, dan Toxic Mode yang bikin kekalahan jadi tontonan.',
  },
  nav: {
    features: 'Fitur',
    toxicMode: 'Toxic Mode',
    ranking: 'Ranking',
    formats: 'Format',
    blog: 'Blog',
    openApp: 'Buka App',
  },
  hero: {
    eyebrow: 'Dibuat untuk mabar padel',
    title1: 'Skor tercatat.',
    title2: 'Ranking naik.',
    title3: 'Yang cupu, ketahuan.',
    subtitle:
      'FOM yang nyatet skor, ngitung klasemen, dan ngurus ranking. Kamu tinggal main. Kalau Toxic Mode dinyalain, yang kalah siap-siap aja.',
    callouts: ['Live scoring', 'Klasemen otomatis', 'Ranking global', 'Toxic Mode'],
    ctaPrimary: 'Mulai gratis',
    ctaSecondary: 'Lihat Toxic Mode',
    trust: 'Gratis. Teman bisa lihat skor tanpa bikin akun.',
    phoneLive: 'LIVE',
    phoneStandings: 'Klasemen',
    phoneRound: 'Ronde 5 dari 8',
  },
  proof: {
    items: [
      { value: '12.000+', label: 'match tercatat' },
      { value: '3.500+', label: 'pemain di papan ranking' },
      { value: '25+', label: 'kota terwakili' },
      { value: '8.000+', label: 'rewind dibagikan' },
    ],
  },
  toxic: {
    eyebrow: 'Toxic Mode',
    title: 'Kalah nggak pernah semenghibur ini.',
    body: 'Sekali dinyalain, FOM mulai nyimpen bukti. Losing streak, jatah bye, skor 11–2 itu — semua kecatat, kena roast, dan dilihat semua orang. Live.',
    levels: [
      {
        name: 'Mild',
        desc: 'Bercandaan ringan. Sentilan kecil buat yang kalah terus.',
        sample: '“Malam yang berat buat Budi. Besok hari baru. Mungkin.”',
      },
      {
        name: 'Medium',
        desc: 'Roast beneran. Di level ini screenshot mulai beredar.',
        sample: '“Budi resmi nyumbang poin ke semua tim di court. Dermawan.”',
      },
      {
        name: 'Savage',
        desc: 'Hall of Shame penuh plus upacara penghargaan. Nggak ada yang aman.',
        sample: '“0 menang, 4 bye, masih ngajak rematch. Cupu D’Or udah pasti punya dia.”',
      },
    ],
    tickerLabel: 'Zona Cupu — live',
    tickerItems: [
      'Budi turun ke P8 setelah kalah 3 kali beruntun',
      'Andi masuk zona cupu: 0 menang, 4 bye',
      'Kekalahan terbesar malam ini: 11–2. Nggak usah sebut nama. (Raka.)',
    ],
    trophyTitle: 'Cupu D’Or',
    trophyDesc:
      'Satu trofi tiap malam, buat performa paling tragis di court. Grup kamu nggak akan pernah lupa.',
    ethics: 'Semuanya bercandaan antar teman. Pilih levelnya, atau matikan kapan aja.',
    cta: 'Lihat cara kerja Toxic Mode',
  },
  ranking: {
    eyebrow: 'Ranking global',
    title: 'Setiap match dihitung. Semua orang bisa lihat.',
    body: 'Menang, MMR naik. Kalah, ya gitu. Tujuh tier dari Rookie sampai Legend, satu papan buat semua — atau filter per kota biar makin panas.',
    tiers: ['Rookie', 'Amateur', 'Challenger', 'Elite', 'Master', 'Grandmaster', 'Legend'],
    toggleGlobal: 'Global',
    toggleCity: 'Jakarta',
    boardTitle: 'Pemain teratas',
    mmrLabel: 'MMR',
    cta: 'Cara kerja ranking',
  },
  bento: {
    title: 'Urusan ribetnya, FOM yang pegang.',
    subtitle: 'Semua yang biasanya bikin host pusing, jalan sendiri di belakang layar.',
    cards: {
      liveScoring: {
        title: 'Live scoring',
        desc: 'Input skor per court selagi semua orang main.',
      },
      standings: {
        title: 'Klasemen yang ngurut sendiri',
        desc: 'Menang, kalah, selisih poin. Update begitu match selesai.',
      },
      share: {
        title: 'Satu link buat semua',
        desc: 'Teman buka link, langsung nonton live. Tanpa akun, tanpa install.',
      },
      rewind: {
        title: 'FOM Rewind',
        desc: 'Recap semalam ala wrapped, siap dipost ke Story.',
      },
      rooms: {
        title: 'Rooms & patungan',
        desc: 'Atur jadwal, pantau siapa yang ikut, bagi biaya court dengan adil.',
      },
      formats: {
        title: 'Tiga format',
        desc: 'Americano, Mexicano, Match Play. Pairing diurus otomatis.',
      },
    },
  },
  rewind: {
    eyebrow: 'FOM Rewind',
    title: 'Mabar kelar. Recap-nya abadi.',
    body: 'Begitu match terakhir selesai, FOM ngerangkum semalaman jadi slide: podium, dream team, match terbaik — dan satu pemenang Cupu D’Or yang lagi apes.',
    slides: {
      numbers: 'The Numbers',
      podium: 'Podium',
      dreamTeam: 'Dream Team',
      cupu: 'Cupu D’Or',
      photos: 'Photo Dump',
    },
  },
  how: {
    title: 'Tiga langkah, langsung main.',
    steps: [
      {
        name: 'Set up',
        desc: 'Pilih format, tambah pemain, atur court.',
      },
      {
        name: 'Main',
        desc: 'Input skor sambil jalan. Ronde dan pairing FOM yang urus.',
      },
      {
        name: 'Pamer',
        desc: 'Share recap-nya, pantau ranking kamu naik.',
      },
    ],
  },
  formats: {
    title: 'Malam ini format apa?',
    cards: [
      {
        name: 'Americano',
        desc: 'Semua main sama semua. Santai, tapi papan skor tetap dihitung.',
      },
      {
        name: 'Mexicano',
        desc: 'Yang menang ketemu yang menang. Tiap ronde makin ketat, makin panas.',
      },
      {
        name: 'Match Play',
        desc: 'Tim tetap, head to head. Buat urusan yang udah personal.',
      },
    ],
    cta: 'Selengkapnya soal format',
  },
  testimonials: {
    title: 'Host-nya suka. Pemainnya kadang kesel.',
    items: [
      {
        quote: 'Dulu setengah malam habis buat ngitung pairing. Sekarang tekan mulai, langsung main.',
        name: 'Placeholder — host komunitas',
        role: 'Host, Jakarta',
      },
      {
        quote: 'Toxic Mode ngumumin Cupu D’Or, grup kami nggak tidur.',
        name: 'Placeholder — pemain',
        role: 'Pemain, Bandung',
      },
      {
        quote: 'Udah nggak ada yang nanya “skor berapa?” ke aku. Itu aja udah worth it.',
        name: 'Placeholder — host komunitas',
        role: 'Host, Surabaya',
      },
    ],
  },
  blogPreview: {
    title: 'Dari blog',
    subtitle: 'Panduan, update, dan cerita dari komunitas FOM.',
    readMore: 'Baca artikel',
    viewAll: 'Lihat semua artikel',
    comingSoon: 'Segera hadir',
  },
  faq: {
    title: 'Pertanyaan yang sering diajukan',
    items: [
      {
        q: 'FOM Play itu apa?',
        a: 'Aplikasi padel gratis buat jalanin mabar. Live scoring, klasemen, dan ranking pemain diurus otomatis, plus fitur seru kayak Toxic Mode dan FOM Rewind.',
      },
      {
        q: 'Teman harus punya akun buat lihat skor?',
        a: 'Nggak. Kamu share satu link, semua bisa pantau klasemen live dari HP masing-masing.',
      },
      {
        q: 'Toxic Mode bisa dimatikan?',
        a: 'Bisa, kapan aja, bahkan di tengah sesi. Default-nya mati — host yang nentuin nyala atau nggak, dan sepedas apa.',
      },
      {
        q: 'Cara kerja ranking-nya gimana?',
        a: 'MMR kamu naik-turun otomatis tiap selesai sesi. Ada tujuh tier dari Rookie sampai Legend, dan papannya bisa dilihat global atau per kota.',
      },
      {
        q: 'Format apa aja yang didukung?',
        a: 'Americano, Mexicano, dan Match Play, dengan partner rotasi atau tetap. Pairing tiap ronde FOM yang urus.',
      },
      {
        q: 'FOM Play gratis?',
        a: 'Iya. Hosting, scoring, ranking, sampai Rewind, semuanya gratis.',
      },
    ],
  },
  finalCta: {
    title: 'Teman-temanmu udah ada di leaderboard.',
    subtitle: 'Sekali sesi langsung keranking. Malam ini juga kehitung.',
    cta: 'Buka FOM Play',
  },
  footer: {
    tagline: 'Aplikasi padel untuk mabar.',
    product: 'Produk',
    formats: 'Format',
    resources: 'Sumber',
    language: 'Bahasa',
    links: {
      features: 'Fitur',
      toxicMode: 'Toxic Mode',
      ranking: 'Ranking',
      rewind: 'FOM Rewind',
      americano: 'Americano',
      mexicano: 'Mexicano',
      matchPlay: 'Match Play',
      blog: 'Blog',
      faq: 'FAQ',
      openApp: 'Buka App',
    },
    copyright: '© 2026 FOM Play. Hak cipta dilindungi.',
  },
  langSwitch: {
    label: 'ID',
    other: 'EN',
    otherUrl: '/',
  },
};

export default id;
