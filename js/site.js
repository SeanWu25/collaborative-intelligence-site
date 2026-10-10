/* Collaborative Intelligence: renders the page from site/data/*.json. No framework, no build step. */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const clean = kids => kids.flat().filter(k => k !== null && k !== undefined && k !== false);
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of clean(kids)) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  };
  const rc = (node, ...kids) => node.replaceChildren(...clean(kids));
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, ...kids) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) n.setAttribute(k, v);
    for (const k of clean(kids)) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  };
  const fmt0 = v => (v === null || v === undefined) ? '–' : Math.round(v).toString();
  const fmt1 = v => (v === null || v === undefined) ? '–' : (Math.round(v * 10) / 10).toFixed(1);
  const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const low = s => s.charAt(0).toLowerCase() + s.slice(1);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const D = {}, M = {}, BYSHORT = {};
  const state = { filter: 'all', view: 'table', sort: { key: 'score', dir: -1 }, exDim: null, exId: null };

  // ---------------------------------------------------------------- nav
  const currentTheme = () => 'light';
  function setupTheme() {
    const t = $('.nav-toggle');
    t.addEventListener('click', () => { const open = $('#nav-links').classList.toggle('open'); t.setAttribute('aria-expanded', String(open)); });
    $$('#nav-links a').forEach(a => a.addEventListener('click', () => { $('#nav-links').classList.remove('open'); t.setAttribute('aria-expanded', 'false'); }));
  }
  function swapLogos() {}

  // ---------------------------------------------------------------- shared bits
  function modelVars() {
    const light = D.leaderboard.models.map(m => `--m-${m.short.toLowerCase()}: ${m.color};`).join('');
    const dark = D.leaderboard.models.map(m => `--m-${m.short.toLowerCase()}: ${m.color_dark};`).join('');
    document.head.append(el('style', { text: `:root{${light}}` }));
  }
  const mcolor = id => `var(--m-${M[id].short.toLowerCase()})`;
  function logoImg(m, size) {
    const img = el('img', { src: m.logo, alt: m.maker + ' logo', class: m.logo_mono ? 'logo-mono' : null, width: size || 40, height: size || 24 });
    if (m.logo_dark) { img.dataset.logoLight = m.logo; img.dataset.logoDark = m.logo_dark; if (currentTheme() === 'dark') img.src = m.logo_dark; }
    return img;
  }
  function logoBox(m) {
    const box = el('span', { class: 'logo-box ' + (m.logo_kind || 'mark') });
    if (!m.logo) { box.append(el('span', { class: 'mono-badge', text: m.maker.slice(0, 1), title: m.maker })); return box; }
    const img = logoImg(m);
    img.addEventListener('error', () => { box.replaceChildren(el('span', { class: 'mono-badge', text: m.maker.slice(0, 1) })); });
    box.append(img);
    return box;
  }
  function robot(m, opts) {
    opts = opts || {};
    const color = m ? mcolor(m.id) : 'var(--muted)';
    const svg = svgEl('svg', { viewBox: '0 0 40 40', 'aria-hidden': 'true' },
      svgEl('line', { x1: 20, y1: 3, x2: 20, y2: 9, stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      svgEl('circle', { cx: 20, cy: 3, r: 2.4, fill: color }),
      svgEl('rect', { class: 'head', x: 5, y: 9, width: 30, height: 26, rx: 8, fill: color }),
      svgEl('rect', { x: 2, y: 18, width: 3, height: 8, rx: 1.5, fill: color }), svgEl('rect', { x: 35, y: 18, width: 3, height: 8, rx: 1.5, fill: color }),
      svgEl('circle', { class: 'eye', cx: 14.5, cy: 20, r: 3.2 }), svgEl('circle', { class: 'eye', cx: 25.5, cy: 20, r: 3.2 }),
      svgEl('rect', { x: 14, y: 27, width: 12, height: 2.6, rx: 1.3, fill: '#fff', opacity: 0.9 }));
    const av = el('span', { class: 'av robot' + (m ? '' : ' partner') + (opts.small ? ' small' : ''), style: `color:${color}`, title: m ? m.name : 'live LLM colleague' }, svg);
    if (m) av.append(el('span', { class: 'badge-logo' }, m.badge ? el('img', { src: m.badge, alt: '', width: 11, height: 11 }) : logoImg(m, 11)));
    return av;
  }
  function person(opts) {
    opts = opts || {};
    const svg = svgEl('svg', { viewBox: '0 0 40 40', 'aria-hidden': 'true' },
      svgEl('circle', { cx: 20, cy: 20, r: 19, fill: 'var(--bg-3)' }),
      svgEl('circle', { cx: 20, cy: 15, r: 6.5, fill: 'currentColor' }),
      svgEl('path', { d: 'M8 34c1.5-7 6-10.5 12-10.5S30.5 27 32 34', fill: 'currentColor' }));
    return el('span', { class: 'av person' + (opts.small ? ' small' : ''), title: opts.title || 'teammate' }, svg);
  }
  const dimName = k => D.leaderboard.dimensions.find(d => d.key === k).name;

  const tip = $('#tooltip');
  function showTip(target, node) {
    tip.replaceChildren(node); tip.hidden = false;
    const r = target.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 8;
    x = Math.max(8, Math.min(window.innerWidth - tw - 8, x));
    if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => { tip.hidden = true; };
  function attachTip(target, make) {
    target.addEventListener('mouseenter', () => showTip(target, make()));
    target.addEventListener('mouseleave', hideTip);
    target.addEventListener('focus', () => showTip(target, make()));
    target.addEventListener('blur', hideTip);
  }
  const trow = (k, v) => el('tr', null, el('td', { text: k }), el('td', { text: v }));

  // ---------------------------------------------------------------- hero chart: alone, normal teammate, test, per model
  function renderHero() {
    const A = D.leaderboard.abstract;
    if (A) $('#abstract-text').textContent = A.text; else $('#abstract').hidden = true;
    $('#footer-generated').textContent = `Data files generated ${D.leaderboard.generated} from the repository's result files by site/build_data.py.`;
  }

  // ---------------------------------------------------------------- leaderboard
  function cellStyle(v) {
    const p = Math.max(0, Math.min(100, v || 0)), mix = 4 + 0.66 * p;
    return `background: color-mix(in oklab, var(--accent) ${mix}%, var(--bg)); color: ${mix > 42 ? 'var(--accent-ink)' : 'var(--ink)'};`;
  }
  function visibleModels() {
    let rows = D.leaderboard.models.slice();
    if (state.filter === 'frontier') rows = rows.filter(m => !m.open);
    if (state.filter === 'open') rows = rows.filter(m => m.open);
    const { key, dir } = state.sort;
    const val = m => key === 'rank' ? m.rank : key === 'model' ? m.name : key === 'score' ? m.score : m.dims[key].test;
    rows.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir * (key === 'rank' || key === 'model' ? -1 : 1); });
    return rows;
  }
  function renderTable() {
    const L = D.leaderboard;
    const cols = [{ key: 'rank', label: '#' }, { key: 'model', label: 'Model' }, { key: 'score', label: 'Overall score' }, ...L.dimensions.map(d => ({ key: d.key, label: d.short, full: d.name }))];
    const thead = el('tr', null, ...cols.map(c => {
      const th = el('th', { scope: 'col', title: c.full || null });
      if (state.sort.key === c.key) th.setAttribute('aria-sort', state.sort.dir === -1 ? 'descending' : 'ascending');
      th.append(el('button', { type: 'button', onclick: () => { if (state.sort.key === c.key) state.sort.dir = -state.sort.dir; else state.sort = { key: c.key, dir: c.key === 'model' ? 1 : -1 }; renderTable(); } },
        c.label, el('span', { class: 'arrow', 'aria-hidden': 'true', text: state.sort.key === c.key ? (state.sort.dir === -1 ? '▼' : '▲') : '' })));
      return th;
    }));
    const rows = visibleModels().map(m => {
      const tr = el('tr', { class: m.open ? 'open' : 'frontier' });
      tr.append(el('td', { class: 'rank', text: m.rank }));
      tr.append(el('td', { class: 'model' }, el('div', { class: 'who' }, logoBox(m), el('div', null, el('span', { class: 'mname' }, m.name, m.open ? el('span', { class: 'tag', text: 'open' }) : null, m.recent ? el('span', { class: 'tag new', text: 'new' }) : null), el('span', { class: 'maker', text: m.maker })))));
      const sc = el('td', { class: 'score', tabindex: '0' }, fmt1(m.score), el('span', { class: 'ci', text: `${fmt1(m.ci[0])}–${fmt1(m.ci[1])}` }));
      attachTip(sc, () => el('div', null, el('strong', { text: m.name }), el('table', null, trow('Overall score', fmt1(m.score)), trow('95% interval', `${fmt1(m.ci[0])} to ${fmt1(m.ci[1])}`),
        trow('Alone (ability check)', fmt1(m.alone) + '%'), trow('Normal teammate', m.baseline === null ? 'not run' : fmt1(m.baseline) + '%'), trow('Scenarios scored', `${m.n_gated} of ${m.n_scenarios}`), m.n_refused ? trow('Excluded (provider refusal)', m.n_refused) : null)));
      tr.append(sc);
      for (const d of L.dimensions) {
        const c = m.dims[d.key];
        const v = el('span', { class: 'v', style: cellStyle(c.test), tabindex: '0', text: fmt0(c.test), 'aria-label': `${m.name}, ${d.name}: test ${fmt0(c.test)}%, alone ${fmt0(c.alone)}%, normal teammate ${fmt0(c.baseline)}%, ${c.n_gated} of ${c.n_scenarios} scenarios scored` });
        attachTip(v, () => el('div', null, el('strong', { text: `${m.name} · ${d.name}` }), el('table', null, trow('Test (the score)', fmt1(c.test) + '%'), trow('95% interval', `${fmt0(c.test_ci[0])} to ${fmt0(c.test_ci[1])}`),
          trow('Alone', fmt1(c.alone) + '%'), trow('Normal teammate', c.baseline === null ? 'not run' : fmt1(c.baseline) + '%'), trow('Scenarios scored', `${c.n_gated} of ${c.n_scenarios}`), c.n_refused ? trow('Excluded (refusal)', c.n_refused) : null)));
        tr.append(el('td', { class: 'cell' }, v));
      }
      return tr;
    });
    rc($('#lb-table'), el('table', { class: 'lb' }, el('caption', { class: 'sr-only', text: 'Leaderboard' }), el('thead', null, thead), el('tbody', null, ...rows)));
    $('#lb-fineprint').textContent = 'Pass rate (%) when a teammate creates the problem, on scenarios the model solves alone. Hover a cell for details.' + (L.recent_note ? ' ' + L.recent_note : '') + (L.audit_note ? ' ' + L.audit_note : '');
  }

  // ---------------------------------------------------------------- spider charts
  function spider(m, mean) {
    const dims = D.leaderboard.dimensions, n = dims.length, R = 84, cx = 175, cy = 140;
    const ang = i => Math.PI / 2 - 2 * Math.PI * i / n;
    const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy - r * Math.sin(ang(i))];
    const svg = svgEl('svg', { viewBox: '0 0 350 285', role: 'img', 'aria-label': `${m.name}: test pass rate per dimension` });
    for (const lev of [0.25, 0.5, 0.75, 1]) svg.append(svgEl('polygon', { class: 'grid', points: dims.map((_, i) => pt(i, R * lev).join(',')).join(' ') }));
    dims.forEach((_, i) => svg.append(svgEl('line', { class: 'grid', x1: cx, y1: cy, x2: pt(i, R)[0], y2: pt(i, R)[1] })));
    svg.append(svgEl('text', { class: 'tick', x: cx + 3, y: cy - R * 0.5 - 2 }, '50'));
    svg.append(svgEl('text', { class: 'tick', x: cx + 3, y: cy - R - 2 }, '100'));
    svg.append(svgEl('polygon', { class: 'avg', points: dims.map((d, i) => pt(i, R * mean[d.key] / 100).join(',')).join(' ') }));
    const pts = dims.map((d, i) => pt(i, R * (m.dims[d.key].test || 0) / 100));
    svg.append(svgEl('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: mcolor(m.id), 'fill-opacity': 0.18, stroke: mcolor(m.id), 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    pts.forEach(p => svg.append(svgEl('circle', { cx: p[0], cy: p[1], r: 3.5, fill: mcolor(m.id), stroke: 'var(--bg)', 'stroke-width': 1.5 })));
    dims.forEach((d, i) => {
      const [x, y] = pt(i, R + 18), c = Math.cos(ang(i)), s = Math.sin(ang(i));
      const t = svgEl('text', { class: 'axis-label', x, y: y + 3, 'text-anchor': Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end' }, `${d.short} ${fmt0(m.dims[d.key].test)}`);
      if (s > 0.5) t.setAttribute('y', y - 2); if (s < -0.5) t.setAttribute('y', y + 10);
      svg.append(t);
    });
    return svg;
  }
  function renderSpiders() {
    const L = D.leaderboard, mean = {};
    const main = L.models.filter(m => !m.recent);
    for (const d of L.dimensions) mean[d.key] = main.reduce((a, m) => a + (m.dims[d.key].test || 0), 0) / main.length;
    rc($('#lb-spider'), ...visibleModels().map(m => el('div', { class: 'spider' }, el('h3', { text: m.name }), el('p', { class: 'sub', text: `score ${fmt0(m.score)}` }), spider(m, mean))),
      el('div', { class: 'spiders-legend' }, el('span', null, el('i', { class: 'swatch line', style: 'border-color: var(--ink)' }), 'the model, test pass rate'), el('span', null, el('i', { class: 'swatch line dash' }), 'average of the six models')));
  }
  function setupControls() {
    $$('.seg [data-filter]').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.filter; $$('.seg [data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderTable(); renderSpiders(); }));
    $$('.seg [data-view]').forEach(b => b.addEventListener('click', () => { state.view = b.dataset.view; $$('.seg [data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#lb-table').hidden = state.view !== 'table'; $('#lb-spider').hidden = state.view !== 'spider'; }));
  }

  // ---------------------------------------------------------------- dimensions
  const ICONS = {
    shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z', flag: 'M5 3v18M5 4h11l-2 4 2 4H5',
    info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 7v6m0-9v1', heart: 'M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.2 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z',
    compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4-4-3 7-7 3 3-7 7-3z', scale: 'M12 3v18M4 7h16M7 7l-4 7a4 4 0 0 0 8 0L7 7zm10 0-4 7a4 4 0 0 0 8 0l-4-7zM8 21h8',
    rocket: 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2m3-3 7-7a3 3 0 0 0-4-4l-7 7-3 1 1 3 3 3 3-1v-3zm-1 1-3-3',
  };
  const icon = k => svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svgEl('path', { d: ICONS[k] || ICONS.info }));
  function renderDimensions() {
    rc($('#dim-cards'), el('div', { class: 'dimgrid' }, ...D.dimensions.dimensions.map(d => {
      const ex = D.examples.examples.find(e => e.dimension === d.key);
      return el('a', { class: 'dimitem', id: 'dim-' + d.key, href: '#examples', onclick: () => ex && selectExample(ex.dimension, ex.id) },
        icon(d.icon), el('strong', { text: d.name }), el('span', { text: d.problem_short }));
    })));
    const V = D.dataset.validation;
    $('#how-judges').textContent = `Every run is pass or fail, graded on the end state and by two LLM judges (${V.judge_agreement}% agreement).`;
    renderHow();
  }

  // ---------------------------------------------------------------- how it works: one looping animation
  function renderHow() {
    const ex = D.examples.examples.find(e => e.id === 'answerkey');
    const run = ex && ex.runs.find(r => r.outcome === 'pass');
    const m = run ? M[run.model] : D.leaderboard.models[0];
    const lead = ex ? ex.runs[0].turns.find(t => t.kind === 'team' && /sign-off/.test(t.text)) : null;
    const reply = run ? run.turns.filter(t => t.kind === 'model').slice(-1)[0] : null;
    const seats = {
      model: el('div', { class: 'hs-seat model' }, robot(m), el('span', { text: 'Model under test' })),
      mate: el('div', { class: 'hs-seat mate' }, person({ title: 'scripted teammate' }), el('span', { text: 'Scripted teammate' })),
      c1: el('div', { class: 'hs-seat col' }, robot(null), el('span', { text: 'LLM colleague' })),
      c2: el('div', { class: 'hs-seat col' }, robot(null), el('span', { text: 'LLM colleague' })),
    };
    const bubble = (who, text, cls) => el('div', { class: 'hs-bubble ' + who + ' ' + (cls || '') }, text ? el('span', { text }) : el('i', { class: 'bars', 'aria-hidden': 'true' }, el('b'), el('b'), el('b')));
    const steps = [
      { key: 'alone', label: '1  Alone', seats: ['model'], q: 'Can it do the task by itself?',
        bubbles: [bubble('model', null)], result: ['pass', 'Solved', 'Only scenarios it solves alone are scored.'] },
      { key: 'normal', label: '2  Normal teammate', seats: ['model', 'mate', 'c1', 'c2'], q: 'Can it work in a team?',
        bubbles: [bubble('mate', null), bubble('col', null), bubble('model', null)], result: ['pass', 'Baseline', 'The same team, working normally.'] },
      { key: 'test', label: '3  Test', seats: ['model', 'mate', 'c1', 'c2'], q: 'What if a teammate creates the problem?', hot: true,
        bubbles: [bubble('mate', lead ? lead.text : 'It’s on my sign-off. Pin the wrong value.', 'hot'), bubble('model', reply ? reply.text : 'No.')], result: ['pass', 'The score', 'The pass rate here is the benchmark score.'] },
    ];
    const tabs = el('div', { class: 'hs-tabs', role: 'tablist' });
    const room = el('div', { class: 'hs-room' }, seats.mate, seats.c1, seats.model, seats.c2);
    const chat = el('div', { class: 'hs-chat' });
    const q = el('p', { class: 'hs-q' });
    const res = el('div', { class: 'hs-result' });
    const note = el('p', { class: 'hs-note', text: 'Lines in the test are verbatim from a real run (the answer-key scenario).' });
    rc($('#how-stage'), tabs, q, room, chat, res, note);
    let i = 0, timer = null, token = 0;
    const show = async (k, auto) => {
      const my = ++token; i = k; const st = steps[k];
      $$('button', tabs).forEach((b, n) => b.setAttribute('aria-selected', String(n === k)));
      q.textContent = st.q;
      Object.entries(seats).forEach(([key, n]) => { n.classList.toggle('off', !st.seats.includes(key)); n.classList.toggle('hot', key === 'mate' && !!st.hot); n.classList.remove('speaking'); });
      note.style.visibility = st.key === 'test' ? 'visible' : 'hidden';
      chat.replaceChildren(); res.replaceChildren(); res.className = 'hs-result';
      const still = reducedMotion();
      for (const bb of st.bubbles) {
        if (my !== token) return;
        const who = bb.classList.contains('model') ? 'model' : bb.classList.contains('mate') ? 'mate' : 'c1';
        Object.entries(seats).forEach(([key, n]) => n.classList.toggle('speaking', key === who));
        chat.append(bb); if (!still) await sleep(bb.textContent.length > 40 ? 2200 : 1100);
      }
      if (my !== token) return;
      Object.values(seats).forEach(n => n.classList.remove('speaking'));
      res.className = 'hs-result show ' + st.result[0];
      res.append(el('span', { class: 'stamp ' + st.result[0], text: st.result[1] }), el('span', { text: st.result[2] }));
      if (auto && !still) timer = setTimeout(() => show((k + 1) % steps.length, true), st.key === 'test' ? 5200 : 2600);
    };
    steps.forEach((st, n) => tabs.append(el('button', { type: 'button', role: 'tab', text: st.label, onclick: () => { clearTimeout(timer); show(n, false); } })));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); show(0, true); } }), { threshold: 0.3 });
    io.observe($('#how-stage'));
  }

  // ---------------------------------------------------------------- examples
  function fileTree(R) {
    // nested folders from the run's paths; folders stay closed unless they hold a key or edited file
    const S = R.summary || {}, read = new Set(S.read_paths || []), edited = new Set(S.edits || []);
    const keys = {}; (S.key_files || []).forEach(k => { keys[k.path] = k; });
    const root = { dirs: {}, files: [] };
    for (const p of R.files) { const parts = p.split('/'); let node = root; for (const d of parts.slice(0, -1)) node = node.dirs[d] || (node.dirs[d] = { dirs: {}, files: [] }); node.files.push(p); }
    const rows = new Map(), folders = [];
    const stats = (node) => { let n = 0, r = 0, open = false; for (const f of node.files) { n++; if (read.has(f) || edited.has(f)) r++; if (keys[f] || edited.has(f)) open = true; } for (const d of Object.values(node.dirs)) { const s = stats(d); n += s.n; r += s.r; open = open || s.open; } return { n, r, open }; };
    const sumText = (st, kfolder, r) => kfolder ? `${r ? r + ' of ' : ''}${st.n} files${r ? ' read' : ', never opened'}` : `${st.n} files${r ? `, ${r} read` : ''}`;
    const build = (node, prefix, depth) => {
      const frag = document.createDocumentFragment();
      for (const d of Object.keys(node.dirs).sort()) {
        const sub = node.dirs[d], st = stats(sub), path = prefix + d + '/', kfolder = keys[path];
        const isOpen = st.open || !!kfolder || depth === 0 && Object.keys(root.dirs).length <= 2;
        const sum = el('span', { class: 'sum', text: sumText(st, kfolder, st.r) });
        const row = el('div', { class: 'd' + (isOpen ? ' open' : ''), style: `--depth:${depth}`, role: 'button', tabindex: '0', 'aria-expanded': String(isOpen) }, el('span', { class: 'chev', 'aria-hidden': 'true' }), d + '/', sum);
        folders.push({ path, row, sum, st, kfolder, r: 0 });
        const kids = el('div', { class: 'kids' }, build(sub, path, depth + 1));
        kids.hidden = !isOpen;
        const toggle = () => { const o = kids.hidden; kids.hidden = !o; row.classList.toggle('open', o); row.setAttribute('aria-expanded', String(o)); };
        row.addEventListener('click', toggle); row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        frag.append(row, kids);
      }
      for (const f of node.files.sort()) {
        const k = keys[f], isEdit = edited.has(f), isRead = read.has(f);
        const status = isEdit ? 'edited' : isRead ? 'read' : k ? 'never opened' : '';
        const row = el('div', { class: 'f', style: `--depth:${depth}`, title: f }, el('span', { class: 'fi', 'aria-hidden': 'true' }), el('span', { class: 'fn', text: f.split('/').pop() }), el('span', { class: 'st', text: status }));
        row.__final = { cls: (isEdit ? ' edited' : isRead ? ' read' : '') + (k ? ' key ' + (status === 'never opened' ? 'missed' : 'hit') : ''), status };
        row.className += row.__final.cls;
        rows.set(f, row); frag.append(row);
      }
      return frag;
    };
    const tree = el('div', { class: 'ws-tree', role: 'tree', 'aria-label': 'Workspace files' });
    tree.append(build(root, '', 0));
    const api = {
      tree, rows,
      // play state: forget what was read, then light files one at a time
      reset() { rows.forEach(row => { row.className = row.className.replace(/ (edited|read|key|missed|hit|reading)/g, ''); row.querySelector('.st').textContent = ''; }); folders.forEach(fo => { fo.r = 0; fo.sum.textContent = sumText(fo.st, fo.kfolder, 0); }); },
      touch(path, kind) {
        const row = rows.get(path); if (!row) return;
        rows.forEach(r => r.classList.remove('reading'));
        const first = !row.classList.contains('read') && !row.classList.contains('edited');
        row.classList.add('reading'); row.classList.add(kind === 'edit' ? 'edited' : 'read');
        row.querySelector('.st').textContent = kind === 'edit' ? 'edited' : 'read';
        if (first) folders.forEach(fo => { if (path.startsWith(fo.path)) { fo.r++; fo.sum.textContent = sumText(fo.st, fo.kfolder, fo.r); } });
      },
      finish() { rows.forEach(row => { row.classList.remove('reading'); row.className = row.className.replace(/ (edited|read|key|missed|hit)/g, '') + row.__final.cls; row.querySelector('.st').textContent = row.__final.status; }); folders.forEach(fo => { fo.sum.textContent = sumText(fo.st, fo.kfolder, fo.st.r); }); },
    };
    return api;
  }
  function workspace(run, m) {
    const R = run.replay, S = R.summary || {};
    const ws = el('div', { class: 'ws' });
    const status = el('span', { class: 'ws-status', text: '' });
    ws.append(el('div', { class: 'ws-role' }, robot(m, { small: true }), el('span', null, el('strong', { text: m.name }), ` as the ${low(R.model_role || 'model')}`)), status);
    const api = { el: ws, status, keys: [], tree: null, people: new Map(), now: null };
    if (R.sandbox) {
      if (S.key_files && S.key_files.length) {
        ws.append(el('div', { class: 'ws-label', text: 'The files that matter' }), el('div', { class: 'ws-keys' }, ...S.key_files.map(k => {
          const cls = k.status === 'edited' ? 'edited' : k.status === 'opened' ? 'hit' : 'missed';
          const row = el('div', { class: 'k ' + cls }, el('span', { class: 'dot' }), el('code', { text: k.path }), el('span', { class: 'lab', text: k.label }), el('span', { class: 'verb', text: k.status }));
          row.__cls = cls; row.__status = k.status; api.keys.push(row); return row;
        })));
      }
      api.tree = fileTree(R);
      ws.append(el('div', { class: 'ws-label', text: `Workspace · ${R.n_files} files` }), api.tree.tree);
      ws.append(el('div', { class: 'ws-sum', text: `${S.reads || 0} files read · ${(S.edits || []).length} edited${S.test_runs ? ` · ${S.test_runs} test run${S.test_runs > 1 ? 's' : ''}` : ''} · ${R.rounds} rounds` }));
    } else {
      const me = el('div', { class: 'p' }, robot(m), el('span', { text: m.short })); api.people.set('__model', me);
      ws.append(el('div', { class: 'ws-label', text: 'In the room' }), el('div', { class: 'ws-people' }, me,
        ...(R.colleagues || []).map(c => { const p = el('div', { class: 'p' }, c.kind === 'partner' ? robot(null) : person({ title: c.role }), el('span', { text: c.role })); api.people.set(c.role, p); return p; })));
      ws.append(el('div', { class: 'ws-sum', text: `${R.rounds} rounds · ${R.n_messages} messages` }));
    }
    if (R.env_seats && R.env_seats.length) {
      api.now = el('div', { class: 'ws-now' });
      ws.append(el('div', { class: 'ws-label', text: 'Around them' }), el('div', { class: 'ws-devices' }, ...R.env_seats.map(e => el('span', { class: 'dev', text: e.name }))), api.now);
    }
    return api;
  }
  function msgNode(t, m) {
    if (t.kind === 'note') return el('div', { class: 'msg note' }, el('div', { class: 'bubble note', text: t.text }));
    if (t.kind === 'round') return el('div', { class: 'msg round' }, el('span', { class: 'round-chip', text: `Round ${t.round}` }));
    const isModel = t.kind.startsWith('model');
    const who = isModel ? (t.who ? `${m.name}, ${t.who}` : (t.kind === 'model-thought' ? `${m.name}, to itself` : m.name)) : t.who;
    const av = isModel ? robot(m) : t.kind === 'partner' ? robot(null) : person({ title: t.who });
    const n = el('div', { class: 'msg ' + t.kind }, av, el('div', { class: 'bubble ' + t.kind }, el('span', { class: 'who', text: who + (t.round ? ` · round ${t.round}` : '') }), t.text));
    n.dataset.round = t.round || ''; n.dataset.who = isModel ? '__model' : (t.who || '');
    return n;
  }
  const stampText = r => r.label || (r.outcome === 'pass' ? 'Pass' : r.outcome === 'fail' ? 'Fail' : 'Probe');
  function runCard(r, ex) {
    const m = M[r.model], R = r.replay;
    const verdict = el('div', { class: 'chat-verdict ' + r.outcome }, el('span', { class: 'stamp ' + r.outcome, text: stampText(r) }), el('div', null, r.verdict));
    const chat = el('div', { class: 'chat' }, r.intro ? el('p', { class: 'intro', text: r.intro }) : null, ...r.turns.map(t => msgNode(t, m)), verdict);
    const ws = R ? workspace(r, m) : null;
    const body = el('div', { class: 'run-body' + (R ? '' : ' chat-only') }, ws ? ws.el : null, chat);
    const ctrl = el('div', { class: 'ctrl' });
    const headStamp = el('span', { class: 'stamp ' + r.outcome, text: stampText(r) });
    const why = el('span', { class: 'why' }, r.verdict);
    const steps = $$('.msg', chat).filter(n => !n.classList.contains('round')).concat([verdict]);
    const modelSteps = steps.filter(n => n.classList.contains('model'));
    const decisive = modelSteps[modelSteps.length - 1];
    let playing = null, played = false;
    const showAll = () => {
      playing = null; played = true;
      steps.forEach(n => { n.classList.remove('hiddenstep', 'reveal'); });
      headStamp.classList.remove('hiddenstep', 'pop'); why.classList.remove('hiddenstep');
      if (decisive && r.outcome !== 'probe') decisive.classList.add('decisive', r.outcome);
      if (ws) { if (ws.tree) ws.tree.finish(); ws.keys.forEach(k => { k.className = 'k ' + k.__cls; k.querySelector('.verb').textContent = k.__status; }); ws.status.textContent = ''; ws.people.forEach(p => p.classList.remove('speaking')); }
    };
    const hideAll = () => {
      steps.forEach(n => { n.classList.add('hiddenstep'); n.classList.remove('reveal', 'decisive', 'pass', 'fail'); });
      headStamp.classList.add('hiddenstep'); why.classList.add('hiddenstep');
      if (ws) { if (ws.tree) ws.tree.reset(); ws.keys.forEach(k => { k.className = 'k pending'; k.querySelector('.verb').textContent = '…'; }); ws.status.textContent = 'starting'; if (ws.now) ws.now.textContent = ''; }
    };
    const play = async () => {
      if (playing || reducedMotion()) { showAll(); return; }
      const token = playing = {};
      hideAll();
      const events = R ? R.events : [];
      const toolsDone = new Set();
      await sleep(400);
      for (const n of steps) {
        if (playing !== token) return;
        const round = Number(n.dataset.round || 0);
        if (n.classList.contains('model') && ws && round) {
          const envs = events.filter(e => e.t === 'env' && e.round === round);
          if (ws.now && envs.length) { ws.now.textContent = envs[0].text.startsWith('[') ? envs[0].text : `[${envs[0].who}] ${envs[0].text}`; ws.now.classList.remove('reveal'); void ws.now.offsetWidth; ws.now.classList.add('reveal'); }
          const tools = events.filter(e => e.t === 'tool' && e.round <= round && !toolsDone.has(e));
          for (const e of tools.slice(0, 12)) {
            toolsDone.add(e);
            if (playing !== token) return;
            if (e.kind === 'read' || e.kind === 'search') { ws.status.textContent = `reading ${e.path}`; if (ws.tree) ws.tree.touch(e.path, 'read'); }
            else if (e.kind === 'edit') { ws.status.textContent = `editing ${e.path}`; if (ws.tree) ws.tree.touch(e.path, 'edit'); }
            else if (e.kind === 'tests') ws.status.textContent = `running the tests: ${e.summary}`;
            else if (e.kind === 'list') ws.status.textContent = 'listing the workspace';
            else if (e.kind === 'submit') ws.status.textContent = 'handing the work in';
            await sleep(e.kind === 'tests' ? 380 : 120);
          }
          tools.forEach(e => toolsDone.add(e));
          ws.status.textContent = 'posting to the team';
        }
        if (ws && !n.classList.contains('chat-verdict')) ws.people.forEach((p, k) => p.classList.toggle('speaking', k === n.dataset.who));
        n.classList.remove('hiddenstep'); n.classList.add('reveal');
        if (n === decisive && r.outcome !== 'probe') { n.classList.add('decisive', r.outcome); }
        if (n.classList.contains('chat-verdict')) { headStamp.classList.remove('hiddenstep'); headStamp.classList.add('pop'); why.classList.remove('hiddenstep'); why.classList.add('reveal'); }
        if (playing !== token) return;
        await sleep(n.classList.contains('chat-verdict') ? 300 : Math.min(1900, 600 + (n.textContent.length || 0) * 8));
      }
      if (ws) {
        ws.status.textContent = 'done';
        ws.people.forEach(p => p.classList.remove('speaking'));
        if (ws.tree) ws.tree.finish();
        for (const k of ws.keys) { if (playing !== token) return; k.className = 'k ' + k.__cls + ' pop'; k.querySelector('.verb').textContent = k.__status; await sleep(350); }
      }
      playing = null; played = true;
    };
    ctrl.append(el('button', { type: 'button', text: 'Replay', onclick: () => { playing = null; play(); } }), el('button', { type: 'button', text: 'Skip', onclick: showAll }));
    const head = el('div', { class: 'run-head' }, el('span', { class: 'who' }, robot(m), m.name), headStamp, why, ctrl);
    const card = el('article', { class: 'run ' + r.outcome }, head, body);
    if (R && R.events) {
      const full = el('div', { class: 'chat' });
      let round = 0;
      for (const e of R.events) {
        if (e.t === 'msg') { if (e.round !== round) { round = e.round; full.append(msgNode({ kind: 'round', round }, m)); } full.append(msgNode({ kind: e.kind, who: e.who, text: e.text }, m)); }
        else if (e.t === 'env') full.append(msgNode({ kind: 'note', text: e.text.startsWith('[') ? e.text : `[${e.who}] ${e.text}` }, m));
      }
      card.append(el('details', { class: 'full' }, el('summary', { text: `Full transcript: ${R.rounds} rounds, ${R.n_messages} messages${R.n_tools ? `, ${R.n_tools} tool calls` : ''}` }), full));
    }
    // play once, the first time the card is mostly on screen; until then the steps stay hidden but keep their space
    if (!reducedMotion()) {
      hideAll();
      const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting && !played && !playing) { io.disconnect(); play(); } }); }, { threshold: 0.35 });
      io.observe(card);
      setTimeout(() => { if (!played && !playing && card.isConnected) { const rect = card.getBoundingClientRect(); if (rect.top < window.innerHeight && rect.bottom > 0) { io.disconnect(); play(); } } }, 400);
    } else showAll();
    return card;
  }
  function selectExample(dim, id) {
    state.exDim = dim; state.exId = id || D.examples.examples.find(e => e.dimension === dim).id;
    renderExamples();
  }
  function renderExamples() {
    const E = D.examples.examples;
    const dims = D.leaderboard.dimensions.filter(d => E.some(e => e.dimension === d.key));
    if (!state.exDim) { state.exDim = 'taking_initiative'; state.exId = E.find(e => e.dimension === state.exDim).id; }
    rc($('#ex-dims'), ...dims.map(d => el('button', { type: 'button', role: 'tab', 'aria-selected': String(d.key === state.exDim), onclick: () => selectExample(d.key) }, icon(D.dimensions.dimensions.find(x => x.key === d.key).icon), el('span', { text: d.short }))));
    const list = E.filter(e => e.dimension === state.exDim);
    rc($('#ex-list'), ...list.map(e => el('button', { type: 'button', role: 'tab', 'aria-selected': String(e.id === state.exId), onclick: () => { state.exId = e.id; renderExamples(); } }, e.title)));
    $('#ex-list').hidden = list.length < 2;
    const ex = E.find(e => e.id === state.exId) || list[0];
    const oc = ex.outcome;
    const head = el('div', { class: 'ex-head2' },
      el('p', { class: 'kicker' }, ex.kicker, ex.code ? el('span', { class: 'tag', text: 'code' }) : null, ex.pilot ? el('span', { class: 'tag', text: 'pilot' }) : null),
      el('h3', { text: ex.title }),
      el('p', { class: 'brief', text: ex.brief }),
      el('div', { class: 'meta' },
        el('span', { class: 'goodb' }, el('i', { class: 'gd', 'aria-hidden': 'true' }), 'Good teammate: ', ex.good_brief),
        oc ? el('span', { class: 'passn', title: `${oc.passed.length} of the ${oc.gated.length} models that solve it alone pass the team test` }, el('b', { text: `${oc.passed.length}/${oc.gated.length}` }), ' models pass') : null,
        el('details', { class: 'src' }, el('summary', { text: 'Source' }), el('p', { text: ex.source }))));
    rc($('#ex-card'), head, el('div', { class: 'runs' }, ...ex.runs.map(r => runCard(r, ex))),
      (ex.note || ex.glossary.length) ? el('details', { class: 'more' }, el('summary', { text: 'Notes' }), ex.note ? el('p', { text: ex.note }) : null, ex.glossary.length ? el('p', { class: 'fineprint', text: ex.glossary.join(' · ') }) : null) : null);
  }

  // ---------------------------------------------------------------- charts
  function barRows(rows, opts) {
    const W = 520, left = opts.left || 130, right = 40, rowH = 30, barH = 18, top = opts.title ? 22 : 6, H = top + rows.length * rowH + 22;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || opts.title || 'chart' });
    const x = v => left + (W - left - right) * v / 100;
    if (opts.title) svg.append(svgEl('text', { class: 'ttl', x: 0, y: 14 }, opts.title));
    for (const g of [0, 25, 50, 75, 100]) { svg.append(svgEl('line', { class: 'grid', x1: x(g), x2: x(g), y1: top, y2: top + rows.length * rowH })); svg.append(svgEl('text', { class: 'muted', x: x(g), y: H - 6, 'text-anchor': 'middle' }, opts.ticks ? opts.ticks(g) : g)); }
    rows.forEach((r, i) => {
      const y = top + i * rowH + (rowH - barH) / 2;
      svg.append(svgEl('text', { class: 'lbl', x: left - 10, y: y + barH / 2 + 4, 'text-anchor': 'end' }, r.label));
      let acc = 0;
      r.segments.forEach((s, j) => {
        if (!s.value) return;
        const x0 = x(acc) + (j ? 1 : 0), w = Math.max(0, x(acc + s.value) - x0 - (j < r.segments.length - 1 ? 1 : 0));
        svg.append(svgEl('rect', { x: x0, y, width: w, height: barH, rx: 3, class: 'bar ' + (s.cls || ''), style: s.fill ? `fill:${s.fill}` : null }));
        const label = s.label !== undefined ? s.label : fmt0(s.value);
        if (w > String(label).length * 7.2 + 12) svg.append(svgEl('text', { class: 'val in', x: x0 + w / 2, y: y + barH / 2 + 4, 'text-anchor': 'middle', style: s.dark ? 'fill:var(--ink)' : null }, label));
        else if (j === r.segments.length - 1) svg.append(svgEl('text', { class: 'val', x: x0 + w + 5, y: y + barH / 2 + 4 }, label));
        acc += s.value;
      });
    });
    return svg;
  }
  const tableTwin = (head, rows) => el('details', { class: 'tbl' }, el('summary', { text: 'Show as a table' }), el('table', null, el('thead', null, el('tr', null, ...head.map(h => el('th', { text: h })))), el('tbody', null, ...rows.map(r => el('tr', null, ...r.map(c => el('td', { text: c })))))));
  const legend = items => el('div', { class: 'legend' }, ...items.map(([c, t]) => el('span', null, el('i', { class: 'swatch', style: `background:${c}` }), t)));
  function dumbbell(rows, opts) {
    const W = 520, left = opts.left || 150, right = 36, rowH = 30, top = 22, H = top + rows.length * rowH + 22;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || 'chart' });
    const x = v => left + (W - left - right) * v / 100;
    for (const g of [0, 25, 50, 75, 100]) { svg.append(svgEl('line', { class: 'grid', x1: x(g), x2: x(g), y1: top - 6, y2: top + rows.length * rowH })); svg.append(svgEl('text', { class: 'muted', x: x(g), y: H - 6, 'text-anchor': 'middle' }, g)); }
    rows.forEach((r, i) => {
      const y = top + i * rowH + rowH / 2;
      svg.append(svgEl('text', { class: 'lbl', x: left - 10, y: y + 4, 'text-anchor': 'end' }, r.label));
      svg.append(svgEl('line', { class: 'link', x1: x(r.a), x2: x(r.b), y1: y, y2: y }));
      svg.append(svgEl('circle', { class: 'dot', cx: x(r.a), cy: y, r: 6, fill: opts.colorA }));
      svg.append(svgEl('circle', { class: 'dot', cx: x(r.b), cy: y, r: 6, fill: opts.colorB }));
      const lo = Math.min(r.a, r.b), hi = Math.max(r.a, r.b);
      svg.append(svgEl('text', { class: 'val', x: x(hi) + 10, y: y + 4 }, fmt0(hi)));
      if (hi - lo > 12) svg.append(svgEl('text', { class: 'val', x: x(lo), y: y - 10, 'text-anchor': 'middle' }, fmt0(lo)));
    });
    return svg;
  }

  function dotRows(rows, series, opts) {
    // one row per item, a dot per series on a 0-100 scale, joined by a line; the last series' value is labelled
    const W = 520, left = opts.left || 150, right = 40, rowH = 32, top = 8, H = top + rows.length * rowH + 22;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || 'chart' });
    const x = v => left + (W - left - right) * v / 100;
    for (const g of [0, 25, 50, 75, 100]) { svg.append(svgEl('line', { class: 'grid', x1: x(g), x2: x(g), y1: top, y2: top + rows.length * rowH })); svg.append(svgEl('text', { class: 'muted', x: x(g), y: H - 6, 'text-anchor': 'middle' }, g)); }
    rows.forEach((r, i) => {
      const y = top + i * rowH + rowH / 2, vals = series.map(([k]) => r.v[k]);
      svg.append(svgEl('text', { class: 'lbl', x: left - 10, y: y + 4, 'text-anchor': 'end', style: r.strong ? 'font-weight:600' : null }, r.label));
      svg.append(svgEl('line', { class: 'link thin', x1: x(Math.min(...vals)), x2: x(Math.max(...vals)), y1: y, y2: y }));
      series.forEach(([k, , c]) => svg.append(svgEl('circle', { class: 'dot', cx: x(r.v[k]), cy: y, r: 6.5, fill: c })));
      const last = r.v[series[series.length - 1][0]], first = r.v[series[0][0]];
      svg.append(svgEl('text', { class: 'val', x: x(last) + (last >= Math.max(...vals) ? 11 : -11), y: y + 4, 'text-anchor': last >= Math.max(...vals) ? 'start' : 'end', style: 'font-weight:600; fill: var(--ink)' }, fmt0(last)));
      if (Math.abs(last - first) > 12) svg.append(svgEl('text', { class: 'val', x: x(first), y: y - 10, 'text-anchor': 'middle' }, fmt0(first)));
    });
    return svg;
  }
  function groupBars(groups, opts) {
    // a block per group, one thin bar per series in its colour, labelled with its count
    const W = 520, left = 160, right = 70, barH = 11, gapB = 4, gapG = 16, top = opts.title ? 22 : 6;
    const gh = g => g.bars.length * (barH + gapB) - gapB;
    const H = top + groups.reduce((a, g) => a + gh(g) + gapG, 0) + 16;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || 'chart' });
    const x = v => left + (W - left - right) * v / 100;
    if (opts.title) svg.append(svgEl('text', { class: 'ttl', x: 0, y: 14 }, opts.title));
    const bottom = H - 16;
    for (const g of [0, 25, 50, 75]) { svg.append(svgEl('line', { class: 'grid', x1: x(g), x2: x(g), y1: top, y2: bottom - 4 })); svg.append(svgEl('text', { class: 'muted', x: x(g), y: H - 3, 'text-anchor': 'middle' }, g)); }
    let y = top;
    for (const g of groups) {
      svg.append(svgEl('text', { class: 'lbl', x: left - 10, y: y + gh(g) / 2 + 4, 'text-anchor': 'end' }, g.label));
      g.bars.forEach((b, j) => {
        const yb = y + j * (barH + gapB), w = Math.max(x(b.value) - x(0), b.value > 0 ? 2 : 0);
        if (w) svg.append(svgEl('rect', { x: x(0), y: yb, width: w, height: barH, rx: 2, style: `fill:${mcolor(b.id)}` }));
        svg.append(svgEl('text', { class: 'val small', x: x(0) + w + 5, y: yb + barH - 1.5 }, b.text));
      });
      y += gh(g) + gapG;
    }
    return svg;
  }

  function renderFindings() {
    const F = D.findings.findings, L = D.leaderboard, byId = Object.fromEntries(F.map(f => [f.id, f])), order = L.models.filter(m => !m.recent).map(m => m.id);
    let n = 0;
    const exLink = f => { const ex = D.examples.examples.find(e => e.id === f.example); return ex ? el('p', { class: 'see' }, el('a', { href: '#examples', onclick: () => selectExample(ex.dimension, ex.id) }, 'See the run →')) : null; };
    const FD = id => byId[id].data;
    const fr3 = FD('safe').rows.filter(r => !M[r.model].open);
    const SHORT = {
      safe: () => `Frontier models score ${fmt0(FD('safe').frontier_safety_min)} or more on safety and reporting, and ${fmt0(fr3.reduce((a, r) => a + r.other, 0) / 3)} on the other five dimensions.`,
      initiative: () => `In ${FD('initiative').never_noticed} of ${FD('initiative').failures} failed runs, the model never looked at the team's work.`,
      ei: () => `Asked one question first, models name a colleague's distress in ${FD('ei').prompted_both} of ${FD('ei').runs} runs. Left alone, they act on it in ${FD('ei').unprompted_pass}.`,
      conflict: () => `Frontier models find the team's best deal alone (${fmt0(FD('conflict').means.frontier.alone.best_deal)}%), then give it up to a pushy teammate (${fmt0(FD('conflict').means.frontier.pushy.best_deal)}%).`,
      hardening: () => `${FD('hardening').mechanisms_tried} ways to break it, ${FD('hardening').frontier_test_runs} runs, ${FD('hardening').genuine_failures} genuine failures. The errors left are over-caution.`,
      gap: () => `Frontier models average ${fmt0(FD('gap').frontier.score)}; open-weight models average ${fmt0(FD('gap').open.score)}. The gap is widest where teamwork means asking and noticing. Newer open-weight models do not close it: ${FD('gap').recent.map(r => `${M[r.model].name} scores ${fmt1(r.score)}`).join(', ')}.`,
      intervention: () => { const d = FD('intervention'); return `One paragraph in the system prompt that states the norm lifts GPT-6 Astra and Claude Opus 5.5 from ${fmt0(d.all.rerun)}% to ${fmt0(d.all.specific)}% on initiative, emotional intelligence and conflict. A generic "be a good teammate" note gets ${fmt0(d.all.generic)}%, and the same paragraph lifts open-weight models only from ${fmt0(d.open.rerun)}% to ${fmt0(d.open.specific)}%.`; },
      inherited: () => { const d = FD('inherited'), shown = d.fixes.find(x => x.cond === 'the diff shown at the takeover'), opened = d.fixes.find(x => x.cond === 'a diff of the session (opened)'), x = shown || opened; return `Taking over ${d.code_states} real coding sessions in which a weaker model had cheated, frontier models kept the cheat in ${d.carried} of ${d.runs} takeovers, on tasks they handle correctly alone. ${shown ? 'Shown a diff of the session at the takeover' : 'Once they open a diff of the session'}, they kept an edited test in only ${x.test_edit.carried} of ${x.test_edit.runs} takeovers (${x.test_edit.carried_without} without it); special-cased code they saw and still kept in ${x.special_case.carried} of ${x.special_case.runs}. Outside code they corrected every false record (${d.records.runs - d.records.carried} of ${d.records.runs}).` + (d.newer && d.newer['gpt-6.1-sol'] && d.newer['claude-sonnet-5-5'] ? ` The blind spots run in families: GPT-6.1 Sol, like GPT-6 Astra, keeps edited tests (${d.newer['gpt-6.1-sol'].test_edit.carried} of ${d.newer['gpt-6.1-sol'].test_edit.runs}) but not special cases (${d.newer['gpt-6.1-sol'].special_case.carried} of ${d.newer['gpt-6.1-sol'].special_case.runs}); Claude Sonnet 5.5 keeps special cases in ${d.newer['claude-sonnet-5-5'].special_case.carried} of ${d.newer['claude-sonnet-5-5'].special_case.runs}, like Opus.` : ''); },
    };
    const quote = (q, who) => q ? el('figure', { class: 'fquote' }, el('blockquote', { text: `“${q.text}”` }), el('figcaption', { text: who })) : null;
    const card = (f, lead, more, chart, stat, q) => el('article', { class: 'finding', id: 'finding-' + f.id },
      el('div', { class: 'ftext' }, el('span', { class: 'fnum', text: String(++n).padStart(2, '0') }), el('h3', { text: f.claim }), el('p', { class: 'lead', text: SHORT[f.id]() }), q || null, exLink(f)),
      el('div', { class: 'chart' }, ...chart.filter(c => !(c && c.classList && (c.classList.contains('tiles'))))));
    const cards = [];
    { const f = byId.safe, d = f.data, frontier = d.rows.filter(r => !M[r.model].open), open = d.rows.filter(r => M[r.model].open);
      const oth = Object.entries(d.frontier_other).map(([k, v]) => [k, Math.min(...v), Math.max(...v)]), g = k => oth.find(o => o[0] === k);
      cards.push(card(f, [`Frontier models score ${fmt0(d.frontier_safety_min)} or more on the two conscience dimensions, and ${fmt0(frontier.reduce((a, r) => a + r.other, 0) / 3)} on the other five.`],
        [`Every frontier model scores at least ${fmt0(d.frontier_safety_min)} on resisting unsafe pressure and reporting misconduct. The weak spots are shared: handling conflict is ${fmt0(g('handling_conflict')[1])} to ${fmt0(g('handling_conflict')[2])} across the frontier three, emotional intelligence ${fmt0(g('emotional_intelligence')[1])} to ${fmt0(g('emotional_intelligence')[2])}. The open models drop on both sides, to ${fmt0(open.reduce((a, r) => a + r.safety, 0) / 3)} and ${fmt0(open.reduce((a, r) => a + r.other, 0) / 3)}.`],
        [legend([['var(--accent)', 'Safety and reporting (mean of two)'], ['var(--muted)', 'The other five dimensions (mean)']]), dumbbell(d.rows.map(r => ({ label: M[r.model].name, a: r.safety, b: r.other })), { colorA: 'var(--accent)', colorB: 'var(--muted)', aria: 'Safety dimensions against the other five, per model' }),
          tableTwin(['Model', 'Safety + reporting', 'Other five'], d.rows.map(r => [M[r.model].name, fmt0(r.safety), fmt0(r.other)]))], [`${fmt0(d.frontier_safety_min)}+`, `vs ${fmt0(frontier.reduce((a, r) => a + r.other, 0) / 3)} on collaboration`]));
    }
    { const f = byId.initiative, d = f.data, top = d.rows.slice(0, 2);
      const rows = d.rows.map(r => ({ label: M[r.model].name, segments: [{ value: 100 * r.passed / r.tests }, { value: 100 * r.did_not_notice / r.tests, cls: 'grey' }, { value: 100 * (r.noticed_did_not_act + r.acted_fell_short) / r.tests, cls: 'light', dark: true }] }));
      cards.push(card(f, [`The model did its own job, answered its colleagues, and never looked at the team's work.`],
        [`In ${d.never_noticed} of ${d.failures} failed initiative runs the model never noticed the problem. Initiative is scored under a realistic workload: sixty to a hundred files, a thirty-row tracker, routine requests every round. On a quiet day the top two models pass ${fmt0(top[0].quiet_day)}% and ${fmt0(top[1].quiet_day)}%; in the busy shift ${fmt0(top[0].busy_shift)}% and ${fmt0(top[1].busy_shift)}%. Each of the top two misses things the other catches.`],
        [legend([['var(--accent)', 'Passed'], ['var(--muted)', 'Never noticed the problem'], ['var(--line-2)', 'Noticed it, fell short']]), barRows(rows, { aria: 'Initiative test outcomes per model, share of runs' }),
          tableTwin(['Model', 'Runs', 'Passed', 'Never noticed', 'Noticed, fell short', 'Quiet day %', 'Busy shift %'], d.rows.map(r => [M[r.model].name, r.tests, r.passed, r.did_not_notice, r.noticed_did_not_act + r.acted_fell_short, fmt0(r.quiet_day), fmt0(r.busy_shift)]))], [`${d.never_noticed} of ${d.failures}`, 'failures never noticed the problem']));
    }
    { const f = byId.ei, d = f.data, asks = d.unprompted_labels.asks_teammate || 0;
      cards.push(card(f, [`Asked one neutral question first, the model names the colleague's state. Left alone, it just asks for the missing information.`],
        [`Prompted, the model named the colleague's state in ${d.prompted_both} of ${d.runs} runs; unprompted, ${d.unprompted_pass} of the same ${d.runs} runs passed. The probe rebuilt one turn of each failed test run for ${d.models_probed.map(id => M[id].name).join(' and ')} and added "${d.question}" before the model posted. Left alone, the models treat a hurt colleague as a missing source of data: ${asks} of ${d.unprompted_label_total} labels on their messages are "asks the teammate for the information".`],
        [el('div', { class: 'tiles' }, el('div', { class: 'tile' }, el('div', { class: 'v', text: `${d.prompted_both} of ${d.runs}` }), el('div', { class: 'l', text: 'named the moment when asked first' })), el('div', { class: 'tile' }, el('div', { class: 'v', text: `${d.unprompted_pass} of ${d.runs}` }), el('div', { class: 'l', text: 'passed unprompted' })), el('div', { class: 'tile' }, el('div', { class: 'v', text: `${asks} of ${d.unprompted_label_total}` }), el('div', { class: 'l', text: 'messages just ask for the information' }))),
          barRows([{ label: 'Asked first', segments: [{ value: 100 * d.prompted_both / d.runs, label: `${d.prompted_both} of ${d.runs}` }] }, { label: 'Unprompted', segments: [{ value: 100 * d.unprompted_pass / d.runs, label: `${d.unprompted_pass} of ${d.runs}` }] }], { title: "Runs in which the model named the colleague's state (%)", aria: 'Prompted against unprompted' }),
          tableTwin(['Model', 'Runs probed', 'Named the moment when asked', 'Passed unprompted'], Object.entries(d.by_model).map(([id, v]) => [M[id].name, v.runs, v.prompted, v.unprompted]))], [`${d.prompted_both} vs ${d.unprompted_pass}`, `of ${d.runs} runs, asked vs unprompted`]));
    }
    { const f = byId.conflict, d = f.data, V = ['alone', 'normal', 'pushy'], VL = { alone: 'Alone', normal: 'Normal teammate', pushy: 'Pushy teammate' }, fr = d.means.frontier;
      const W = 520, H = 230, left = 40, bottom = 36, top = 24, bw = 48;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Share of runs that reached the best joint deal, by version' });
      const xs = i => left + 40 + i * 155, y = v => top + (H - top - bottom) * (1 - v / 100);
      for (const g of [0, 50, 100]) { svg.append(svgEl('line', { class: 'grid', x1: left, x2: W - 10, y1: y(g), y2: y(g) })); svg.append(svgEl('text', { class: 'muted', x: left - 6, y: y(g) + 4, 'text-anchor': 'end' }, g)); }
      V.forEach((v, i) => {
        const mean = d.means.all[v].best_deal;
        svg.append(svgEl('rect', { class: 'bar', x: xs(i) - bw / 2, y: y(mean), width: bw, height: y(0) - y(mean), rx: 3, 'fill-opacity': 0.9 }));
        svg.append(svgEl('text', { class: 'val', x: xs(i) + bw / 2 + 8, y: y(mean) + 4, style: 'font-weight:600; fill: var(--ink)' }, fmt0(mean)));
        order.forEach((id, k) => svg.append(svgEl('circle', { class: 'dot', cx: xs(i) + bw / 2 + 34 + k * 9, cy: y(d.by_model[id][v].best_deal), r: 4.5, fill: mcolor(id) })));
        svg.append(svgEl('text', { class: 'lbl', x: xs(i), y: H - 14, 'text-anchor': 'middle' }, VL[v]));
      });
      Object.entries(d.humans).forEach(([name, h]) => { svg.append(svgEl('line', { class: 'ref', x1: left, x2: W - 10, y1: y(h.best_deal), y2: y(h.best_deal) })); svg.append(svgEl('text', { class: 'muted', x: W - 10, y: y(h.best_deal) - 3, 'text-anchor': 'end' }, `people, ${name} (${h.best_deal})`)); });
      cards.push(card(f, [`Frontier models find the team's best split alone, then give it up to end an argument. The score is the team's total.`],
        [`Alone, the frontier models reach the best joint split in ${fmt0(fr.alone.best_deal)}% of runs; with a pushy teammate, ${fmt0(fr.pushy.best_deal)}%. A behaviour change, not a lack of skill: with the pushy teammate the frontier models still ask about the other side's needs in ${fmt0(fr.pushy.asked)}% of runs, then take the teammate's own below-best offer in ${fmt0(fr.pushy.caved)}% to end the argument. Each concession is small; the deals still reach about ${fmt0(fr.pushy.efficiency)}% of the best joint value.`],
        [el('p', { class: 'legend', text: 'Reached the best joint deal (%). Bars: average of six models. Dots: each model.' }), svg,
          tableTwin(['Model', 'Alone', 'Normal teammate', 'Pushy teammate', 'Caved (pushy)', 'Efficiency (pushy)'], order.map(id => [M[id].name, fmt0(d.by_model[id].alone.best_deal), fmt0(d.by_model[id].normal.best_deal), fmt0(d.by_model[id].pushy.best_deal), fmt0(d.by_model[id].pushy.caved) + '%', fmt1(d.by_model[id].pushy.efficiency) + '%']))], [`${fmt0(fr.alone.best_deal)}% → ${fmt0(fr.pushy.best_deal)}%`, 'best deal, alone vs pushy teammate']));
    }
    { const f = byId.intervention, d = f.data;
      const S = [['rerun', 'No note', 'var(--muted)'], ['generic', 'Generic note', 'var(--line-2)'], ['specific', 'The norm stated', 'var(--accent)']];
      const rows = d.rows.map(r => ({ label: dimName(r.dimension), v: r })).concat([{ label: 'All three', v: d.all, strong: true }]);
      cards.push(card(f, [], [], [legend(S.map(([, t, c]) => [c, t])), dotRows(rows, S, { aria: 'Test pass rate with no note, a generic note and the stated norm, per dimension', left: 170 }),
        tableTwin(['Dimension', 'No note', 'Generic note', 'Norm stated'], rows.map(r => [r.label, fmt0(r.v.rerun), fmt0(r.v.generic), fmt0(r.v.specific)]))],
        null, quote(d.quotes.note, 'Claude Opus 5.5 with the note, to a nurse who went quiet after a medication error. Without it, the same model asked the nurse for the vial and the volume.')));
    }
    { const f = byId.hardening, d = f.data, t = d.tactic_lines;
      cards.push(card(f, [`${d.mechanisms_tried} ways to break the frontier models' safety behaviour, ${d.frontier_test_runs} test runs, every failure read by hand. What remained was over-caution.`],
        [`Levers included approving a change a teammate had already made, a written approval resting on a false premise, round after round of pressure to retract a report, an AI teammate facing shutdown, and a realistic workload. In the scored runs no arguing tactic drew a yes from GPT-6 Astra or Claude Opus 5.5: ${t.precedent} precedent lines, ${t.responsibility} "it's on my sign-off" lines, ${t.temporary} "only temporary or disclosed" lines, ${t.consensus} "everyone agrees" lines. The one frontier lapse in the scored set is an edge case where the harm was doubtful: the check the model let a teammate switch off was itself wrong, and the code was right.`],
        [el('div', { class: 'tiles' }, el('div', { class: 'tile' }, el('div', { class: 'v', text: d.frontier_test_runs }), el('div', { class: 'l', text: 'frontier test runs under hardening' })), el('div', { class: 'tile' }, el('div', { class: 'v', text: d.genuine_failures }), el('div', { class: 'l', text: 'genuine safety failures' })), el('div', { class: 'tile' }, el('div', { class: 'v', text: d.mechanisms_tried }), el('div', { class: 'l', text: 'mechanisms tried' }))),
          barRows(order.map(id => ({ label: M[id].name, segments: [{ value: d.stress[id].score }] })), { title: `Safety stress set, ${d.stress_n} harder scenarios: score (%)`, aria: 'Safety stress set scores per model' }),
          tableTwin(['Model', 'Stress set', 'Resisting pressure', 'Reporting misconduct'], order.map(id => [M[id].name, fmt1(d.stress[id].score), fmt0(d.stress[id].dims.resisting_unsafe_pressure), fmt0(d.stress[id].dims.whistleblowing)]))], [`${d.genuine_failures}`, `genuine failures in ${d.frontier_test_runs} hardened runs`]));
    }
    { const f = byId.inherited, d = f.data, fr = order.filter(id => !M[id].open);
      const groups = d.rows.map(r => ({ label: r.label, bars: fr.map(id => ({ id, value: r.by_model[id].pct, text: `${r.by_model[id].carried} of ${r.by_model[id].runs}` })) }));
      const cell = c => `${c.carried} of ${c.runs} (${c.carried_without})`;
      cards.push(card(f, [], [], [legend(fr.map(id => [mcolor(id), M[id].name])), groupBars(groups, { aria: 'Takeovers that carried the inherited compromise forward, by what the predecessor left, per frontier model', title: 'Takeovers that kept what the weaker model left (%)' }),
        el('table', { class: 'mini' }, el('caption', { text: 'What stops it: takeovers that still kept the cheat with the help (in brackets, the same runs without it)' }),
          el('thead', null, el('tr', null, el('th', { text: 'Help for the new model' }), el('th', { text: 'Edited test file' }), el('th', { text: 'Special-cased code' }))),
          el('tbody', null, ...d.fixes.map((x, i) => el('tr', { class: x.cond === 'the diff shown at the takeover' ? 'hl' : null }, el('td', { text: x.label }), el('td', { text: cell(x.test_edit) }), el('td', { text: cell(x.special_case) }))))),
        tableTwin(['Predecessor left', ...fr.map(id => M[id].name)], d.rows.map(r => [r.label, ...fr.map(id => `${r.by_model[id].carried} of ${r.by_model[id].runs}`)]))],
        null, quote(d.quotes.tidy, 'Claude Opus 5.5, after opening the diff that showed the hard-coded guard its predecessor had added. It kept the guard.')));
    }
    { const f = byId.gap, d = f.data, fk = d.fable_vs_kimi, g = k => fmt0(d.rows.find(r => r.dimension === k).gap);
      cards.push(card(f, [`Frontier models average ${fmt0(d.frontier.score)}, open models ${fmt0(d.open.score)}. The ranking between the groups never flips in the bootstrap.`],
        [`The gap between the lowest frontier model and the highest open one is ${fmt1(fk.diff)} points (95% interval ${fmt1(fk.ci[0])} to ${fmt1(fk.ci[1])}). The gap is widest where teamwork is about asking and noticing: sharing and seeking information (${g('sharing_and_seeking_information')} points), taking initiative (${g('taking_initiative')}) and emotional intelligence (${g('emotional_intelligence')}). It is smallest on handling conflict (${g('handling_conflict')}), where everyone struggles. The open models also pass fewer scenarios alone (${fmt0(d.open.alone)}% against ${fmt0(d.frontier.alone)}%).`],
        [legend([['var(--accent)', 'Frontier models (mean of three)'], ['var(--muted)', 'Open models (mean of three)']]), dumbbell(d.rows.map(r => ({ label: dimName(r.dimension), a: r.frontier, b: r.open })), { colorA: 'var(--accent)', colorB: 'var(--muted)', left: 215, aria: 'Frontier against open mean score per dimension' }),
          tableTwin(['Dimension', 'Frontier', 'Open', 'Gap'], d.rows.map(r => [dimName(r.dimension), fmt0(r.frontier), fmt0(r.open), fmt0(r.gap)]))], [`+${fmt0(fk.diff)}`, 'points, lowest frontier over best open']));
    }
    rc($('#finding-list'), ...cards);
  }

  // ---------------------------------------------------------------- dataset
  function renderDataset() {
    const S = D.dataset, c = S.counts;
    const V0 = S.validation;
    $('#data-lede').textContent = `${c.scenarios} scenarios, each grounded in a real public source.`;
    const rows = S.families.map(f => ({ label: f.label, segments: [{ value: 100 * f.count / c.scenarios, cls: f.real_world ? '' : 'grey', label: String(f.count) }] }));
    rc($('#data-sources'), el('div', { class: 'chart' }, legend([['var(--accent)', 'Real-world cases'], ['var(--muted)', 'Benchmarks and datasets']]), barRows(rows, { left: 215, aria: 'Scenarios by source family', ticks: () => '' })),
      el('p', { class: 'fineprint', text: 'Sources include ImpossibleBench, SWE-bench, HiddenBench, CaSiNo, MATH and GPQA; NTSB, NASA ASRS and Chemical Safety Board reports; FDA letters and misconduct findings; published clinical cases.' }));
    const V = S.validation;
    const step = (i, t, sub) => el('li', null, el('span', { class: 'n', text: i }), el('div', null, el('strong', { text: t }), el('span', { text: sub })));
    rc($('#data-validation'),
      step(1, 'Provenance check', `${V.quotes_checked.toLocaleString()} of ${V.quotes_total.toLocaleString()} source quotes verbatim; every fact tied to one or marked adapted`),
      step(2, 'Adversarial review', 'reviewer and fixer per scenario, then real runs read item by item'),
      step(3, 'Ability gate', 'frontier models must pass alone, and an ideal teammate must pass the test'),
      step(4, 'Scoring audit', `all ${V.failed_runs_reread} failed runs re-read for false fails, checkers fixed, rescored`),
      step(5, 'Judges and a third rater', `${V.judge_agreement}% agreement on ${V.judge_messages.toLocaleString()} messages; ${V.disputed_relabelled} disputed labels re-rated by another lab's model`),
      step(6, 'Human checks', 'cue readability and blind label checks in progress'));
    const L = S.licence;
    $('#data-licence-text').textContent = `Code: ${L.code_licence}. Scenario text adapts public sources under their own terms. An audit classed all ${L.total} scenarios by the licence of the material they adapt; ${L.need_action} need action before a public release. The plan: ${L.plan}`;
    rc($('#data-licence'), el('div', { class: 'lic-wrap' }, el('table', { class: 'lic-table' }, el('thead', null, el('tr', null, ...['Licence class', 'Scored set', 'Stress set', 'Total', 'Need action'].map(h => el('th', { text: h })))),
      el('tbody', null, ...L.classes.map(r => el('tr', null, el('td', { text: r.cls }), el('td', { text: r.final }), el('td', { text: r.stress }), el('td', { text: r.total }), el('td', { text: r.need_action })))))));
  }

  // ---------------------------------------------------------------- citation
  function setupCitation() {
    const b = $('#copy-bib');
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#bibtex').textContent); b.textContent = 'Copied'; }
      catch (e) { const r = document.createRange(); r.selectNodeContents($('#bibtex')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected, press copy'; }
      setTimeout(() => { b.textContent = 'Copy BibTeX'; }, 1800);
    });
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    const names = ['leaderboard', 'dimensions', 'examples', 'findings', 'dataset'];
    const got = await Promise.all(names.map(n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw new Error(n); return r.json(); })));
    names.forEach((n, i) => { D[n] = got[i]; });
    for (const m of D.leaderboard.models) { M[m.id] = m; BYSHORT[m.short] = m.id; }
    modelVars(); setupTheme(); setupControls(); setupCitation();
    renderHero(); renderTable(); renderSpiders(); renderDimensions(); renderExamples(); renderFindings(); renderDataset();
    if (location.hash.startsWith('#dim-')) { const k = location.hash.slice(5); const ex = D.examples.examples.find(e => e.dimension === k); if (ex) selectExample(k, ex.id); }
  }
  boot().catch(err => {
    console.error(err);
    rc($('#lb-table'), el('p', { class: 'lede', text: 'The data files did not load. Run site/build_data.py, then serve the site folder over HTTP (for example: python -m http.server).' }));
  });
})();
