(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = window.DROPLATES_DATA;
  const KEY = 'droplates-saved';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eur = n => n === 0 ? '€0' : '€' + n.toFixed(2).replace('.00', '');

  /* Wishlist buttons on product pages */
  $$('.wish').forEach(b => {
    const set = () => { const on = read().includes(b.dataset.slug); b.setAttribute('aria-pressed', on); b.textContent = on ? 'Saved' : 'Save to wishlist'; };
    b.addEventListener('click', () => { const s = read(), i = s.indexOf(b.dataset.slug); i > -1 ? s.splice(i, 1) : s.push(b.dataset.slug); write(s); set(); });
    set();
  });

  /* Device switch on product pages */
  $$('.pshot .device-switch button').forEach(b => b.addEventListener('click', () => {
    $$('.pshot .device-switch button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    $('.frame').dataset.size = b.dataset.size;
  }));

  /* Saved page */
  const savedEl = $('#saved');
  if (savedEl && D) {
    const ids = read(), items = D.templates.filter(t => ids.includes(t.slug));
    $('#semp').hidden = items.length > 0;
    savedEl.innerHTML = items.map(t => `<a class="tcard" href="/templates/${t.slug}/"><div class="tthumb ${t.tier}"><i></i><i></i><i></i><i></i></div><div class="tbody"><h3>${esc(t.name)}</h3><p>${esc(D.meta.categories[t.category])}</p><div class="trow"><span class="price">${eur(t.price)}</span><span class="status">Planned</span></div></div></a>`).join('');
  }

  /* Catalog filters */
  const grid = $('#grid');
  if (grid && D) {
    const q = $('#q'), fc = $('#f-cat'), fp = $('#f-plat'), ft = $('#f-tier'), fpr = $('#f-price');
    const fromURL = () => { const p = new URLSearchParams(location.search); [[q, 'q'], [fc, 'cat'], [fp, 'plat'], [ft, 'tier'], [fpr, 'price']].forEach(([el, k]) => { if (p.has(k)) el.value = p.get(k); }); };
    const toURL = () => { const p = new URLSearchParams(); [[q, 'q'], [fc, 'cat'], [fp, 'plat'], [ft, 'tier'], [fpr, 'price']].forEach(([el, k]) => { if (el.value) p.set(k, el.value); }); history.replaceState(null, '', p.toString() ? '?' + p : location.pathname); };
    const templatesBySlug = new Map(D.templates.map(template => [template.slug, template]));
    const cards = $$('.tcard', grid).map(card => {
      const template = templatesBySlug.get(card.dataset.slug);
      const searchText = [template.name, template.summary, ...template.tags, D.meta.categories[template.category]].join(' ').toLowerCase();
      return { card, template, searchText };
    });
    const apply = () => {
      const term = q.value.trim().toLowerCase();
      let n = 0;
      cards.forEach(({ card, template: t, searchText }) => {
        const ok = (!term || searchText.includes(term))
          && (!fc.value || t.category === fc.value)
          && (!fp.value || t.platforms.includes(fp.value))
          && (!ft.value || t.tier === ft.value)
          && (!fpr.value || t.price <= +fpr.value);
        card.hidden = !ok; if (ok) n++;
      });
      $('#count').textContent = n + (n === 1 ? ' template' : ' templates');
      $('#empty').hidden = n > 0;
      toURL();
    };
    fromURL();
    [q, fc, fp, ft, fpr].forEach(el => el.addEventListener('input', apply));
    apply();
  }

  /* Droplates Match: catalog-based scoring, runs in the browser */
  const form = $('#match');
  if (form && D) {
    const score = (t, goal, plat, budget, words) => {
      if (plat !== 'any' && !t.platforms.includes(plat)) return null;
      if (t.budget > budget) return null;
      let s = 0; const reasons = [];
      if (t.goals.includes(goal)) { s += 50; reasons.push('Built for: ' + D.meta.goals[goal].toLowerCase()); }
      if (plat !== 'any') { s += 20; reasons.push('Works on ' + D.meta.platforms[plat]); }
      s += Math.max(0, 15 - (t.budget - 1) * 5 - (t.price > 0 ? 0 : 0));

      const hits = t.tags.filter(tag => words.some(w => tag.includes(w) || w.includes(tag)));
      if (hits.length) { s += 10 * hits.length; reasons.push('Matches your description: ' + hits.join(', ')); }
      return { t, s, reasons };
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const goal = (form.elements.goal.value || '');
      if (!goal) { $('#merr').textContent = 'Choose a goal to continue.'; form.elements.goal[0].focus(); return; }
      $('#merr').textContent = '';
      const plat = form.elements.plat.value, budget = +form.elements.budget.value, desc = $('#desc').value;
      const words = desc.toLowerCase().split(/[^a-z]+/).filter(word => word.length > 3);
      const ranked = D.templates.map(t => score(t, goal, plat, budget, words)).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 3);
      const out = $('#results');
      out.innerHTML = ranked.length ? ranked.map(r => `<a class="rcard" href="/templates/${r.t.slug}/">
        <div><span class="tier">${D.meta.tiers[r.t.tier]}</span><h3>${esc(r.t.name)}</h3><p>${esc(r.reasons.join('. ') || r.t.summary)}.</p>
        <ul>${r.t.platforms.map(p => `<li>${D.meta.platforms[p]}</li>`).join('')}</ul></div>
        <div class="rscore">${eur(r.t.price)}<b>${Math.min(99, Math.round(r.s))}</b>match</div></a>`).join('')
        : '<p class="rnone">No template fits these answers yet. Try a higher budget or any platform, or <a href="/custom/">request a custom quote</a>.</p>';
      out.focus && out.setAttribute('tabindex', '-1');
    });
  }

  /* Quote and support forms: validation only, no delivery yet */
  const validate = f => { for (const el of $$('[required]', f)) { if (el.type === 'checkbox' ? !el.checked : !el.value.trim()) return el; if (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value)) return el; } return null; };
  const bind = (id, errId, doneId, msg) => {
    const f = document.getElementById(id); if (!f) return;
    f.addEventListener('submit', e => {
      e.preventDefault();
      const bad = validate(f);
      if (bad) { $('#' + errId).textContent = msg; bad.focus(); return; }
      $('#' + errId).textContent = '';
      f.hidden = true; document.getElementById(doneId).hidden = false;
    });
  };
  bind('quote', 'qerr', 'qdone', 'Please complete the required fields. Email must be valid and consent is needed.');
  bind('support', 'serr', 'sdone', 'Please complete the required fields.');
})();
/* Template preview viewer */
(() => {
  const frame = document.getElementById('pv-frame'); if (!frame) return;
  const D = window.DROPLATES_DATA, slug = new URLSearchParams(location.search).get('t');
  const t = D && D.templates.find(x => x.slug === slug);
  if (!t || !t.preview_url) { frame.hidden = true; document.getElementById('pv-empty').hidden = false; return; }
  document.title = t.name + ' preview — Droplates';
  document.getElementById('pv-name').textContent = t.name + ' · ' + D.meta.tiers[t.tier];
  frame.src = t.preview_url; frame.title = t.name + ' preview';
  document.getElementById('pv-open').href = t.preview_url;
  document.getElementById('pv-info').href = '../templates/' + t.slug + '/';
  document.querySelectorAll('.pv-bar .device-switch button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.pv-bar .device-switch button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    frame.style.width = b.dataset.w;
  }));
})();
