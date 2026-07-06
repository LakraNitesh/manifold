/* Manifold — shared page engine. Exposes window.MF. */
(function () {
  const MF = {};
  const $ = (s, el = document) => el.querySelector(s);

  /* ---------- theme ---------- */
  MF.initTheme = function () {
    const saved = localStorage.getItem('mf_theme') || 'dark';
    document.documentElement.dataset.theme = saved;
  };
  MF.themeButton = function () {
    const b = document.createElement('button');
    b.className = 'mf-toggle';
    const dot = document.createElement('span'); dot.className = 'dot';
    const lab = document.createElement('span');
    const sync = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      lab.textContent = dark ? 'DARK' : 'LIGHT';
      dot.style.background = dark ? '#EDF0F4' : '#1C2430';
      b.setAttribute('aria-pressed', dark);
    };
    b.append(dot, lab);
    b.setAttribute('aria-label', 'Toggle dark mode');
    b.onclick = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('mf_theme', next);
      sync();
      window.dispatchEvent(new Event('mf-theme'));
    };
    sync();
    return b;
  };
  MF.cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- progress (localStorage) ---------- */
  MF.getStatus = (n) => localStorage.getItem('mf_mod_' + n) || 'not';
  MF.setStatus = (n, s) => {
    const order = { not: 0, prog: 1, done: 2 };
    if (order[s] > order[MF.getStatus(n)]) localStorage.setItem('mf_mod_' + n, s);
  };

  /* ---------- toast ---------- */
  let toastT = null;
  MF.toast = function (tag, msg, ms = 2600) {
    let t = $('#mf-toast');
    if (!t) { t = document.createElement('div'); t.id = 'mf-toast'; document.body.appendChild(t); }
    t.innerHTML = '<span class="mono"></span>';
    t.querySelector('.mono').textContent = tag;
    t.appendChild(document.createTextNode(msg));
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms);
  };

  /* ---------- micro-animations ---------- */
  MF.pop = function (el, cls = 'pop') {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  };

  /* ---------- page shell ---------- */
  // opts: {num, title, sub, mission, metric:{label,target,targetPct(0..100 marker pos),format,dir:'up'|'down'}, prev:{href,name}, next:{href,name}}
  MF.shell = function (opts) {
    MF.initTheme();
    MF.setStatus(opts.num, 'prog');
    const root = document.body;
    root.innerHTML = `
    <div class="wrap">
      <nav class="mf-nav">
        <div style="display:flex;align-items:center;gap:18px">
          <a class="mf-back" href="../index.html">&larr; Manifold</a>
          <div style="display:flex;flex-direction:column;gap:1px">
            <span class="mf-title"></span>
            <span class="mf-sub"></span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="mf-live"><span class="mf-pulse"></span><span id="live-label">COMPUTING LIVE</span></span>
          <span id="theme-slot"></span>
        </div>
      </nav>
    </div>
    <section class="wrap" style="padding-top:18px">
      <div class="mission" id="mission">
        <div style="display:flex;flex-direction:column;gap:2px;flex:1 1 260px">
          <span class="mtag">MISSION</span>
          <span class="mtext" id="mission-text"></span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;flex:0 1 auto">
          <div style="display:flex;flex-direction:column;gap:5px">
            <div class="range-ends"><span id="metric-label"></span><span id="metric-target"></span></div>
            <div class="mbar"><i id="metric-fill"></i><b id="metric-mark"></b></div>
          </div>
          <span class="mnum" id="metric-num">—</span>
        </div>
      </div>
    </section>
    <main class="wrap bench" id="bench">
      <aside class="rail" id="rail"></aside>
      <figure class="stage" id="stage">
        <div class="stage-head"><span id="stage-info"></span><span id="stage-extra" style="color:var(--live)"></span></div>
        <canvas id="cv" tabindex="0" role="application"></canvas>
        <div class="stage-foot"><span id="foot-l"></span><span id="foot-r"></span></div>
        <div class="narrate" id="narrate" style="margin:12px 14px 14px"></div>
      </figure>
      <aside class="side" id="side">
        <div class="quest-head">
          <span class="label" style="color:var(--accent)">Your quest — one card at a time</span>
          <span class="hint" id="quest-count"></span>
        </div>
        <div class="quest" id="quest"></div>
      </aside>
    </main>
    <section class="wrap code-panel" id="code-panel"></section>
    <div class="wrap mod-foot" id="mod-foot"></div>`;

    $('.mf-title').textContent = opts.title;
    $('.mf-sub').textContent = `MODULE ${String(opts.num).padStart(2, '0')} · ${opts.sub}`;
    $('#mission-text').textContent = opts.mission;
    $('#metric-label').textContent = opts.metric.label;
    $('#metric-target').textContent = opts.metric.targetText || '';
    $('#metric-mark').style.left = (opts.metric.targetPct ?? 95) + '%';
    $('#theme-slot').replaceWith(MF.themeButton());

    const foot = $('#mod-foot');
    if (opts.prev) foot.innerHTML += `<a href="${opts.prev.href}"><span class="hint">&larr; PREVIOUS · MODULE ${String(opts.num - 1).padStart(2, '0')}</span><span class="disp" style="font-weight:600;font-size:16px">${opts.prev.name}</span></a>`;
    if (opts.next) foot.innerHTML += `<a class="next" href="${opts.next.href}"><span class="hint" style="color:var(--accent)">UP NEXT · MODULE ${String(opts.num + 1).padStart(2, '0')}</span><span class="disp" style="font-weight:600;font-size:16px">${opts.next.name} &rarr;</span></a>`;

    return {
      rail: $('#rail'), side: $('#side'), quest: $('#quest'), canvas: $('#cv'),
      stageInfo: $('#stage-info'), stageExtra: $('#stage-extra'),
      footL: $('#foot-l'), footR: $('#foot-r'),
      metric: MF.metricCtl(opts.metric), narrate: MF.narrator($('#narrate')),
      codePanel: $('#code-panel')
    };
  };

  /* ---------- mission metric ---------- */
  MF.metricCtl = function (cfg) {
    const num = $('#metric-num'), fill = $('#metric-fill'), mission = $('#mission');
    let last = null, won = false;
    return {
      set(value, pct, ok) {
        const label = cfg.format ? cfg.format(value) : String(value);
        if (label !== num.textContent) { num.textContent = label; MF.pop(num); }
        fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
        const col = ok ? 'var(--live)' : 'var(--accent)';
        fill.style.background = col; num.style.color = ok ? 'var(--live)' : 'var(--text)';
        mission.classList.toggle('win', !!ok);
        if (ok && !won) { won = true; }
        last = value;
        return ok;
      },
      get won() { return won; }
    };
  };

  /* ---------- live narration ---------- */
  MF.narrator = function (el) {
    let last = '';
    return {
      say(text, force) {
        if (text === last && !force) return;
        last = text;
        el.textContent = text;
        MF.pop(el);
      }
    };
  };

  /* ---------- quest / step system: Anki-style card deck ---------- */
  // steps: [{id,title,desc, predict?:{q,options,answer,whyRight,whyWrong}}]
  // Logic is unchanged (ordered, page calls q.done(id)); the UI shows ONE card
  // at a time. Completing a card unlocks a flick (button or swipe) to the next.
  MF.questCtl = function (container, steps, hooks = {}) {
    const state = steps.map(() => 'future');
    let cur = 0;        // first not-yet-done step (game logic pointer)
    let view = 0;       // which card is on top of the deck (UI pointer, view <= cur)
    const countEl = $('#quest-count');
    container.classList.add('deck-wrap');

    const deck = document.createElement('div');
    deck.className = 'deck';
    const nav = document.createElement('div');
    nav.className = 'deck-nav';
    nav.innerHTML = `<button class="deck-arrow" data-d="-1" aria-label="Previous card">&#8249;</button>
      <div class="deck-dots" role="presentation"></div>
      <button class="deck-arrow" data-d="1" aria-label="Next card">&#8250;</button>`;
    container.append(deck, nav);
    const dots = nav.querySelector('.deck-dots');
    steps.forEach(() => dots.appendChild(document.createElement('i')));
    const prevBtn = nav.querySelector('[data-d="-1"]'), nextBtn = nav.querySelector('[data-d="1"]');

    const els = steps.map((s, i) => {
      const el = document.createElement('div');
      el.className = 'qstep deck-card';
      el.innerHTML = `<div class="qbody">
          <div class="qtop"><span class="qmark">${i + 1}</span><span class="qtitle"></span></div>
          <p class="qdesc"></p>
        </div>
        <span class="qback">CARD ${i + 1} / ${steps.length}</span>`;
      el.querySelector('.qtitle').textContent = s.title;
      el.querySelector('.qdesc').textContent = s.desc;
      const body = el.querySelector('.qbody');
      if (s.predict) {
        const opts = document.createElement('div');
        opts.className = 'qopts';
        s.predict.options.forEach((o, oi) => {
          const b = document.createElement('button');
          b.textContent = o;
          b.onclick = () => {
            if (i !== cur || state[i] === 'done') return;
            const right = oi === s.predict.answer;
            const rev = document.createElement('p');
            rev.className = 'qreveal ' + (right ? 'yes' : 'no');
            rev.innerHTML = `<b>${right ? 'CALLED IT' : 'SURPRISE — that IS the lesson'}</b>`;
            rev.appendChild(document.createTextNode(right ? s.predict.whyRight : s.predict.whyWrong));
            opts.replaceWith(rev);
            api.done(s.id, true);
            hooks.onPredict && hooks.onPredict(s.id, oi, right);
          };
          opts.appendChild(b);
        });
        body.appendChild(opts);
      }
      const flick = document.createElement('button');
      flick.className = 'btn primary qflick';
      flick.textContent = i === steps.length - 1 ? 'Finish the quest ▸' : 'Got it — flick to next ▸';
      flick.onclick = () => flickTo(1);
      body.appendChild(flick);
      deck.appendChild(el);
      return el;
    });

    // synthetic final card, shown after the last real card is flicked away
    const endCard = document.createElement('div');
    endCard.className = 'qstep deck-card done';
    endCard.innerHTML = `<div class="qbody">
        <div class="qtop"><span class="qmark">✓</span><span class="qtitle">Quest complete</span></div>
        <p class="qdesc">Every card cleared. Your final unlock — the real Python — is open below the playground.</p>
        <button class="btn primary qflick" style="display:flex">Take me to the code ⌄</button>
      </div><span class="qback"></span>`;
    endCard.querySelector('.qflick').onclick = () => {
      const cp = $('#code-panel');
      cp && cp.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    deck.appendChild(endCard);

    const canAdvance = () => view < steps.length && state[view] === 'done';

    function render() {
      const all = els.concat([endCard]);
      all.forEach(el => { el.classList.add('dk-hidden'); el.classList.remove('top', 'peek', 'peek1', 'peek2', 'now'); el.style.transform = ''; });
      const top = all[view];
      top.classList.remove('dk-hidden');
      top.classList.add('top');
      if (view < steps.length) {
        top.classList.toggle('done', state[view] === 'done');
        if (state[view] !== 'done') top.classList.add('now');
        top.querySelector('.qmark').textContent = state[view] === 'done' ? '✓' : (view + 1);
      }
      [1, 2].forEach(o => {
        const el = all[view + o];
        if (el) { el.classList.remove('dk-hidden'); el.classList.add('peek', 'peek' + o); }
      });
      [...dots.children].forEach((d, i) => {
        d.className = (state[i] === 'done' ? 'don' : '') + (i === view ? ' cur' : '');
      });
      prevBtn.disabled = view === 0;
      nextBtn.disabled = !canAdvance();
      const doneN = state.filter(s => s === 'done').length;
      countEl.textContent = `card ${Math.min(view + 1, steps.length)}/${steps.length} · ${doneN} done`;
    }

    function flickTo(dir) {
      if (dir > 0) {
        if (!canAdvance()) return;
        const top = els.concat([endCard])[view];
        top.classList.add('throw-left');
        setTimeout(() => { top.classList.remove('throw-left'); view++; render(); }, 300);
      } else {
        if (view === 0) return;
        view--;
        render();
        els[view].classList.add('enter-back');
        setTimeout(() => els[view] && els[view].classList.remove('enter-back'), 400);
      }
    }
    prevBtn.onclick = () => flickTo(-1);
    nextBtn.onclick = () => flickTo(1);

    // swipe: left = next, right = previous
    let sx = null, sTop = null;
    deck.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      sx = e.clientX;
      sTop = els.concat([endCard])[view];
      deck.setPointerCapture(e.pointerId);
    });
    deck.addEventListener('pointermove', e => {
      if (sx === null || !sTop) return;
      const dx = e.clientX - sx;
      const damp = (dx < 0 && !canAdvance()) || (dx > 0 && view === 0) ? 0.15 : 1;
      sTop.style.transform = 'translateX(' + dx * damp + 'px) rotate(' + dx * damp * 0.03 + 'deg)';
    });
    const endSwipe = e => {
      if (sx === null || !sTop) return;
      const dx = e.clientX - sx;
      sTop.style.transform = '';
      if (dx < -70) flickTo(1);
      else if (dx > 70) flickTo(-1);
      sx = null; sTop = null;
    };
    deck.addEventListener('pointerup', endSwipe);
    deck.addEventListener('pointercancel', () => { if (sTop) sTop.style.transform = ''; sx = null; sTop = null; });

    const api = {
      current: () => (cur < steps.length ? steps[cur].id : null),
      isDone: (id) => state[steps.findIndex(s => s.id === id)] === 'done',
      done(id, silent) {
        const i = steps.findIndex(s => s.id === id);
        if (i !== cur || state[i] === 'done') return false;
        state[i] = 'done';
        cur++;
        if (i === view) { render(); els[i].classList.add('justdone'); }
        else render();
        if (!silent) MF.toast('STEP ' + (i + 1) + ' — DONE', steps[i].title + ' · flick the card when ready');
        if (cur >= steps.length) hooks.onAll && hooks.onAll();
        hooks.onStep && hooks.onStep(id);
        return true;
      }
    };
    render();
    return api;
  };

  /* ---------- insight cards (concept panel, unlocked by doing) ---------- */
  MF.insights = function (container, items) {
    const map = {};
    const head = document.createElement('div');
    head.className = 'quest-head';
    head.innerHTML = '<span class="label">Concepts — unlocked by doing</span>';
    container.appendChild(head);
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'insight locked';
      el.innerHTML = `<h4><span class="hint" style="letter-spacing:.06em"></span></h4><p></p>`;
      const h = el.querySelector('h4');
      h.insertBefore(document.createTextNode(it.title), h.firstChild);
      el.querySelector('h4 span').textContent = 'locked';
      el.querySelector('p').textContent = it.lockedHint || '';
      container.appendChild(el);
      map[it.id] = { el, it };
    });
    return {
      unlock(id) {
        const m = map[id];
        if (!m || !m.el.classList.contains('locked')) return;
        m.el.classList.remove('locked');
        m.el.classList.add('unlocked');
        m.el.querySelector('h4 span').textContent = 'unlocked';
        m.el.querySelector('h4 span').style.color = 'var(--live)';
        m.el.querySelector('p').textContent = m.it.body;
      }
    };
  };

  /* ---------- code reveal (Python, typed line by line) ---------- */
  // lines: [{c:'code', n:'note explaining it, tied to the playground'}]
  const PYKEYS = /\b(import|def|for|in|if|else|elif|return|while|from|as|not|and|or|None|True|False|class|lambda|range|len|max|min|sum|print)\b/g;
  function highlight(code) {
    let h = code.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    h = h.replace(/(#.*)$/g, '<span class="tok-c">$1</span>');
    h = h.replace(/("[^"]*"|'[^']*')/g, '<span class="tok-s">$1</span>');
    h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-n">$1</span>');
    h = h.replace(PYKEYS, '<span class="tok-k">$1</span>');
    return h;
  }
  MF.codeReveal = function (panel, cfg) {
    // cfg: {filename, intro, lines, accentNote, moduleNum, onDone}
    panel.innerHTML = `
      <div class="card card-pad" style="border-color:var(--live);margin-bottom:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="flex:1 1 300px">
          <span class="label" style="color:var(--live)">Mission complete — final unlock</span>
          <h3 class="disp" style="margin:4px 0 4px;font-size:20px">Now build it for real, in Python</h3>
          <p style="margin:0;font-size:13.5px;line-height:1.55;color:rgba(var(--text-rgb),.8)">${cfg.intro}</p>
        </div>
        <div class="btnrow" style="flex:0 0 auto">
          <button class="btn primary" id="code-next">Type next line ▸</button>
          <button class="btn" id="code-all">Type it all</button>
        </div>
      </div>
      <div class="code-grid">
        <div class="code-box">
          <div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>${cfg.filename}</span><span style="margin-left:auto" id="code-count">0/${cfg.lines.length} lines</span></div>
          <div class="code-body" id="code-body"><span class="caret" id="code-caret"></span></div>
        </div>
        <div class="code-note">
          <div class="card card-pad" style="flex:1">
            <span class="note-tag" id="note-tag">LINE-BY-LINE</span>
            <p class="note-body" id="note-body" style="margin:8px 0 0">Press “Type next line”. Each line appears with a note connecting it to what you just did in the playground.</p>
          </div>
          <a class="btn" href="../index.html" id="code-back" style="display:none;justify-content:center">Back to the path — module marked complete ✓</a>
        </div>
      </div>`;
    panel.classList.add('show');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    MF.toast('UNLOCKED', 'The Python behind what you just did — scroll down.');

    const body = $('#code-body', panel), caret = $('#code-caret', panel);
    const noteB = $('#note-body', panel), noteT = $('#note-tag', panel);
    const count = $('#code-count', panel), back = $('#code-back', panel);
    let idx = 0, typing = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function typeLine(then) {
      if (idx >= cfg.lines.length || typing) return;
      typing = true;
      const L = cfg.lines[idx];
      const row = document.createElement('div');
      row.className = 'cl hot';
      row.innerHTML = `<span class="ln">${idx + 1}</span><span class="code-txt"></span>`;
      body.insertBefore(row, caret);
      [...body.querySelectorAll('.cl')].forEach(r => { if (r !== row) r.classList.remove('hot'); });
      const txt = row.querySelector('.code-txt');
      const full = L.c;
      let i = 0;
      noteT.textContent = 'LINE ' + (idx + 1);
      noteB.textContent = L.n;
      const step = () => {
        i += reduced ? full.length : Math.max(1, Math.round(full.length / 26));
        txt.innerHTML = highlight(full.slice(0, i));
        if (i < full.length) setTimeout(step, 12);
        else {
          txt.innerHTML = highlight(full);
          idx++; typing = false;
          count.textContent = idx + '/' + cfg.lines.length + ' lines';
          if (idx >= cfg.lines.length) {
            caret.remove();
            noteT.textContent = 'THAT’S THE WHOLE ALGORITHM';
            noteB.textContent = cfg.outro || 'Paste this into any Python environment and it runs. You already understand every line — you built the intuition first, the code second.';
            back.style.display = 'flex';
            MF.setStatus(cfg.moduleNum, 'done');
            MF.toast('MODULE COMPLETE', 'You can explain it AND code it. That’s the whole game.');
            cfg.onDone && cfg.onDone();
          }
          then && then();
        }
      };
      step();
    }
    $('#code-next', panel).onclick = () => typeLine();
    $('#code-all', panel).onclick = function auto() {
      if (idx < cfg.lines.length) typeLine(() => setTimeout(auto, 140));
    };
  };

  /* ---------- canvas helpers ---------- */
  MF.setupCanvas = function (canvas, aspect = 0.66, onResize) {
    const ctx = canvas.getContext('2d');
    function fit(skipCb) {
      const w = canvas.clientWidth || canvas.parentElement.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * aspect * dpr);
      canvas.style.height = Math.round(w * aspect) + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!skipCb && onResize) onResize();
    }
    window.addEventListener('resize', () => fit());
    window.addEventListener('mf-theme', () => onResize && onResize());
    fit(true); // size now; the page runs its own first draw after wiring up
    return {
      ctx,
      W: () => canvas.width / Math.min(2, window.devicePixelRatio || 1),
      H: () => canvas.height / Math.min(2, window.devicePixelRatio || 1),
      toData(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      }
    };
  };
  MF.drag = function (canvas, cb) {
    let down = false;
    canvas.addEventListener('pointerdown', e => { down = true; canvas.setPointerCapture(e.pointerId); cb('down', e); });
    canvas.addEventListener('pointermove', e => { if (down) cb('move', e); else cb('hover', e); });
    canvas.addEventListener('pointerup', e => { down = false; cb('up', e); });
    canvas.addEventListener('pointercancel', () => { down = false; });
  };
  // shade a decision field
  MF.field = function (ctx, W, H, cols, rows, classify, colA, colB, alpha = 0.16) {
    const cw = W / cols, ch = H / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const v = classify((i + 0.5) / cols, (j + 0.5) / rows);
      ctx.fillStyle = v === 1 ? colB : colA;
      ctx.globalAlpha = alpha;
      ctx.fillRect(i * cw, j * ch, cw + 0.6, ch + 0.6);
    }
    ctx.globalAlpha = 1;
  };
  MF.gridLines = function (ctx, W, H, step = 40) {
    ctx.strokeStyle = 'rgba(' + MF.cssVar('--text-rgb') + ',0.07)';
    ctx.lineWidth = 1;
    for (let x = step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  };
  MF.dot = function (ctx, x, y, r, fill, stroke, lw = 2) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  };
  MF.diamond = function (ctx, x, y, r, fill, stroke, lw = 2) {
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  };

  /* ---------- small ui builders ---------- */
  MF.sliderCard = function (rail, { id, label, min, max, step, value, ends, bigFmt }) {
    const el = document.createElement('div');
    el.className = 'card card-pad';
    el.style.cssText = 'display:flex;flex-direction:column;gap:11px';
    el.innerHTML = `<div class="ctl-title"><label for="${id}"></label><span class="big-val" id="${id}-val"></span></div>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
      <div class="range-ends"><span>${ends[0]}</span><span>${ends[1]}</span></div>
      <span class="hint" id="${id}-lock" style="display:none;border:1px dashed rgba(var(--text-rgb),.3);border-radius:5px;padding:6px 9px"></span>`;
    el.querySelector('label').textContent = label;
    rail.appendChild(el);
    const input = el.querySelector('input'), val = el.querySelector('#' + id + '-val'), lock = el.querySelector('#' + id + '-lock');
    const fmt = bigFmt || (v => v);
    const sync = () => { val.textContent = fmt(input.value); MF.pop(val); };
    sync();
    return {
      el, input,
      value: () => parseFloat(input.value),
      sync,
      setLocked(on, msg) {
        input.disabled = on;
        lock.style.display = on ? 'block' : 'none';
        if (msg) lock.textContent = msg;
      }
    };
  };
  MF.button = function (rail, label, right, cb) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `<span></span><span class="hint" style="pointer-events:none"></span>`;
    b.firstChild.textContent = label;
    b.lastChild.textContent = right || '';
    b.onclick = cb;
    rail.appendChild(b);
    return b;
  };
  MF.legend = function (rail, rows) {
    const el = document.createElement('div');
    el.className = 'card card-pad';
    el.style.cssText = 'display:flex;flex-direction:column;gap:9px';
    el.innerHTML = '<span class="label">Legend</span>';
    rows.forEach(([swatchHTML, text]) => {
      const r = document.createElement('div');
      r.className = 'leg';
      r.innerHTML = `<span class="sw">${swatchHTML}</span><span></span>`;
      r.lastChild.textContent = text;
      el.appendChild(r);
    });
    rail.appendChild(el);
    return el;
  };

  window.MF = MF;
})();
