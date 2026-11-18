/* Bonsai Days — illustration: title print, selection prints, character portraits, chapter cards.
   Everything is drawn here in code. Inspired by the flat colour and bokashi gradients of
   ukiyo-e, but all compositions and characters are original. */
(function () {
  const BD = window.BD;
  const { rng, f, mix, smooth } = BD.util;

  // ---------- helpers ----------
  function bez(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  }

  // ---------- title print ----------
  function title() {
    const R = rng(1823);
    let s = `<defs>
      <linearGradient id="tSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22386a"/><stop offset=".22" stop-color="#7f9bb4"/><stop offset=".5" stop-color="#e8dcc0"/><stop offset="1" stop-color="#f0e4c6"/></linearGradient>
      <linearGradient id="tMtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e2f1f"/><stop offset=".55" stop-color="#b8472c"/><stop offset="1" stop-color="#c7683c"/></linearGradient>
      <linearGradient id="tSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a64a0"/><stop offset="1" stop-color="#1b305e"/></linearGradient>
      <clipPath id="waveClip"><path id="waveBodyPath" d=""/></clipPath>
    </defs>`;
    s += `<rect width="1600" height="900" fill="url(#tSky)"/>`;
    // mackerel-sky clouds: rows of small soft dashes
    let clouds = '';
    for (let row = 0; row < 7; row++) {
      const y = 120 + row * 26 + R() * 6;
      for (let i = 0; i < 22; i++) {
        const x = 120 + i * 62 + (row % 2) * 30 + R() * 14;
        if (R() < 0.3) continue;
        clouds += `<rect x="${f(x)}" y="${f(y)}" width="${f(26 + R() * 18)}" height="9" rx="4.5"/>`;
      }
    }
    s += `<g fill="#fbf6e8" opacity=".85">${clouds}</g>`;
    // red mountain
    const mtn = 'M80 690 C260 600 420 420 560 268 C578 250 606 250 624 268 C760 410 920 590 1180 690Z';
    s += `<path d="${mtn}" fill="url(#tMtn)" stroke="#3a1a10" stroke-width="2"/>`;
    // snow streaks reaching down the summit
    let streaks = '';
    for (let i = 0; i < 9; i++) {
      const x = 545 + i * 12, L = 30 + R() * 50;
      streaks += `M${x} ${268 + Math.abs(i - 4) * 6}q${f((i - 4) * 3)} ${f(L * 0.5)} ${f((i - 4) * 5)} ${f(L)}`;
    }
    s += `<path d="${streaks}" stroke="#f6ecd6" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M548 280 C566 254 610 250 632 278 L612 292 L598 280 L584 296 L570 282Z" fill="#f6ecd6"/>`;
    // forest at the mountain foot
    let dots = '';
    for (let i = 0; i < 70; i++) dots += `<ellipse cx="${f(150 + R() * 1000)}" cy="${f(640 + R() * 40)}" rx="${f(6 + R() * 6)}" ry="${f(10 + R() * 6)}"/>`;
    s += `<path d="M60 700 C300 640 800 630 1200 690 V720 H60Z" fill="#2f4a32"/>`;
    s += `<g fill="#26402a">${dots}</g>`;
    // sea
    s += `<rect x="0" y="690" width="1600" height="210" fill="url(#tSea)"/>`;
    let lines = '';
    for (let i = 0; i < 26; i++) {
      const y = 705 + i * 8, x = R() * 1400;
      lines += `M${f(x)} ${y}q40 -6 80 0t80 0`;
    }
    s += `<path d="${lines}" stroke="#8fb0d8" stroke-width="2" fill="none" opacity=".6"/>`;

    // the great wave — original curl built from three bezier segments
    const S1 = [[1650, 560], [1560, 430], [1420, 300], [1230, 286]];
    const S2 = [[1230, 286], [1100, 278], [990, 320], [940, 400]];
    const S3 = [[940, 400], [915, 442], [930, 486], [968, 488]];
    const body = `M1650 900 L1650 560 C1560 430 1420 300 1230 286 C1100 278 990 320 940 400 C915 442 930 486 968 488 C1000 490 1012 458 994 438 C1030 404 1100 388 1160 416 C1236 452 1262 570 1196 700 C1150 790 1070 860 990 900Z`;
    s = s.replace('<path id="waveBodyPath" d=""/>', `<path d="${body}"/>`);
    s += `<path d="${body}" fill="#1f3a6e" stroke="#0f1d3a" stroke-width="3"/>`;
    // inner stripes following the crest
    let stripes = '';
    [[24, 44, '#3a64a4'], [52, 92, '#2c5190'], [84, 150, '#3a64a4'], [120, 210, '#2c5190']].forEach(([dx, dy, c]) => {
      stripes += `<path d="M${S1[0][0] + dx} ${S1[0][1] + dy}C${S1[1][0] + dx} ${S1[1][1] + dy} ${S1[2][0] + dx} ${S1[2][1] + dy} ${S1[3][0] + dx} ${S1[3][1] + dy}C${S2[1][0] + dx} ${S2[1][1] + dy} ${S2[2][0] + dx} ${S2[2][1] + dy} ${S2[3][0] + dx} ${S2[3][1] + dy}" stroke="${c}" stroke-width="16" fill="none"/>`;
      stripes += `<path d="M${S1[0][0] + dx} ${S1[0][1] + dy}C${S1[1][0] + dx} ${S1[1][1] + dy} ${S1[2][0] + dx} ${S1[2][1] + dy} ${S1[3][0] + dx} ${S1[3][1] + dy}C${S2[1][0] + dx} ${S2[1][1] + dy} ${S2[2][0] + dx} ${S2[2][1] + dy} ${S2[3][0] + dx} ${S2[3][1] + dy}" stroke="#e8eef6" stroke-width="2" fill="none" opacity=".55"/>`;
    });
    s += `<g clip-path="url(#waveClip)">${stripes}</g>`;
    // foam band + claws
    const crest = [];
    [[S1, 0.45, 1, 12], [S2, 0, 1, 16], [S3, 0, 0.85, 6]].forEach(([S, a, b, n]) => {
      for (let i = 0; i < n; i++) crest.push(bez(S[0], S[1], S[2], S[3], a + ((b - a) * i) / n));
    });
    s += `<path d="${smooth(crest, false)}" stroke="#f6efdc" stroke-width="26" fill="none" stroke-linecap="round"/>`;
    let foam = '';
    let claws = '';
    for (let i = 1; i < crest.length - 1; i++) {
      const p = crest[i], q = crest[i + 1], o = crest[i - 1];
      let tx = q[0] - o[0], ty = q[1] - o[1];
      const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      const nx = ty, ny = -tx; // outward normal (crest runs right-to-left)
      foam += `<circle cx="${f(p[0] + nx * 10)}" cy="${f(p[1] + ny * 10)}" r="${f(9 + R() * 6)}"/>`;
      if (i % 2 === 0) {
        // a claw: three tapering fingers curling forward
        const bx = p[0] + nx * 14, by = p[1] + ny * 14;
        for (let k = -1; k <= 1; k++) {
          const len = 26 + R() * 14 - Math.abs(k) * 6;
          const ex = bx + nx * len * 0.6 + tx * len * 0.9 + k * 7 * tx, ey = by + ny * len * 0.6 + ty * len * 0.9 + k * 7 * ty;
          const cx = bx + nx * len + tx * len * 0.1, cy = by + ny * len + ty * len * 0.1;
          claws += `<path d="M${f(bx + k * 5 * tx)} ${f(by + k * 5 * ty)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" />`;
        }
      }
    }
    s += `<g fill="#f6efdc" stroke="#1f3a6e" stroke-width="1.5">${foam}</g>`;
    s += `<g stroke="#f6efdc" stroke-width="7" stroke-linecap="round" fill="none">${claws}</g>`;
    // spray dots
    let spray = '';
    for (let i = 0; i < 60; i++) spray += `<circle cx="${f(900 + R() * 520)}" cy="${f(220 + R() * 200)}" r="${f(2 + R() * 4)}"/>`;
    s += `<g fill="#f6efdc" opacity=".9">${spray}</g>`;
    // small foreground swells
    let sw = '';
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 150, y = 830 + (i % 2) * 20;
      sw += `<path d="M${x} ${y + 70} C${x + 20} ${y} ${x + 90} ${y - 20} ${x + 140} ${y + 10} C${x + 110} ${y + 4} ${x + 96} ${y + 30} ${x + 120} ${y + 40} C${x + 160} ${y + 60} ${x + 180} ${y + 70} ${x + 190} ${y + 70}Z" fill="#1f3a6e" stroke="#0f1d3a" stroke-width="2"/>`;
      sw += `<path d="M${x + 30} ${y + 18} C${x + 60} ${y - 6} ${x + 110} ${y - 14} ${x + 138} ${y + 10}" stroke="#f6efdc" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    }
    s += sw;
    // rocky outcrop with a windswept pine (drawn by the bonsai engine)
    s += `<g transform="translate(150 0)"><path d="M180 900 L220 760 L260 730 L330 716 L400 740 L450 790 L470 900Z" fill="#5a4a3a" stroke="#24170f" stroke-width="3"/>
      <path d="M260 730 L300 780 L290 900 M330 716 L360 790 L420 820" stroke="#24170f" stroke-width="2" fill="none"/>
      <path d="M330 716 L400 740 L450 790 L380 770Z" fill="#3e3228"/></g>`;
    const t = BD.tree.render({ species: 'pine', seed: 77, g: 1, style: 'windswept', sweep: 'droop', sun: 'full', season: 'summer', era: 1, ramif: 4 });
    s += `<g transform="translate(470 726) scale(1.15) scale(-1 1)">${t.svg}</g>`;
    // paper grain over everything
    s += `<rect width="1600" height="900" fill="#fff" filter="url(#paperfx)" opacity=".55"/>`;
    return s;
  }

  // ---------- selection prints ----------
  const PRESET = {
    pine: { style: 'informal', pot: 'rect', season: 'summer', sweep: 'level', seed: 401 },
    maple: { style: 'informal', pot: 'oval', season: 'autumn', sweep: 'droop', seed: 517 },
    juniper: { style: 'windswept', pot: 'drum', season: 'summer', sweep: 'level', seed: 233 },
  };
  function selectPrint(species) {
    const p = PRESET[species];
    const sp = BD.tree.SPECIES[species];
    const t = BD.tree.render({ species, seed: p.seed, g: 1, style: p.style, sweep: p.sweep, sun: species === 'maple' ? 'morning' : 'full', season: p.season, era: 1, ramif: 5 });
    const pot = BD.tree.pot(p.pot, 1);
    const sunCol = species === 'maple' ? '#d9472b' : '#f1e6c8';
    return `<svg viewBox="-230 -430 460 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="sel-${species}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22386a"/><stop offset=".25" stop-color="#9db3c4"/><stop offset=".6" stop-color="#efe3c6"/></linearGradient></defs>
      <rect x="-230" y="-430" width="460" height="560" fill="url(#sel-${species})"/>
      <circle cx="${species === 'juniper' ? -120 : 120}" cy="-300" r="42" fill="${sunCol}" opacity=".95"/>
      ${species === 'juniper' ? '<path d="M-230 -40 C-120 -120 -40 -110 40 -60 C120 -110 180 -90 230 -60 V140 H-230Z" fill="#7a9458"/>' : '<path d="M-230 -30 C-120 -90 -40 -80 40 -40 C140 -100 190 -80 230 -40 V140 H-230Z" fill="#7a9458" opacity=".8"/>'}
      <rect x="-230" y="40" width="460" height="100" fill="#c9a676"/>
      <path d="M-230 40 H230" stroke="#24170f" stroke-width="2"/>
      <g transform="translate(0 ${-pot.h + 34}) scale(.78)">${pot.defs}${pot.soil}${t.svg}${BD.tree.moss(1, pot.w, 1, p.seed)}${pot.body}</g>
      <rect x="-230" y="-430" width="460" height="560" fill="#fff" filter="url(#paperfx)" opacity=".5"/>
      <g transform="translate(${species === 'juniper' ? 160 : -200} -400)">
        <rect width="44" height="${sp.jp.length * 40 + 24}" fill="#f4ead2" stroke="#24170f" stroke-width="2"/>
        <rect x="4" y="4" width="36" height="${sp.jp.length * 40 + 16}" fill="none" stroke="#24170f" stroke-width="1"/>
        <text x="22" y="18" writing-mode="vertical-rl" font-family="'Shippori Mincho','Yu Mincho',serif" font-size="30" font-weight="700" fill="#1a1410">${sp.jp}</text>
      </g>
    </svg>`;
  }

  // ---------- portraits ----------
  function portrait(who, era) {
    const line = era === 2 ? '#111' : era === 1 ? '#3a2418' : 'none';
    const lw = era === 2 ? 3.2 : era === 1 ? 1.6 : 0;
    const L = `stroke="${line}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"`;
    const thin = era === 2 ? 2 : 1.3;
    const skin = era === 2 ? '#fff' : era === 1 ? '#f2dcbc' : 'url(#skinG)';
    const skinShade = era === 2 ? '#ececec' : era === 1 ? '#e2c49c' : '#e2b48f';
    let bg = '', defs = '';
    if (era === 1) bg = `<rect width="200" height="220" fill="#ead9b4"/><rect y="150" width="200" height="70" fill="url(#seigaiha)" opacity=".9"/><rect width="200" height="220" fill="#fff" filter="url(#paperfx)" opacity=".4"/>`;
    if (era === 2) {
      let lines = '';
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; lines += `M${f(100 + Math.cos(a) * 70)} ${f(110 + Math.sin(a) * 70)}L${f(100 + Math.cos(a) * 200)} ${f(110 + Math.sin(a) * 200)}`; }
      bg = `<rect width="200" height="220" fill="#fff"/><path d="${lines}" stroke="#bdbdbd" stroke-width="1"/>`;
    }
    if (era === 3) {
      defs = `<defs><radialGradient id="pbg-${who}" cx=".3" cy=".25" r="1"><stop offset="0" stop-color="${who === 'aoi' ? '#ffb2d0' : '#ffd9a0'}"/><stop offset=".55" stop-color="${who === 'aoi' ? '#7a6cf0' : '#5c8ee8'}"/><stop offset="1" stop-color="#1f2350"/></radialGradient>
        <linearGradient id="skinG" x1="0" x2="1"><stop offset="0" stop-color="#ffe8d4"/><stop offset="1" stop-color="#eebc98"/></linearGradient>
        <linearGradient id="cloth-${who}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${who === 'aoi' ? '#4b6cd8' : '#3a4f9a'}"/><stop offset="1" stop-color="${who === 'aoi' ? '#2a2f80' : '#1f2858'}"/></linearGradient></defs>`;
      bg = `<rect width="200" height="220" fill="url(#pbg-${who})"/><g opacity=".6">${[[40, 50, 16], [160, 40, 10], [150, 120, 22], [30, 150, 12]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".25"/>`).join('')}</g>`;
    }
    let s = defs + bg;
    if (who === 'sensei') {
      const cloth = era === 2 ? '#a9a9a9' : era === 1 ? '#2d4a7a' : 'url(#cloth-sensei)';
      // shoulders in a samue work jacket
      s += `<path d="M14 222 C18 186 46 168 72 162 L128 162 C154 168 182 186 186 222Z" fill="${cloth}" ${L}/>`;
      s += `<path d="M84 160 L100 196 L116 160Z" fill="${era === 2 ? '#fff' : '#efe6d4'}" ${L}/>`;
      s += `<path d="M72 162 L100 214 M128 162 L108 196" fill="none" ${L}/>`;
      s += `<rect x="86" y="140" width="28" height="26" fill="${skin}" ${L}/>`;
      // ears + head
      s += `<ellipse cx="57" cy="104" rx="9" ry="14" fill="${skin}" ${L}/><ellipse cx="143" cy="104" rx="9" ry="14" fill="${skin}" ${L}/>`;
      s += `<ellipse cx="100" cy="96" rx="43" ry="52" fill="${skin}" ${L}/>`;
      if (era === 2) s += `<path d="M118 60 C140 80 144 120 126 146 C138 120 136 86 118 60Z" fill="#e6e6e6"/>`;
      if (era === 3) s += `<ellipse cx="86" cy="62" rx="16" ry="8" fill="#fff" opacity=".5"/>`;
      // white side hair
      const hair = era === 2 ? '#fff' : era === 3 ? '#f4f2ff' : '#f2efe6';
      s += `<path d="M58 86 C50 96 52 116 60 120 C60 108 62 96 66 88Z M142 86 C150 96 148 116 140 120 C140 108 138 96 134 88Z" fill="${hair}" ${L}/>`;
      // forehead lines
      s += `<path d="M84 64 q16 -5 32 0 M88 72 q12 -4 24 0" fill="none" stroke="${era === 3 ? '#c99a7a' : line}" stroke-width="${thin * 0.7}"/>`;
      // bushy brows
      s += `<path d="M70 86 q12 -10 26 -2 q-12 0 -26 6Z M130 86 q-12 -10 -26 -2 q12 0 26 6Z" fill="${hair}" ${L}/>`;
      // gentle closed eyes
      s += `<g class="eyes"><path d="M76 100 q8 6 16 0 M108 100 q8 6 16 0" fill="none" stroke="${era === 3 ? '#4a2e22' : line || '#3a2418'}" stroke-width="${era === 2 ? 2.6 : 2}"/></g>`;
      // round glasses
      s += `<g fill="${era === 3 ? 'rgba(255,255,255,.18)' : 'none'}" stroke="${era === 3 ? '#2a2a3a' : era === 2 ? '#111' : '#3a2418'}" stroke-width="${era === 2 ? 2.4 : 1.8}"><circle cx="84" cy="101" r="13"/><circle cx="116" cy="101" r="13"/><path d="M97 100 q3 -3 6 0 M71 99 L58 96 M129 99 L142 96"/></g>`;
      if (era === 2) s += `<path d="M76 94 l6 -6 M108 94 l6 -6" stroke="#111" stroke-width="2"/>`;
      // nose, moustache and beard
      s += `<path d="M100 104 q-6 14 0 16 q4 1 6 -1" fill="none" stroke="${era === 3 ? '#b07a5a' : line}" stroke-width="${thin}"/>`;
      s += `<path d="M78 128 C88 118 98 122 100 126 C102 122 112 118 122 128 C112 126 104 130 100 132 C96 130 88 126 78 128Z" fill="${hair}" ${L}/>`;
      s += `<path d="M90 138 C92 156 108 156 110 138 C104 142 96 142 90 138Z" fill="${hair}" ${L}/>`;
      s += `<path d="M93 134 q7 4 14 0" fill="none" stroke="${era === 3 ? '#9a5a4a' : line}" stroke-width="${thin}"/>`;
      if (era !== 1) s += `<ellipse cx="72" cy="118" rx="7" ry="4" fill="${era === 2 ? 'url(#hatch)' : '#ff9a8a'}" opacity="${era === 2 ? 0.6 : 0.35}"/><ellipse cx="128" cy="118" rx="7" ry="4" fill="${era === 2 ? 'url(#hatch)' : '#ff9a8a'}" opacity="${era === 2 ? 0.6 : 0.35}"/>`;
    } else {
      const shirt = era === 2 ? '#fff' : era === 1 ? '#d9a43a' : '#ffcf6a';
      const apron = era === 2 ? '#8f8f8f' : era === 1 ? '#2d4a7a' : 'url(#cloth-aoi)';
      const hair = era === 2 ? '#111' : era === 1 ? '#1d1a1e' : '#2a2340';
      s += `<path d="M22 222 C26 188 52 170 76 166 L124 166 C148 170 174 188 178 222Z" fill="${shirt}" ${L}/>`;
      s += `<path d="M60 222 L64 186 L136 186 L140 222Z" fill="${apron}" ${L}/>`;
      s += `<path d="M64 186 L76 166 M136 186 L124 166" fill="none" ${L}/>`;
      // tiny leaf on the apron
      s += `<path d="M100 198 q8 -8 14 0 q-8 6 -14 0Z" fill="${era === 2 ? '#fff' : '#8fc15a'}" ${L}/>`;
      s += `<rect x="88" y="142" width="24" height="26" fill="${skin}" ${L}/>`;
      // hair behind head
      s += `<path d="M54 96 C50 52 150 52 146 96 L150 146 C134 152 120 140 118 132 L82 132 C80 140 66 152 50 146Z" fill="${hair}" ${L}/>`;
      s += `<ellipse cx="100" cy="100" rx="38" ry="46" fill="${skin}" ${L}/>`;
      if (era === 2) s += `<path d="M120 70 C138 90 136 124 118 142 C130 118 130 90 120 70Z" fill="#e6e6e6"/>`;
      // bangs
      s += `<path d="M60 92 C58 54 142 50 140 92 C132 78 124 72 120 84 C114 70 104 68 100 82 C94 68 82 70 78 84 C72 76 64 80 60 92Z" fill="${hair}" ${L}/>`;
      if (era !== 1) s += `<path d="M80 64 q12 -6 26 -2" stroke="#fff" stroke-width="${era === 2 ? 3 : 2}" fill="none" opacity="${era === 2 ? 1 : 0.5}" stroke-linecap="round"/>`;
      // leaf hair clip
      s += `<path d="M126 74 q10 -12 18 -2 q-10 10 -18 2Z" fill="${era === 2 ? '#fff' : '#79b04a'}" ${L}/><path d="M128 74 l12 -4" stroke="${era === 2 ? '#111' : '#3d6a22'}" stroke-width="1"/>`;
      // eyes
      if (era === 1) {
        s += `<g class="eyes"><path d="M74 104 q9 -5 18 0 q-9 3 -18 0Z M108 104 q9 -5 18 0 q-9 3 -18 0Z" fill="#fff" stroke="#3a2418" stroke-width="1.4"/><circle cx="83" cy="103.5" r="2.2" fill="#1d1a1e"/><circle cx="117" cy="103.5" r="2.2" fill="#1d1a1e"/></g>`;
        s += `<path d="M74 94 q9 -4 18 -1 M108 93 q9 -3 18 1" stroke="#1d1a1e" stroke-width="1.4" fill="none"/>`;
        s += `<path d="M98 110 q-2 8 2 10" stroke="#3a2418" stroke-width="1.2" fill="none"/><path d="M94 128 q6 3 12 0" stroke="#b03a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      } else {
        const big = era === 2 ? 1.15 : 1;
        const iris = era === 2 ? '#111' : 'url(#irisG)';
        if (era === 3) s += `<defs><linearGradient id="irisG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a6a"/><stop offset="1" stop-color="#5ab0e0"/></linearGradient></defs>`;
        s += `<g class="eyes">`;
        [83, 117].forEach((cx) => {
          s += `<ellipse cx="${cx}" cy="104" rx="${f(9 * big)}" ry="${f(11 * big)}" fill="#fff" stroke="${era === 2 ? '#111' : '#3a2a4a'}" stroke-width="${era === 2 ? 2 : 1}"/>`;
          s += `<ellipse cx="${cx}" cy="106" rx="${f(6.5 * big)}" ry="${f(8.5 * big)}" fill="${iris}"/>`;
          s += `<circle cx="${cx - 3}" cy="101" r="3" fill="#fff"/><circle cx="${cx + 3}" cy="110" r="1.4" fill="#fff"/>`;
          s += `<path d="M${cx - 11} 96 q11 -9 22 0" stroke="${era === 2 ? '#111' : '#2a2340'}" stroke-width="${era === 2 ? 3.4 : 2.4}" fill="none" stroke-linecap="round"/>`;
        });
        s += `</g>`;
        s += `<path d="M74 86 q9 -4 16 -1 M110 85 q9 -3 16 1" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        s += `<path d="M100 114 l-2 6 h3" stroke="${era === 2 ? '#111' : '#c08a70'}" stroke-width="1.4" fill="none"/>`;
        s += `<path d="M92 128 q8 6 16 0" stroke="${era === 2 ? '#111' : '#c0506a'}" stroke-width="2.4" fill="${era === 2 ? '#fff' : '#ff9ab0'}" stroke-linecap="round"/>`;
        s += `<ellipse cx="72" cy="120" rx="8" ry="4" fill="${era === 2 ? 'url(#hatch)' : '#ff8aa8'}" opacity="${era === 2 ? 0.7 : 0.45}"/><ellipse cx="128" cy="120" rx="8" ry="4" fill="${era === 2 ? 'url(#hatch)' : '#ff8aa8'}" opacity="${era === 2 ? 0.7 : 0.45}"/>`;
        if (era === 2) s += `<path d="M144 60 l26 -26" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="M144 60 l26 -26" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M170 34 l5 -5" stroke="#111" stroke-width="5"/>`;
        if (era === 3) s += `<path d="M146 62 l24 -30" stroke="#e8ecff" stroke-width="4" stroke-linecap="round"/><circle cx="170" cy="32" r="4" fill="#9ff" opacity=".8"/>`;
      }
    }
    if (era === 3) s += `<rect width="200" height="220" fill="url(#pbg-${who})" opacity=".12" style="mix-blend-mode:screen"/>`;
    return `<svg viewBox="0 0 200 220" class="portrait-svg" aria-hidden="true">${s}</svg>`;
  }

  // ---------- chapter card backgrounds ----------
  function chapterArt(era) {
    if (era === 1) {
      return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="c1sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22386a"/><stop offset=".35" stop-color="#e9dcc0"/></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#c1sky)"/>
        <circle cx="800" cy="430" r="190" fill="#c23a28"/>
        <rect y="640" width="1600" height="260" fill="url(#seigaiha)"/>
        <rect width="1600" height="900" fill="#fff" filter="url(#paperfx)" opacity=".55"/></svg>`;
    }
    if (era === 2) {
      let lines = '';
      const R = rng(9);
      for (let i = 0; i < 160; i++) { const a = (i / 160) * Math.PI * 2 + R() * 0.02; const r0 = 260 + R() * 120; lines += `M${f(800 + Math.cos(a) * r0)} ${f(450 + Math.sin(a) * r0)}L${f(800 + Math.cos(a) * 1400)} ${f(450 + Math.sin(a) * 1400)}`; }
      return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1600" height="900" fill="#fff"/><path d="${lines}" stroke="#222" stroke-width="2"/></svg>`;
    }
    const R = rng(3);
    let dots = '';
    for (let i = 0; i < 70; i++) dots += `<circle cx="${f(R() * 1600)}" cy="${f(R() * 900)}" r="${f(1 + R() * 4)}" fill="#fff" opacity="${f(0.2 + R() * 0.6)}"/>`;
    return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><radialGradient id="c3a" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#ff9ad0"/><stop offset=".45" stop-color="#6a5cf0"/><stop offset="1" stop-color="#0e1030"/></radialGradient>
      <radialGradient id="c3b" cx=".75" cy=".7" r=".6"><stop offset="0" stop-color="#5ff0e0" stop-opacity=".55"/><stop offset="1" stop-color="#5ff0e0" stop-opacity="0"/></radialGradient></defs>
      <rect width="1600" height="900" fill="url(#c3a)"/><rect width="1600" height="900" fill="url(#c3b)"/>${dots}</svg>`;
  }

  BD.art = { title, selectPrint, portrait, chapterArt, PRESET };
})();
