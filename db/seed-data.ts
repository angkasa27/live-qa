// Seed data for a fresh database: the demo majelis plus the two hand-extracted recordings.
// Loaded by db/seed.mjs. This is not application code: nothing in app/ or lib/ imports it.
//
// The "live"/"scheduled" events are fictional demo data for the submit-and-answer flow. The two
// archived ones are real videos whose Q&A was pulled from their own captions (ROADMAP.md §7).

type SeedEvent = {
  id: string;
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  status: "scheduled" | "live" | "archived";
  moderation?: "auto" | "manual";
  publicArchive?: boolean;
  image?: string;
  youtubeId?: string;
};

type SeedQuestion = {
  id: string;
  eventId: string;
  body: string;
  author: string | null;
  answer: string | null;
  createdAt: string;
  source?: "transcript";
  videoStart?: number;
};

// The two recorded events are real videos whose questions were ingested from their own
// auto-generated captions (see TRANSCRIPT / TRANSCRIPT_2). Everything marked "live" is
// fictional demo data for the submit-and-answer flow.
export const events: SeedEvent[] = [
  {
    id: "tanya-ustadz-24-jun",
    name: "Talkshow Tanya Ustadz — 24 Juni 2026",
    startsAt: "2026-06-24T20:00:00+07:00",
    venue: "Khalid Basalamah Official",
    speaker: "Khalid Basalamah",
    status: "archived",
    publicArchive: true,
    youtubeId: "71z6vw_c5JE",
  },
  {
    id: "tanya-jawab-yazid",
    name: "Tanya Jawab: Masalah-Masalah Penting",
    startsAt: "2026-05-12T19:30:00+07:00",
    venue: "Moslem Nearer",
    speaker: "Ustadz Yazid bin Abdul Qadir Jawas",
    status: "archived",
    publicArchive: true,
    youtubeId: "1mycTmtS5_4",
  },
  {
    id: "devfest-25",
    name: "DevFest Jakarta 2026: Building for the Next Billion",
    startsAt: "2026-08-17T09:30:00+07:00",
    venue: "Main Hall, Ciputra Artpreneur",
    speaker: "Rani Wijaya",
    status: "live",
  },
  {
    id: "ai-townhall",
    name: "AI Town Hall",
    startsAt: "2026-08-17T13:00:00+07:00",
    venue: "Studio B",
    speaker: "Danu Prasetyo",
    status: "live",
    moderation: "manual",
  },
  {
    id: "design-systems",
    name: "Design Systems That Survive Contact With Product",
    startsAt: "2026-08-18T10:00:00+07:00",
    venue: "Workshop Room 3",
    speaker: "Mira Halim",
    status: "scheduled",
  },
  {
    id: "infra-night",
    name: "Infra Night: Postmortems We Actually Learned From",
    startsAt: "2026-08-18T19:00:00+07:00",
    venue: "Rooftop Deck",
    speaker: "Chris Tanuwijaya",
    status: "scheduled",
  },
];

