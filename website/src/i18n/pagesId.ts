import type { Pages } from './pagesEn';

// Konten halaman turunan (ID). Copy natural, gaya ngobrol.
const pagesId: Pages = {
  features: {
    meta: {
      title: 'Fitur — Semua yang Bisa FOM Play | Live Scoring & Ranking Padel',
      description:
        'Live scoring, klasemen otomatis, ranking MMR global, link share, FOM Rewind, Rooms dengan patungan, dan Toxic Mode. Ini semua yang diurus FOM Play buat mabar kamu.',
    },
    eyebrow: 'Fitur',
    title: 'Satu aplikasi buat semua urusan mabar.',
    subtitle:
      'Kamu tinggal datang dan main. Scoring, klasemen, ranking, sampai bahan gibah — FOM yang urus. Ini daftar lengkapnya.',
    groups: [
      {
        title: 'Menjalankan game',
        cards: [
          { icon: 'zap', title: 'Live scoring', desc: 'Input skor per court sambil semua main. Tanpa pulpen, tanpa kertas, tanpa ribut.' },
          { icon: 'bar-chart', title: 'Klasemen otomatis', desc: 'Menang, kalah, selisih poin — ngitung ulang begitu match selesai.' },
          { icon: 'shuffle', title: 'Pairing pintar', desc: 'Americano, Mexicano, Match Play, partner rotasi atau tetap. Tiap ronde FOM yang susun.' },
          { icon: 'target', title: 'Golden point atau advantage', desc: 'Skor sesuai selera. Pilih sistemnya sebelum mulai, FOM ngikut.' },
        ],
      },
      {
        title: 'Berbagi momen',
        cards: [
          { icon: 'link', title: 'Satu link, tanpa login', desc: 'Semua pantau klasemen live dari HP masing-masing. Tanpa akun, tanpa install.' },
          { icon: 'camera', title: 'FOM Rewind', desc: 'Recap semalam ala wrapped: podium, dream team, match terbaik, dan Cupu D’Or.' },
          { icon: 'flame', title: 'Toxic Mode', desc: 'Hall of Shame opsional yang nge-roast yang kalah. Tiga level, default-nya mati.' },
        ],
      },
      {
        title: 'Bikin nagih',
        cards: [
          { icon: 'trending-up', title: 'Ranking global & kota', desc: 'Tujuh tier MMR dari Rookie sampai Legend. Lihat posisimu dunia atau di kotamu.' },
          { icon: 'calendar', title: 'Rooms', desc: 'Atur jadwal, pantau siapa yang datang, dan kumpulin squad reguler di satu tempat.' },
          { icon: 'coins', title: 'Patungan', desc: 'Biaya court dan bola dibagi adil ke semua yang ikut main.' },
          { icon: 'users', title: 'Friends & profil', desc: 'Tambah squad, lihat statistiknya, tarik ke match cukup dua tap.' },
        ],
      },
    ],
    cta: {
      title: 'Banyak, ya. Untungnya gratis.',
      subtitle: 'Buka FOM Play dan jalankan mabar malam ini pakai semuanya.',
      button: 'Buka FOM Play',
    },
  },

  ranking: {
    meta: {
      title: 'Ranking & MMR Padel — Cara FOM Play Meranking Pemain',
      description:
        'FOM Play kasih MMR ke tiap pemain yang bergerak tiap sesi. Naiki tujuh tier dari Rookie sampai Legend, dan lihat leaderboard global atau per kota.',
    },
    eyebrow: 'Ranking',
    title: 'Tiap match meninggalkan jejak.',
    subtitle:
      'Menang, MMR naik. Kalah, turun. Sistem rating yang sama kayak game serius, tapi dibikin buat mabar mingguan kamu — jadi selalu ada yang dipertaruhkan.',
    tiersTitle: 'Tujuh tier buat didaki',
    tiersBody:
      'Semua mulai dari Rookie. Terus menang, kamu bakal naik pelan-pelan. Makin tinggi, tiap langkah makin susah.',
    tiers: [
      { name: 'Rookie', desc: 'Baru mulai.' },
      { name: 'Amateur', desc: 'Mulai nemu ritme.' },
      { name: 'Challenger', desc: 'Menang lebih sering dari kalah.' },
      { name: 'Elite', desc: 'Nama yang mulai dikenal.' },
      { name: 'Master', desc: 'Jagoan di scene lokal.' },
      { name: 'Grandmaster', desc: 'Hampir nggak ada yang di atasmu.' },
      { name: 'Legend', desc: 'Batas atasnya. Semoga beruntung.' },
    ],
    how: {
      title: 'Cara kerjanya',
      steps: [
        { name: 'Main satu sesi', desc: 'Format apa aja boleh. Cukup jalanin satu malam mabar dengan FOM nyatet skor.' },
        { name: 'MMR menyesuaikan', desc: 'Begitu sesi selesai, rating kamu bergerak berdasarkan hasil lawan siapa.' },
        { name: 'Kamu muncul di papan', desc: 'Cek papan global, atau filter ke kotamu buat nentuin siapa yang paling jago di kota.' },
      ],
    },
    faq: [
      { q: 'Gimana caranya keranking?', a: 'Cukup main satu sesi penuh dengan FOM nyatet skor. Itu udah cukup buat masuk papan.' },
      { q: 'Kalah bikin ranking turun?', a: 'Sedikit, iya. Justru itu intinya — biar tiap match berarti. Menang lebih sering dari kalah, kamu bakal naik.' },
      { q: 'Ranking global atau kota?', a: 'Dua-duanya. Lihat posisimu di dunia, atau filter ke kotamu buat lihat siapa yang beneran nguasain scene lokal.' },
    ],
    cta: {
      title: 'Kotamu punya #1. Itu kamu?',
      subtitle: 'Main satu sesi dan lihat kamu di posisi berapa.',
      button: 'Buka FOM Play',
    },
  },

  formats: {
    meta: {
      title: 'Format Padel — Americano, Mexicano & Match Play | FOM Play',
      description: 'Tiga format yang dijalankan FOM Play: Americano, Mexicano, dan Match Play. Apa itu masing-masing, cara mainnya, dan kapan dipakai.',
    },
    common: {
      howLabel: 'Cara mainnya',
      bestForLabel: 'Cocok buat',
      scoringLabel: 'Sistem skor',
      otherFormats: 'Format lain',
      ctaTitle: 'Siap jalanin satu?',
      ctaButton: 'Mulai match',
    },
    items: {
      americano: {
        slugEn: 'americano',
        slugId: 'americano',
        name: 'Americano',
        tagline: 'Semua main sama semua.',
        metaTitle: 'Apa Itu Americano Padel? Aturan, Skor & Cara Main | FOM Play',
        metaDesc: 'Americano itu format padel sosial di mana partner rotasi tiap ronde dan semua main sama semua. Ini cara kerjanya dan cara jalanin di FOM Play.',
        intro:
          'Americano cara paling santai buat jalanin mabar padel. Partner rotasi tiap ronde, jadi kamu main bareng — dan lawan — semua orang di grup. Poin ngikut kamu sendiri, bukan tim, jadi tetap adil walau pasangan terus ganti.',
        how: [
          'Semua masuk ke satu pool pemain.',
          'Tiap ronde, FOM pasangin kamu sama partner beda lawan pasangan beda.',
          'Main sampai target poin tertentu, lalu rotasi.',
          'Poin pribadimu kebawa tiap ronde — klasemennya individu, bukan tim.',
        ],
        bestFor: [
          'Grup campur level yang pengen semua kebagian main',
          'Malam santai yang tetap ada papan skor',
          'Kenalan orang baru di sesi open',
        ],
        scoring: 'Berbasis poin. Tiap ronde main sampai target (misal 24 atau 32 poin), total individumu yang nentuin klasemen.',
      },
      mexicano: {
        slugEn: 'mexicano',
        slugId: 'mexicano',
        name: 'Mexicano',
        tagline: 'Yang menang ketemu yang menang.',
        metaTitle: 'Apa Itu Mexicano Padel? Aturan, Skor & Cara Main | FOM Play',
        metaDesc: 'Mexicano itu format padel di mana hasil nentuin pairing berikutnya, jadi tiap ronde tetap ketat. Ini cara kerjanya dan cara jalanin di FOM Play.',
        intro:
          'Mexicano itu Americano yang lebih kompetitif. Bukan rotasi tetap, klasemen yang nentuin siapa lawan siapa berikutnya — yang teratas ketemu yang teratas, yang bawah ketemu yang bawah. Tiap ronde makin ketat, gamenya tetap panas sampai akhir.',
        how: [
          'Ronde pertama diseeding atau acak.',
          'Habis tiap ronde, FOM pasangin ulang semua berdasarkan klasemen terkini.',
          'Yang mimpin lawan yang mimpin, jadi nggak ada yang kabur jauh.',
          'Poin pribadi tetap yang nentuin ranking akhir.',
        ],
        bestFor: [
          'Grup yang pengen game tetap kompetitif',
          'Pemain yang levelnya mirip dan pengen tes beneran',
          'Malam yang pengen rankingnya terasa hidup',
        ],
        scoring: 'Berbasis poin kayak Americano, tapi pairing ronde berikutnya dari klasemen live.',
      },
      'match-play': {
        slugEn: 'match-play',
        slugId: 'match-play',
        name: 'Match Play',
        tagline: 'Tim tetap, head to head.',
        metaTitle: 'Match Play Padel — Format, Aturan & Skor | FOM Play',
        metaDesc: 'Match Play itu format padel tim tetap klasik buat game head-to-head. Ini cara kerjanya dan cara jalanin di FOM Play.',
        intro:
          'Match Play yang klasik. Kunci partnermu dan main head-to-head beneran — format buat pas timnya udah fix dan urusannya personal. Golden point atau advantage, terserah kamu.',
        how: [
          'Kamu pilih pasangan tetap yang bareng terus semalaman.',
          'Tim saling lawan di match head-to-head terjadwal.',
          'Pilih golden point biar cepat, atau advantage buat rasa tradisional.',
          'Klasemen ngikut hasil tim sepanjang sesi.',
        ],
        bestFor: [
          'Partner reguler yang main bareng terus',
          'Grup kecil dan rematch',
          'Malam yang rivalitasnya udah kebentuk',
        ],
        scoring: 'Skor match tradisional. Pilih golden point (sudden death pas deuce) atau advantage (menang selisih dua).',
      },
    },
  },

  faq: {
    meta: {
      title: 'FAQ — Pertanyaan Umum tentang FOM Play',
      description: 'Jawaban pertanyaan umum soal FOM Play: fungsinya, cara kerja ranking, apakah teman perlu akun, Toxic Mode, format, dan harga.',
    },
    title: 'Pertanyaan, terjawab.',
    subtitle: 'Semua yang biasanya ditanyain orang sebelum mabar pertamanya.',
    groups: [
      {
        category: 'Dasar-dasar',
        items: [
          { q: 'FOM Play itu apa?', a: 'Aplikasi padel gratis buat jalanin mabar. Live scoring, klasemen, dan ranking pemain diurus otomatis, plus fitur seru kayak Toxic Mode dan FOM Rewind.' },
          { q: 'Gratis?', a: 'Iya. Hosting, scoring, ranking, sampai Rewind semuanya gratis.' },
          { q: 'Jalan di perangkat apa aja?', a: 'HP apa pun yang ada browser. FOM Play jalan di web dan bisa di-install kayak aplikasi di iOS dan Android.' },
        ],
      },
      {
        category: 'Main & berbagi',
        items: [
          { q: 'Teman harus punya akun buat lihat skor?', a: 'Nggak. Kamu share satu link, semua pantau klasemen live dari HP masing-masing — tanpa login, tanpa install.' },
          { q: 'Format apa aja yang didukung?', a: 'Americano, Mexicano, dan Match Play, dengan partner rotasi atau tetap. Pairing tiap ronde FOM yang urus.' },
          { q: 'FOM Rewind itu apa?', a: 'Recap sesi ala wrapped — angka-angka, podium, dream team, dan Cupu D’Or — siap dishare ke Story.' },
        ],
      },
      {
        category: 'Ranking & Toxic Mode',
        items: [
          { q: 'Ranking-nya gimana kerjanya?', a: 'MMR kamu naik-turun otomatis tiap selesai sesi. Ada tujuh tier dari Rookie sampai Legend, dan papannya bisa dilihat global atau per kota.' },
          { q: 'Toxic Mode bisa dimatikan?', a: 'Bisa, kapan aja, bahkan di tengah sesi. Default-nya mati — host yang nentuin nyala atau nggak, dan sepedas apa.' },
          { q: 'Toxic Mode kejam nggak?', a: 'Yang di-roast performa malam ini, bukan orangnya. Kamu yang atur sepedas apa, dan Mild ya beneran ringan.' },
        ],
      },
    ],
  },

  toxic: {
    meta: {
      title: 'Toxic Mode — Kalah Nggak Pernah Semenghibur Ini | FOM Play',
      description:
        'Toxic Mode bikin mabar padel jadi ajang roast: Hall of Shame live, ticker Zona Cupu, toxic awards, dan Cupu D’Or — trofi yang nggak ada yang mau.',
    },
    heroEyebrow: 'Toxic Mode',
    heroTitle1: 'Menang dapat gengsi.',
    heroTitle2: 'Kalah dapat Cupu D’Or.',
    heroBody:
      'Nyalakan dan FOM nyimpen bukti: Hall of Shame live, ticker zona cupu, roast dari hasil beneran, dan upacara penghargaan yang bakal diputar ulang grup WhatsApp berminggu-minggu.',
    ctaTonight: 'Coba malam ini',
    ctaPoison: 'Pilih racunmu',
    tickerLabel: 'Zona Cupu — live',
    tickerItems: [
      'Budi turun ke P8 setelah kalah 3 beruntun',
      'Andi masuk zona cupu: 0 menang, 4 bye',
      'Kekalahan terbesar malam ini: 11–2. (Kelihatan kok, Raka.)',
    ],
    screensNote:
      'Layar asli dari mabar beneran. Cupu D’Or ditentukan hasil nyata — nggak bisa nyogok biar lolos.',
    levelsTitle: 'Tiga level. Pilih seberapa kuat pertemananmu.',
    levels: [
      {
        name: 'Mild',
        tagline: 'Bercanda ringan',
        desc: 'Sentilan kecil buat yang kalah terus. Aman buat grup baru, teman campur, dan rekan kerja yang masih harus kamu temui Senin.',
        samples: ['“Malam yang berat buat Budi. Besok hari baru. Mungkin.”', '“Sasha lagi nyimpen padel terbaiknya buat lain hari.”'],
      },
      {
        name: 'Medium',
        tagline: 'Roast beneran',
        desc: 'Titik pas. Cukup nyelekit buat kena, cukup ramah buat ditertawakan. Di sini screenshot mulai beredar.',
        samples: ['“Budi resmi nyumbang poin ke semua tim di court. Dermawan.”', '“Strategi Yoga malam ini: perang psikologis lewat kekecewaan.”'],
      },
      {
        name: 'Savage',
        tagline: 'Full Hall of Shame',
        desc: 'Nggak ada yang aman. Ticker cupu live, upacara penghargaan penuh, dan Cupu D’Or diserahkan dengan drama maksimal. Buat grup bermental baja.',
        samples: ['“0 menang, 4 bye, masih ngajak rematch. Cupu D’Or udah pasti punya dia.”', '“Ilmuwan lagi meneliti gimana Raka kalah 11–2 padahal raketnya lebih bagus.”'],
      },
    ],
    awardsTitle: 'Upacara penghargaan yang nggak ada yang minta.',
    awardsBody:
      'Di level Savage, malam ditutup dengan upacara penuh. Sorotan lampu, konfeti, dan kategori yang dirancang buat rasa malu maksimal.',
    awards: [
      { icon: 'trophy', name: 'Cupu D’Or', desc: 'Performa paling tragis malam ini. Satu pemenang, nol kejayaan.' },
      { icon: 'trending-up', name: 'MVP — Minus Value Player', desc: 'Angkanya mengesankan. Arahnya salah.' },
      { icon: 'clock', name: 'King of Bye', desc: 'Paling banyak duduk nunggu. Secara teknis nggak terkalahkan sambil duduk.' },
      { icon: 'target', name: 'Kekalahan Terbesar', desc: 'Skor yang kita sepakat nggak akan diungkit lagi. (11–2.)' },
    ],
    ethicsTitle: 'Roast game-nya, bukan orangnya.',
    ethicsBody:
      'Roast nyasar ke performa malam ini — bukan penampilan, identitas, atau hal personal. Host yang pilih levelnya, dan satu tap matiin semua. Termasuk di tengah sesi.',
    faqs: [
      { q: 'Bisa dimatikan?', a: 'Kapan aja, bahkan di tengah sesi. Default-nya mati — host yang nentuin nyala atau nggak, dan di level berapa.' },
      { q: 'Siapa yang lihat roast-nya?', a: 'Semua yang nonton match. Itu emang intinya. Muncul di klasemen live, ticker cupu, dan recap FOM Rewind.' },
      { q: 'Beneran kejam nggak?', a: 'Yang di-roast performa malam ini, bukan orangnya. Kamu yang atur sepedas apa, dan Mild ya beneran ringan.' },
    ],
    ctaTitle1: 'Ada orang di grupmu yang',
    ctaTitleEm: 'sedikit lagi',
    ctaTitle2: 'dapat Cupu D’Or.',
    ctaSub: 'Jalanin mabar malam ini dengan Toxic Mode nyala dan cari tahu siapa.',
    ctaButton: 'Buka FOM Play',
  },
};

export default pagesId;
