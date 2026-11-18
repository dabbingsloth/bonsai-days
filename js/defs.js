/* Bonsai Days — shared SVG definitions: leaf shapes for each era, screentones, filters.
   They live in one hidden <svg> so every scene (title, selection, game, epilogue) can <use> them. */
(function () {
  const BD = window.BD;
  const { rng, f } = BD.util;

  // Japanese maple: 7 deeply cut, pointed, finely toothed lobes; origin = end of the leaf stalk.
  function mapleOutline() {
    const cy = -11, rs = 3.2;
    const lobes = [-180, -150, -120, -90, -60, -30, 0];
    const R = [6.5, 10, 12.5, 13.5, 12.5, 10, 6.5];
    const pts = [];
    for (let i = 0; i < 240; i++) {
      const phi = -195 + i * 1.5;
      let r = rs * 0.9;
      for (let k = 0; k < lobes.length; k++) {
        const dx = phi - lobes[k];
        if (Math.abs(dx) <= 15) {
          const x = dx / 15;
          const prof = 0.55 * Math.pow(1 - Math.abs(x), 1.4) + 0.45 * Math.pow(Math.cos((Math.PI * x) / 2), 2);
          r = rs + (R[k] - rs) * prof;
          r += (0.5 * R[k]) / 13 * Math.abs(Math.sin((dx * Math.PI) / 5)) * (1 - Math.abs(x)); // serration
        }
      }
      const a = (phi * Math.PI) / 180;
      pts.push([r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const d = pts.map((p, i) => (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join('') + 'Z';
    let veins = 'M0 0L0 ' + (cy + 2);
    lobes.forEach((l, k) => {
      const a = (l * Math.PI) / 180, r = R[k] * 0.82;
      veins += `M0 ${cy}L${f(r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
    });
    return { d, veins };
  }

  // Japanese black pine: a fascicle tuft of stiff paired needles.
  function pineTuft(seed, n, len) {
    const R = rng(seed);
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (-90 + (i / (n - 1) - 0.5) * 150 + (R() - 0.5) * 10) * Math.PI / 180;
      const L = len * (0.75 + R() * 0.3);
      const x = Math.cos(a) * L, y = Math.sin(a) * L - 2;
      const cx = Math.cos(a) * L * 0.5 - Math.sin(a) * 1.4, cy = Math.sin(a) * L * 0.5 + Math.cos(a) * 1.4 - 1;
      d += `M0 -1Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
    }
    return d;
  }

  // Shimpaku juniper: a little frond made of overlapping scale-like leaves.
  function juniperSpray() {
    const axes = [
      [[0, 0], [0.5, -9], [-0.5, -19]],
      [[0, -6], [-4, -10], [-8, -15]],
      [[0, -9], [4, -13], [7, -17]],
      [[0, -3], [4, -6], [8, -8]],
    ];
    let d = '';
    axes.forEach((ax, ai) => {
      const steps = ai === 0 ? 11 : 6;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const seg = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
        const a = ax[seg], b = ax[seg + 1];
        const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        const r = (ai === 0 ? 2.7 : 2.2) * (1 - t * 0.55);
        d += `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;
      }
    });
    return d;
  }

  function build() {
    const maple = mapleOutline();
    const needles = pineTuft(11, 15, 16), needlesB = pineTuft(23, 11, 13);
    const jun = juniperSpray();
    const candle = 'M-1.7 0Q-2.3 -8 0 -15Q2.3 -8 1.7 0Z';
    const eraLeaf = {
      1: { line: '#2b3420', lw: 0.55, needleW: 1.05, junLine: '#2a3d1f', junW: 0.4 },
      2: { line: '#111', lw: 0.85, needleW: 1.0, junLine: '#111', junW: 0.55 },
      3: { line: 'none', lw: 0, needleW: 0.95, junLine: 'rgba(10,40,25,.35)', junW: 0.35 },
    };
    let leaves = '';
    for (const e of [1, 2, 3]) {
      const s = eraLeaf[e];
      leaves += `
      <g id="lf${e}-maple"><path d="${maple.d}" stroke="${s.line}" stroke-width="${s.lw}" stroke-linejoin="round"/>
        <path d="${maple.veins}" fill="none" stroke="currentColor" stroke-width="${e === 3 ? 0.45 : 0.5}" opacity="${e === 3 ? 0.55 : 0.9}"/></g>
      <g id="lf${e}-pine"><path d="${needles}" fill="none" stroke="currentColor" stroke-width="${s.needleW}" stroke-linecap="round"/></g>
      <g id="lf${e}-pineb"><path d="${needlesB}" fill="none" stroke="currentColor" stroke-width="${s.needleW}" stroke-linecap="round"/></g>
      <g id="lf${e}-juniper"><path d="${jun}" stroke="${s.junLine}" stroke-width="${s.junW}"/></g>
      <g id="lf${e}-candle"><path d="${candle}" stroke="${e === 2 ? '#111' : e === 1 ? '#5a4030' : 'none'}" stroke-width="0.6"/></g>`;
    }

    // Manga screentones and hatching (user space, so they stay crisp at any size).
    const tones = `
      <pattern id="tone-s" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".85" fill="#111"/></pattern>
      <pattern id="tone-m" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><circle cx="2.5" cy="2.5" r="1.35" fill="#111"/></pattern>
      <pattern id="tone-mt" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.35" fill="#111"/></pattern>
      <pattern id="tone-l" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><circle cx="2.5" cy="2.5" r="2" fill="#111"/></pattern>
      <pattern id="tone-w" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><circle cx="2.5" cy="2.5" r=".85" fill="#111"/></pattern>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#111" stroke-width="1.3"/></pattern>
      <pattern id="hatch-w" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#111" stroke-width="1.2"/></pattern>
      <pattern id="xhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="6" height="6" fill="#fff"/><path d="M0 0V6M0 0H6" stroke="#111" stroke-width="1.2"/></pattern>
      <pattern id="seigaiha" width="40" height="20" patternUnits="userSpaceOnUse">
        <rect width="40" height="20" fill="#2d4a7a"/>
        ${[0, 40].map((x) => [18, 13, 8, 3].map((r, i) => `<circle cx="${x}" cy="20" r="${r}" fill="${i % 2 ? '#2d4a7a' : '#f0e4c8'}"/>`).join('')).join('')}
        ${[18, 13, 8, 3].map((r, i) => `<circle cx="20" cy="10" r="${r}" fill="${i % 2 ? '#2d4a7a' : '#f0e4c8'}"/>`).join('')}
        ${[0, 40].map((x) => [18, 13, 8, 3].map((r, i) => `<circle cx="${x}" cy="0" r="${r}" fill="${i % 2 ? '#2d4a7a' : '#f0e4c8'}" />`).join('')).join('')}
      </pattern>`;

    const filters = `
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="softblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="blur4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="paperfx" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .12  0 0 0 .5 0"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
      <filter id="woodfx" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".012 .35" numOctaves="2" seed="9" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 .2  0 0 0 0 .1  0 0 0 0 .05  0 0 0 .55 -.05"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>`;

    const host = document.getElementById('global-defs');
    host.innerHTML = `<defs>${leaves}${tones}${filters}</defs>`;
  }

  BD.defs = { build };
})();
