/* Bonsai Days — game flow: screens, visual-novel dialogue, hands-on moments, saving. */
(function () {
  const BD = window.BD;
  const { clamp, lerp, ease, f, mix, esc } = BD.util;
  const S = BD.story;
  const $ = (q, el) => (el || document).querySelector(q);
  const NS = 'http://www.w3.org/2000/svg';
  const FAST = /[?&]fast=1/.test(location.search); // used by automated tests
  const T = (ms) => (FAST ? Math.min(ms, 40) : ms);
  const SAVE_KEY = 'bonsai-days-save-v1';
  const KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];

  let st = null; // game state (saved)
  let run = 0; // bumped to abandon the running day (Menu button)
  class Abort extends Error {}
  const guard = (id) => { if (id !== run) throw new Abort(); };
  const sleep = (ms, id) => new Promise((res, rej) => setTimeout(() => (id != null && id !== run ? rej(new Abort()) : res()), T(ms)));

  // ---------- storage (never trusted to exist) ----------
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && BD.tree.SPECIES[s.species] && s.day >= 1 && s.day <= 15) return s;
    } catch (e) { /* private mode etc. */ }
    return null;
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }

  // ---------- screens ----------
  const SCREENS = ['title', 'select', 'game', 'epilogue'];
  function show(id) {
    SCREENS.forEach((s) => ($('#' + s).hidden = s !== id));
    if (id !== 'game') particles.stop();
  }
  function setBodyEra(e) {
    document.body.classList.remove('era-1', 'era-2', 'era-3');
    document.body.classList.add('era-' + e);
  }

  // ---------- title ----------
  // On tall phone screens, frame the print on the mountain peak and the wave's curl.
  function fitTitle() {
    const a = innerWidth / innerHeight, el = $('#title-art');
    if (a < 1.2) { const vw = Math.max(420, 900 * a); el.setAttribute('viewBox', `${f(760 - vw / 2)} 0 ${f(vw)} 900`); }
    else el.setAttribute('viewBox', '0 0 1600 900');
  }
  addEventListener('resize', fitTitle);
  function initTitle() {
    $('#title-art').innerHTML = BD.art.title();
    fitTitle();
    const bar = $('.loadbar i'), txt = $('.load-text');
    const steps = ['Grinding ink', 'Carving the woodblock', 'Soaking the paper', 'Pressing the print'];
    let i = 0;
    const tick = () => {
      i++;
      bar.style.width = (i / steps.length) * 100 + '%';
      txt.textContent = steps[Math.min(i, steps.length - 1)] + '…';
      if (i < steps.length) setTimeout(tick, T(380));
      else setTimeout(() => {
        $('.loadwrap').hidden = true;
        $('#start-btn').hidden = false;
        $('#start-btn').focus({ preventScroll: true });
      }, T(300));
    };
    setTimeout(tick, T(250));
    $('#start-btn').onclick = showSelect;
  }

  // ---------- selection ----------
  const DESC = {
    pine: { p: 'The classic bonsai of Japan. Tough, sun-loving and evergreen, with stiff paired needles and bark that cracks into plates as it ages.', li: ['Needles in pairs', 'Loves full sun', 'Spring "candles" to prune'] },
    maple: { p: 'Delicate hand-shaped leaves that open fresh green and turn fiery red in autumn. A tree that shows every season.', li: ['Leaves with 5–7 pointed lobes', 'Morning sun, afternoon shade', 'Brilliant autumn colour'] },
    juniper: { p: 'A mountain tree with soft, scale-like foliage and twisting red-brown bark, often with bleached silver deadwood.', li: ['Scale-like foliage', 'Full sun and moving air', 'Dramatic deadwood'] },
  };
  let cardsBuilt = false;
  function showSelect() {
    show('select');
    setBodyEra(1);
    if (!cardsBuilt) {
      const html = ['pine', 'maple', 'juniper'].map((k) => {
        const sp = BD.tree.SPECIES[k];
        return `<article class="card">
          <div class="print">${BD.art.selectPrint(k)}</div>
          <div class="info">
            <h3>${sp.name}</h3>
            <div class="romaji">${sp.jp} · ${sp.romaji}</div>
            <p>${DESC[k].p}</p>
            <ul>${DESC[k].li.map((x) => `<li>${x}</li>`).join('')}</ul>
          </div>
          <button class="btn-print plant" data-sp="${k}">Plant this tree</button>
        </article>`;
      }).join('');
      $('.cards').innerHTML = html;
      document.querySelectorAll('.plant').forEach((b) => (b.onclick = () => pick(b.dataset.sp)));
      cardsBuilt = true;
    }
    const sv = loadSave();
    const cw = $('#continue-wrap');
    if (sv) {
      cw.hidden = false;
      const sp = BD.tree.SPECIES[sv.species];
      $('#continue-btn').textContent = sv.done ? 'See your finished tree' : 'Continue';
      $('#continue-meta').textContent = sv.done ? `${sp.name} · all 15 days complete` : `${sp.name} · Day ${sv.day} of 15 · ${S.SEASON_LABEL[sv.day - 1]}`;
      $('#continue-btn').onclick = () => { st = sv; if (st.done) epilogue(); else startGame(false); };
    } else cw.hidden = true;
  }
  function pick(species) {
    const sv = loadSave();
    const go = () => {
      st = { v: 1, species, seed: (Math.random() * 1e9) >>> 0, day: 1, choices: {}, ramif: 0, pruned: 0, waterTries: 0, journal: [], done: false };
      save();
      startGame(true);
    };
    if (sv && !sv.done) confirmBox(`You already have a ${BD.tree.SPECIES[sv.species].name} on Day ${sv.day}. Plant a new tree instead? Your old save will be replaced.`, 'Plant a new tree', go);
    else go();
  }

  // ---------- game scene ----------
  const svg = $('#scene');
  let era = 0, timeT = 0, lastRender = null, lastPot = null, zoom = 1.6;

  const eraOf = (d) => (d <= 5 ? 1 : d <= 10 ? 2 : 3);
  const gOf = (d) => clamp((d - 1) / 14, 0, 1);
  const zoomFor = (g) => lerp(1.4, 1.0, ease(clamp(g * 1.25, 0, 1)));

  function fit() {
    const w = innerWidth, h = innerHeight;
    const narrow = w < 760;
    const r = narrow ? 0.36 : 0.24; // bottom share reserved for dialogue
    const focusTop = 24, focusH = 500, minW = narrow ? 500 : 640;
    const s = Math.min((h * (1 - r)) / focusH, w / minW);
    const vbW = w / s, vbH = h / s;
    const avail = (h * (1 - r)) / s;
    // portrait phones: sit the sill just above the dialogue; otherwise centre the room
    const y = avail > focusH * 1.15 ? focusTop + focusH - avail + 6 : focusTop - (avail - focusH) / 2;
    svg.setAttribute('viewBox', `${f(500 - vbW / 2)} ${f(y)} ${f(vbW)} ${f(vbH)}`);
  }
  addEventListener('resize', () => { fit(); particles.resize(); });

  function setEra(e) {
    if (e === era) return;
    era = e;
    setBodyEra(e);
    svg.innerHTML = BD.scene.build(e);
    fit();
    BD.scene.setTime(svg, e, timeT);
    applyZoom(zoom);
  }
  function opts(over) {
    return Object.assign({
      species: st.species, seed: st.seed, g: gOf(st.day), style: st.choices.style || 'none', sweep: st.choices.sweep || null,
      sun: st.choices.sun || 'morning', season: S.SEASONS[st.day - 1], era, ramif: st.ramif,
    }, over || {});
  }
  const hasMoss = () => st.day > 3 || st.journal.includes('care-moss');

  function drawTree(over, fade) {
    over = over || {};
    const o = opts(over);
    const r = BD.tree.render(o);
    const pt = BD.tree.pot(over.pot || st.choices.pot || 'training', era);
    $('#potWrap', svg).setAttribute('transform', `translate(500 ${BD.scene.SILL_Y - pt.h})`);
    $('#potDefs', svg).innerHTML = pt.defs;
    $('#soilG', svg).innerHTML = pt.soil;
    const tg = $('#treeG', svg);
    if (fade) {
      const old = [...tg.children];
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = r.svg;
      g.style.opacity = '0';
      g.style.transition = `opacity ${T(700)}ms`;
      tg.appendChild(g);
      requestAnimationFrame(() => requestAnimationFrame(() => (g.style.opacity = '1')));
      setTimeout(() => old.forEach((n) => n.remove()), T(760));
    } else tg.innerHTML = `<g>${r.svg}</g>`;
    $('#mossG', svg).innerHTML = hasMoss() ? BD.tree.moss(era, pt.w, o.g, st.seed) : '';
    $('#potBody', svg).innerHTML = pt.body;
    $('#potShadow', svg).setAttribute('rx', f(pt.w * 0.56));
    lastRender = r; lastPot = pt;
    animZoom(zoomFor(o.g));
  }

  let pan = 0; // extra upward shift (svg units) so panels never hide the pot
  function applyZoom(z) {
    const cam = $('#cam', svg);
    if (cam) cam.setAttribute('transform', `translate(0 ${f(-pan)}) translate(500 ${BD.scene.SILL_Y}) scale(${f(z * 1000) / 1000}) translate(-500 ${-BD.scene.SILL_Y})`);
  }
  function animPan(to) {
    const from = pan, t0 = performance.now(), D = T(600);
    const step = (now) => {
      const k = clamp((now - t0) / D, 0, 1);
      pan = lerp(from, to, ease(k));
      applyZoom(zoom);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // Lift the scene if the activity panel would cover the pot, without pushing the crown under the HUD.
  function clearPanel() {
    const P = $('#activity');
    const pot = $('#potBody', svg), tree = $('#treeG', svg);
    if (!P || P.hidden || !pot || !tree) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pr = P.getBoundingClientRect(), pb = pot.getBoundingClientRect(), tb = tree.getBoundingClientRect();
    let px = Math.min(pb.bottom - pr.top + 16, tb.top - 64);
    if (px <= 0) return;
    animPan(pan + px / ctm.a);
  }
  let zoomRaf = 0;
  function animZoom(to) {
    cancelAnimationFrame(zoomRaf);
    const from = zoom, t0 = performance.now(), D = T(1400);
    const step = (now) => {
      const k = clamp((now - t0) / D, 0, 1);
      zoom = lerp(from, to, ease(k));
      applyZoom(zoom);
      if (k < 1) zoomRaf = requestAnimationFrame(step);
    };
    zoomRaf = requestAnimationFrame(step);
  }

  function setT(t) { timeT = t; BD.scene.setTime(svg, era, t); }
  function animT(to, ms, id) {
    return new Promise((res) => {
      const from = timeT, t0 = performance.now(), D = T(ms);
      const step = (now) => {
        if (id !== run) return res();
        const k = clamp((now - t0) / D, 0, 1);
        setT(lerp(from, to, ease(k)));
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- dialogue ----------
  const dlg = $('#dialogue'), dbox = $('.dbox'), dname = $('.dname'), dtext = $('.dtext'), portraitEl = $('#portrait'), sr = $('#sr-line');
  let advance = null, curPortrait = '', holdMode = false;
  function onAdvance() { if (advance) { const a = advance; advance = null; a(); } }
  dbox.addEventListener('click', onAdvance);
  svg.addEventListener('click', () => { if (!dlg.classList.contains('hide')) onAdvance(); });

  function resolveText(t) {
    if (typeof t === 'function') return t(st);
    if (t && typeof t === 'object') return t[st.species] || '';
    return t;
  }
  async function say(line, id) {
    const who = line.who, text = resolveText(line.t);
    dlg.classList.remove('hide');
    $('#activity').hidden = true;
    const hasP = who === 'sensei' || who === 'aoi';
    dlg.classList.toggle('noportrait', !hasP);
    if (hasP && curPortrait !== who + era) { portraitEl.innerHTML = BD.art.portrait(who, era); curPortrait = who + era; }
    const C = S.CHAR[who];
    dname.innerHTML = C.name ? `${C.name}<small>${C.jp}</small>` : '';
    dname.className = 'dname ' + who;
    dtext.className = 'dtext' + (who === 'narr' ? ' narr' : '');
    dbox.classList.remove('ready');
    sr.textContent = (C.name ? C.name + ': ' : '') + text;
    await new Promise((res) => {
      if (FAST) { dtext.textContent = text; return res(); }
      let i = 0;
      const timer = setInterval(() => {
        i += 2;
        dtext.textContent = text.slice(0, i);
        if (i >= text.length) { clearInterval(timer); advance = null; res(); }
      }, 28);
      advance = () => { clearInterval(timer); dtext.textContent = text; res(); };
    });
    guard(id);
    dbox.classList.add('ready');
    if (line.j) unlock(line.j);
    await new Promise((res) => (advance = res));
    guard(id);
  }
  const hideDialogue = () => dlg.classList.add('hide');

  // ---------- journal + toast ----------
  const toastQ = [];
  let toasting = false;
  function toast(msg) {
    toastQ.push(msg);
    if (toasting) return;
    const next = () => {
      const m = toastQ.shift();
      if (!m) { toasting = false; return; }
      toasting = true;
      const el = $('#toast');
      el.innerHTML = m;
      el.classList.add('on');
      setTimeout(() => { el.classList.remove('on'); setTimeout(next, 350); }, FAST ? 200 : 2400);
    };
    next();
  }
  function unlock(j) {
    if (!S.JOURNAL[j] || st.journal.includes(j)) return;
    st.journal.push(j);
    save();
    toast(`<b>${era === 2 ? 'NEW!' : 'Journal'}</b> · ${esc(S.JOURNAL[j].title)}`);
    $('#jdot').hidden = false;
    if (j === 'care-moss') drawTree();
  }
  let jFilter = 'All';
  function openJournal() {
    const J = $('#journal');
    const ids = Object.keys(S.JOURNAL);
    const have = st ? st.journal : [];
    const cats = ['All', 'History', 'Care', 'Design'];
    const list = ids.filter((k) => jFilter === 'All' || S.JOURNAL[k].cat === jFilter);
    const got = list.filter((k) => have.includes(k)), locked = list.length - got.length;
    J.innerHTML = `<div class="jbook" role="dialog" aria-modal="true" aria-label="Journal">
      <div class="jhead"><h2>Journal<small>${have.length} / ${ids.length} notes</small></h2><button class="jclose">Close ✕</button></div>
      <div class="jtabs">${cats.map((c) => `<button class="jtab${c === jFilter ? ' on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
      <div class="jlist">${got.map((k) => { const e = S.JOURNAL[k]; return `<div class="jentry"><div class="cat">${e.cat}</div><h4>${esc(e.title)}</h4>${esc(e.text)}</div>`; }).join('')}
      ${locked ? `<div class="jentry locked">${locked} more ${locked === 1 ? 'note' : 'notes'} to discover…</div>` : ''}</div></div>`;
    J.hidden = false;
    $('.jclose', J).onclick = closeJournal;
    J.onclick = (e) => { if (e.target === J) closeJournal(); };
    J.querySelectorAll('.jtab').forEach((b) => (b.onclick = () => { jFilter = b.dataset.c; openJournal(); }));
    $('#jdot').hidden = true;
    $('.jclose', J).focus({ preventScroll: true });
  }
  function closeJournal() { $('#journal').hidden = true; }

  // ---------- confirm ----------
  function confirmBox(msg, okLabel, onOk) {
    const c = $('#confirm');
    c.innerHTML = `<div class="cbox" role="alertdialog" aria-modal="true"><div>${esc(msg)}</div><div class="cbtns"><button class="btn-print c-no">Cancel</button><button class="btn-print red c-ok">${esc(okLabel)}</button></div></div>`;
    c.hidden = false;
    $('.c-no', c).onclick = () => (c.hidden = true);
    $('.c-ok', c).onclick = () => { c.hidden = true; onOk(); };
    $('.c-ok', c).focus();
  }

  // ---------- cards & captions ----------
  async function dayCard(d, id) {
    const dc = $('#daycard');
    const season = S.SEASON_LABEL[d - 1];
    let bg = '';
    if (era === 2) {
      let lines = '';
      for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2; lines += `M${f(800 + Math.cos(a) * 300)} ${f(450 + Math.sin(a) * 220)}L${f(800 + Math.cos(a) * 1300)} ${f(450 + Math.sin(a) * 1300)}`; }
      bg = `<svg class="daycard-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><path d="${lines}" stroke="#111" stroke-width="3"/></svg>`;
    }
    const inner = era === 1
      ? `<div class="dc"><div class="k">${KANJI[d - 1]}日目</div><div class="e"><b>Day ${d}</b><span>${season}</span></div></div>`
      : era === 2
        ? `<div class="dc"><div class="k">${KANJI[d - 1]}日目 · ${season}</div><div class="e"><b>DAY ${d}!</b></div></div>`
        : `<div class="dc"><div class="k">${KANJI[d - 1]}日目</div><div class="e"><b>Day ${d}</b><span>${season}</span></div></div>`;
    dc.innerHTML = bg + inner;
    dc.classList.add('on');
    await sleep(1700, id);
    dc.classList.remove('on');
    await sleep(350, id);
  }
  function caption(text) { const c = $('#caption'); c.textContent = text; c.classList.toggle('on', !!text); }
  function fade(on) { $('#fade').classList.toggle('on', on); }

  function chapterCard(e) {
    return new Promise((res) => {
      const E = S.ERAS[e];
      const c = $('#chapter');
      c.className = 'overlay c' + e;
      c.innerHTML = `<div class="art">${BD.art.chapterArt(e)}</div>
        <div class="inner"><div class="jp">${E.jp}</div><div class="num">CHAPTER ${E.num}</div><h2>${E.title}</h2>
        <div class="sub">${E.sub}</div><div class="style">Drawn as: ${E.style}</div><div class="tap">TAP TO CONTINUE</div></div>`;
      c.hidden = false;
      let ready = false;
      const go = () => { if (!ready) return; c.hidden = true; c.onclick = null; removeEventListener('keydown', key); res(); };
      const key = (ev) => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); go(); } };
      c.onclick = go;
      addEventListener('keydown', key);
      setTimeout(() => (ready = true), T(900));
    });
  }

  // ---------- particles (petals / motes) ----------
  const particles = (() => {
    const cv = $('#particles'), ctx = cv.getContext('2d');
    let mode = null, items = [], raf = 0, last = 0;
    const dpr = Math.min(2, devicePixelRatio || 1);
    function resize() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    function set(m) {
      mode = m; items = [];
      if (!m) { stop(); ctx.clearRect(0, 0, cv.width, cv.height); return; }
      resize();
      const n = m === 'motes' ? 40 : 14;
      for (let i = 0; i < n; i++) items.push(spawn(true));
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }
    function spawn(any) {
      const W = cv.width, H = cv.height;
      return mode === 'motes'
        ? { x: Math.random() * W, y: any ? Math.random() * H : H + 10, r: (1 + Math.random() * 2.6) * dpr, v: (8 + Math.random() * 18) * dpr, ph: Math.random() * 6 }
        : { x: Math.random() * W, y: any ? Math.random() * H : -10, r: (4 + Math.random() * 4) * dpr, v: (20 + Math.random() * 25) * dpr, ph: Math.random() * 6, rot: Math.random() * 6 };
    }
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        p.ph += dt;
        if (mode === 'motes') {
          p.y -= p.v * dt; p.x += Math.sin(p.ph * 0.8) * 10 * dt * dpr;
          const a = 0.35 + 0.35 * Math.sin(p.ph * 2);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, `rgba(255,250,215,${a})`); g.addColorStop(1, 'rgba(255,230,160,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 7); ctx.fill();
          if (p.y < -20) items[i] = spawn(false);
        } else {
          p.y += p.v * dt; p.x += Math.sin(p.ph) * 18 * dt * dpr + 10 * dt * dpr; p.rot += dt;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = '#f2b8c0'; ctx.strokeStyle = '#7a3a40'; ctx.lineWidth = 0.8 * dpr;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
          if (p.y > cv.height + 20) items[i] = spawn(false);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    return { set, stop, resize };
  })();
  function particleMode(d) {
    const e = eraOf(d);
    particles.set(e === 3 ? 'motes' : e === 1 && S.SEASONS[d - 1] === 'spring' ? 'petals' : null);
  }

  // ---------- hands-on: water ----------
  function soilTint(k) {
    const el = $('.soil', svg);
    if (!el) return;
    const dry = el.dataset.dry, wet = el.dataset.wet;
    el.setAttribute('fill', dry.startsWith('url') ? (k > 0.5 ? wet : dry) : mix(dry, wet, clamp(k, 0, 1)));
  }
  function panel(html) { const p = $('#activity'); p.innerHTML = html; p.hidden = false; hideDialogue(); return p; }

  async function water(act, id) {
    const [lo, hi] = act.zone;
    const P = panel(`<div class="prompt">${era === 2 ? 'POUR IT!' : 'Water the tree'}</div>
      <div class="hint" id="whint"></div>
      <div class="gauge" data-lo="${lo}" data-hi="${hi}"><div class="track"><div class="zone" style="left:${lo * 100}%;width:${(hi - lo) * 100}%"></div><div class="fill"></div></div>
      <span class="lbl" style="left:${((lo + hi) / 2) * 100}%">water reaches the roots</span></div>
      <button class="hold" aria-label="Hold to pour water">Hold to pour</button>`);
    const hint = $('#whint'), fill = $('.fill', P), btn = $('.hold', P), gauge = $('.gauge', P);
    const soilY = BD.scene.SILL_Y - lastPot.h;
    const fx = $('#fx', svg);

    if (act.tutorial) {
      btn.disabled = true;
      hint.textContent = 'First, touch the soil to feel if it is dry.';
      fx.innerHTML = `<g class="soil-hit"><ellipse class="ring" cx="500" cy="${soilY + 2}" rx="${lastPot.w * 0.42}" ry="16" fill="${era === 2 ? 'none' : 'rgba(255,220,120,.25)'}" stroke="${era === 2 ? '#111' : '#f0b030'}" stroke-width="4" stroke-dasharray="10 6"/>
        <ellipse cx="500" cy="${soilY}" rx="${lastPot.w * 0.5}" ry="40" fill="transparent"/></g>`;
      await new Promise((res) => ($('.soil-hit', fx).onclick = (e) => { e.stopPropagation(); res(); }));
      guard(id);
      fx.innerHTML = '';
      hint.textContent = 'Dry and pale on top, barely cool underneath. Time to water.';
      await sleep(1600, id);
      btn.disabled = false;
    }
    hint.textContent = 'Hold the button (or Space) to pour. Let go when the water reaches the green zone.';
    $('#canRest', svg).style.display = 'none';
    const pourX = 500 - Math.max(30, lastPot.w * 0.3);
    const canX = pourX - 122, canY = soilY - 92;
    const streamCol = era === 2 ? '#111' : era === 3 ? '#9ff0ff' : '#5f8fcf';
    fx.innerHTML = `<g id="pourCan" transform="translate(${canX} ${canY}) rotate(10)">${BD.scene.wateringCan(era)}</g>
      <path id="stream" d="M${f(pourX)} ${canY + 19} L${f(pourX)} ${soilY - 2}" stroke="${streamCol}" stroke-width="${era === 2 ? 3 : 4}" stroke-dasharray="${era === 2 ? '6 8' : '10 6'}" stroke-linecap="round" opacity="0" ${era === 3 ? 'filter="url(#glow)"' : ''}>
        <animate attributeName="stroke-dashoffset" from="0" to="-32" dur=".35s" repeatCount="indefinite"/></path>`;
    const can = $('#pourCan', fx), stream = $('#stream', fx);
    const drip = $('#dripG', svg);
    const dripCol = era === 2 ? '#111' : era === 3 ? '#9ff0ff' : '#5f8fcf';
    drip.innerHTML = [-0.22, 0.05, 0.25].map((x, i) => `<circle cx="${f(x * lastPot.w)}" cy="${lastPot.drip}" r="3" fill="${dripCol}" opacity="0"><animate attributeName="cy" values="${lastPot.drip};${lastPot.drip + 22}" dur=".9s" begin="${i * 0.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur=".9s" begin="${i * 0.3}s" repeatCount="indefinite"/></circle>`).join('');
    drip.style.display = 'none';

    let level = 0, holding = false, busy = false, done = false, tries = 0;
    const rate = 0.26; // fraction per second; slower inside the target zone so it is fair
    let rafId = 0, last = performance.now();
    const render = () => {
      fill.style.width = level * 100 + '%';
      gauge.dataset.level = level.toFixed(3);
      soilTint(level / hi);
      drip.style.display = level > lo * 0.92 ? '' : 'none';
      can.setAttribute('transform', `translate(${canX} ${canY}) rotate(${holding ? 45 : 10})`);
      stream.setAttribute('opacity', holding ? 0.9 : 0);
    };
    let resolveDone;
    const finished = new Promise((r) => (resolveDone = r));
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (id !== run) return;
      if (holding && !busy) {
        level = Math.min(1, level + dt * (level >= lo && level <= hi ? rate * 0.62 : rate));
        if (level >= 1) release();
      }
      render();
      if (!done) rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    function press(e) { if (e) e.preventDefault(); if (busy || done) return; holding = true; btn.classList.add('on'); }
    function release() {
      if (!holding) return;
      holding = false; btn.classList.remove('on');
      if (level < lo) {
        hint.textContent = level < lo * 0.5 ? 'Only the surface is wet. Keep pouring.' : 'Almost. The water hasn’t reached the bottom yet. Pour a little more.';
      } else if (level <= hi) {
        done = true;
        hint.textContent = era === 2 ? 'PERFECT! Water drips from the drainage holes.' : 'Water drips from the drainage holes. The roots are soaked.';
        resolveDone();
      } else {
        tries++;
        busy = true;
        hint.textContent = 'Too much at once! Water is spilling over the rim. Let it drain, then try again, a little gentler.';
        const from = level, t0 = performance.now();
        const drain = (now) => {
          const k = clamp((now - t0) / T(1500), 0, 1);
          level = from * (1 - k);
          if (k < 1) requestAnimationFrame(drain);
          else { busy = false; hint.textContent = 'Drained. Try again: hold, and let go in the green zone.'; }
        };
        requestAnimationFrame(drain);
      }
    }
    btn.addEventListener('pointerdown', press);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, release));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    holdMode = true;
    const kd = (e) => { if (e.code === 'Space' && !e.repeat && $('#journal').hidden) { press(e); } };
    const ku = (e) => { if (e.code === 'Space') release(); };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    try {
      await Promise.race([finished, new Promise((_, rej) => { const chk = setInterval(() => { if (id !== run) { clearInterval(chk); rej(new Abort()); } if (done) clearInterval(chk); }, 200); })]);
    } finally {
      holdMode = false;
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      cancelAnimationFrame(rafId);
    }
    btn.disabled = true;
    stream.setAttribute('opacity', 0);
    can.setAttribute('transform', `translate(${canX} ${canY}) rotate(10)`);
    await sleep(1600, id);
    fx.innerHTML = '';
    drip.style.display = 'none';
    $('#canRest', svg).style.display = '';
    st.waterTries += tries;
    return { tries };
  }

  // ---------- hands-on: prune ----------
  async function prune(act, id) {
    const sh = BD.tree.shoots(opts(), lastRender, act.n, st.day);
    if (!sh.length) return { cut: 0 };
    const label = (n) => `${era === 2 ? 'Snip the shoots!' : 'Tap the glowing shoots to prune them.'} (${n} / ${sh.length})`;
    const P = panel(`<div class="prompt">${era === 2 ? 'PRUNE!' : 'Prune the long shoots'}</div><div class="hint" id="phint">${label(0)}</div>
      <div class="hint" style="opacity:.8;font-size:14px">${{ pine: 'Black pine: pinch back the long candles.', maple: 'Maple: cut back to one or two pairs of leaves.', juniper: 'Juniper: cut inside the foliage with scissors, never shear it flat.' }[st.species]}</div>`);
    const sg = $('#shootsG', svg);
    sg.innerHTML = sh.map((s) => `<g class="shoot" data-id="${s.id}" role="button" aria-label="shoot">${s.svg}</g>`).join('');
    let cut = 0;
    await new Promise((res, rej) => {
      sg.querySelectorAll('.shoot').forEach((el, i) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (el.classList.contains('cut') || id !== run) return;
          el.classList.add('cut');
          snipFx(sh[i].x, sh[i].y);
          cut++;
          $('#phint').textContent = label(cut);
          if (cut >= sh.length) res();
        });
      });
      const chk = setInterval(() => { if (id !== run) { clearInterval(chk); rej(new Abort()); } if (cut >= sh.length) clearInterval(chk); }, 200);
    });
    guard(id);
    $('#phint').textContent = era === 2 ? 'CLEAN!' : 'Clean lines. Light can reach the inner branches now.';
    st.ramif += 1; st.pruned += cut;
    await sleep(1000, id);
    sg.innerHTML = '';
    drawTree(null, true);
    await sleep(900, id);
    return { cut };
  }
  function snipFx(x, y) {
    const sg = $('#shootsG', svg);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'snipfx');
    if (era === 2) g.innerHTML = `<g transform="translate(${f(x)} ${f(y - 14)}) rotate(-12)"><path d="M-38 -4 L-30 -18 L-14 -12 L-6 -26 L6 -14 L22 -22 L26 -8 L42 -6 L30 6 L36 18 L18 14 L8 26 L-2 12 L-18 20 L-20 6 L-36 8Z" fill="#fff" stroke="#111" stroke-width="2.5"/><text x="0" y="6" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="20" fill="#111">SNIP!</text></g>`;
    else if (era === 3) g.innerHTML = `<g transform="translate(${f(x)} ${f(y)})" filter="url(#glow)">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<path d="M${f(Math.cos(a) * 6)} ${f(Math.sin(a) * 6)}L${f(Math.cos(a) * 20)} ${f(Math.sin(a) * 20)}" stroke="#bffcff" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}<circle r="5" fill="#fff"/></g>`;
    else g.innerHTML = `<g transform="translate(${f(x)} ${f(y - 6)})"><rect x="-13" y="-13" width="26" height="26" rx="3" fill="#c23a28" transform="rotate(-6)"/><text x="0" y="6" text-anchor="middle" font-family="'Shippori Mincho',serif" font-size="16" font-weight="800" fill="#fbeedd">切</text></g>`;
    sg.appendChild(g);
    setTimeout(() => g.remove(), 950);
  }

  // ---------- hands-on: choice ----------
  async function choice(act, id) {
    const key = act.key;
    const P = panel(`<div class="prompt">${esc(act.prompt)}</div>
      <div class="hint choice-hint">Tap an option to preview it on your tree, then confirm.</div>
      <div class="options">${act.options.map((o) => `<button class="opt" data-id="${o.id}"><b>${esc(o.label)}</b><span class="jp">${esc(o.jp)}</span><span class="desc">${esc(o.desc)}</span></button>`).join('')}</div>
      <button class="confirm" disabled>Confirm</button>`);
    requestAnimationFrame(clearPanel);
    let sel = null;
    const preview = (v) => {
      const over = { [key]: v };
      if (key === 'style') { over.guide = true; over.wb = 1; }
      drawTree(over, false);
    };
    P.querySelectorAll('.opt').forEach((b) => (b.onclick = () => {
      sel = b.dataset.id;
      P.querySelectorAll('.opt').forEach((x) => x.classList.toggle('sel', x === b));
      $('.confirm', P).disabled = false;
      preview(sel);
    }));
    await new Promise((res, rej) => {
      $('.confirm', P).onclick = () => { if (sel) res(); };
      const chk = setInterval(() => { if (id !== run) { clearInterval(chk); rej(new Abort()); } }, 200);
      $('.confirm', P).addEventListener('click', () => clearInterval(chk));
    });
    guard(id);
    st.choices[key] = sel;
    save();
    drawTree(null, false);
    animPan(0);
    return { choice: sel };
  }

  // ---------- day loop ----------
  async function playDay() {
    const id = ++run;
    const d = st.day;
    pan = 0;
    const D = S.DAYS[d - 1];
    timeT = 0.04;
    setEra(eraOf(d));
    setT(0.04);
    hideDialogue();
    $('#activity').hidden = true;
    caption('');
    updateHud();
    drawTree();
    BD.scene.setOvercast(svg, era, !!D.overcast);
    particleMode(d);
    fade(false);
    await dayCard(d, id);
    for (let i = 0; i < D.intro.length; i++) {
      animT(Math.min(0.42, 0.06 + i * 0.045), 900, id);
      await say(D.intro[i], id);
    }
    animT(0.48, 1200, id);
    let res;
    if (D.act.type === 'water') res = await water(D.act, id);
    else if (D.act.type === 'prune') res = await prune(D.act, id);
    else res = await choice(D.act, id);
    guard(id);
    $('#activity').hidden = true;
    const after = D.after(st, res);
    for (const line of after) { animT(Math.min(0.62, timeT + 0.05), 900, id); await say(line, id); }
    hideDialogue();
    await passTime(d, id);
    guard(id);
    if (d === 15) { st.done = true; save(); fade(false); return epilogue(); }
    st.day = d + 1;
    save();
    if (eraOf(st.day) !== eraOf(d)) { await chapterCard(eraOf(st.day)); guard(id); }
    return playDay();
  }

  async function passTime(d, id) {
    caption(S.PASS[d - 1]);
    const g0 = gOf(d), g1 = d < 15 ? gOf(d + 1) : g0;
    const tA = animT(1, 3600, id);
    if (g1 > g0) {
      for (let i = 1; i <= 3; i++) {
        await sleep(1000, id);
        drawTree({ g: lerp(g0, g1, i / 3), season: i === 3 ? S.SEASONS[d] : S.SEASONS[d - 1] }, true);
      }
    }
    await tA;
    guard(id);
    await sleep(d === 15 ? 1500 : 700, id);
    caption('');
    fade(true);
    await sleep(1000, id);
  }

  function updateHud() {
    $('#daylabel').innerHTML = `Day ${st.day} <span style="opacity:.6">/ 15</span><small>${S.SEASON_LABEL[st.day - 1]} · ${BD.tree.SPECIES[st.species].name}</small>`;
  }

  function stopRun() {
    run++;
    advance = null;
    hideDialogue();
    $('#activity').hidden = true;
    caption('');
    fade(false);
    $('#daycard').classList.remove('on');
    $('#chapter').hidden = true;
    const fx = $('#fx', svg); if (fx) fx.innerHTML = '';
    const sg = $('#shootsG', svg); if (sg) sg.innerHTML = '';
    const cr = $('#canRest', svg); if (cr) cr.style.display = '';
  }

  async function startGame(isNew) {
    stopRun();
    show('game');
    era = 0; zoom = zoomFor(gOf(st.day));
    setEra(eraOf(st.day));
    setT(0.04);
    drawTree();
    updateHud();
    $('#jdot').hidden = true;
    await chapterCard(eraOf(st.day));
    playDay().catch((e) => { if (!(e instanceof Abort)) console.error(e); });
  }

  // ---------- epilogue ----------
  function epilogue() {
    stopRun();
    show('epilogue');
    setBodyEra(3);
    const sp = BD.tree.SPECIES[st.species];
    const base = { species: st.species, seed: st.seed, g: 1, style: st.choices.style || 'informal', sweep: st.choices.sweep, sun: st.choices.sun, season: 'late', ramif: st.ramif };
    const bgs = {
      1: `<rect x="-300" y="-470" width="600" height="640" fill="#efe3c6"/><rect x="-300" y="-470" width="600" height="120" fill="url(#bokashi-e)"/><circle cx="170" cy="-330" r="44" fill="#c23a28"/><rect x="-300" y="60" width="600" height="110" fill="#b08a5a"/><rect x="-300" y="-470" width="600" height="640" fill="#fff" filter="url(#paperfx)" opacity=".5"/>`,
      2: `<rect x="-300" y="-470" width="600" height="640" fill="#fff"/><rect x="-300" y="-470" width="600" height="200" fill="url(#tone-s)" opacity=".6"/><rect x="-300" y="60" width="600" height="110" fill="url(#hatch-w)"/><path d="M-300 60H300" stroke="#111" stroke-width="3"/>`,
      3: `<rect x="-300" y="-470" width="600" height="640" fill="url(#epi3)"/><circle cx="-160" cy="-320" r="120" fill="#fff" opacity=".12"/><rect x="-300" y="60" width="600" height="110" fill="#2a1f3a" opacity=".7"/>`,
    };
    const trip = [1, 2, 3].map((e) => {
      const t = BD.tree.render(Object.assign({}, base, { era: e }));
      const p = BD.tree.pot(st.choices.pot || 'rect', e);
      return `<figure class="p${e}"><svg viewBox="-300 -470 600 640" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="bokashi-e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22386a"/><stop offset="1" stop-color="#22386a" stop-opacity="0"/></linearGradient>
        <linearGradient id="epi3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2f8a"/><stop offset=".6" stop-color="#d86aa0"/><stop offset="1" stop-color="#ffb070"/></linearGradient></defs>
        ${bgs[e]}<g transform="translate(0 ${60 - p.h})">${p.defs}${p.soil}${t.svg}${BD.tree.moss(e, p.w, 1, st.seed)}${p.body}</g></svg>
        <figcaption>${['WOODBLOCK', 'INK', 'LIGHT'][e - 1]}</figcaption></figure>`;
    }).join('');
    const label = (opts, id) => (opts.find((o) => o.id === id) || { label: '—' }).label;
    const styleName = { formal: 'formal upright', informal: 'informal upright', windswept: 'windswept' }[st.choices.style] || 'young';
    const potName = (BD.tree.POTS[st.choices.pot] || { name: 'clay pot' }).name.toLowerCase();
    const total = Object.keys(S.JOURNAL).length;
    $('#epilogue').innerHTML = `<div class="wrap">
      <div class="jp">終章 · EPILOGUE</div>
      <h1>Many springs later</h1>
      <div class="trip">${trip}</div>
      <div class="epi-text">
        <p>Haruki-sensei still reads the soil each morning before he reads the newspaper. These days he mostly watches from the bench and lets Aoi do the cutting.</p>
        <p>Aoi kept the old white pine alive through its first winter in her care. Her bonsai manga, the one that started in a sketchbook on this windowsill, now has readers in countries she has never visited.</p>
        <p>Your ${sp.name.toLowerCase()} — ${styleName}, in its ${potName} — still sits by the window in Ōmiya when it is not out on the bench. It will very likely outlive everyone in this story. That was always the point.</p>
        <p>Three pictures of one tree: a woodblock print, a manga panel, a glowing screen. The way people draw bonsai keeps changing. The way you care for it hasn’t: look at the soil, water deeply, cut a little, and wait.</p>
      </div>
      <div class="stats">
        <div class="stat"><b>Tree</b><span>${sp.name}</span></div>
        <div class="stat"><b>Style</b><span>${label(BD.story.DAYS[3].act.options, st.choices.style)}</span></div>
        <div class="stat"><b>Pot</b><span>${label(BD.story.DAYS[6].act.options, st.choices.pot)}</span></div>
        <div class="stat"><b>Light</b><span>${label(BD.story.DAYS[1].act.options, st.choices.sun)}</span></div>
        <div class="stat"><b>Branches</b><span>${label(BD.story.DAYS[12].act.options, st.choices.sweep)}</span></div>
        <div class="stat"><b>Shoots pruned</b><span>${st.pruned}</span></div>
        <div class="stat"><b>Journal</b><span>${st.journal.length} / ${total} notes</span></div>
      </div>
      <div class="realtip"><b>Want to try it for real?</b> Start with a hardy young tree from a local nursery, keep it outdoors, and join a bonsai club near you. Water when the soil surface dries. Prune in small steps. Be patient. And forgive yourself if a tree dies: every keeper has lost one.</div>
      <div class="epi-btns"><button class="primary" id="epi-again">Grow another tree</button><button id="epi-journal">Read your journal</button><button id="epi-title">Title screen</button></div>
    </div>`;
    $('#epi-again').onclick = showSelect;
    $('#epi-journal').onclick = openJournal;
    $('#epi-title').onclick = () => { show('title'); setBodyEra(1); };
    $('#epilogue').scrollTop = 0;
  }

  // ---------- global wiring ----------
  $('#journal-btn').onclick = openJournal;
  $('#menu-btn').onclick = () => confirmBox(`Return to the tree selection? Your progress is saved. You will continue from the start of Day ${st.day}.`, 'Return to menu', () => { stopRun(); showSelect(); });
  $('#reset-save').onclick = () => confirmBox('Delete your saved tree? This cannot be undone.', 'Delete save', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } showSelect(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeJournal(); $('#confirm').hidden = true; return; }
    if ($('#game').hidden || !$('#journal').hidden || !$('#confirm').hidden) return;
    if ((e.key === 'j' || e.key === 'J') && st) { openJournal(); return; }
    if (!holdMode && (e.code === 'Space' || e.key === 'Enter') && !dlg.classList.contains('hide')) { e.preventDefault(); onAdvance(); }
  });

  function boot() {
    BD.defs.build();
    show('title');
    setBodyEra(1);
    initTitle();
  }
  BD.game = { boot, get state() { return st; } };
})();
