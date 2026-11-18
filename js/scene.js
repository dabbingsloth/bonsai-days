/* Bonsai Days — the room: a wooden windowsill inside a Japanese house, with a window onto
   a mountain, bamboo and a stone lantern. Redrawn in each era's art style; time of day
   (0 = morning, 0.5 = noon, 1 = evening) is animated by updating a few attributes. */
(function () {
  const BD = window.BD;
  const { rng, clamp, lerp, f, mix, ramp, smooth } = BD.util;

  const SILL_Y = 488; // pot base sits here
  const WIN = { x0: 240, x1: 760, y0: 60, y1: 470 };

  const SKY = {
    1: [['#30508a', '#a7bccb', '#f3dcae'], ['#2b4f8c', '#93b6d2', '#e2e8dc'], ['#2a2250', '#a24f68', '#efa060']],
    2: [['#ffffff', '#ffffff', '#ffffff'], ['#ffffff', '#ffffff', '#ffffff'], ['#ffffff', '#ffffff', '#ffffff']],
    3: [['#7390d2', '#f5c4ab', '#ffe7c2'], ['#3f7fd8', '#8ec2f0', '#d8f0ff'], ['#1c1842', '#7b3a82', '#ff9a62']],
  };
  function skyColours(era, t) {
    const k = SKY[era];
    return [0, 1, 2].map((i) => ramp([[0, k[0][i]], [0.5, k[1][i]], [1, k[2][i]]], t));
  }

  const PAL = {
    1: { wall: '#dcc7a0', wallDark: '#c9b088', wood: '#5a3a26', woodLight: '#7d5536', woodDark: '#3a2418', line: '#24170f', lw: 1.6,
      sill: '#9a6a42', sillTop: '#b88656', grain: '#6a4428', shoji: '#f3ead2', kumiko: '#6a4a30',
      mountain: '#35558a', mountainShade: '#26406c', snow: '#f4ecd8', hill: '#5c7a48', hill2: '#7a9458', mist: '#f3e7cc',
      gwall: '#e6d6b0', roof: '#3e4450', bamboo: '#6a9a3e', bambooDark: '#46702a', bLeaf: '#4f7f30', stone: '#9a978a', stoneDark: '#6f6c62', stoneLight: '#bdb9aa' },
    // Manga: white paper, black ink for the room, light grey ink for the view outside, a few FLAT greys.
    // (Fine dot screens shimmer on screens, so the scene doesn't use them.)
    2: { wall: '#ffffff', wallDark: '#ececec', wood: '#ffffff', woodLight: '#ffffff', woodDark: '#111', line: '#111', lw: 2.2,
      sill: '#d4d4d4', sillTop: '#ffffff', grain: '#8a8a8a', shoji: '#ffffff', kumiko: '#a8a8a8',
      mountain: '#ffffff', mountainShade: '#e6e6e6', snow: '#ffffff', hill: '#f3f3f3', hill2: '#ffffff', mist: '#ffffff',
      gwall: '#ffffff', roof: '#2a2a2a', bamboo: '#ffffff', bambooDark: '#b0b0b0', bLeaf: '#ffffff', stone: '#ffffff', stoneDark: '#d6d6d6', stoneLight: '#fff' },
    3: { wall: '#ead7c0', wallDark: '#cdb196', wood: '#6b4632', woodLight: '#9a6a4a', woodDark: '#3d261b', line: 'none', lw: 0,
      sill: '#9c6a46', sillTop: '#c4915e', grain: '#7a5034', shoji: '#fbf3e6', kumiko: '#8a6448',
      mountain: '#5f7fb8', mountainShade: '#45639a', snow: '#f8f4ff', hill: '#4f8a64', hill2: '#79aa78', mist: '#ffffff',
      gwall: '#efe1cc', roof: '#4a5164', bamboo: '#7dbb5a', bambooDark: '#4f8c3c', bLeaf: '#5aa04a', stone: '#a9a8a2', stoneDark: '#7a7974', stoneLight: '#d6d4cc' },
  };

  function strokeAttr(P, k) {
    return P.lw ? `stroke="${P.line}" stroke-width="${f(P.lw * (k || 1))}" stroke-linejoin="round"` : '';
  }

  // ---------- outside the window ----------
  function view(era, P) {
    const S = (k) => strokeAttr(P, k);
    let s = '';
    // sky
    s += `<rect x="${WIN.x0 - 20}" y="${WIN.y0 - 20}" width="${WIN.x1 - WIN.x0 + 40}" height="${WIN.y1 - WIN.y0 + 40}" fill="url(#skyG)"/>`;
    if (era === 2) s += `<rect id="skyTone" x="${WIN.x0 - 20}" y="${WIN.y0 - 20}" width="560" height="450" fill="#a0a0a0" opacity="0"/>`;
    if (era === 1) s += `<rect x="${WIN.x0 - 20}" y="${WIN.y0 - 20}" width="560" height="70" fill="url(#bokashi)"/>`;
    // sun
    if (era === 1) s += `<circle id="sun" cx="300" cy="300" r="26" fill="#d9472b"/>`;
    else if (era === 2) s += `<g id="sun"><g id="sunRays">${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return `<path d="M${f(Math.cos(a) * 36)} ${f(Math.sin(a) * 36)}L${f(Math.cos(a) * (60 + (i % 2) * 22))} ${f(Math.sin(a) * (60 + (i % 2) * 22))}" stroke="#777" stroke-width="1.3"/>`; }).join('')}</g><circle r="28" fill="#fff" stroke="#555" stroke-width="1.8"/></g>`;
    else s += `<g id="sun"><circle r="90" fill="url(#sunGlow)"/><circle r="26" fill="#fff6dc"/></g>`;
    // stars/moon for evening in era 3 are added via opacity group
    if (era === 3) {
      const R = rng(4);
      s += `<g id="stars" opacity="0">${Array.from({ length: 30 }, () => `<circle cx="${f(WIN.x0 + R() * 520)}" cy="${f(WIN.y0 + R() * 180)}" r="${f(0.6 + R() * 1.3)}" fill="#fff"/>`).join('')}</g>`;
    }
    // clouds / mist bands
    if (era === 1) {
      [[260, 150, 180], [520, 120, 220], [380, 330, 300], [610, 345, 200]].forEach(([x, y, w]) => {
        s += `<rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="${P.mist}" opacity=".9" ${S(0.5)}/>`;
      });
    } else if (era === 2) {
      s += `<path d="M260 140q20 -22 50 -8q18 -24 50 -4q30 -6 30 14Z" fill="#fff" stroke="#666" stroke-width="1.3"/><path d="M560 110q22 -18 48 -4q20 -20 46 0q24 0 22 14Z" fill="#fff" stroke="#666" stroke-width="1.3"/>`;
    } else {
      s += `<g opacity=".55" filter="url(#blur4)"><ellipse cx="330" cy="140" rx="90" ry="14" fill="#fff"/><ellipse cx="600" cy="110" rx="120" ry="16" fill="#fff"/><ellipse cx="480" cy="335" rx="220" ry="14" fill="#fff"/></g>`;
    }
    // mountain — an original snow-capped volcano, off-centre to the left
    const mtn = 'M180 372 C260 320 330 250 372 208 C384 196 398 196 410 208 C452 250 540 320 660 372 Z';
    const shade = 'M391 200 C398 196 404 200 410 208 C452 250 540 320 660 372 L470 372 C450 300 420 250 391 200Z';
    const snow = 'M352 228 C362 216 368 210 372 208 C384 196 398 196 410 208 C418 215 426 224 434 232 L420 240 L410 230 L398 246 L388 232 L376 248 L366 236Z';
    s += `<path id="mtn" d="${mtn}" fill="${era === 3 ? 'url(#mtnG)' : P.mountain}" ${S()}/>`;
    s += `<path id="mtnShade" d="${shade}" fill="${P.mountainShade}" opacity="${era === 3 ? 0.5 : 1}"/>`;
    s += `<path d="${snow}" fill="${P.snow}" ${S(0.7)}/>`;
    if (era === 1) s += `<path d="M300 300l-14 22M330 280l-10 30M450 270l12 28M490 300l16 26" stroke="#24406a" stroke-width="2" stroke-linecap="round"/>`;
    // hills with tree dots
    s += `<path d="M180 400 C260 352 330 360 420 384 C500 350 600 352 790 392 V480 H180Z" fill="${era === 3 ? 'url(#hillG)' : P.hill}" ${S()}/>`;
    if (era !== 2) {
      const R = rng(8);
      let dots = '';
      for (let i = 0; i < 26; i++) { const x = 200 + R() * 560, y = 392 + R() * 22; dots += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5 + R() * 5)}" ry="${f(7 + R() * 5)}"/>`; }
      s += `<g fill="${era === 1 ? '#3f5e32' : '#3c7550'}" opacity="${era === 3 ? 0.5 : 0.9}">${dots}</g>`;
    }
    // garden wall with tile roof (tsuiji-bei)
    s += `<rect x="200" y="420" width="600" height="60" fill="${P.gwall}" ${S()}/>`;
    s += `<path d="M196 424 L206 408 H794 L804 424Z" fill="${P.roof}" ${S()}/>`;
    if (era !== 3) for (let x = 212; x < 800; x += 14) s += `<path d="M${x} 410v12" stroke="${era === 2 ? '#777' : '#2a2e38'}" stroke-width="1.5"/>`;
    // bamboo grove (right) and a few stalks (left)
    const R = rng(21);
    const stalks = [[640, 11], [668, 9], [700, 13], [735, 10], [756, 12], [258, 9], [282, 7]];
    let bam = '';
    stalks.forEach(([x, w], i) => {
      const lean = (R() - 0.5) * 16;
      bam += `<path d="M${x} 480 L${f(x + lean)} 40 L${f(x + lean + w)} 40 L${x + w} 480Z" fill="${i % 2 || era === 2 ? P.bamboo : mix(P.bamboo, '#2f4f20', 0.25)}" ${S(0.6)}/>`;
      for (let y = 450; y > 50; y -= 38 + R() * 10) {
        const xx = x + (lean * (480 - y)) / 440;
        bam += `<path d="M${f(xx - 1)} ${f(y)}h${w + 2}" stroke="${P.bambooDark}" stroke-width="${era === 2 ? 1.2 : 2}"/>`;
      }
    });
    // bamboo leaves: narrow blades in sprays
    let leaves = '';
    for (let i = 0; i < 46; i++) {
      const left = i < 10;
      const x = left ? 250 + R() * 60 : 615 + R() * 160, y = 70 + R() * 300;
      const a = (left ? 20 : -20) + (R() - 0.5) * 120;
      const L = 22 + R() * 14;
      leaves += `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})" d="M0 0 Q${f(L * 0.5)} -4 ${f(L)} 0 Q${f(L * 0.5)} 4 0 0Z"/>`;
    }
    s += `<g id="bamboo">${bam}<g fill="${P.bLeaf}" ${era === 2 ? 'stroke="#777" stroke-width=".9"' : era === 1 ? 'stroke="#2f4f1c" stroke-width=".6"' : 'opacity=".9"'}>${leaves}</g></g>`;
    // stone lantern (kasuga-style tōrō)
    const lx = 330, ly = 478;
    const st = era === 3 ? 'url(#stoneG)' : P.stone;
    s += `<g id="lantern" ${S(0.8)}>
      <path d="M${lx - 30} ${ly} h60 l-6 -12 h-48Z" fill="${P.stoneDark}"/>
      <rect x="${lx - 8}" y="${ly - 62}" width="16" height="50" fill="${st}"/>
      <path d="M${lx - 26} ${ly - 62} h52 l-6 -10 h-40Z" fill="${st}"/>
      <rect x="${lx - 18}" y="${ly - 100}" width="36" height="28" fill="${st}"/>
      <rect id="lanternWin" x="${lx - 9}" y="${ly - 94}" width="18" height="16" fill="${era === 2 ? '#111' : '#2a2a28'}"/>
      <path d="M${lx - 40} ${ly - 98} Q${lx - 30} ${ly - 104} ${lx - 18} ${ly - 112} L${lx} ${ly - 124} L${lx + 18} ${ly - 112} Q${lx + 30} ${ly - 104} ${lx + 40} ${ly - 98} Q${lx} ${ly - 104} ${lx - 40} ${ly - 98}Z" fill="${P.stoneDark}"/>
      <circle cx="${lx}" cy="${ly - 130}" r="7" fill="${st}"/>
    </g>`;
    s += `<circle id="lanternGlow" cx="${lx}" cy="${ly - 86}" r="${era === 3 ? 60 : 30}" fill="${era === 3 ? 'url(#lampGlow)' : era === 2 ? '#fff' : '#f6c75a'}" opacity="0" ${era === 1 ? 'style="mix-blend-mode:screen"' : ''}/>`;
    return s;
  }

  // ---------- the room ----------
  function room(era, P) {
    const S = (k) => strokeAttr(P, k);
    let s = '';
    const woodFill = era === 3 ? 'url(#woodV)' : P.wood;
    // window frame (jambs + head)
    s += `<rect x="${WIN.x0 - 18}" y="${WIN.y0 - 20}" width="${WIN.x1 - WIN.x0 + 36}" height="22" fill="${woodFill}" ${S()}/>`;
    s += `<rect x="${WIN.x0 - 18}" y="${WIN.y0}" width="18" height="${WIN.y1 - WIN.y0}" fill="${woodFill}" ${S()}/>`;
    s += `<rect x="${WIN.x1}" y="${WIN.y0}" width="18" height="${WIN.y1 - WIN.y0}" fill="${woodFill}" ${S()}/>`;
    // shoji panels slid to each side
    [[136, 262], [738, 864]].forEach(([a, b]) => {
      s += `<rect x="${a}" y="${WIN.y0 - 2}" width="${b - a}" height="${WIN.y1 - WIN.y0 + 4}" fill="${P.shoji}" ${era === 3 ? 'opacity=".92"' : ''} ${S()}/>`;
      let k = '';
      for (let i = 1; i < 4; i++) k += `M${f(a + ((b - a) * i) / 4)} ${WIN.y0}V${WIN.y1}`;
      for (let j = 1; j < 7; j++) k += `M${a} ${f(WIN.y0 + ((WIN.y1 - WIN.y0) * j) / 7)}H${b}`;
      s += `<path d="${k}" stroke="${P.kumiko}" stroke-width="${era === 2 ? 1.1 : 2}" fill="none" ${era === 3 ? 'opacity=".55"' : ''}/>`;
      s += `<rect x="${a}" y="${WIN.y0 - 2}" width="${b - a}" height="${WIN.y1 - WIN.y0 + 4}" fill="none" stroke="${era === 2 ? '#111' : P.woodDark}" stroke-width="${era === 2 ? 2 : 7}"/>`;
    });
    // posts (hashira) and lintel (nageshi)
    s += `<rect x="-600" y="0" width="2200" height="26" fill="${woodFill}" ${S()}/>`;
    [92, 882].forEach((x) => (s += `<rect x="${x}" y="0" width="28" height="1600" fill="${woodFill}" ${S()}/>`));
    if (era === 2) [92, 882].forEach((x) => (s += `<rect x="${x + 17}" y="26" width="10" height="1600" fill="#d8d8d8"/>`));
    // hanging scroll (kakejiku) — right of window
    const sx = 940;
    s += `<g id="scroll">
      <path d="M${sx + 70} 34 L${sx + 40} 54 M${sx + 70} 34 L${sx + 100} 54" stroke="${era === 2 ? '#111' : '#4a3a2a'}" stroke-width="1.5"/>
      <rect x="${sx + 34}" y="52" width="72" height="8" rx="3" fill="${era === 2 ? '#111' : P.woodDark}"/>
      <rect x="${sx + 30}" y="60" width="80" height="330" fill="${era === 1 ? '#5a6a4a' : era === 2 ? '#bdbdbd' : '#3c4a6a'}" ${S()}/>
      <rect x="${sx + 40}" y="84" width="60" height="276" fill="${era === 3 ? '#f8f2e8' : P.shoji}" ${S(0.6)}/>
      <text x="${sx + 70}" y="104" font-family="'Shippori Mincho','Yu Mincho',serif" font-size="30" fill="${era === 3 ? '#2a2d40' : '#1a1410'}" writing-mode="vertical-rl" text-anchor="start" letter-spacing="8">一期一会</text>
      <circle cx="${sx + 82}" cy="340" r="0"/>
      <rect x="${sx + 78}" y="332" width="10" height="10" fill="#c23a28"/>
      <rect x="${sx + 26}" y="388" width="88" height="10" rx="5" fill="${era === 2 ? '#111' : P.woodDark}"/>
    </g>`;
    // left: a shoji door
    s += `<rect x="-420" y="26" width="512" height="1600" fill="${P.shoji}" ${S()}/>`;
    let k2 = '';
    for (let x = -380; x < 92; x += 46) k2 += `M${x} 26V1600`;
    for (let y = 80; y < 1600; y += 62) k2 += `M-420 ${y}H92`;
    s += `<path d="${k2}" stroke="${P.kumiko}" stroke-width="${era === 2 ? 1.1 : 2}" fill="none" opacity="${era === 3 ? 0.4 : 0.9}"/>`;
    // sill
    s += `<path d="M120 ${SILL_Y - 18} H880 L896 ${SILL_Y + 2} H104Z" fill="${era === 3 ? 'url(#sillTopG)' : P.sillTop}" ${S()}/>`;
    s += `<rect x="100" y="${SILL_Y + 2}" width="800" height="22" fill="${era === 3 ? 'url(#sillG)' : P.sill}" ${S()}/>`;
    let grain = '';
    const R = rng(3);
    for (let i = 0; i < 9; i++) { const y = SILL_Y - 14 + i * 1.9; const x = 130 + R() * 500; grain += `M${f(x)} ${f(y)}q60 ${f((R() - 0.5) * 3)} ${f(120 + R() * 140)} 0`; }
    for (let i = 0; i < 5; i++) { const y = SILL_Y + 7 + i * 3.4; const x = 110 + R() * 400; grain += `M${f(x)} ${f(y)}q80 ${f((R() - 0.5) * 3)} ${f(160 + R() * 220)} 0`; }
    s += `<path d="${grain}" stroke="${P.grain}" stroke-width="${era === 2 ? 0.8 : 1}" fill="none" opacity="${era === 3 ? 0.35 : 0.7}"/>`;
    // wainscot below
    s += `<rect x="-600" y="${SILL_Y + 24}" width="2200" height="1400" fill="${era === 2 ? '#e6e6e6' : era === 3 ? 'url(#lowG)' : P.woodDark}" ${S()}/>`;
    for (let x = -560; x < 1600; x += 120) s += `<path d="M${x} ${SILL_Y + 24}V2000" stroke="${era === 2 ? '#b5b5b5' : era === 3 ? 'rgba(0,0,0,.18)' : '#24150e'}" stroke-width="${era === 2 ? 1.4 : 2}"/>`;
    // tools on the sill: scissors (left)
    const tc = era === 2 ? '#111' : era === 3 ? '#2a2a35' : '#2a2420';
    s += `<g transform="translate(205 ${SILL_Y - 9}) rotate(-8)" fill="none" stroke="${tc}" stroke-width="3" stroke-linecap="round">
      <ellipse cx="-16" cy="-3" rx="9" ry="6"/><ellipse cx="-16" cy="5" rx="9" ry="6"/><path d="M-7 -1 L30 4 M-7 3 L30 1"/></g>`;
    return s;
  }

  // ---------- watering can (jōro): copper body, long spout, sprinkler rose ----------
  const ROSE = [136, -100]; // centre of the rose, in the can's own coordinates (origin = bottom of the body)
  const SPOUT_ANG = -38.7; // spout direction, degrees
  function wateringCan(era) {
    const c = era === 2 ? '#fff' : era === 3 ? 'url(#canG)' : '#b0683a';
    const cflat = era === 2 ? '#fff' : era === 3 ? '#c7814c' : '#b0683a';
    const cd = era === 2 ? '#c4c4c4' : era === 3 ? '#7a3e1e' : '#7a4224';
    const cl = era === 2 ? '#fff' : era === 3 ? '#ffd6a8' : '#e0a26c';
    const l = era === 2 ? '#111' : era === 1 ? '#24170f' : 'rgba(70,30,10,.6)';
    const lw = era === 2 ? 1.8 : era === 1 ? 1.4 : 0.9;
    const S = `stroke="${l}" stroke-width="${lw}" stroke-linejoin="round"`;
    const tube = (d, w) => `<path d="${d}" fill="none" stroke="${l}" stroke-width="${w + lw * 2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${cflat}" stroke-width="${w}" stroke-linecap="round"/>`;
    let s = '<g class="can">';
    // rear handle
    s += tube('M-32 -58C-58 -56 -60 -18 -33 -13', 6);
    // spout (tapered tube) and its brace
    const spout = BD.util.ribbon([[26, -16], [60, -43], [94, -70], [126, -93.5]], [12, 8.5, 6.5, 5.5]).d;
    s += `<path d="${spout}" fill="${cflat}" ${S}/>`;
    if (era !== 2) s += `<path d="M38 -30L118 -92" stroke="${cl}" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>`;
    s += `<path d="M30 -50L66 -48" stroke="${l}" stroke-width="${4 + lw * 2}" stroke-linecap="round"/><path d="M30 -50L66 -48" stroke="${cd}" stroke-width="4" stroke-linecap="round"/>`;
    // rose: a flared cone and a perforated disc, at right angles to the spout
    s += `<g transform="translate(${ROSE[0]} ${ROSE[1]}) rotate(${SPOUT_ANG})">
      <path d="M-15 -3.2L-3 -10L-3 10L-15 3.2Z" fill="${cflat}" ${S}/>
      <ellipse cx="-1" cy="0" rx="4.5" ry="13" fill="${cd}" ${S}/>
      <ellipse cx="1" cy="0" rx="2.8" ry="11.2" fill="${era === 2 ? '#fff' : cl}" ${S}/>
      ${[-8.4, -5.6, -2.8, 0, 2.8, 5.6, 8.4].map((y) => `<circle cx="1.3" cy="${y}" r=".75" fill="${era === 2 ? '#111' : '#4a2410'}"/>`).join('')}
    </g>`;
    // body
    const body = 'M-34 -2Q-39 -34 -31 -66L31 -66Q39 -34 34 -2Q0 3 -34 -2Z';
    s += `<path d="${body}" fill="${c}" ${S}/>`;
    // form: shadow side, highlight streak, hammered dents
    s += `<path d="M13 -65Q22 -34 17 -1Q27 0 34 -2Q39 -34 31 -66Z" fill="${era === 2 ? '#000' : cd}" opacity="${era === 2 ? 0.13 : 0.55}"/>`;
    if (era === 2) {
      let h = '';
      for (let y = -60; y < -6; y += 5) h += `M20 ${y}l10 -4`;
      s += `<path d="${h}" stroke="#111" stroke-width=".8"/>`;
    } else {
      s += `<path d="M-23 -60Q-28 -34 -24 -8" stroke="${era === 3 ? '#fff' : cl}" stroke-width="4" opacity="${era === 3 ? 0.65 : 0.7}" fill="none" stroke-linecap="round"/>`;
      let dents = '';
      const R = BD.util.rng(5);
      for (let k = 0; k < 22; k++) { const x = -26 + R() * 50, y = -60 + R() * 52; dents += `M${f(x)} ${f(y)}a3 2 0 0 1 5 0`; }
      s += `<path d="${dents}" stroke="${era === 3 ? '#fff' : cd}" stroke-width=".8" fill="none" opacity="${era === 3 ? 0.3 : 0.55}"/>`;
    }
    // rolled seams with rivets
    [-10, -57].forEach((y) => {
      s += `<path d="M${y < -30 ? -32 : -35} ${y}Q0 ${y + 4} ${y < -30 ? 32 : 35} ${y}" fill="none" stroke="${l}" stroke-width="${lw * 0.8}"/>`;
      for (let x = -26; x <= 26; x += 13) s += `<circle cx="${x}" cy="${f(y + 1.6 - Math.abs(x) * 0.02)}" r="1.3" fill="${era === 2 ? '#111' : cd}"/>`;
    });
    // opening
    s += `<ellipse cx="0" cy="-66" rx="31" ry="6" fill="${era === 2 ? '#fff' : cd}" ${S}/><ellipse cx="0" cy="-65.5" rx="26" ry="4" fill="${era === 2 ? '#111' : '#2a160c'}"/>`;
    // top handle
    s += tube('M-22 -66C-20 -96 18 -98 20 -66', 5);
    s += '</g>';
    return s;
  }

  // The can held over the soil (tilted while pouring) and a fine shower from the rose.
  function pourMarkup(era, pourX, soilY, pouring) {
    const TILT = 36, IDLE = 8, K = 0.85;
    const rot = (p, a) => { const r = (a * Math.PI) / 180; return [p[0] * Math.cos(r) - p[1] * Math.sin(r), p[0] * Math.sin(r) + p[1] * Math.cos(r)]; };
    const rw = rot([ROSE[0] * K, ROSE[1] * K], TILT);
    const rose = [pourX - 12, soilY - 70];
    const ox = rose[0] - rw[0], oy = rose[1] - rw[1];
    const a = ((SPOUT_ANG + TILT) * Math.PI) / 180, dir = [Math.cos(a), Math.sin(a)], perp = [-Math.sin(a), Math.cos(a)];
    const col = era === 2 ? '#444' : era === 3 ? '#c4f8ff' : '#6f9fd8';
    let st = '';
    for (let i = -3; i <= 3; i++) {
      const sx = rose[0] + perp[0] * i * 2.4 * K + dir[0] * 3, sy = rose[1] + perp[1] * i * 2.4 * K + dir[1] * 3;
      const ex = sx + dir[0] * 26 + i * 3.5, ey = soilY - 1;
      const cx = sx + dir[0] * 22, cy = sy + dir[1] * 22 + 6;
      st += `<path d="M${f(sx)} ${f(sy)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" stroke-dasharray="${6 + (i & 1) * 3} 5"><animate attributeName="stroke-dashoffset" from="${i * 3}" to="${i * 3 - 22}" dur="${0.38 + (i & 1) * 0.08}s" repeatCount="indefinite"/></path>`;
    }
    let splash = '';
    for (let i = 0; i < 6; i++) {
      const x = rose[0] + dir[0] * 26 + (i - 2.5) * 5;
      const dur = 0.5 + (i % 3) * 0.12;
      splash += `<circle cx="${f(x)}" cy="${soilY - 2}" r="1.3" fill="${col}"><animate attributeName="cy" values="${soilY - 2};${soilY - 8 - (i % 3) * 2};${soilY - 2}" dur="${dur}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="${dur}s" repeatCount="indefinite"/></circle>`;
    }
    const tf = (t) => `translate(${f(ox)} ${f(oy)}) rotate(${t}) scale(${K})`;
    return `<g id="pourCan" data-idle="${tf(IDLE)}" data-pour="${tf(TILT)}" transform="${tf(pouring ? TILT : IDLE)}">${wateringCan(era)}</g>
      <g id="stream" opacity="${pouring ? 1 : 0}"><g fill="none" stroke="${col}" stroke-width="${era === 2 ? 1 : 1.3}" stroke-linecap="round" ${era === 3 ? 'filter="url(#glow)"' : ''}>${st}</g>${splash}</g>`;
  }

  function defsFor(era) {
    return `<defs>
      <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop id="sky0" offset="0"/><stop id="sky1" offset=".6"/><stop id="sky2" offset="1"/></linearGradient>
      <linearGradient id="bokashi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2f5c" stop-opacity=".95"/><stop offset="1" stop-color="#1d2f5c" stop-opacity="0"/></linearGradient>
      <clipPath id="winClip"><rect x="${WIN.x0}" y="${WIN.y0}" width="${WIN.x1 - WIN.x0}" height="${WIN.y1 - WIN.y0}"/></clipPath>
      <radialGradient id="sunGlow"><stop offset="0" stop-color="#fff2c0" stop-opacity=".95"/><stop offset=".3" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/></radialGradient>
      <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffc060" stop-opacity=".45"/><stop offset="1" stop-color="#ff9040" stop-opacity="0"/></radialGradient>
      <linearGradient id="mtnG" x1="0" y1="0" x2="0" y2="1"><stop id="mtn0" offset="0" stop-color="#6f8fca"/><stop id="mtn1" offset="1" stop-color="#c9d6ee"/></linearGradient>
      <linearGradient id="hillG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6aa47a"/><stop offset="1" stop-color="#2f6a4a"/></linearGradient>
      <linearGradient id="stoneG" x1="0" x2="1"><stop offset="0" stop-color="#d6d4cc"/><stop offset="1" stop-color="#85847e"/></linearGradient>
      <linearGradient id="woodV" x1="0" x2="1"><stop offset="0" stop-color="#8a5c40"/><stop offset=".5" stop-color="#6b4632"/><stop offset="1" stop-color="#4a3022"/></linearGradient>
      <linearGradient id="sillTopG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98654"/><stop offset="1" stop-color="#dcae7a"/></linearGradient>
      <linearGradient id="sillG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a87650"/><stop offset="1" stop-color="#6e4630"/></linearGradient>
      <linearGradient id="lowG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3226"/><stop offset=".4" stop-color="#2a1c18"/></linearGradient>
      <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9d3bb"/><stop offset="1" stop-color="#d7b998"/></linearGradient>
      <linearGradient id="canG" x1="0" x2="1"><stop offset="0" stop-color="#e2a46a"/><stop offset="1" stop-color="#8a5226"/></linearGradient>
      <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d6" stop-opacity=".0"/><stop offset=".4" stop-color="#fff4d6" stop-opacity=".22"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>
    </defs>`;
  }

  // Build the whole scene for an era. Returns the SVG inner markup.
  function build(era) {
    const P = PAL[era];
    const wallFill = era === 3 ? 'url(#wallG)' : P.wall;
    let s = defsFor(era);
    s += `<g id="cam">`;
    s += `<rect x="-2000" y="-2000" width="5000" height="5000" fill="${wallFill}"/>`;
    if (era === 1) s += `<rect x="-2000" y="-2000" width="5000" height="5000" fill="#fff" filter="url(#paperfx)" opacity=".5"/>`;
    s += `<g id="view" clip-path="url(#winClip)">${view(era, era === 2 ? Object.assign({}, P, { line: '#5a5a5a', lw: 1.3 }) : P)}</g>`;
    s += room(era, P);
    if (era === 3) {
      s += `<g id="shafts" style="mix-blend-mode:screen">
        <path d="M300 60 L460 60 L620 ${SILL_Y} L380 ${SILL_Y}Z" fill="url(#shaft)"/>
        <path d="M520 60 L600 60 L760 ${SILL_Y} L640 ${SILL_Y}Z" fill="url(#shaft)" opacity=".7"/></g>`;
    }
    // pot shadow + tree assembly
    s += `<ellipse id="potShadow" cx="500" cy="${SILL_Y - 2}" rx="150" ry="9" fill="#000" opacity="${era === 2 ? 0.16 : 0.25}"/>`;
    s += `<g id="potWrap"><g id="potDefs"></g><g id="soilG"></g><g id="treeG"></g><g id="mossG"></g><g id="potBody"></g><g id="dripG"></g><g id="shootsG"></g></g>`;
    s += `<g id="canRest" transform="translate(772 ${SILL_Y - 5}) scale(.5)">${wateringCan(era)}</g>`;
    s += `<g id="fx"></g>`;
    s += `</g>`; // cam
    s += `<rect id="tint" x="-2000" y="-2000" width="5000" height="5000" fill="${era === 2 ? '#000' : '#2a1840'}" opacity="0" pointer-events="none" ${era === 2 ? '' : 'style="mix-blend-mode:multiply"'}/>`;
    s += `<rect id="warm" x="-2000" y="-2000" width="5000" height="5000" fill="#ff9a40" opacity="0" pointer-events="none" style="mix-blend-mode:soft-light"/>`;
    return s;
  }

  function setTime(svg, era, t) {
    t = clamp(t, 0, 1);
    const c = skyColours(era, t);
    ['sky0', 'sky1', 'sky2'].forEach((id, i) => { const el = svg.querySelector('#' + id); if (el) el.setAttribute('stop-color', c[i]); });
    const sx = lerp(290, 700, t), sy = 110 + Math.pow((t - 0.5) * 2, 2) * 240;
    const sun = svg.querySelector('#sun');
    if (sun) {
      if (era === 1) {
        sun.setAttribute('cx', f(sx)); sun.setAttribute('cy', f(sy));
        sun.setAttribute('fill', ramp([[0, '#e8a050'], [0.35, '#f6eccc'], [0.65, '#f6eccc'], [1, '#d9472b']], t));
      } else sun.setAttribute('transform', `translate(${f(sx)} ${f(sy)})`);
    }
    const night = clamp((t - 0.65) / 0.35, 0, 1);
    const glow = svg.querySelector('#lanternGlow');
    if (glow) glow.setAttribute('opacity', f(night * (era === 2 ? 0 : 0.9) * 10) / 10);
    const lw = svg.querySelector('#lanternWin');
    if (lw) lw.setAttribute('fill', night > 0.3 ? (era === 2 ? '#fff' : '#ffd26a') : era === 2 ? '#111' : '#2a2a28');
    const stars = svg.querySelector('#stars');
    if (stars) stars.setAttribute('opacity', f(night));
    const tint = svg.querySelector('#tint');
    if (tint) tint.setAttribute('opacity', f((era === 2 ? night * 0.2 : night * 0.32) * 100) / 100);
    const warm = svg.querySelector('#warm');
    const golden = Math.max(0, 1 - Math.abs(t - 0.85) / 0.25) * 0.5 + Math.max(0, 0.12 - t) * 2;
    if (warm) warm.setAttribute('opacity', f(era === 2 ? 0 : golden * 100) / 100);
    if (era === 1) {
      const m = svg.querySelector('#mtn');
      if (m) m.setAttribute('fill', ramp([[0, '#35558a'], [0.65, '#35558a'], [1, '#a8452e']], t)); // the mountain blushes red at dusk
      const ms = svg.querySelector('#mtnShade');
      if (ms) ms.setAttribute('fill', ramp([[0, '#26406c'], [0.65, '#26406c'], [1, '#7a2e22']], t));
    }
    if (era === 2) {
      const tone = svg.querySelector('#skyTone');
      if (tone) tone.setAttribute('opacity', f((night * 0.9 + (t < 0.2 ? (0.2 - t) * 1.5 : 0)) * 100) / 100);
    }
    if (era === 3) {
      const m0 = svg.querySelector('#mtn0'), m1 = svg.querySelector('#mtn1');
      if (m0) m0.setAttribute('stop-color', ramp([[0, '#7a8fcf'], [0.5, '#5f86c8'], [1, '#4a3a7a']], t));
      if (m1) m1.setAttribute('stop-color', ramp([[0, '#f4d0c4'], [0.5, '#cfe0f4'], [1, '#e08a7a']], t));
      const sh = svg.querySelector('#shafts');
      if (sh) sh.setAttribute('opacity', f((1 - night) * 100) / 100);
    }
  }

  // a grey, sunless day (used for the sad chapter of the story)
  function setOvercast(svg, era, on) {
    const sun = svg.querySelector('#sun'), v = svg.querySelector('#view');
    if (sun) sun.style.display = on ? 'none' : '';
    if (v) v.style.filter = on ? (era === 2 ? 'contrast(.85) brightness(.92)' : 'grayscale(.75) brightness(.9)') : '';
  }

  BD.scene = { build, setTime, setOvercast, wateringCan, pourMarkup, SILL_Y, WIN };
})();