const BODIES: [string, string | null, string | null][] = [
  [
    "How do you decide when a feature is done enough to ship versus when it needs another iteration? We keep going back and forth internally and it burns weeks.",
    "Sasha",
    "Ship when the next thing you'd learn can only be learned in production. Everything before that is guessing with extra steps.",
  ],
  ["What's the single biggest mistake you see teams make in their first year?", null, null],
  [
    "You mentioned latency budgets earlier. Concretely, how do you allocate a 200ms budget across the gateway, the service mesh, the database round trip, and rendering? And what do you do when one of those consistently blows past its slice but the overall number still looks acceptable to leadership because the p50 is fine and nobody is looking at p99 until something actually catches fire in production?",
    "Bimo",
    null,
  ],
  ["Is TypeScript still worth it for a two-person team?", "Kelly", "Yes. It pays for itself the first time you rename something."],
  ["Do you write tests before or after the code, honestly?", null, null],
  [
    "How do you handle a stakeholder who keeps changing the requirements mid-sprint?",
    "Farah",
    null,
  ],
  ["What does your local dev setup look like these days?", "Toni", null],
  [
    "Our monolith takes 14 minutes to build. The team wants to break it into services. I think that fixes the symptom and not the cause, but I can't articulate why well enough to win the argument. What would you tell them?",
    null,
    "Microservices trade a slow build for a slow debugging session at 3am. Fix the build.",
  ],
  ["Any book recommendations for someone moving from IC to lead?", "Nadia", null],
  ["How much of your day is actually spent writing code now?", null, "Maybe an hour. On a good day."],
  [
    "Can you talk about the tradeoff between shipping fast and accumulating debt? Where's the line for you?",
    "Yoga",
    null,
  ],
  ["What's your take on AI code review tools — genuinely useful or noise?", null, null],
  [
    "We're a fintech and every schema change needs a compliance review, which takes two weeks. How do teams in regulated environments keep any velocity at all?",
    "Priya",
    null,
  ],
  ["Do you still use feature flags after launch or clean them up?", "Marco", "Clean them up. A flag older than a quarter is just a bug waiting for a quiet week."],
  ["Favourite debugging technique that isn't a debugger?", null, null],
  [
    "How do you interview for judgment rather than for trivia? Every loop I've run ends up selecting for people who prepped, not people who can think.",
    "Dewi",
    null,
  ],
  ["Is on-call rotation still necessary if you have good observability?", null, null],
  ["What's the smallest team you've seen ship something at real scale?", "Alvin", null],
  [
    "You said earlier that documentation rots. So what's the alternative — do you just accept that the code is the only truth and invest in readability instead, or is there a category of docs that's actually worth maintaining over years?",
    null,
    null,
  ],
  ["How do you keep learning without burning your weekends?", "Ratna", null],
  ["Any advice for someone switching from backend to frontend?", null, null],
  ["What made you leave your last role?", "Anonymous fan", null],
  [
    "Our postmortems always end with 'add more monitoring' and nothing changes. How do you make them actually produce change?",
    "Gilang",
    "Assign one owner and one date per action item. No owner means it didn't happen.",
  ],
  ["Do you think junior roles are disappearing?", null, null],
  ["Vim or VS Code?", "Iqbal", null],
  [
    "How should a small team think about accessibility when there's no budget for an audit and no one on the team has the expertise?",
    "Lena",
    null,
  ],
  ["What's the most over-hyped tool right now?", null, null],
  ["How do you say no to your own manager?", "Hendra", null],
  [
    "We've got a legacy system nobody understands and the person who wrote it left three years ago. Where do you even start with something like that?",
    null,
    "Instrument it before you touch it. You can't refactor what you can't observe.",
  ],
  ["Remote, hybrid, or office — what actually works for engineering?", "Sinta", null],
  ["Best way to onboard a new engineer in week one?", null, null],
  [
    "Is there ever a good reason to build your own auth in 2026, or is that permanently a mistake now?",
    "Rio",
    null,
  ],
  ["How do you measure developer productivity without it becoming a metric people game?", null, null],
  ["What would you do differently if you started over?", "Ayu", null],
  ["Do you use AI to write tests? Does it work?", "Bagas", null],
  [
    "Speaking as someone who's been burned: how do you evaluate a vendor whose pricing looks fine at your current scale but has a cliff at 10x, without spending three months modelling it?",
    null,
    null,
  ],
  ["Thoughts on monorepos for a team of five?", "Cindy", null],
  ["What's one thing you wish someone told you earlier in your career?", null, null],
  ["How do you handle disagreement in a code review without it getting personal?", "Fajar", null],
  ["Will you share the slides?", null, "Yes — link goes out tonight."],
];

// Deterministic timestamps so nothing depends on Date.now() at module scope.
const BASE = Date.parse("2026-08-17T09:40:00+07:00");

// Deliberately lopsided: the first demo event needs more than one page so "Load more" and the
// speaker deck's prefetch are exercised without submitting anything first.
const DEMO = ["devfest-25", "ai-townhall", "design-systems", "infra-night"];
const eventFor = (i: number) => (i < 22 ? DEMO[0] : DEMO[1 + (i % 3)]);

export const questions: SeedQuestion[] = BODIES.map(([body, author, answer], i) => ({
  id: `q${i + 1}`,
  eventId: eventFor(i),
  body,
  author,
  answer,
  createdAt: new Date(BASE + i * 97_000).toISOString(),
}));

// ---------------------------------------------------------------------------
// Extracted from the auto-generated Indonesian captions of youtu.be/71z6vw_c5JE.
// `videoStart` is the second the ustadz begins answering, so the replay link lands on the
// answer rather than the host reading the question. Questions are tidied from the caption text;
// see ROADMAP.md §6, "rewrite, don't transcribe".
// ---------------------------------------------------------------------------

