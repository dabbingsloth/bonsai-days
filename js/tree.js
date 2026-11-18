/* Bonsai Days — procedural bonsai.
   A tree is fully described by: species, seed, growth g (0..1), style + wire blend, branch sweep,
   sun placement, season, ramification (how often it was pruned) and the art era it is drawn in.
   Origin (0,0) is the soil surface where the trunk enters the pot; y grows downward. */
(function () {
  const BD = window.BD;
  const { rng, clamp, lerp, ease, f, rad, mix, smooth, ribbon, poly } = BD.util;

  const SPECIES = {
    pine: {
      key: 'pine', name: 'Japanese Black Pine', jp: '黒松', romaji: 'Kuromatsu',
      H: 262, baseW: 60, nB: 7, bLen: 158, subs: 2, padW: 0.74, padH: 0.42, twist: 1.0,
      leaf: 'pine', leafK: 0.0042, leafScale: 1.05,
    },
    maple: {
      key: 'maple', name: 'Japanese Maple', jp: '紅葉', romaji: 'Momiji',
      H: 268, baseW: 52, nB: 8, bLen: 146, subs: 2, padW: 0.8, padH: 0.52, twist: 0.85,
      leaf: 'maple', leafK: 0.0064, leafScale: 0.9,
    },
    juniper: {
      key: 'juniper', name: 'Shimpaku Juniper', jp: '真柏', romaji: 'Shimpaku',
      H: 258, baseW: 56, nB: 7, bLen: 142, subs: 2, padW: 0.7, padH: 0.5, twist: 1.45,
      leaf: 'juniper', leafK: 0.0062, leafScale: 0.95, deadwood: true,
    },
  };

  const SWEEP = { droop: -17, level: -3, rising: 14 };
  let uid = 0;

  // ---------- colour per species / era / season ----------
  function palette(sp, era, season, sun) {
    const k = sp.key;
    const P = {};
    const leaf1 = {
      pine: { spring: ['#3f6d45', '#507f50', '#33603d'], summer: ['#2f5e3b', '#3f6e44', '#28513a'], autumn: ['#2f5a3a', '#3d6a42', '#294f36'], late: ['#2c5236', '#3a6340', '#264a33'] },
      maple: { spring: ['#93c04c', '#a9cf5d', '#7eae40', '#c98a4a'], summer: ['#4f8a34', '#62a03e', '#437a2c'], autumn: ['#d4462a', '#e2692e', '#b83428', '#eb9c36'], late: ['#b02c20', '#cc4428', '#8e281c', '#de6d2a'] },
      juniper: { spring: ['#5a9450', '#6eab5e', '#4a8046'], summer: ['#4a8446', '#5c9852', '#3d7140'], autumn: ['#467c45', '#58904f', '#3a6a3e'], late: ['#4f7a48', '#62894f', '#3f6740'] },
    };
    const base1 = {
      pine: '#24412c', maple: { spring: '#5b7f33', summer: '#30562a', autumn: '#7e2a1e', late: '#661f17' }, juniper: '#2b5131',
    };
    let leaves = leaf1[k][season].slice();
    if (k === 'maple' && sun === 'full' && (season === 'autumn' || season === 'late')) leaves = leaves.map((c) => mix(c, '#d0201a', 0.2));
    if (k === 'maple' && sun === 'shade') leaves = leaves.map((c) => mix(c, '#7a9a40', season === 'autumn' || season === 'late' ? 0.25 : 0));
    if (sun === 'shade' && k !== 'maple') leaves = leaves.map((c) => mix(c, '#7c9a50', 0.18));
    let padBase = typeof base1[k] === 'string' ? base1[k] : base1[k][season];
    if (k === 'maple') padBase = mix(leaves[2], '#1a0c08', 0.32);
    const trunk = { pine: ['#6a5040', '#4f3a2d', '#30221a'], maple: ['#8c7d6a', '#6d604f', '#463c32'], juniper: ['#94583c', '#6e3f2b', '#43251a'] }[k];

    if (era === 1) {
      Object.assign(P, {
        trunk: trunk[1], trunkDark: trunk[2], trunkLight: trunk[0], line: '#24170f', lw: 1.5,
        leaves, padBase, padLine: mix(padBase, '#000', 0.35), padLW: 0.9, vein: mix(leaves[0], '#000', 0.45),
        needle: leaves, candle: '#d8c49a', dead: '#ece2cf', deadLine: '#6d5d4c', mossA: '#7a9a3c', mossB: '#56752a',
      });
    } else if (era === 2) {
      const autumnTone = k === 'maple' && (season === 'autumn' || season === 'late');
      Object.assign(P, {
        trunk: '#fff', trunkDark: '#111', trunkLight: '#fff', line: '#111', lw: 2.6,
        leaves: autumnTone ? ['url(#tone-w)', '#fff', 'url(#tone-w)'] : ['#fff', '#fff', 'url(#tone-w)'],
        padBase: k === 'maple' && !autumnTone ? 'url(#tone-m)' : 'url(#tone-l)', padLine: '#111', padLW: 2.4, vein: '#111',
        needle: ['#111', '#1b1b1b', '#000'], candle: '#fff', dead: '#fff', deadLine: '#111', mossA: 'url(#tone-m)', mossB: '#111',
      });
    } else {
      const glowLeaves = leaves.map((c) => mix(c, '#fff8d0', 0.12));
      const warm = k === 'maple' && (season === 'autumn' || season === 'late');
      Object.assign(P, {
        trunk: trunk[1], trunkDark: trunk[2], trunkLight: mix(trunk[0], '#ffe2b0', 0.25), line: 'none', lw: 0,
        leaves: glowLeaves, padBase: warm ? mix(padBase, '#5a0c18', 0.2) : mix(padBase, '#0b2a2a', 0.25), padLine: 'none', padLW: 0, vein: mix(leaves[0], '#000', 0.35),
        needle: glowLeaves, candle: '#f3e2b0', dead: '#f6f0e4', deadLine: '#b9ab98', mossA: '#86b04a', mossB: '#5c8a34',
      });
    }
    return P;
  }

  function growth(g) {
    return { sTop: 0.2 + 0.8 * (1 - Math.pow(1 - g, 1.5)), sc: 0.58 + 0.42 * g };
  }

  // ---------- skeleton ----------
  function build(o) {
    const sp = SPECIES[o.species];
    const R = rng(o.seed);
    const P = { p1: R() * 6.28, dir: R() < 0.5 ? -1 : 1, wind: R() < 0.5 ? -1 : 1, lenJ: 0.92 + R() * 0.16, hJ: 0.94 + R() * 0.12 };
    const style = o.style || 'none';
    const g = clamp(o.g, 0, 1);
    const { sTop, sc } = growth(g);
    const wb = style === 'none' ? 0 : o.wb == null ? 1 : o.wb;
    const H = sp.H * P.hJ;
    const sweepAdj = SWEEP[o.sweep] || 0;

    function centre(s, scale) {
      const pre = 0.045 * H * Math.sin(s * 2.4 + P.p1) * s;
      let sx = pre, hf = 1;
      if (style === 'formal') { sx = 0.012 * H * Math.sin(s * 6 + P.p1); hf = 0.95; }
      else if (style === 'informal') { sx = P.dir * 0.13 * H * sp.twist * Math.sin(s * Math.PI * 1.7) * (1 - 0.25 * s); hf = 0.95; }
      else if (style === 'windswept') { sx = P.wind * (0.4 * H * Math.pow(s, 1.35) - 0.08 * H * Math.sin(s * Math.PI)); hf = 0.8; }
      const k = scale == null ? sc : scale;
      return [lerp(pre, sx, wb) * k, -H * s * lerp(1, hf, wb) * k];
    }

    const W0 = sp.baseW * (0.1 + 0.9 * Math.pow(g, 0.85));
    const tipW = 1.6 + 2.6 * g;
    function width(s) {
      const u = clamp(s / sTop, 0, 1);
      let w = lerp(W0, tipW, Math.pow(u, 0.85));
      if (s < 0.06) w *= 1 + 0.55 * Math.pow(1 - s / 0.06, 2);
      return w;
    }

    // Branch plan (identical for every growth stage, so the same tree keeps its identity).
    const branches = [];
    for (let i = 0; i < sp.nB; i++) {
      const Rb = rng(o.seed * 7 + i * 131 + 17);
      const u = i / (sp.nB - 1);
      const s = 0.24 + u * 0.64 + (Rb() - 0.5) * 0.04;
      let side = i % 2 === 0 ? P.dir : -P.dir;
      if (i === 2 && Rb() < 0.5) side = -side; // break perfect alternation now and then
      const back = i % 3 === 2;
      let lenF = 1 - 0.7 * u;
      let ang = lerp(-12, 22, u) + (Rb() - 0.5) * 10 + sweepAdj * (1 - u * 0.5);
      if (style === 'windswept' && wb > 0.5) {
        if (i % 4 === 1 && u < 0.7) { side = -P.wind; lenF *= 0.3; ang = 6; }
        else { side = P.wind; ang = lerp(-6, 4, u) + (Rb() - 0.5) * 8 + sweepAdj * 0.5; lenF *= 1.08; }
      }
      const L = sp.bLen * lenF * (0.85 + Rb() * 0.3) * P.lenJ;
      const subs = [];
      const ns = sp.subs + (Rb() < 0.4 ? 1 : 0);
      for (let j = 0; j < ns; j++) subs.push({ t: 0.32 + (0.45 * j) / ns + Rb() * 0.08, da: (j % 2 ? 40 : -24) + (Rb() - 0.5) * 14, lf: 0.34 + Rb() * 0.2 });
      branches.push({ i, s, u, side, back, L, ang, subs, wig: Rb() * 6.28, jin: false });
    }
    if (sp.deadwood || (style === 'windswept' && o.species === 'pine')) {
      // one dead branch (jin) high on the tree
      const j = branches[branches.length - 2];
      if (j) j.jin = true;
    }
    return { sp, P, style, g, sTop, sc, wb, H, centre, width, W0, branches, sweepAdj };
  }

  function branchPts(x0, y0, side, ang, L, droop, wig) {
    const pts = [];
    const K = 8, ca = Math.cos(rad(ang)), sa = Math.sin(rad(ang));
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      const x = x0 + side * ca * L * t;
      const y = y0 - sa * L * t + droop * L * Math.sin(Math.PI * t) * 0.15 - L * 0.12 * t * t * t + Math.sin(t * 9 + wig) * L * 0.025 * t;
      pts.push([x, Math.min(y, -14)]);
    }
    return pts;
  }

  // Fluffy foliage-pad outline: bumpy dome on top, gently flattened underneath.
  function cloudPath(cx, cy, w, h, R) {
    const n = Math.max(3, Math.round(w / 20));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const j = i === 0 || i === n ? 1 : 0.92 + R() * 0.16;
      pts.push([cx + Math.cos(a) * w * 0.5 * j, cy + Math.sin(a) * h * 0.5 * j + (i === 0 || i === n ? h * 0.12 : 0)]);
    }
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const dd = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const r = dd * (0.58 + R() * 0.1);
      d += `A${f(r)} ${f(r)} 0 0 1 ${f(pts[i][0])} ${f(pts[i][1])}`;
    }
    d += `C${f(cx + w * 0.42)} ${f(cy + h * 0.55)} ${f(cx - w * 0.42)} ${f(cy + h * 0.55)} ${f(pts[0][0])} ${f(pts[0][1])}Z`;
    return d;
  }

  // ---------- full render ----------
  function render(o) {
    const era = o.era || 1;
    const T = build(o);
    const { sp, centre, width, sTop, sc, g, branches } = T;
    const season = o.season || 'spring';
    const pal = palette(sp, era, season, o.sun);
    const id = 't' + ++uid;
    const ramif = o.ramif || 0;
    const sunDensity = { full: 1.08, morning: 1, shade: 0.8 }[o.sun] || 1;
    const sunScale = sp.key === 'maple' ? { full: 0.88, morning: 1, shade: 1.14 }[o.sun] || 1 : sp.key === 'pine' ? { full: 0.92, morning: 1.05, shade: 1.2 }[o.sun] || 1 : 1;
    const density = sunDensity * (1 + Math.min(ramif, 10) * 0.05);
    const droop = o.sweep === 'droop' ? 1.8 : o.sweep === 'rising' ? 0.4 : 1;
    const lf = `#lf${era}-${sp.leaf}`;

    let defs = '';
    const trunkFill = era === 3 ? `url(#${id}-tg)` : pal.trunk;
    if (era === 3) {
      defs += `<linearGradient id="${id}-tg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${pal.trunkLight}"/><stop offset=".45" stop-color="${pal.trunk}"/><stop offset="1" stop-color="${pal.trunkDark}"/></linearGradient>
        <radialGradient id="${id}-hl" cx=".45" cy=".2" r=".7"><stop offset="0" stop-color="#fff6c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>`;
      pal.leaves.forEach((c, i) => {
        defs += `<linearGradient id="${id}-l${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(c, '#fffbe0', 0.35)}"/><stop offset="1" stop-color="${mix(c, '#14060a', 0.22)}"/></linearGradient>`;
      });
    }
    const leafFill = (i) => (era === 3 && sp.leaf === 'maple' ? `url(#${id}-l${i})` : pal.leaves[i]);

    // ---- trunk ----
    const N = 26;
    const cpts = [], ws = [];
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * sTop;
      cpts.push(centre(s));
      ws.push(width(s));
    }
    cpts[0] = [cpts[0][0], 3];
    const rb = ribbon(cpts, ws);
    const top = cpts[cpts.length - 1];

    // ---- branches + pads ----
    const back = { wood: '', pads: [] }, front = { wood: '', pads: [] };
    const allPads = [];
    let jinSvg = '';
    for (const b of branches) {
      if (sTop < b.s + 0.02) continue;
      const p = clamp((sTop - b.s - 0.02) / 0.22, 0, 1);
      const L = b.L * sc * Math.pow(p, 0.8) * (b.back ? 0.78 : 1);
      if (L < 3) continue;
      const c = centre(b.s);
      const w = width(b.s);
      const x0 = c[0];
      const layer = b.back ? back : front;
      if (b.jin && g > 0.45) {
        // dead, bleached branch stub
        const jp = branchPts(x0, c[1], b.side, b.ang + 18, L * 0.55, 0.2, b.wig);
        const jw = jp.map((_, k) => lerp(w * 0.35, 0.6, k / (jp.length - 1)));
        jinSvg += `<path d="${ribbon(jp, jw).d}" fill="${pal.dead}" stroke="${pal.deadLine}" stroke-width="${era === 2 ? 2 : 0.9}"/>`;
        continue;
      }
      const pts = branchPts(x0, c[1], b.side, b.ang, L, droop, b.wig);
      const bw = pts.map((_, k) => lerp(w * 0.5, 1.1, Math.pow(k / (pts.length - 1), 0.8)));
      layer.wood += `<path d="${ribbon(pts, bw).d}"/>`;
      const tip = pts[pts.length - 1];
      const pw = 16 + L * sp.padW * 0.85;
      const pad = { cx: tip[0] + b.side * pw * 0.1, cy: Math.min(tip[1] - pw * sp.padH * 0.22, -pw * sp.padH * 0.45 - 8), w: pw, h: pw * sp.padH, back: b.back, p, side: b.side, key: `b${b.i}` };
      layer.pads.push(pad);
      for (const [si, sb] of b.subs.entries()) {
        if (p < sb.t + 0.1) continue;
        const k = Math.round(sb.t * (pts.length - 1));
        const sp0 = pts[k];
        const sL = L * sb.lf;
        const spts = branchPts(sp0[0], sp0[1], b.side, b.ang + sb.da, sL, droop * 0.6, b.wig + si);
        const sw = spts.map((_, q) => lerp(bw[k] * 0.6, 0.8, q / (spts.length - 1)));
        layer.wood += `<path d="${ribbon(spts, sw).d}"/>`;
        const st = spts[spts.length - 1];
        const spw = 12 + sL * sp.padW * 1.25;
        layer.pads.push({ cx: st[0], cy: Math.min(st[1] - spw * sp.padH * 0.2, -spw * sp.padH * 0.45 - 8), w: spw, h: spw * sp.padH, back: b.back, p, side: b.side, key: `b${b.i}s${si}` });
      }
    }
    // apex and shoulders
    const apW = (26 + 98 * Math.pow(g, 0.9)) * (sp.key === 'maple' ? 1.08 : 1) * sc;
    front.pads.push({ cx: top[0], cy: top[1] - apW * 0.16, w: apW, h: apW * 0.62, back: false, p: 1, side: 0, key: 'apex' });
    if (g > 0.3) {
      const sh = centre(sTop - 0.07);
      [-1, 1].forEach((sd) => front.pads.push({ cx: sh[0] + sd * apW * 0.42, cy: sh[1] - apW * 0.05, w: apW * 0.62, h: apW * 0.38, back: false, p: 1, side: sd, key: 'sh' + sd }));
    }

    function padSvg(pad, isBack) {
      const R = rng(o.seed + Math.round(pad.cx * 13 + pad.cy * 7));
      let s = '';
      const small = pad.w < 30;
      if (!small) s += `<path d="${sp.leaf === 'maple' ? cloudPath(pad.cx, pad.cy + pad.h * 0.06, pad.w * 0.86, pad.h * 0.84, R) : cloudPath(pad.cx, pad.cy, pad.w, pad.h, R)}" fill="${pal.padBase}" stroke="${pal.padLine}" stroke-width="${pal.padLW}" stroke-linejoin="round"/>`;
      const count = clamp(Math.round(pad.w * pad.h * sp.leafK * density * (small ? 1.6 : 1)), sp.leaf === 'maple' ? 3 : 4, 90);
      const items = [];
      for (let i = 0; i < count; i++) {
        const a = R() * Math.PI * 2, r = Math.sqrt(R());
        const x = pad.cx + Math.cos(a) * r * pad.w * 0.46;
        const y = pad.cy + Math.sin(a) * r * pad.h * 0.42 - pad.h * 0.1;
        items.push([x, y, R(), R(), R()]);
      }
      items.sort((a, b) => b[1] - a[1]);
      const lsc = sp.leafScale * sunScale * (0.55 + 0.45 * Math.min(1, sc * 1.25));
      for (const [x, y, r1, r2, r3] of items) {
        const tY = clamp((y - (pad.cy - pad.h / 2)) / pad.h, 0, 1);
        let ci = r1 < 0.5 ? 0 : r1 < 0.8 ? 1 : 2;
        if (tY < 0.35 && r2 < 0.6) ci = 1;
        if (tY > 0.7 && r2 < 0.5) ci = 2;
        if (pal.leaves[3] && r3 < 0.12 && season === 'spring') ci = 3;
        let rot, sc2 = lsc * (0.85 + r2 * 0.3);
        if (sp.leaf === 'maple') rot = (Math.atan2(y - (pad.cy + pad.h * 0.6), x - pad.cx) * 180) / Math.PI + 90 + (r3 - 0.5) * 50;
        else if (sp.leaf === 'pine') rot = ((x - pad.cx) / pad.w) * 70 + (r3 - 0.5) * 30;
        else rot = ((x - pad.cx) / pad.w) * 90 + (r3 - 0.5) * 60;
        const tf = `translate(${f(x)} ${f(y)}) rotate(${Math.round(rot)}) scale(${f(sc2 * 10) / 10})`;
        if (sp.leaf === 'pine') {
          const col = pal.needle[ci % pal.needle.length];
          s += `<use href="${r2 < 0.5 ? lf : `#lf${era}-pineb`}" transform="${tf}" color="${col}"/>`;
          if ((season === 'spring' || season === 'summer') && r3 < 0.1 && tY < 0.4) s += `<use href="#lf${era}-candle" transform="${tf}" fill="${pal.candle}"/>`;
        } else {
          s += `<use href="${lf}" transform="${tf}" fill="${leafFill(ci % pal.leaves.length)}" color="${pal.vein}"/>`;
        }
      }
      if (era === 3 && !small) s += `<ellipse cx="${f(pad.cx)}" cy="${f(pad.cy - pad.h * 0.15)}" rx="${f(pad.w * 0.5)}" ry="${f(pad.h * 0.45)}" fill="url(#${id}-hl)" style="mix-blend-mode:screen"/>`;
      return `<g${isBack ? ' opacity=".82"' : ''}>${s}</g>`;
    }

    const woodStyle = `fill="${trunkFill}" stroke="${pal.line}" stroke-width="${pal.lw * 0.8}" stroke-linejoin="round"`;
    let out = `<g class="tree">${defs ? `<defs>${defs}</defs>` : ''}`;

    // back layer
    out += `<g ${woodStyle}${era === 1 ? ' opacity=".9"' : ''}>${back.wood}</g>`;
    back.pads.forEach((p) => { out += padSvg(p, true); allPads.push(p); });

    // nebari: surface roots
    if (g > 0.12) {
      const W0 = T.W0;
      const R = rng(o.seed + 99);
      let roots = '';
      for (let k = 0; k < 5; k++) {
        const side = k % 2 ? 1 : -1;
        const spread = W0 * (0.75 + R() * 0.8) * (k < 2 ? 1.1 : 0.8);
        const x0 = cpts[0][0] + side * W0 * (0.1 + R() * 0.25);
        const rp = [[x0, -W0 * 0.12], [x0 + side * spread * 0.45, 0.5], [x0 + side * spread, 3.5]];
        roots += `<path d="${ribbon(rp, [W0 * 0.42, W0 * 0.18, 1.2]).d}"/>`;
      }
      out += `<g ${woodStyle}>${roots}</g>`;
    }

    // front branches start inside the trunk, so the trunk is drawn over their bases
    out += `<g ${woodStyle}>${front.wood}</g>`;
    // trunk
    out += `<path d="${rb.d}" ${woodStyle}/>`;
    // trunk shading / bark
    const R2 = rng(o.seed + 5);
    let bark = '';
    if (era === 2) {
      // hatch the shadow half of the trunk
      const half = cpts.map((c, i) => [c[0] + ws[i] * 0.05, c[1]]);
      const edge = rb.L.slice().reverse(); // ribbon L = right-hand side for an upward trunk
      out += `<path d="${smooth(half.concat(edge), true)}" fill="url(#hatch)" opacity=".85"/>`;
    }
    if (era === 3) {
      out += `<path d="${smooth(rb.R, false)}" fill="none" stroke="#ffe9c0" stroke-width="2.2" opacity=".45" stroke-linecap="round"/>`;
    }
    const marks = Math.round(10 + 40 * g);
    for (let i = 0; i < marks; i++) {
      const s = R2() * sTop * 0.92;
      const c = centre(s), w = width(s);
      const x = c[0] + (R2() - 0.5) * w * 0.7, y = c[1];
      if (sp.key === 'pine') bark += `M${f(x - w * 0.12)} ${f(y)}q${f(w * 0.12)} ${f(-3 - R2() * 3)} ${f(w * 0.24)} 0`;
      else if (sp.key === 'maple') { if (i % 3 === 0) bark += `M${f(x)} ${f(y)}h${f(w * 0.12)}`; }
      else bark += `M${f(x)} ${f(y)}q${f(w * 0.1)} ${f(-8)} ${f(w * 0.04)} ${f(-16)}`;
    }
    const barkCol = era === 2 ? '#111' : era === 1 ? pal.trunkDark : mix(pal.trunkDark, pal.trunk, 0.3);
    out += `<path d="${bark}" fill="none" stroke="${barkCol}" stroke-width="${era === 2 ? 1.3 : 1.2}" stroke-linecap="round" opacity="${era === 3 ? 0.5 : 0.85}"/>`;

    // juniper live-vein / deadwood (shari) spiralling up the trunk
    if (sp.deadwood && g > 0.3) {
      const sp2 = [], sw2 = [];
      const n2 = 18, sEnd = sTop * 0.78;
      for (let i = 0; i <= n2; i++) {
        const s = 0.02 + (i / n2) * (sEnd - 0.02);
        const c = centre(s), w = width(s);
        sp2.push([c[0] + w * 0.22 * Math.sin(s * 9 + 1), c[1]]);
        sw2.push(w * 0.3 * (1 - (i / n2) * 0.7));
      }
      const sh = ribbon(sp2, sw2);
      out += `<path d="${sh.d}" fill="${pal.dead}" stroke="${pal.deadLine}" stroke-width="${era === 2 ? 1.6 : 0.8}"/>`;
      out += `<path d="${smooth(sp2, false)}" fill="none" stroke="${pal.deadLine}" stroke-width=".7" opacity=".6"/>`;
    }
    out += jinSvg;
    front.pads.forEach((p) => { out += padSvg(p, false); allPads.push(p); });
    out += '</g>';

    // guide: the mature trunk line the wire will lead toward
    let guide = '';
    if (o.guide) {
      const gp = [];
      for (let i = 0; i <= 20; i++) gp.push(centre(i / 20, 0.72)); // scaled so it stays on screen while the tree is small
      guide = `<path d="${smooth(gp, false)}" fill="none" stroke="${era === 2 ? '#111' : era === 3 ? '#bff' : '#b8322a'}" stroke-width="3" stroke-dasharray="7 7" opacity=".7" stroke-linecap="round"/>`;
    }

    return { svg: guide + out, pads: allPads, top: Math.min(...allPads.map((p) => p.cy - p.h / 2), top[1]), T, pal, era };
  }

  // ---------- shoots that need pruning ----------
  function shoots(o, result, count, daySeed) {
    const { pads, era, pal } = result;
    const sp = SPECIES[o.species];
    const R = rng(o.seed * 3 + daySeed * 977);
    const cand = pads.filter((p) => !p.back && p.w > 22).sort((a, b) => R() - 0.5);
    // prefer outer pads, they break the silhouette best
    cand.sort((a, b) => Math.abs(b.cx) + -b.cy * 0.5 - (Math.abs(a.cx) + -a.cy * 0.5) + (R() - 0.5) * 80);
    const out = [];
    const lf = `#lf${era}-${sp.leaf}`;
    const picked = [];
    // keep shoots apart so each one is easy to tap; relax the spacing on small trees
    for (const gap of [48, 26, 0]) {
      for (let i = 0; i < cand.length && picked.length < count; i++) {
        const p = cand[i];
        if (picked.includes(p) || picked.some((q) => Math.hypot(q.cx - p.cx, q.cy - p.cy) < gap)) continue;
        picked.push(p);
      }
    }
    for (let i = 0; i < picked.length; i++) {
      const p = picked[i];
      let dx = p.cx, dy = p.cy + 120;
      const L0 = Math.hypot(dx, dy) || 1;
      dx /= L0; dy /= L0;
      dx = dx * 0.75; dy = dy * 0.75 - 0.55;
      const L1 = Math.hypot(dx, dy); dx /= L1; dy /= L1;
      const bx = p.cx + dx * p.w * 0.32, by = p.cy + dy * p.h * 0.3;
      const len = 34 + R() * 18;
      const tx = bx + dx * len, ty = by + dy * len;
      const mx = (bx + tx) / 2 - dy * 6, my = (by + ty) / 2 + dx * 6;
      const twig = `M${f(bx)} ${f(by)}Q${f(mx)} ${f(my)} ${f(tx)} ${f(ty)}`;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      let leaves = '';
      const lcol = pal.leaves[1] || pal.leaves[0];
      if (sp.leaf === 'pine') {
        leaves += `<use href="#lf${era}-candle" transform="translate(${f(tx)} ${f(ty)}) rotate(${Math.round(ang)}) scale(1.3 2.2)" fill="${pal.candle}"/>`;
        leaves += `<use href="${lf}" transform="translate(${f(bx + dx * len * 0.55)} ${f(by + dy * len * 0.55)}) rotate(${Math.round(ang)}) scale(.9)" color="${pal.needle[1]}"/>`;
      } else {
        [0.45, 0.75, 1].forEach((t, k) => {
          const x = bx + (tx - bx) * t, y = by + (ty - by) * t;
          const r = ang + (k === 2 ? 0 : k % 2 ? 50 : -50);
          leaves += `<use href="${lf}" transform="translate(${f(x)} ${f(y)}) rotate(${Math.round(r)}) scale(${sp.leaf === 'maple' ? 0.75 : 0.9})" fill="${lcol}" color="${pal.vein}"/>`;
        });
      }
      out.push({
        id: 's' + i,
        x: tx, y: ty,
        svg: `<path class="hit" d="${twig}" stroke="transparent" stroke-width="26" fill="none"/>
              <path class="glow" d="${twig}" fill="none" stroke-linecap="round"/>
              <path d="${twig}" fill="none" stroke="${era === 2 ? '#111' : pal.trunk}" stroke-width="2.4" stroke-linecap="round"/>${leaves}`,
      });
    }
    return out;
  }

  // ---------- pots ----------
  const POTS = {
    training: { w: 128, h: 56, name: 'Training pot' },
    rect: { w: 284, h: 52, name: 'Unglazed rectangle', jp: '長方鉢' },
    oval: { w: 272, h: 46, name: 'Cobalt glazed oval', jp: '楕円鉢' },
    drum: { w: 214, h: 62, name: 'Celadon drum pot', jp: '太鼓鉢' },
  };

  function potColours(type, era) {
    const base = { training: ['#c27a4c', '#9a5432', '#e0a070'], rect: ['#7c4430', '#5a2e20', '#9c6248'], oval: ['#2f5597', '#1d3870', '#6f97d6'], drum: ['#9fbfa6', '#6f9478', '#d6eadb'] }[type];
    return base;
  }

  // Soil (drawn behind the tree) and pot body (drawn in front). Soil surface = y 0.
  function pot(type, era, opts) {
    opts = opts || {};
    const P = POTS[type];
    const [c, cd, cl] = potColours(type, era);
    const w = P.w, h = P.h, id = 'p' + ++uid;
    const line = era === 2 ? '#111' : era === 1 ? '#24170f' : 'none';
    const lw = era === 2 ? 3 : era === 1 ? 1.5 : 0;
    let fill = c, rimFill = cl;
    let defs = '';
    if (era === 2) { fill = type === 'oval' ? 'url(#tone-l)' : type === 'drum' ? 'url(#tone-w)' : 'url(#tone-m)'; rimFill = '#fff'; }
    if (era === 3) {
      defs = `<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${cl}"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${cd}"/></linearGradient>
        <linearGradient id="${id}r" x1="0" x2="0" y2="1"><stop offset="0" stop-color="${cl}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
      fill = `url(#${id}g)`; rimFill = `url(#${id}r)`;
    }
    const soilCol = era === 2 ? 'url(#tone-l)' : era === 3 ? '#3b2a22' : '#4a3426';
    const wetCol = era === 2 ? '#111' : era === 3 ? '#22160f' : '#2e1f15';
    const sw = w / 2 - 6;
    const soil = `<path class="soil" d="M${-sw} 6Q${-sw * 0.6} -6 0 -5Q${sw * 0.6} -6 ${sw} 6Z" fill="${soilCol}" data-dry="${soilCol}" data-wet="${wetCol}" stroke="${line}" stroke-width="${lw * 0.6}"/>`;
    let body = '';
    if (type === 'training') {
      body += `<path d="M${-w / 2 + 6} 12L${w / 2 - 6} 12L${w / 2 - 18} ${h}L${-w / 2 + 18} ${h}Z" fill="${fill}" stroke="${line}" stroke-width="${lw}"/>`;
      body += `<rect x="${-w / 2}" y="2" width="${w}" height="12" rx="3" fill="${rimFill}" stroke="${line}" stroke-width="${lw}"/>`;
    } else if (type === 'rect') {
      body += `<path d="M${-w / 2 + 4} 12L${w / 2 - 4} 12L${w / 2 - 9} ${h - 6}L${-w / 2 + 9} ${h - 6}Z" fill="${fill}" stroke="${line}" stroke-width="${lw}"/>`;
      body += `<rect x="${-w / 2 - 4}" y="1" width="${w + 8}" height="12" rx="2" fill="${rimFill}" stroke="${line}" stroke-width="${lw}"/>`;
      body += `<path d="M${-w / 2 + 8} 22H${w / 2 - 8}" stroke="${era === 2 ? '#111' : cd}" stroke-width="${era === 2 ? 2 : 1.6}"/>`;
      [-1, 1].forEach((s) => (body += `<path d="M${s * (w / 2 - 12)} ${h - 7}h${-s * 26}l${s * 4} 8h${s * 18}Z" fill="${era === 2 ? '#fff' : cd}" stroke="${line}" stroke-width="${lw * 0.8}"/>`));
      body += `<rect x="${w / 2 - 34}" y="${h - 22}" width="9" height="9" fill="none" stroke="${era === 2 ? '#111' : cd}" stroke-width="1.2"/>`;
    } else if (type === 'oval') {
      body += `<path d="M${-w / 2 + 2} 10C${-w / 2 + 8} ${h - 2} ${-w / 2 + 40} ${h - 4} 0 ${h - 4}C${w / 2 - 40} ${h - 4} ${w / 2 - 8} ${h - 2} ${w / 2 - 2} 10Z" fill="${fill}" stroke="${line}" stroke-width="${lw}"/>`;
      body += `<rect x="${-w / 2 - 3}" y="1" width="${w + 6}" height="11" rx="6" fill="${era === 2 ? '#fff' : era === 3 ? `url(#${id}g)` : cd}" stroke="${line}" stroke-width="${lw}"/>`;
      if (era !== 2) body += `<path d="M${-w / 2 + 30} 22Q${-w / 4} 16 ${-w / 8} 24" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>`;
      [-1, 1].forEach((s) => (body += `<path d="M${s * (w / 2 - 60)} ${h - 5}q${s * -2} 6 ${s * -14} 6h${s * 26}q${s * -10} 0 ${s * -12} -6Z" fill="${era === 2 ? '#111' : cd}"/>`));
    } else if (type === 'drum') {
      body += `<path d="M${-w / 2 + 2} 10C${-w / 2 - 10} ${h * 0.45} ${-w / 2 - 4} ${h - 8} ${-w / 2 + 14} ${h - 6}H${w / 2 - 14}C${w / 2 - 4} ${h - 8} ${w / 2 + 10} ${h * 0.45} ${w / 2 - 2} 10Z" fill="${fill}" stroke="${line}" stroke-width="${lw}"/>`;
      body += `<rect x="${-w / 2 - 2}" y="1" width="${w + 4}" height="11" rx="5" fill="${rimFill}" stroke="${line}" stroke-width="${lw}"/>`;
      for (let i = 0; i < 15; i++) {
        const x = -w / 2 + 12 + (i * (w - 24)) / 14;
        body += `<circle cx="${f(x)}" cy="18" r="2.4" fill="${era === 2 ? '#111' : cl}" stroke="${era === 1 ? cd : 'none'}" stroke-width=".8"/>`;
        body += `<circle cx="${f(x)}" cy="${h - 13}" r="2.2" fill="${era === 2 ? '#111' : cl}" stroke="${era === 1 ? cd : 'none'}" stroke-width=".8"/>`;
      }
      [-0.33, 0.33].forEach((s) => (body += `<path d="M${s * w - 12} ${h - 6}h24l-4 8h-16Z" fill="${era === 2 ? '#111' : cd}"/>`));
    }
    if (era === 3) body += `<rect x="${-w / 2}" y="2" width="${w}" height="3" fill="#fff" opacity=".35" rx="1.5"/>`;
    return { defs: defs ? `<defs>${defs}</defs>` : '', soil, body, w, h, drip: type === 'oval' ? h - 3 : h };
  }

  function moss(era, potW, g, seed) {
    const R = rng(seed + 77);
    const A = era === 2 ? 'url(#tone-m)' : era === 3 ? '#7fae46' : '#7a9a3c';
    const B = era === 2 ? '#111' : era === 3 ? '#4f8030' : '#56752a';
    const line = era === 2 ? '#111' : era === 1 ? '#3d5520' : 'none';
    let s = '';
    const span = potW / 2 - 14;
    for (let i = 0; i < 16; i++) {
      const x = (R() - 0.5) * 2 * span * (i < 6 ? 0.35 : 1);
      const r = 5 + R() * 9;
      s += `<path d="M${f(x - r)} 2A${f(r)} ${f(r * 0.6)} 0 0 1 ${f(x + r)} 2Z" fill="${A}" stroke="${line}" stroke-width="${era === 2 ? 1.4 : 0.7}"/>`;
      for (let k = 0; k < 3; k++) s += `<circle cx="${f(x + (R() - 0.5) * r)}" cy="${f(1 - R() * r * 0.35)}" r="${era === 3 ? 1.2 : 0.9}" fill="${era === 3 ? '#d6f5a0' : B}" opacity="${era === 3 ? 0.7 : 1}"/>`;
    }
    return `<g class="moss">${s}</g>`;
  }

  BD.tree = { SPECIES, POTS, render, shoots, pot, moss, build };
})();
