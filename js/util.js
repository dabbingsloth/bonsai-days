/* Bonsai Days — shared helpers (random numbers, colour, SVG path helpers). */
(function () {
  const BD = (window.BD = window.BD || {});

  // Small, fast, seedable random number generator (mulberry32).
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const f = (n) => Math.round(n * 10) / 10; // compact numbers in SVG output
  const rad = (d) => (d * Math.PI) / 180;

  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function mix(c1, c2, t) {
    const a = hex2rgb(c1), b = hex2rgb(c2);
    return rgb2hex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
  }
  // Interpolate across keyframes [[t, colour], ...]
  function ramp(stops, t) {
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
        return mix(c0, c1, (t - t0) / (t1 - t0));
      }
    }
    return stops[stops.length - 1][1];
  }

  // Catmull-Rom spline through points -> smooth cubic bezier path.
  function smooth(points, closed) {
    const p = points;
    const n = p.length;
    if (n < 2) return '';
    let d = `M${f(p[0][0])} ${f(p[0][1])}`;
    const get = (i) => (closed ? p[(i + n) % n] : p[clamp(i, 0, n - 1)]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return closed ? d + 'Z' : d;
  }
  function poly(points, closed) {
    return points.map((q, i) => (i ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1])).join('') + (closed ? 'Z' : '');
  }

  // Tapered ribbon around a centre line: widths[i] is full width at points[i].
  function ribbon(points, widths) {
    const L = [], R = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const w = widths[i] / 2;
      L.push([points[i][0] - dy * w, points[i][1] + dx * w]);
      R.push([points[i][0] + dy * w, points[i][1] - dx * w]);
    }
    return { L, R, d: smooth(L.concat(R.reverse()), true) };
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  BD.util = { rng, clamp, lerp, ease, f, rad, mix, ramp, smooth, poly, ribbon, esc, hex2rgb };
})();