const TRANSCRIPT: [number, string, string | null, string][] = [
  [
    221,
    "Apa itu puasa Tasu'a dan puasa Asyura, apa keutamaan masing-masing, dan bolehkah kalau kita hanya berpuasa Asyura saja?",
    null,
    "Tasu'a dari kata tisa'ah, yaitu 9 Muharram; Asyura dari asyarah, yaitu 10 Muharram. Nabi ﷺ tiba di Madinah dan mendapati orang Yahudi berpuasa di hari Asyura sebagai syukur atas selamatnya Musa dari kejaran Fir'aun. Beliau bersabda, \"Kami lebih berhak untuk memuliakan Musa daripada kalian,\" lalu memerintahkan sahabat berpuasa. Ketika disebut bahwa itu menyerupai orang Yahudi, beliau bersabda, \"Kalau saya masih hidup tahun depan, saya akan ikutkan yang ke-10 dengan yang ke-9.\" Maka keluarlah puasa Tasu'a dan Asyura. Kalau seseorang hanya puasa Asyura saja tidak masalah, walaupun Imam Nawawi dan ulama lain menganjurkan keduanya.",
  ],
  [
    636,
    "Di tengah euforia Piala Dunia, banyak muslim mengidolakan pemain bola sampai berlebihan — memasang foto mereka, memakai jersey bernama mereka, meniru gaya hidup mereka. Bolehkah seperti itu? Dan bolehkah kita meniatkan bangun tengah malam menonton bola sembari melaksanakan salat tahajud?",
    "Tim Tanya Ustadz",
    "Olahraga hukumnya mubah dalam Islam, bahkan bisa menjadi sunah. Kata Syekh Abu Bakar Jazairi rahimahullah, perkara mubah bisa berubah menjadi sunah kalau diniatkan untuk memberikan hak jasad — sebagaimana makan, minum, tidur, dan mandi. Sabda Nabi ﷺ, \"Wa inna lijasadika alaika haqqo,\" jasadmu punya hak atasmu. Tapi olahraga juga bisa berubah menjadi makruh bahkan haram, yaitu ketika masuk ke ranah judi atau pelanggaran-pelanggaran agama lainnya.",
  ],
  [
    905,
    "Bagaimana pendapat Ustaz mengenai desas-desus yang beredar tentang manusia reptil? Dan mungkinkah ada jin atau setan yang menyerupai manusia?",
    null,
    "Tidak usah dipercaya dan tidak usah diyakini. Ini mirip dengan Darwin yang mengatakan manusia berasal dari kera. Kita sebagai orang beriman sudah tahu kita dari Adam, dan Adam dari tanah — sabda Nabi ﷺ, \"Kalian semua dari Adam dan Adam dari tanah.\" Dalam hadis lain, tidak ada perbedaan antara Arab dan ajam kecuali dengan ketakwaan.",
  ],
  [
    1105,
    "Belakangan ada beberapa kasus kekerasan berat dalam hubungan sepasang kekasih, sampai menimbulkan cacat permanen pada pihak perempuan. Bagaimana Islam memandang kezaliman seperti ini, dan apa batasan yang Allah tetapkan dalam interaksi suami istri?",
    "Tim Tanya Ustadz",
    "Kekasih yang bukan suami istri sendiri sudah haram. Adapun suami istri, KDRT itu tidak ada dan tidak boleh dalam Islam — Allah menjadikan di antara kalian mawaddah wa rahmah. Dalam surah An-Nisa tentang istri yang nusyuz pun urutannya jelas: ingatkan dulu, lalu boikot di ranjang, baru wadribuhunna. Dan kata ulama tafsir itu darbatun ghairu mubarrih, pukulan yang tidak boleh berbekas; dalam hadis dirincikan tidak boleh memukul wajah dan tidak boleh menghina. Kalau mereka sudah taat, jangan cari-cari kesalahannya.",
  ],
  [
    1397,
    "Terkadang ada kebijakan pemimpin yang tidak disukai sebagian masyarakat. Bagaimana tuntunan syariat dalam menyampaikan kritik? Apakah seorang muslim dibenarkan menggunakan kata kasar, celaan, atau perumpamaan yang merendahkan?",
    "Tim Tanya Ustadz",
    "Pemimpin itu simbol masyarakatnya. Kalau pemimpin jujur, berarti banyak yang jujur di antara kita; kalau pemimpin pendusta, berarti banyak pendustanya. Ketika orang Khawarij bertanya kepada Ali radhiallahu anhu kenapa di masa Abu Bakar dan Umar tidak pernah terjadi kericuhan seperti di masanya, Ali menjawab: karena di masa mereka masyarakatnya seperti saya, sedangkan di masa ini masyarakatnya seperti kamu. Ali juga menegaskan satu komunitas harus punya pemimpin — mukmin ataupun fasik — karena dengan adanya pemimpin stabilitas keamanan negara tetap terjaga.",
  ],
  [
    2334,
    "Suami saya sudah lelah dan menyerahkan buku nikah kepada saya, lalu menyuruh saya mengurus perceraian ke pengadilan, tapi ia tidak mau mengucapkan kata talak. Saya tanya \"jadi kita cerai?\" dan ia menjawab \"iya\". Bagaimana statusnya, apakah saya sah berpisah?",
    "Hamba Allah · perempuan, 25 · Sumatera",
    "Justru ibu yang bertanya ini harus bertanya pada diri sendiri dulu: kenapa suaminya jenuh? Umumnya perubahan sikap seorang suami muncul setelah muamalah yang tidak baik dari pasangannya. Dan justru karena suami tidak mau mengucapkan kalimat talak, berarti masih ada rasa sayang — sebenarnya ia tidak ingin bercerai.",
  ],
  [
    2760,
    "Apa hukumnya orang tua melarang anak perempuannya menikah dengan lelaki pilihannya karena ingin anaknya menikah dengan orang kaya, padahal selama ini anaknya selalu memenuhi kebutuhan rumah? Dan apa hukumnya menikah tanpa restu orang tua?",
    "Hamba Allah · perempuan, 29 · Jakarta Pusat",
    "Tidak boleh. Tidak ada orang tua yang membenci anaknya kecuali dia tidak waras. Kalau pilihan si anak beragama tapi miskin dan pilihan orang tua beragama serta berkecukupan, orang tua tidak salah memilih yang kedua — karena yang nanti menikmati harta suaminya adalah anaknya sendiri, orang tua sudah berlepas. Kecuali kalau orang tua justru mendorong anaknya menikah dengan orang yang jelas buruk, barulah boleh ditolak.",
  ],
];

