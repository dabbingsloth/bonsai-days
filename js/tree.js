/* Bonsai Days — procedural bonsai.
   A tree is fully described by: species, seed, growth g (0..1), style + wire blend, branch sweep,
   sun placement, season, ramification (how often it was pruned) and the art era it is drawn in.
   Origin (0,0) is the soil surface where the trunk enters the pot; y grows downward. */
(function () {
  const BD = window.BD;
  const { rng, clamp, lerp, f, rad, mix, smooth, ribbon } = BD.util;

  const SPECIES = {
    pine: {
      key: 'pine', name: 'Japanese Black Pine', jp: '黒松', romaji: 'Kuromatsu',
      H: 262, baseW: 60, nB: 7, bLen: 158, subs: 2, padW: 0.74, padH: 0.42, twist: 1.0,
      leaf: 'pine', leafK: 0.0042, leafScale: 1.05, leafSize: 26,
    },
    maple: {
      key: 'maple', name: 'Japanese Maple', jp: '紅葉', romaji: 'Momiji',
      H: 268, baseW: 52, nB: 8, bLen: 146, subs: 2, padW: 0.8, padH: 0.52, twist: 0.85,
      leaf: 'maple', leafK: 0.0058, leafScale: 0.9, leafSize: 21,
    },
    juniper: {
      key: 'juniper', name: 'Shimpaku Juniper', jp: '真柏', romaji: 'Shimpaku',
      H: 258, baseW: 56, nB: 7, bLen: 142, subs: 2, padW: 0.7, padH: 0.5, twist: 1.45,
      leaf: 'juniper', leafK: 0.0056, leafScale: 0.95, leafSize: 17, deadwood: true,
    },
  };

  const SWEEP = { droop: -17, level: -3, rising: 14 };
  let uid = 0;

  // ---------- colour per species / era / season ----------
  function palette(sp, era, season, sun) {
    const k = sp.key;
    const P = {};
    const leaf1 = {
      pine: { spring: ['#3f6d45', '#5a8a56', '#2f5a3a'], summer: ['#2f5e3b', '#457548', '#26503a'], autumn: ['#2f5a3a', '#426f45', '#294f36'], late: ['#2c5236', '#3f6843', '#264a33'] },
      maple: { spring: ['#93c04c', '#b0d466', '#7aa83e', '#c98a4a'], summer: ['#4f8a34', '#68a542', '#40752b'], autumn: ['#d4462a', '#e8722f', '#b0302a', '#eb9c36'], late: ['#b02c20', '#d24a2a', '#8a261c', '#de6d2a'] },
      juniper: { spring: ['#5a9450', '#74b062', '#477c44'], summer: ['#4a8446', '#629e56', '#3b6e3f'], autumn: ['#467c45', '#5c9450', '#38683d'], late: ['#4f7a48', '#668e52', '#3d653f'] },
    };
    const base1 = { pine: '#24412c', maple: '#30562a', juniper: '#2b5131' };
    let leaves = leaf1[k][season].slice();
    const autumn = season === 'autumn' || season === 'late';
    if (k === 'maple' && sun === 'full' && autumn) leaves = leaves.map((c) => mix(c, '#d0201a', 0.2));
    if (k === 'maple' && sun === 'shade' && autumn) leaves = leaves.map((c) => mix(c, '#7a9a40', 0.25));
    if (sun === 'shade' && k !== 'maple') leaves = leaves.map((c) => mix(c, '#7c9a50', 0.18));
    let padBase = base1[k];
    if (k === 'maple') padBase = mix(leaves[2], '#1a0c08', 0.32);
    const trunk = { pine: ['#7a5e4a', '#55402f', '#30221a'], maple: ['#9a8b76', '#6f6250', '#463c32'], juniper: ['#a5674a', '#743f2b', '#43251a'] }[k];

    if (era === 1) {
      Object.assign(P, {
        trunk: trunk[1], trunkDark: trunk[2], trunkLight: trunk[0], line: '#24170f', lw: 1.5,
        shade: mix(trunk[1], trunk[2], 0.5), hi: trunk[0], twig: trunk[2], bark: trunk[2],
        leaves, padBase, under: mix(padBase, '#0a1208', 0.4), padLine: mix(padBase, '#000', 0.35), padLW: 0.9, vein: mix(leaves[0], '#000', 0.45),
        needle: leaves, candle: '#d8c49a', dead: '#ece2cf', deadLine: '#6d5d4c', mossA: '#7a9a3c', mossB: '#56752a', mossHi: '#a8c25e',
      });
    } else if (era === 2) {
      // Manga: clean white shapes, bold outlines, a few FLAT greys. No dot screens on the tree (they shimmer on screens).
      const autumnTone = k === 'maple' && autumn;
      Object.assign(P, {
        trunk: '#fff', trunkDark: '#111', trunkLight: '#fff', line: '#111', lw: 2.4,
        shade: null, hi: null, twig: '#111', bark: '#111',
        leaves: autumnTone ? ['#d4d4d4', '#eeeeee', '#bdbdbd'] : ['#fff', '#fff', '#ececec'],
        padBase: k === 'pine' ? '#e2e2e2' : '#dedede', under: '#b8b8b8', padLine: '#111', padLW: 1.8, vein: '#111',
        needle: ['#3a3a3a', '#7a7a7a', '#111'], candle: '#fff', dead: '#fff', deadLine: '#111', mossA: '#e2e2e2', mossB: '#111', mossHi: '#111',
      });
    } else {
      const glowLeaves = leaves.map((c) => mix(c, '#fff8d0', 0.12));
      const warm = k === 'maple' && autumn;
      const pb = warm ? mix(padBase, '#5a0c18', 0.2) : mix(padBase, '#0b2a2a', 0.25);
      Object.assign(P, {
        trunk: trunk[1], trunkDark: trunk[2], trunkLight: mix(trunk[0], '#ffe2b0', 0.25), line: 'none', lw: 0,
        shade: null, hi: '#ffe9c0', twig: trunk[2], bark: mix(trunk[2], trunk[1], 0.3),
        leaves: glowLeaves, padBase: pb, under: mix(pb, '#05060f', 0.45), padLine: 'none', padLW: 0, vein: mix(leaves[0], '#000', 0.35),
        needle: glowLeaves, candle: '#f3e2b0', dead: '#f6f0e4', deadLine: '#b9ab98', mossA: '#86b04a', mossB: '#5c8a34', mossHi: '#e2ffb0',
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
      const j = branches[branches.length - 2]; // one dead branch (jin) high on the tree
      if (j) j.jin = true;
    }
    return { sp, P, style, g, sTop, sc, wb, H, centre, width, W0, branches, sweepAdj };
  }

  // A branch: out, a little down, tip turning up, with the angular elbows that years of pruning leave.
  function branchPts(x0, y0, side, ang, L, droop, wig) {
    const pts = [];
    const K = 6, ca = Math.cos(rad(ang)), sa = Math.sin(rad(ang));
    const px = sa, py = side * ca; // perpendicular to the branch direction
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      let x = x0 + side * ca * L * t;
      let y = y0 - sa * L * t + droop * L * Math.sin(Math.PI * t) * 0.15 - L * 0.12 * t * t * t;
      const zz = k === 0 || k === K ? 0 : (k % 2 ? 1 : -1) * L * 0.04 * (0.6 + 0.4 * Math.sin(wig + k * 1.7));
      x += px * zz; y += py * zz;
      pts.push([x, Math.min(y, -14)]);
    }
    return pts;
  }

  // Foliage-pad mass: bumpy dome on top, gently flattened underneath.
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
    const lsc = sp.leafScale * sunScale * (0.55 + 0.45 * Math.min(1, sc * 1.25));

    let defs = '';
    const trunkFill = era === 3 ? `url(#${id}-tg)` : pal.trunk;
    if (era === 3) {
      defs += `<linearGradient id="${id}-tg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${pal.trunkLight}"/><stop offset=".45" stop-color="${pal.trunk}"/><stop offset="1" stop-color="${pal.trunkDark}"/></linearGradient>
        <radialGradient id="${id}-hl" cx=".45" cy=".2" r=".7"><stop offset="0" stop-color="#fff6c8" stop-opacity=".45"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>`;
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
      let L = b.L * sc * Math.pow(p, 0.8) * (b.back ? 0.78 : 1);
      if (L < 3) continue;
      const c = centre(b.s);
      const w = width(b.s);
      const x0 = c[0];
      // keep the crown compact so it fits a phone screen: cap how far a branch tip can reach
      const reach = Math.abs(x0 + b.side * Math.cos(rad(b.ang)) * L);
      if (reach > 200) L *= Math.max(0.35, 200 / reach);
      const layer = b.back ? back : front;
      if (b.jin && g > 0.45) {
        // dead, bleached branch stub with grain lines
        const jp = branchPts(x0, c[1], b.side, b.ang + 18, L * 0.55, 0.2, b.wig);
        const jw = jp.map((_, k) => lerp(w * 0.35, 0.6, k / (jp.length - 1)));
        jinSvg += `<path d="${ribbon(jp, jw).d}" fill="${pal.dead}" stroke="${pal.deadLine}" stroke-width="${era === 2 ? 1.8 : 0.9}"/>`;
        jinSvg += `<path d="${smooth(jp, false)}" fill="none" stroke="${pal.deadLine}" stroke-width=".6" opacity=".7"/>`;
        continue;
      }
      const pts = branchPts(x0, c[1], b.side, b.ang, L, droop, b.wig);
      const bw = pts.map((_, k) => lerp(w * 0.5, 1.1, Math.pow(k / (pts.length - 1), 0.8)));
      layer.wood += `<path d="${ribbon(pts, bw).d}"/>`;
      const tip = pts[pts.length - 1];
      const pw = 16 + L * sp.padW * 0.85;
      const pad = { cx: tip[0] + b.side * pw * 0.1, cy: Math.min(tip[1] - pw * sp.padH * 0.22, -pw * sp.padH * 0.45 - 8), w: pw, h: pw * sp.padH, back: b.back, p, side: b.side, key: `b${b.i}`, tx: tip[0], ty: tip[1] };
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
        layer.pads.push({ cx: st[0], cy: Math.min(st[1] - spw * sp.padH * 0.2, -spw * sp.padH * 0.45 - 8), w: spw, h: spw * sp.padH, back: b.back, p, side: b.side, key: `b${b.i}s${si}`, tx: st[0], ty: st[1] });
      }
    }
    // apex and shoulders
    const apW = (26 + 98 * Math.pow(g, 0.9)) * (sp.key === 'maple' ? 1.08 : 1) * sc;
    front.pads.push({ cx: top[0], cy: top[1] - apW * 0.16, w: apW, h: apW * 0.62, back: false, p: 1, side: 0, key: 'apex', tx: top[0], ty: top[1] + apW * 0.1 });
    if (g > 0.3) {
      const sh = centre(sTop - 0.07);
      [-1, 1].forEach((sd) => front.pads.push({ cx: sh[0] + sd * apW * 0.42, cy: sh[1] - apW * 0.05, w: apW * 0.62, h: apW * 0.38, back: false, p: 1, side: sd, key: 'sh' + sd, tx: sh[0], ty: sh[1] + 4 }));
    }

    function leafUse(x, y, rot, scl, ci) {
      const tf = `translate(${f(x)} ${f(y)}) rotate(${Math.round(rot)}) scale(${f(scl * 10) / 10})`;
      if (sp.leaf === 'pine') return `<use href="${ci === 2 ? `#lf${era}-pineb` : lf}" transform="${tf}" color="${pal.needle[ci % pal.needle.length]}"/>`;
      return `<use href="${lf}" transform="${tf}" fill="${leafFill(ci % pal.leaves.length)}" color="${pal.vein}"/>`;
    }

    function padSvg(pad, isBack) {
      const R = rng(o.seed + Math.round(pad.cx * 13 + pad.cy * 7));
      let s = '';
      const small = pad.w < 30;
      const { cx, cy, w, h } = pad;
      if (!small) {
        // 1. the shadowed mass of the pad
        const mw = sp.leaf === 'maple' ? 0.84 : 0.9, mh = sp.leaf === 'maple' ? 0.8 : 0.86;
        s += `<path d="${cloudPath(cx, cy + h * 0.04, w * mw, h * mh, R)}" fill="${pal.padBase}" stroke="${pal.padLine}" stroke-width="${pal.padLW}" stroke-linejoin="round"/>`;
        // 2. darker underside, where light doesn't reach
        s += `<path d="M${f(cx - w * 0.4)} ${f(cy + h * 0.06)}Q${f(cx)} ${f(cy + h * 0.6)} ${f(cx + w * 0.4)} ${f(cy + h * 0.06)}Q${f(cx)} ${f(cy + h * 0.28)} ${f(cx - w * 0.4)} ${f(cy + h * 0.06)}Z" fill="${pal.under}" opacity="${era === 3 ? 0.5 : 0.85}"/>`;
        // 3. twigs fanning from the branch tip into the pad (seen between the leaves)
        if (pad.tx != null && w > 26) {
          let tw = '', tw2 = '';
          const n = 3 + Math.floor(w / 45);
          for (let i = 0; i < n; i++) {
            const u = i / (n - 1);
            const ex = cx + (u - 0.5) * w * 0.74, ey = cy + h * 0.02 - R() * h * 0.14;
            const mx = lerp(pad.tx, ex, 0.5) + (R() - 0.5) * 8, my = lerp(pad.ty, ey, 0.5) + 4;
            tw += `M${f(pad.tx)} ${f(pad.ty)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
            const fx = lerp(pad.tx, ex, 0.68), fy = lerp(pad.ty, ey, 0.68) + 2;
            tw2 += `M${f(fx)} ${f(fy)}l${f((u - 0.5) * w * 0.22 + (R() - 0.5) * 6)} ${f(-(5 + R() * h * 0.22))}`;
          }
          s += `<path d="${tw}" stroke="${pal.twig}" stroke-width="${era === 2 ? 1.1 : 1.5}" fill="none" stroke-linecap="round"/>`;
          s += `<path d="${tw2}" stroke="${pal.twig}" stroke-width="${era === 2 ? 0.8 : 0.9}" fill="none" stroke-linecap="round"/>`;
        }
      }
      // 4. leaves: inside the pad (weighted to the sunny top) ...
      const count = clamp(Math.round(w * h * sp.leafK * density * (small ? 1.6 : 1)), sp.leaf === 'maple' ? 3 : 4, 80);
      const items = [];
      for (let i = 0; i < count; i++) {
        const a = R() * Math.PI * 2, r = Math.sqrt(R());
        items.push({ x: cx + Math.cos(a) * r * w * 0.44, y: cy + Math.sin(a) * r * h * 0.36 - h * 0.14, r1: R(), r2: R(), r3: R(), rim: null });
      }
      // ... and around the outline, so the silhouette is made of leaves rather than a smooth dome
      if (!small) {
        const size = sp.leafSize * lsc;
        const rx = w * 0.47, ry = h * 0.46;
        const nRim = Math.max(4, Math.round((Math.PI * (rx + ry)) / 2 / (size * 0.6)));
        for (let i = 0; i <= nRim; i++) {
          const a = Math.PI * (0.94 + (1.12 * i) / nRim);
          const j = 0.94 + R() * 0.12;
          items.push({ x: cx + Math.cos(a) * rx * j, y: cy + Math.sin(a) * ry * j - h * 0.04, r1: R(), r2: R(), r3: R(), rim: a });
        }
        const nB = Math.max(3, Math.round(nRim * 0.5));
        for (let i = 0; i <= nB; i++) {
          const a = Math.PI * (0.1 + (0.8 * i) / nB);
          const j = 0.9 + R() * 0.12;
          items.push({ x: cx + Math.cos(a) * rx * j, y: cy + Math.sin(a) * ry * 0.6 + h * 0.02, r1: 0.9, r2: R(), r3: R(), rim: a, under: true });
        }
      }
      items.sort((a, b) => b.y - a.y);
      for (const it of items) {
        const tY = clamp((it.y - (cy - h / 2)) / h, 0, 1);
        let ci = it.r1 < 0.5 ? 0 : it.r1 < 0.8 ? 1 : 2;
        if (tY < 0.35 && it.r2 < 0.65) ci = 1; // sunlit top
        if (tY > 0.65 && it.r2 < 0.6) ci = 2; // shaded sides
        if (pal.leaves[3] && it.r3 < 0.12 && season === 'spring') ci = 3;
        if (it.under) ci = 2;
        const scl = lsc * (0.85 + it.r2 * 0.3);
        let rot;
        if (it.rim != null) rot = ((it.rim * 180) / Math.PI + 90) * (sp.leaf === 'maple' ? 1 : 0.8) + (it.r3 - 0.5) * 24;
        else if (sp.leaf === 'maple') rot = (Math.atan2(it.y - (cy + h * 0.6), it.x - cx) * 180) / Math.PI + 90 + (it.r3 - 0.5) * 50;
        else if (sp.leaf === 'pine') rot = ((it.x - cx) / w) * 70 + (it.r3 - 0.5) * 30;
        else rot = ((it.x - cx) / w) * 90 + (it.r3 - 0.5) * 60;
        s += leafUse(it.x, it.y, rot, scl, ci);
        if (sp.leaf === 'pine' && (season === 'spring' || season === 'summer') && it.r3 < 0.09 && tY < 0.4) s += `<use href="#lf${era}-candle" transform="translate(${f(it.x)} ${f(it.y)}) rotate(${Math.round(rot)}) scale(${f(scl * 10) / 10})" fill="${pal.candle}"/>`;
      }
      if (era === 3 && !small) s += `<ellipse cx="${f(cx)}" cy="${f(cy - h * 0.15)}" rx="${f(w * 0.5)}" ry="${f(h * 0.45)}" fill="url(#${id}-hl)" style="mix-blend-mode:screen"/>`;
      return `<g${isBack ? ' opacity=".82"' : ''}>${s}</g>`;
    }

    const woodStyle = `fill="${trunkFill}" stroke="${pal.line}" stroke-width="${pal.lw * 0.8}" stroke-linejoin="round"`;
    let out = `<g class="tree">${defs ? `<defs>${defs}</defs>` : ''}`;

    // back layer
    out += `<g ${woodStyle}${era === 1 ? ' opacity=".9"' : ''}>${back.wood}</g>`;
    back.pads.forEach((p) => { out += padSvg(p, true); allPads.push(p); });

    // nebari: surface roots spreading over the soil
    if (g > 0.12) {
      const W0 = T.W0;
      const R = rng(o.seed + 99);
      let roots = '';
      for (let k = 0; k < 7; k++) {
        const side = k % 2 ? 1 : -1;
        const spread = W0 * (0.6 + R() * 0.9) * (k < 2 ? 1.25 : k < 4 ? 0.95 : 0.7);
        const x0 = cpts[0][0] + side * W0 * (0.05 + R() * 0.3);
        const rp = [[x0, -W0 * 0.16], [x0 + side * spread * 0.35, -W0 * 0.04], [x0 + side * spread * 0.75, 1.5], [x0 + side * spread, 4]];
        roots += `<path d="${ribbon(rp, [W0 * 0.4, W0 * 0.24, W0 * 0.1, 1]).d}"/>`;
      }
      out += `<g ${woodStyle}>${roots}</g>`;
    }

    // front branches start inside the trunk, so the trunk is drawn over their bases
    out += `<g ${woodStyle}>${front.wood}</g>`;
    out += `<path d="${rb.d}" ${woodStyle}/>`;
    // clip trunk details to the trunk shape so nothing spills over the outline
    out += `<clipPath id="${id}-tc"><path d="${rb.d}"/></clipPath><g clip-path="url(#${id}-tc)">`;

    // light and shadow sides
    const rightEdge = rb.L.slice().reverse(); // ribbon L = right-hand side for an upward trunk
    if (pal.shade) {
      const half = cpts.map((c, i) => [c[0] + ws[i] * 0.14, c[1]]);
      out += `<path d="${smooth(half.concat(rightEdge), true)}" fill="${pal.shade}"/>`;
    }
    if (era === 2) {
      // crisp hand-drawn hatching on the shadow side
      let hs = '';
      const nH = Math.max(6, Math.round((sTop * T.H * sc) / 4.2));
      for (let i = 0; i < nH; i++) {
        const s = ((i + 0.5) / nH) * sTop * 0.97;
        const c = centre(s), w = width(s);
        hs += `M${f(c[0] + w * 0.1)} ${f(c[1])}L${f(c[0] + w * 0.5)} ${f(c[1] - w * 0.16)}`;
      }
      out += `<path d="${hs}" stroke="#111" stroke-width=".8" fill="none"/>`;
    }
    if (pal.hi) {
      const hp = cpts.map((c, i) => [c[0] - ws[i] * 0.27, c[1]]);
      out += `<path d="${ribbon(hp, ws.map((w) => w * 0.13)).d}" fill="${pal.hi}" opacity="${era === 3 ? 0.35 : 0.5}"/>`;
    }

    // species bark
    const R2 = rng(o.seed + 5);
    let bark = '', barkHi = '';
    if (g > 0.12) {
      if (sp.key === 'pine') {
        // rough plates of uneven size, split by fissures
        const end = sTop * 0.94;
        const step0 = end / Math.max(4, Math.round((sTop * T.H * sc) / Math.max(7, 12 * sc)));
        let sAcc = 0, r = 0;
        while (sAcc < end - 0.001) {
          const s0 = sAcc, s1 = Math.min(end, sAcc + step0 * (0.65 + R2() * 0.8));
          sAcc = s1; r++;
          const c0 = centre(s0), c1 = centre(s1), w = width(s0);
          const us = (r % 2 ? [-0.3, 0.12] : [-0.1, 0.3]).map((u) => u + (R2() - 0.5) * 0.14);
          if (R2() < 0.5) us.push(r % 2 ? 0.4 : -0.4);
          us.sort((a, b) => a - b);
          us.forEach((u, k) => {
            bark += `M${f(c0[0] + u * w)} ${f(c0[1])}Q${f(c0[0] + (u + (R2() - 0.5) * 0.08) * w)} ${f((c0[1] + c1[1]) / 2)} ${f(c1[0] + u * w * 0.95)} ${f(c1[1])}`;
            if (k < us.length - 1 && R2() < 0.55) {
              const a = c0[0] + u * w + 1, b2 = c0[0] + us[k + 1] * w - 1;
              bark += `M${f(a)} ${f(c0[1])}Q${f((a + b2) / 2)} ${f(c0[1] + 2.5)} ${f(b2)} ${f(c0[1] - 1)}`;
            }
            if (u < 0 && k < us.length - 1) barkHi += `M${f(c0[0] + u * w + 2)} ${f(c1[1] + 2)}l${f(w * 0.08)} ${f(-1)}`;
          });
        }
      } else if (sp.key === 'maple') {
        // smooth bark: long pale streaks and small lenticels
        [-0.3, -0.08, 0.16, 0.34].forEach((k, j) => {
          const pts = [];
          for (let i = 0; i <= 14; i++) { const s = (i / 14) * sTop * 0.95, c = centre(s), w = width(s); pts.push([c[0] + (k + 0.03 * Math.sin(s * 7 + j * 5)) * w, c[1]]); }
          if (k < 0.2) barkHi += smooth(pts, false); else bark += smooth(pts, false);
        });
        for (let i = 0; i < 18; i++) { const s = R2() * sTop * 0.9, c = centre(s), w = width(s); bark += `M${f(c[0] + (R2() - 0.5) * w * 0.6)} ${f(c[1])}h${f(w * 0.08)}`; }
      } else {
        // juniper: fibrous, twisting strands
        for (let k = 0; k < 8; k++) {
          const pts = [];
          for (let i = 0; i <= 18; i++) { const s = (i / 18) * sTop * 0.97, c = centre(s), w = width(s); pts.push([c[0] + (-0.42 + k * 0.12 + 0.1 * Math.sin(s * 9 + k * 0.7)) * w, c[1]]); }
          if (k % 2) bark += smooth(pts, false); else barkHi += smooth(pts, false);
        }
      }
    }
    out += `<path d="${bark}" fill="none" stroke="${pal.bark}" stroke-width="${era === 2 ? 0.9 : 1.1}" stroke-linecap="round" opacity="${era === 3 ? 0.45 : 0.85}"/>`;
    if (barkHi && era !== 2) out += `<path d="${barkHi}" fill="none" stroke="${era === 3 ? '#ffe9c0' : pal.hi}" stroke-width="1" stroke-linecap="round" opacity="${era === 3 ? 0.3 : 0.6}"/>`;
    out += `</g>`;

    // juniper deadwood (shari) spiralling up the trunk
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
      let grain = '';
      [-0.25, 0, 0.25].forEach((k) => { grain += smooth(sp2.map((p, i) => [p[0] + k * sw2[i], p[1]]), false); });
      out += `<path d="${grain}" fill="none" stroke="${pal.deadLine}" stroke-width=".6" opacity=".6"/>`;
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
    // only pads comfortably inside a phone-width view, unless there are too few
    let cand = pads.filter((p) => !p.back && p.w > 22 && Math.abs(p.cx) < 190).sort(() => R() - 0.5);
    if (cand.length < count) cand = pads.filter((p) => !p.back && p.w > 22).sort(() => R() - 0.5);
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
        // the wide invisible tap target goes on top, so the whole shoot is easy to hit with a finger
        svg: `<path class="glow" d="${twig}" fill="none" stroke-linecap="round"/>
              <path d="${twig}" fill="none" stroke="${era === 2 ? '#111' : pal.trunk}" stroke-width="2.4" stroke-linecap="round"/>${leaves}
              <path class="hit" d="${twig}" stroke="transparent" stroke-width="30" stroke-linecap="round" fill="none"/>`,
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
  const POT_COL = { training: ['#c27a4c', '#9a5432', '#e0a070'], rect: ['#7c4430', '#5a2e20', '#9c6248'], oval: ['#2f5597', '#1d3870', '#6f97d6'], drum: ['#9fbfa6', '#6f9478', '#d6eadb'] };
  const POT_GREY = { training: '#fff', rect: '#fff', oval: '#b4b4b4', drum: '#f0f0f0' }; // manga: flat greys

  // Soil (drawn behind the tree) and pot body (drawn in front). Soil surface = y 0.
  function pot(type, era) {
    const P = POTS[type];
    const [c, cd, cl] = POT_COL[type];
    const w = P.w, h = P.h, id = 'p' + ++uid;
    const line = era === 2 ? '#111' : era === 1 ? '#24170f' : 'none';
    const lw = era === 2 ? 2.6 : era === 1 ? 1.5 : 0;
    let fill = c, rimFill = cl;
    let defs = '';
    if (era === 2) { fill = POT_GREY[type]; rimFill = '#fff'; }
    if (era === 3) {
      defs += `<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${cl}"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${cd}"/></linearGradient>
        <linearGradient id="${id}r" x1="0" x2="0" y2="1"><stop offset="0" stop-color="${cl}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
      fill = `url(#${id}g)`; rimFill = `url(#${id}r)`;
    }
    // soil with grit
    const soilCol = era === 2 ? '#8a8a8a' : era === 3 ? '#3b2a22' : '#4a3426';
    const wetCol = era === 2 ? '#3a3a3a' : era === 3 ? '#22160f' : '#2e1f15';
    const sw = w / 2 - 6;
    let soil = `<path class="soil" d="M${-sw} 6Q${-sw * 0.6} -6 0 -5Q${sw * 0.6} -6 ${sw} 6Z" fill="${soilCol}" data-dry="${soilCol}" data-wet="${wetCol}" stroke="${line}" stroke-width="${lw * 0.6}"/>`;
    const Rg = rng(w * 7 + h);
    let grit = '';
    const gritCols = era === 2 ? ['#555', '#fff'] : era === 3 ? ['#6b5446', '#8a7262', '#2a1c16'] : ['#6e5442', '#8c7058', '#2e2018'];
    for (let i = 0; i < Math.round(w / 3.2); i++) {
      const x = (Rg() * 2 - 1) * sw * 0.92;
      const y = -4 + (Math.abs(x) / sw) * 8 + Rg() * 2.5;
      grit += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.7 + Rg() * 1.1)}" fill="${gritCols[i % gritCols.length]}"/>`;
    }
    soil += grit;

    let bodyD = '', body = '', extra = '';
    if (type === 'training') {
      bodyD = `M${-w / 2 + 6} 12L${w / 2 - 6} 12L${w / 2 - 18} ${h}L${-w / 2 + 18} ${h}Z`;
    } else if (type === 'rect') {
      bodyD = `M${-w / 2 + 4} 12L${w / 2 - 4} 12L${w / 2 - 9} ${h - 6}L${-w / 2 + 9} ${h - 6}Z`;
      extra += `<path d="M${-w / 2 + 8} 22H${w / 2 - 8}" stroke="${era === 2 ? '#111' : cd}" stroke-width="${era === 2 ? 1.4 : 1.6}"/>`;
      [-1, 1].forEach((s) => (extra += `<path d="M${s * (w / 2 - 12)} ${h - 7}h${-s * 26}l${s * 4} 8h${s * 18}Z" fill="${era === 2 ? '#fff' : cd}" stroke="${line}" stroke-width="${lw * 0.8}"/>`));
      extra += `<rect x="${w / 2 - 34}" y="${h - 22}" width="9" height="9" fill="none" stroke="${era === 2 ? '#111' : cd}" stroke-width="1.2"/><path d="M${w / 2 - 32} ${h - 18}h5M${w / 2 - 29.5} ${h - 20}v6" stroke="${era === 2 ? '#111' : cd}" stroke-width=".9"/>`;
    } else if (type === 'oval') {
      bodyD = `M${-w / 2 + 2} 10C${-w / 2 + 8} ${h - 2} ${-w / 2 + 40} ${h - 4} 0 ${h - 4}C${w / 2 - 40} ${h - 4} ${w / 2 - 8} ${h - 2} ${w / 2 - 2} 10Z`;
      extra += `<path d="M${-w / 2 + 30} 22Q${-w / 4} 16 ${-w / 8} 24" stroke="#fff" stroke-width="3" opacity="${era === 2 ? 0.95 : 0.4}" fill="none" stroke-linecap="round"/>`;
      extra += `<path d="M${w / 8} 30Q${w / 4} 34 ${w / 3} 26" stroke="#fff" stroke-width="1.6" opacity="${era === 2 ? 0.8 : 0.25}" fill="none" stroke-linecap="round"/>`;
      [-1, 1].forEach((s) => (extra += `<path d="M${s * (w / 2 - 60)} ${h - 5}q${s * -2} 6 ${s * -14} 6h${s * 26}q${s * -10} 0 ${s * -12} -6Z" fill="${era === 2 ? '#111' : cd}"/>`));
    } else if (type === 'drum') {
      bodyD = `M${-w / 2 + 2} 10C${-w / 2 - 10} ${h * 0.45} ${-w / 2 - 4} ${h - 8} ${-w / 2 + 14} ${h - 6}H${w / 2 - 14}C${w / 2 - 4} ${h - 8} ${w / 2 + 10} ${h * 0.45} ${w / 2 - 2} 10Z`;
      for (let i = 0; i < 15; i++) {
        const x = -w / 2 + 12 + (i * (w - 24)) / 14;
        extra += `<circle cx="${f(x)}" cy="18" r="2.4" fill="${era === 2 ? '#111' : cl}" stroke="${era === 1 ? cd : 'none'}" stroke-width=".8"/>`;
        extra += `<circle cx="${f(x)}" cy="${h - 13}" r="2.2" fill="${era === 2 ? '#111' : cl}" stroke="${era === 1 ? cd : 'none'}" stroke-width=".8"/>`;
      }
      [-0.33, 0.33].forEach((s) => (extra += `<path d="M${s * w - 12} ${h - 6}h24l-4 8h-16Z" fill="${era === 2 ? '#111' : cd}"/>`));
    }
    // body with form shading: lit left, shadowed right, shadow under the rim
    defs += `<clipPath id="${id}c"><path d="${bodyD}"/></clipPath>`;
    body += `<path d="${bodyD}" fill="${fill}" stroke="${line}" stroke-width="${lw}"/>`;
    const shadeCol = era === 2 ? '#000' : cd;
    body += `<g clip-path="url(#${id}c)">
      ${era !== 3 ? `<rect x="${f(w * 0.24)}" y="0" width="${w}" height="${h + 10}" fill="${shadeCol}" opacity="${era === 2 ? 0.14 : 0.3}"/>` : ''}
      ${era !== 2 ? `<rect x="${f(-w * 0.4)}" y="0" width="${f(w * 0.05)}" height="${h + 10}" fill="#fff" opacity="${era === 3 ? 0.12 : 0.1}"/>` : ''}
      <rect x="${-w}" y="11" width="${w * 2}" height="6" fill="#000" opacity="${era === 2 ? 0.2 : 0.22}"/></g>`;
    body += extra;
    const rimRx = type === 'oval' ? 6 : type === 'drum' ? 5 : type === 'training' ? 3 : 2;
    const rimX = type === 'rect' ? -w / 2 - 4 : type === 'oval' ? -w / 2 - 3 : type === 'drum' ? -w / 2 - 2 : -w / 2;
    const rimW = w + (type === 'rect' ? 8 : type === 'oval' ? 6 : type === 'drum' ? 4 : 0);
    body += `<rect x="${rimX}" y="1" width="${rimW}" height="${type === 'oval' || type === 'drum' ? 11 : 12}" rx="${rimRx}" fill="${type === 'oval' && era !== 2 ? (era === 3 ? `url(#${id}g)` : cd) : rimFill}" stroke="${line}" stroke-width="${lw}"/>`;
    body += `<rect x="${rimX + 3}" y="2.5" width="${rimW - 6}" height="2" rx="1" fill="#fff" opacity="${era === 2 ? 0 : 0.3}"/>`;
    return { defs: `<defs>${defs}</defs>`, soil, body, w, h, drip: type === 'oval' ? h - 3 : h };
  }

  // Moss: soft tufted cushions with a little texture.
  function moss(era, potW, g, seed) {
    const R = rng(seed + 77);
    const line = era === 2 ? '#111' : era === 1 ? '#3d5520' : 'none';
    const A = era === 2 ? '#e2e2e2' : era === 3 ? '#7fae46' : '#7a9a3c';
    const B = era === 2 ? '#111' : era === 3 ? '#4f8030' : '#56752a';
    const hi = era === 2 ? '#111' : era === 3 ? '#e2ffb0' : '#a8c25e';
    let s = '';
    const span = potW / 2 - 14;
    for (let i = 0; i < 15; i++) {
      const x = (R() - 0.5) * 2 * span * (i < 6 ? 0.35 : 1);
      const r = 5 + R() * 10;
      // bumpy cushion outline
      const n = 3 + Math.round(r / 6);
      let d = `M${f(x - r)} 3`;
      for (let k = 1; k <= n; k++) {
        const px = x - r + (2 * r * k) / n, py = 3 - (k === n ? 0 : 0);
        const br = r / n + 0.5;
        d += `A${f(br)} ${f(br * (0.9 + R() * 0.5))} 0 0 1 ${f(px)} ${f(py)}`;
      }
      d += 'Z';
      s += `<path d="${d}" fill="${A}" stroke="${line}" stroke-width="${era === 2 ? 1.3 : 0.7}"/>`;
      s += `<path d="M${f(x - r * 0.8)} 3Q${f(x)} ${f(1 - r * 0.15)} ${f(x + r * 0.8)} 3Z" fill="${B}" opacity="${era === 2 ? 0 : 0.45}"/>`;
      for (let k = 0; k < 4; k++) {
        const tx = x + (R() - 0.5) * r * 1.2, ty = 1 - R() * r * 0.45;
        s += era === 2
          ? `<circle cx="${f(tx)}" cy="${f(ty)}" r=".7" fill="${hi}"/>`
          : `<path d="M${f(tx - 1.2)} ${f(ty + 1)}l1.2 -2l1.2 2" stroke="${hi}" stroke-width=".7" fill="none" opacity="${era === 3 ? 0.8 : 0.9}"/>`;
      }
    }
    return `<g class="moss">${s}</g>`;
  }

  BD.tree = { SPECIES, POTS, render, shoots, pot, moss, build };
})();
