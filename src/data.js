// All portfolio content lives here — zones, projects, links.

export const CONTENT = {
  about: {
    tag: 'About',
    title: 'Ciao, I\'m Vito 👋',
    body: `
      <p>I'm a <strong>web developer from Sicily, Italy</strong> — building for the
      web from the island you're driving on right now.</p>
      <p>I co-founded <strong>GeForge</strong>, a web agency where we craft sites,
      e-commerce and custom platforms for clients. On the side I freelance and
      build my own products as an indie SaaS maker.</p>
      <p>Currently building <strong>Tren</strong> — a white-label mobile app
      platform for personal trainers.</p>
    `,
    links: [
      { label: 'Get in touch →', href: 'mailto:v.digrigoli@geforge.it', alt: true },
    ],
  },

  skills: {
    tag: 'Skills',
    title: 'The toolbox',
    body: `
      <p>From CMS battlegrounds to mobile apps and 3D on the web — whatever the
      job needs:</p>
      <div class="chips">
        <span class="chip">WordPress</span>
        <span class="chip">WooCommerce</span>
        <span class="chip">PrestaShop</span>
        <span class="chip">Flutter / Dart</span>
        <span class="chip">Supabase</span>
        <span class="chip">Three.js / WebGL</span>
        <span class="chip">PHP</span>
        <span class="chip">JavaScript / React</span>
        <span class="chip">Linux / VPS</span>
      </div>
    `,
    links: [],
  },

  contact: {
    tag: 'Contact',
    title: 'Let\'s build something',
    body: `
      <p>Got a project, an idea, or just want to say ciao? The lighthouse is
      always on. 🗼</p>
      <p>I'm open to freelance work, agency collaborations and interesting
      product ideas.</p>
    `,
    links: [
      { label: '✉️ v.digrigoli@geforge.it', href: 'mailto:v.digrigoli@geforge.it', alt: true },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vito-di-grigoli' },
      { label: 'GitHub', href: 'https://github.com/vitodigrigoli' },
    ],
  },
};

// Project structures placed around the harbor district.
export const PROJECTS = [
  {
    id: 'anfi',
    tag: 'Project · PWA',
    title: 'Congresso ANFI',
    short: 'ANFI',
    body: `
      <p>A <strong>PWA for the Associazione Nazionale Fisiatria
      Interventistica</strong>, used live during its medical congresses:
      attendees register for events, follow the up-to-date program and join
      the <strong>gamification</strong> activities with leaderboard.</p>
      <p>Per-congress sponsor management, speaker directory, downloadable
      participation certificates, a passport-style stamp for every congress
      attended, photo gallery and an auto-updating social wall.</p>
      <p>Built on <strong>WordPress</strong> with a fully custom theme.</p>
    `,
    links: [{ label: 'Visit the app →', href: 'https://congressoanfi.fisiaforma.it/' }],
    color: 0x3da9fc,
  },
  {
    id: 'geforge',
    tag: 'Project · Agency',
    title: 'GeForge',
    short: 'GEFORGE',
    body: `
      <p>The showcase site of the <strong>web agency I co-founded</strong> in
      San Giovanni Gemini, Sicily. Web design, branding, SEO, video and
      social — with a distinctive focus on <strong>healthcare
      professionals</strong>: surgeons, physiotherapy centers, labs and
      medical training programs.</p>
      <p>Built on <strong>WordPress</strong> with a custom theme.</p>
    `,
    links: [{ label: 'Visit GeForge →', href: 'https://geforge.it/' }],
    color: 0xf2b134,
  },
  {
    id: 'artieri',
    tag: 'Project · Custom theme',
    title: 'Artieri 1895',
    short: 'ARTIERI 1895',
    body: `
      <p>Showcase site for a <strong>Volterra alabaster atelier</strong>
      founded in 1895 — heritage, bespoke services and collections, with an
      elegant minimal aesthetic to match.</p>
      <p>Design and mockup by <strong>Antonio Lo Cicero</strong>, custom
      <strong>WordPress theme development by me</strong>; project managed for
      the client by Tip Studio.</p>
    `,
    links: [
      { label: 'Visit Artieri 1895 →', href: 'https://artieri1895.com/' },
      { label: 'Design: A. Lo Cicero', href: 'https://www.antoniolocicero.com/' },
    ],
    color: 0xd4582a,
  },
  {
    id: 'tona',
    tag: 'Project · Website + App',
    title: 'Dottor Diego Tona',
    short: 'DR TONA',
    body: `
      <p>Personal site for a <strong>doctor, nutritionist and coach</strong> —
      training programs, tailored nutrition plans and medical check-ups,
      packaged in 6-week cycles.</p>
      <p>Custom <strong>WordPress</strong> theme with smooth page transitions
      powered by <strong>Barba.js</strong>. We're now also building his
      training app together.</p>
    `,
    links: [{ label: 'Visit the site →', href: 'https://dottordiegotona.it/' }],
    color: 0x4ecdc4,
  },
];

export const HINTS = {
  desktop: 'Drive with WASD or arrow keys · drive into places to discover them',
  mobile: 'Drag the joystick to drive · roll into places to discover them',
};