// Second recording: youtu.be/1mycTmtS5_4, a rapid-fire session where the ustadz reads each
// question aloud himself, so there is no host cue to segment on. Transitions were found by
// reading for the interrogative, which is a harder signal to automate than "Selanjutnya…".
const TRANSCRIPT_2: [number, string, string | null, string][] = [
  [
    8,
    "Sebagian dari ibu-ibu yang baru mengaji merasa malas datang karena ibu-ibu yang memakai cadar tidak ramah kepada mereka. Bagaimana ini?",
    null,
    "Sudah saya ingatkan di awal: cadar itu dibuka, kecuali di hadapan laki-laki. Hukum cadar sendiri sunah — itu yang rajih dari dua pendapat ulama. Dan sambutlah yang datang, karena yang mengaji tidak semuanya orang yang sudah lama; banyak yang baru ikut. Kalau pakaiannya belum sempurna tidak ada masalah, dia mau mendengarkan kebaikan — kita harus sedikit demi sedikit.",
  ],
  [
    818,
    "Apakah ada uzur bagi orang jahil yang melakukan syirik dan bidah?",
    null,
    "Masih ada uzur, kalau di tempat itu tidak ada kajian apa-apa dan tidak ada yang mengingatkan dia tentang tauhid dan syirik. Tapi kalau kajian sudah menyebar, dakwah sudah disampaikan, buku-buku sudah disebarkan, dan dia masih tidak mau belajar — itu salah dia, tidak ada uzur baginya. Maka di tempat yang mengajarkan tauhid, tidak ada uzur.",
  ],
  [
    869,
    "Dalam hadis disebutkan al-Khawarij kilabun nar — orang Khawarij adalah anjing-anjing neraka. Apakah mereka nanti benar-benar diserupakan dengan anjing?",
    null,
    "Wallahu a'lam. Kalau melihat lafaznya, lafaznya memang demikian; tapi penjelasan yang lebih luas mesti kita cari lagi. Yang pasti, orang yang masih ada iman seberat zarrah di hatinya tidak akan kekal dalam neraka — itu i'tikad Ahlus Sunnah wal Jamaah.",
  ],
  [
    1057,
    "Apakah ahlul bidah itu sebatas penyimpangan dalam akidah seperti Syiah, Khawarij, Muktazilah, dan Murjiah — sementara amalan seperti tahlilan dan semacamnya tidak termasuk?",
    null,
    "Masuk. Dan umumnya mereka yang sudah melakukan seperti ini pasti juga berkaitan dengan perbuatan syirik — beribadah ke kuburan dan yang lainnya. Ini berbeda dengan ulama yang berijtihad: kalau berijtihad lalu keliru mereka dapat satu ganjaran, kalau benar dua. Tapi ketika ulama itu salah, kita tidak boleh ikut — dan kita juga tidak pernah menyesatkan ulama.",
  ],
  [
    1433,
    "Ziarah kubur itu sudah jelas diperbolehkan. Lalu mengapa Ustaz Yazid tidak memperbolehkan ziarah kubur, sedangkan Nabi memperbolehkan?",
    null,
    "Jangan salah paham — saya tidak melarang orang ziarah kubur. Ziarah kubur boleh dan syar'i. Yang saya larang adalah minta-minta di kubur, kepada selain Allah: kuburan wali, kuburan habib, kuburan kiai, atau yang lainnya. Itu syirik. Tujuan ziarah kubur yang pertama mengucapkan salam kepada penghuni kubur, yang kedua mendoakan mereka — bukan meminta doa dari mereka.",
  ],
  [
    1678,
    "Kalau ada orang melakukan perbuatan-perbuatan syirik, apakah langsung divonis musyrik dan keluar dari Islam?",
    null,
    "Tidak boleh memvonis begitu. Perbuatannya syirik, belum tentu orangnya langsung dikatakan musyrik — hujah harus sampai dulu kepadanya: apakah dia tahu, apakah dia paham. Bahkan orang yang menyembah kubur pun tidak langsung dikatakan musyrik. Pernah ada sahabat sujud kepada Nabi ﷺ — itu kufur, tapi Nabi tidak mengatakan dia kafir dan tidak menyuruhnya mengucapkan dua kalimat syahadat, karena hujah belum sampai kepadanya. Jadi hati-hati, jangan gampang mengatakan orang itu musyrik.",
  ],
  [
    1818,
    "Bolehkah seseorang yang sudah bertobat menceritakan masa lalunya yang penuh maksiat?",
    null,
    "Tidak boleh. Allah sudah menutupi dia ketika berbuat maksiat, jadi jangan diceritakan lagi kepada orang lain. Kalau dia sudah bertobat kepada Allah, sudah — masa lalunya tutup. Jangan ceritakan apa-apa yang sudah Allah tutup. Nanti orang justru ingin berusaha melakukannya.",
  ],
  [
    1859,
    "Bolehkah kita berguru kepada siapa saja, diambil baiknya dan ditinggalkan jeleknya?",
    null,
    "Belajar kepada seseorang itu harus tahu dulu akidahnya benar atau tidak, manhajnya benar atau tidak, bagaimana ibadah dan salatnya — setelah semuanya jelas, baru belajar. Bukan seperti sekarang, baru dengar ceramahnya di YouTube langsung dipanggil, tidak tahu siapa yang ceramah itu. Itu justru menunjukkan kebodohan; harus tahu dulu siapa.",
  ],
];

function ingest(
  eventId: string,
  startsAt: string,
  pairs: [number, string, string | null, string][],
  prefix: string,
): SeedQuestion[] {
  const base = Date.parse(startsAt);
  return pairs.map(([videoStart, body, author, answer], i) => ({
    id: `${prefix}${i + 1}`,
    eventId,
    body,
    author,
    answer,
    source: "transcript" as const,
    videoStart,
    createdAt: new Date(base + videoStart * 1000).toISOString(),
  }));
}

questions.push(
  ...ingest("tanya-ustadz-24-jun", "2026-06-24T20:00:00+07:00", TRANSCRIPT, "t"),
  ...ingest("tanya-jawab-yazid", "2026-05-12T19:30:00+07:00", TRANSCRIPT_2, "y"),
);
