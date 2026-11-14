// Droplates end-to-end checks. Usage: python3 -m http.server 8766 (repo root), then: node tests/run.js
// Requires Playwright (available in dev environment; not shipped to customers).
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const BASE = process.env.BASE || 'http://localhost:8766/';
const ROOT = path.join(__dirname, '..');
const SITE = process.env.DROPLATES_SITE || path.join(ROOT, '..', 'droplates-frontend');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/templates.json')));
const FREE = data.templates.filter(t => t.status === 'released');
let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? pass++ : fail++; console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(p.url() + ' ' + e.message));

  console.log('Product metadata');
  for (const t of FREE) {
    const m = JSON.parse(fs.readFileSync(path.join(SITE, 'products', t.slug, 'manifest.json')));
    ok(m.presets.length === 3 && t.presets.length === 3, `${t.slug}: 3 presets`);
    ok(m.pages.length === t.pages.length, `${t.slug}: pages match catalog (${t.pages.length})`);
    ok(m.files.every(f => fs.existsSync(path.join(SITE, 'products', t.slug, f))), `${t.slug}: all manifest files exist`);
    ok(m.edition === 'free' && m.editions.premium.status === 'planned' && m.editions.pro.status === 'planned', `${t.slug}: edition model (free released, premium/pro planned)`);
    ok(!m.files.some(f => /premium|pro\//i.test(f)), `${t.slug}: no paid files in free package`);
  }

  console.log('Site crawl (internal links)');
  const seen = new Set(), queue = [''];
  while (queue.length) {
    const u = queue.shift(); if (seen.has(u)) continue; seen.add(u);
    const r = await p.goto(BASE + u); if (!r || r.status() !== 200) { ok(false, 'route ' + u + ' → ' + (r && r.status())); continue; }
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)));
    for (const l of links) { const rel = l.replace(/^https?:\/\/[^/]+\//, '').split('#')[0].split('?')[0]; if (!seen.has(rel) && !rel.startsWith('studio') && !rel.startsWith('preview')) queue.push(rel); }
  }
  ok(seen.size > 30, `crawled ${seen.size} pages, all returned 200`);

  console.log('Catalog');
  await p.goto(BASE + 'templates/'); await p.fill('#q', 'portfolio'); await p.waitForTimeout(200);
  ok(await p.locator('.tcard:visible').count() >= 1, 'search finds portfolio');
  await p.goto(BASE + 'templates/?tier=free'); await p.waitForTimeout(200);
  ok(await p.locator('.tcard:visible').count() === 3, 'free filter shows 3 templates');

  console.log('Customer journey: catalog → product → Studio → ZIP');
  for (const t of FREE) {
    await p.goto(BASE + 'templates/'); await p.click(`.tcard[data-slug="${t.slug}"]`); await p.waitForLoadState();
    ok(p.url().includes('/templates/' + t.slug + '/'), `${t.slug}: product page opens`);
    await p.click('text=Customize'); await p.waitForSelector('#pages .row'); await p.waitForTimeout(300);
    ok(p.url().includes('studio/?t=' + t.slug), `${t.slug}: Customize opens Studio`);
    await p.click('.tabs [data-tab=style]'); await p.click(`#p-style .chips button:text-is("${t.presets[1].toLowerCase()}")`); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('frame').contentDocument.documentElement.dataset.preset) === t.presets[1].toLowerCase(), `${t.slug}: preset applies in preview`);
    await p.click('#p-style .chips button:text-is("dark")'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('frame').contentDocument.documentElement.dataset.theme) === 'dark', `${t.slug}: theme switch`);
    const invalid = await p.evaluate(() => document.getElementById('frame').contentWindow.SITE.validate({ preset: 'nope', theme: 'x', style: { accent: 'red;}body{', font: 'Comic' }, hero: { ctaUrl: 'javascript:alert(1)' } }));
    ok(invalid.preset !== 'nope' && invalid.style.accent !== 'red;}body{' && !/javascript/.test(invalid.hero ? invalid.hero.ctaUrl || '' : ''), `${t.slug}: config validation rejects invalid values`);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dz-')); const zp = path.join(dir, 'x.zip'); await dl.saveAs(zp);
    execFileSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zp, dir]);
    const site = path.join(dir, 'droplates-' + t.slug);
    ok(['README.md', 'LICENSE.txt', 'config.js', 'index.html'].every(f => fs.existsSync(path.join(site, f))), `${t.slug}: ZIP has README, LICENSE, config, pages`);
    const q = await ctx.newPage(); await q.goto('file://' + site + '/index.html');
    ok(await q.evaluate(() => document.documentElement.dataset.preset + '/' + document.documentElement.dataset.theme) === t.presets[1].toLowerCase() + '/dark', `${t.slug}: exported site keeps settings without Droplates`);
    for (const f of fs.readdirSync(site).filter(f => f.endsWith('.html'))) { await q.goto('file://' + site + '/' + f); if (!await q.evaluate(() => !!window.SITE)) ok(false, `${t.slug}: exported ${f} loads`); }
    await q.close();
    // product page Download free button
    await p.goto(BASE + 'templates/' + t.slug + '/');
    const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click("text=Download free")]);
    ok(!!dl2, `${t.slug}: Download free on product page delivers a ZIP`);
  }

  console.log('Studio 2.0');
  {
    const fr = () => p.evaluate(() => document.getElementById('frame').contentDocument);
    await p.goto(BASE + 'studio/?t=saas'); await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForSelector('#sections .row'); await p.waitForTimeout(500);
    ok(await p.locator('#sections .row').count() >= 4, 'section manager lists sections');
    // click-to-edit a text element
    const key = await p.evaluate(() => document.getElementById('frame').contentDocument.querySelector('[data-e]').dataset.e);
    await p.frameLocator('#frame').locator(`[data-e="${key}"]`).click();
    await p.waitForSelector('#p-element textarea');
    await p.fill('#p-element textarea', 'Edited by test'); await p.waitForTimeout(300);
    ok(await p.evaluate(k => document.getElementById('frame').contentDocument.querySelector(`[data-e="${k}"]`).textContent, key) === 'Edited by test', 'click-to-edit updates the preview');
    await p.fill('#p-element textarea', '<img src=x onerror=alert(1)>'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !document.getElementById('frame').contentDocument.querySelector('main img[src="x"]')), 'edited text is never inserted as HTML');
    await p.fill('#p-element textarea', 'Edited by test'); await p.waitForTimeout(1300);
    // undo / redo
    await p.click('#undo'); await p.waitForTimeout(200);
    const afterUndo = await p.evaluate(k => document.getElementById('frame').contentDocument.querySelector(`[data-e="${k}"]`).textContent, key);
    await p.click('#redo'); await p.waitForTimeout(200);
    const afterRedo = await p.evaluate(k => document.getElementById('frame').contentDocument.querySelector(`[data-e="${k}"]`).textContent, key);
    ok(afterUndo !== 'Edited by test' && afterRedo === 'Edited by test', 'undo and redo');
    // section hide + persistence across pages
    const sid = await p.evaluate(() => [...document.getElementById('frame').contentDocument.querySelectorAll('[data-s-optional="true"]')][0].dataset.s);
    await p.click('#sections .row:nth-child(2) .act >> nth=0'); await p.waitForTimeout(200);
    ok(await p.evaluate(s => document.getElementById('frame').contentDocument.querySelector(`[data-s="${s}"]`).hidden, sid), 'hide section');
    await p.click('#pages .row:nth-child(2)'); await p.waitForTimeout(1200); await p.click('#pages .row:nth-child(1)'); await p.waitForTimeout(1200);
    ok(await p.evaluate(k => document.getElementById('frame').contentDocument.querySelector(`[data-e="${k}"]`).textContent, key) === 'Edited by test', 'edits persist across page switches');
    // link edit + validation
    const lk = await p.evaluate(() => document.getElementById('frame').contentDocument.querySelector('[data-el]').dataset.el);
    await p.frameLocator('#frame').locator(`[data-el="${lk}"]`).click(); await p.waitForTimeout(200);
    await p.fill('#p-element input[type=text]', 'javascript:alert(1)'); await p.waitForTimeout(200);
    ok(!/javascript/.test(await p.evaluate(k => document.getElementById('frame').contentDocument.querySelector(`[data-el="${k}"]`).getAttribute('href'), lk)), 'unsafe link rejected');
    await p.fill('#p-element input[type=text]', 'about.html'); await p.waitForTimeout(200);
    ok(await p.evaluate(k => document.getElementById('frame').contentDocument.querySelector(`[data-el="${k}"]`).getAttribute('href'), lk) === 'about.html', 'link edit applied');
    // brand kit save + apply to other template
    p.once('dialog', d => d.accept('Test kit'));
    await p.click('.tabs [data-tab=brand]'); await p.fill('#p-brand input[type=text] >> nth=0', 'KitBrand'); await p.waitForTimeout(300); await p.click('text=Save current as kit'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('droplates-brandkits')).some(k => k.name === 'Test kit' && k.brand.name === 'KitBrand')), 'brand kit saved');
    await p.goto(BASE + 'studio/?t=agency'); await p.waitForSelector('#pages .row'); await p.waitForTimeout(500);
    await p.click('.tabs [data-tab=brand]'); await p.click('.kit:has-text("Test kit") >> text=Apply'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('frame').contentDocument.querySelector('[data-c="brand.name"]').textContent) === 'KitBrand', 'brand kit applies to another template');
    // drafts export -> import round trip
    await p.click('#drafts-btn'); const [cf] = await Promise.all([p.waitForEvent('download'), p.click('#draft-export')]);
    const cp = path.join(os.tmpdir(), 'cfg-' + Date.now() + '.json'); await cf.saveAs(cp);
    const cj = JSON.parse(fs.readFileSync(cp)); ok(cj.droplates === 'config' && cj.config.brand.name === 'KitBrand', 'configuration export');
    // schema 1 migration
    const mig = await p.evaluate(() => document.getElementById('frame').contentWindow.SITE.validate({ schema: 1, preset: 'studio', brand: { name: 'Old' } }));
    ok(mig.schema === 2 && mig.preset === 'studio' && mig.brand.name === 'Old' && typeof mig.content === 'object', 'schema 1 config migrates to schema 2');
    // export keeps click-to-edit content offline
    await p.goto(BASE + 'studio/?t=saas'); await p.waitForSelector('#pages .row'); await p.waitForTimeout(500);
    const [dz] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'dz2-')); await dz.saveAs(d2 + '/x.zip');
    execFileSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', d2 + '/x.zip', d2]);
    const q2 = await ctx.newPage(); await q2.goto('file://' + d2 + '/droplates-saas/index.html');
    ok(await q2.evaluate(k => document.querySelector(`[data-e="${k}"]`).textContent, key) === 'Edited by test' && await q2.evaluate(s => document.querySelector(`[data-s="${s}"]`).hidden, sid), 'exported site keeps edited text and hidden sections');
    ok(await q2.evaluate(() => !document.getElementById('dp-edit') && !document.getElementById('dp-tag')), 'exported site has no editor UI');
    await q2.close();
  }

  console.log('Roadmap 1 (legacy pricing, comparison columns)');
  {
    const P = BASE + 'products/saas/';
    // Inject extra config after config.js loads, without touching the shipped file.
    const inject = async (page, js) => {
      await page.route(P + 'config.js', async route => {
        const res = await route.fetch(); const body = (await res.text()) + ';' + js;
        await route.fulfill({ response: res, body, headers: { ...res.headers(), 'cache-control': 'no-store' } });
      });
    };
    await inject(p, "window.SITE_CONFIG.content={'pricing-t5':'Free plan','pricing-t11':'Growth','pricing-t9':'Chat support','pricing-t12':' /mo'};window.SITE_CONFIG.links={'pricing-l2':'contact.html'};");
    await p.goto(P + 'pricing.html'); await p.waitForTimeout(300);
    ok((await p.locator('.plan h3').allInnerTexts()).join('|') === 'Free plan|Growth|Team', 'legacy pricing names move into their plans');
    ok((await p.locator('.plan').nth(0).innerText()).includes('Chat support') && (await p.locator('.plan').nth(1).locator('.pr small').innerText()).trim() === '/mo', 'legacy feature and period values move into their plans');
    await p.unroute(P + 'config.js');

    await inject(p, "window.SITE_CONFIG.compare[0].rows[0].values=['1'];");
    await p.goto(P + 'pricing.html'); await p.waitForTimeout(300);
    ok((await p.evaluate(() => [...document.querySelectorAll('.cmp tbody tr:not(.grp)')][0].innerText.replace(/\s+/g, ' ').trim())) === 'Projects 1 — —', 'short comparison rows are padded with dashes');
    await p.unroute(P + 'config.js');

    await p.goto(BASE + 'studio/?t=saas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#pages .row'); await p.waitForTimeout(500);
    await p.click('#pages .row:has-text("Pricing")'); await p.waitForTimeout(1200);
    await p.frameLocator('#frame').locator('.plan h3').nth(1).click(); await p.waitForTimeout(200);
    await p.click('#p-element button:text-is("Duplicate")'); await p.waitForTimeout(400);
    const rowVals = await p.evaluate(() => {
      const raw = localStorage.getItem('droplates-studio-saas'); if (!raw) return null;
      const find = o => { if (!o || typeof o !== 'object') return null; if (Array.isArray(o.compare)) return o; for (const k of Object.keys(o)) { const r = find(o[k]); if (r) return r; } return null; };
      const cfg = find(JSON.parse(raw)); const row = cfg && cfg.compare[0] && cfg.compare[0].rows[1]; return row ? row.values : null;
    });
    ok(JSON.stringify(rowVals) === JSON.stringify(['10k', '1M', '1M', '10M']), 'Studio duplicate of a plan adds a matching comparison column');
  }

  console.log('Agency v1.1 (packages: price, highlight, compatibility)');
  {
    const A = BASE + 'products/agency/';
    const inject = async (page, js) => {
      await page.route(A + 'config.js', async route => {
        const res = await route.fetch(); const body = (await res.text()) + ';' + js;
        await route.fulfill({ response: res, body, headers: { ...res.headers(), 'cache-control': 'no-store' } });
      });
    };
    const cards = () => p.evaluate(() => [...document.querySelectorAll('.pk article')].map(a => ({ name: a.querySelector('h3').textContent, price: a.querySelector('.pr').textContent, hl: a.classList.contains('hl') })));

    await p.goto(A + 'services.html'); await p.waitForTimeout(300);
    let c = await cards();
    ok(c.length === 3 && c.map(x => x.name).join('|') === 'Brand starter|Full identity|Website', 'packages render from config (three cards)');
    ok(c.every(x => x.price === 'Price on request'), 'empty price falls back to "Price on request"');
    ok(c[1].hl && !c[0].hl && !c[2].hl, 'middle package is highlighted by default');
    const btn = await p.evaluate(() => { const hb = getComputedStyle(document.querySelector('.pk .hl .btn')).backgroundColor, card = getComputedStyle(document.querySelector('.pk .hl')).backgroundColor; return { hb, card }; });
    ok(btn.hb !== btn.card, 'highlighted card button is visible (not the same colour as the card)');
    await p.unroute(A + 'config.js');

    await inject(p, "window.SITE_CONFIG.packages[0].price='From €1,200';window.SITE_CONFIG.packages[1].price='';window.SITE_CONFIG.packages[2].price='Custom quote';");
    await p.goto(A + 'services.html'); await p.waitForTimeout(300);
    c = await cards();
    ok(c[0].price === 'From €1,200' && c[1].price === 'Price on request' && c[2].price === 'Custom quote', 'custom price text is shown as typed; blank shows the default');
    await p.unroute(A + 'config.js');

    await inject(p, "window.SITE_CONFIG.packages.forEach(x => x.highlight = false);");
    await p.goto(A + 'services.html'); await p.waitForTimeout(300);
    ok((await cards()).every(x => !x.hl), 'highlight can be turned off for every package');
    await p.unroute(A + 'config.js');

    await inject(p, "window.SITE_CONFIG.packages.forEach((x, i) => x.highlight = i === 0);");
    await p.goto(A + 'services.html'); await p.waitForTimeout(300);
    c = await cards();
    ok(c[0].hl && !c[1].hl, 'highlight moves to whichever package is switched on');
    await p.unroute(A + 'config.js');

    // Backwards compatibility: an older config without packages hides the section and leaves the rest of the page working.
    await inject(p, "delete window.SITE_CONFIG.packages;");
    await p.goto(A + 'services.html'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('[data-list="packages"]').closest('section')).display === 'none'), 'older config without packages hides the packages section');
    ok(await p.locator('h1').first().isVisible(), 'older config keeps the rest of Services page');
    await p.unroute(A + 'config.js');

    // Old pages/config still use the same content keys.
    await p.goto(A + 'index.html'); await p.waitForTimeout(300);
    ok(await p.locator('h1').first().isVisible(), 'home page still renders with packages config present');

    // Studio: highlight checkbox and price field edit the package and save to the draft.
    await p.goto(BASE + 'studio/?t=agency'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#pages .row'); await p.waitForTimeout(500);
    await p.click('#pages .row:has-text("Services")'); await p.waitForTimeout(1200);
    await p.frameLocator('#frame').locator('.pk article h3').nth(1).click(); await p.waitForTimeout(300);
    await p.locator('#p-element label:has-text("Highlight") input').uncheck(); await p.waitForTimeout(300);
    await p.frameLocator('#frame').locator('.pk article h3').nth(0).click(); await p.waitForTimeout(300);
    await p.locator('#p-element label:has-text("Price") input').fill('From €1,200'); await p.waitForTimeout(300);
    await p.waitForTimeout(400);
    const studioState = await p.evaluate(() => {
      const raw = localStorage.getItem('droplates-studio-agency'); if (!raw) return null;
      const find = o => { if (!o || typeof o !== 'object') return null; if (Array.isArray(o.packages)) return o; for (const k of Object.keys(o)) { const r = find(o[k]); if (r) return r; } return null; };
      const cfg = find(JSON.parse(raw)); return cfg ? cfg.packages : null;
    });
    ok(studioState && studioState[1].highlight === false, 'Studio Highlight checkbox turns a package highlight off and saves it');
    ok(studioState && studioState[0].price === 'From €1,200', 'Studio price field saves a custom price');
    ok(await p.evaluate(() => document.getElementById('frame').contentDocument.querySelector('.pk article .pr').textContent === 'From €1,200'), 'Studio preview shows the custom price');
  }

  console.log('SaaS v1.1 (lists, tour, comparison, banner, changelog)');
  {
    const P = BASE + 'products/saas/';
    await p.goto(P + 'pricing.html'); await p.waitForTimeout(300);
    ok(await p.locator('.plans .plan').count() === 3, 'pricing cards render from config list');
    ok(await p.locator('.cmp thead th').count() === 4 && await p.locator('.cmp tbody tr:not(.grp)').count() === 8, 'comparison table renders header and rows');
    ok(await p.evaluate(() => [...document.querySelectorAll('.cmp tbody tr:not(.grp)')][0].innerText.replace(/\s+/g, ' ').trim()) === 'Projects 1 Unlimited Unlimited', 'nested list values are correct (not taken from outer item)');
    await p.click('.toggle [data-p=y]'); ok((await p.locator('.plan.pop .pr').innerText()).startsWith('€24'), 'monthly/yearly switch uses list data');
    await p.goto(P + 'index.html'); await p.waitForTimeout(300);
    ok(await p.locator('[data-show="announcement.enabled"]').isHidden(), 'announcement banner off by default');
    await p.click('.walk li:nth-of-type(3)'); ok(await p.evaluate(() => [...document.querySelectorAll('[data-shots] > [data-gen]')].map(s => s.hidden).join()) === 'true,true,false,true', 'tour step click shows its screenshot');
    ok(await p.locator('.ints > div').count() === 6 && !/slack|stripe|postgres|segment/i.test(await p.locator('.ints').innerText()), 'integrations use generic labels');
    await p.goto(P + 'changelog.html'); ok(await p.locator('.entry').count() === 3, 'changelog page renders entries');
    // Studio: enable banner, edit list, duplicate a plan
    await p.goto(BASE + 'studio/?t=saas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#pages .row'); await p.waitForTimeout(500);
    await p.click('.tabs [data-tab=settings]'); await p.check('#p-settings input[type=checkbox]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.getElementById('frame').contentDocument.querySelector('[data-show="announcement.enabled"]').hidden), 'Studio toggle shows the banner');
    await p.click('#pages .row:has-text("Pricing")'); await p.waitForTimeout(1200);
    await p.frameLocator('#frame').locator('.plan h3').nth(1).click(); await p.waitForTimeout(200);
    await p.fill('#p-element textarea', 'Growth'); await p.waitForTimeout(200);
    ok((await p.evaluate(() => [...document.getElementById('frame').contentDocument.querySelectorAll('.cmp thead th')].map(t => t.textContent).join('|'))).endsWith('Starter|Growth|Team'), 'editing a plan name updates cards and comparison header');
    await p.click('#p-element button:text-is("Duplicate")'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('frame').contentDocument.querySelectorAll('.plans .plan').length) === 4, 'duplicate a list item');
    await p.click('#undo'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('frame').contentDocument.querySelectorAll('.plans .plan').length) === 3, 'undo list change');
    const [dz] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
    const d3 = fs.mkdtempSync(path.join(os.tmpdir(), 'dz3-')); await dz.saveAs(d3 + '/x.zip');
    execFileSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', d3 + '/x.zip', d3]);
    ok(fs.existsSync(d3 + '/droplates-saas/changelog.html'), 'export includes the changelog page');
    const q3 = await ctx.newPage(); await q3.goto('file://' + d3 + '/droplates-saas/pricing.html');
    ok((await q3.locator('.plan h3').nth(1).innerText()) === 'Growth' && await q3.locator('[data-show="announcement.enabled"]').isVisible(), 'exported site keeps list edits and banner setting');
    await q3.close();
  }

  console.log('Portfolio v1.1 (projects list, featured, filters, case study, CV)');
  {
    const P = BASE + 'products/portfolio/';
    await p.goto(P + 'index.html'); await p.waitForTimeout(300);
    ok(await p.locator('.grid .it').count() === 6 && await p.locator('.feat h2').innerText() === 'Northpeak identity', 'home renders 6 projects and the featured project');
    ok(await p.locator('.chips [data-f]').count() === 5, 'filter buttons built from categories');
    await p.click('.chips [data-f=Print]'); ok(await p.locator('.grid .it:visible').count() === 2, 'category filter works');
    ok(await p.locator('.avail').isVisible(), 'availability badge shown');
    await p.goto(P + 'project.html?p=fieldwork'); await p.waitForTimeout(200);
    ok(await p.locator('.case-hero h1').innerText() === 'Fieldwork journal' && await p.locator('.gal .im').count() === 5 && (await p.locator('.next a').innerText()).startsWith('Cascade'), 'case study chosen by ?p= with gallery and next project');
    await p.goto(P + 'project.html?p=unknown'); ok(await p.locator('.case-hero h1').innerText() === 'Northpeak identity', 'unknown project falls back to the first');
    await p.goto(P + 'about.html'); ok(await p.locator('.cvdl').isHidden(), 'CV card hidden until a PDF is added');
    // Studio: edit project fields, featured, duplicate with unique slug, CV upload, image upload, export
    await p.goto(BASE + 'studio/?t=portfolio'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#pages .row'); await p.waitForTimeout(600);
    await p.frameLocator('#frame').locator('.grid .it b').nth(1).click(); await p.waitForTimeout(200);
    ok(await p.locator('#p-element label:has-text("Featured") input[type=checkbox]').count() === 1 && await p.evaluate(() => [...document.querySelectorAll('#p-element input[type=text]')].some(i => i.value.includes('Interface'))), 'project panel shows all fields (featured, tags)');
    await p.locator('#p-element label:has-text("Featured") input').check(); await p.waitForTimeout(200);
    await p.click('#p-element button:text-is("Duplicate")'); await p.waitForTimeout(300);
    const slugs = await p.evaluate(() => JSON.parse(localStorage.getItem('droplates-studio-portfolio')).projects.map(x => x.slug));
    ok(slugs.length === 9 && new Set(slugs).size === 9 && slugs.includes('lumen-copy'), 'duplicate project gets a unique slug');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await p.frameLocator('#frame').locator('.grid .it .im').first().click(); await p.waitForTimeout(200);
    await p.setInputFiles('#p-element input[type=file]', { name: 'p.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(300);
    await p.click('.tabs [data-tab=settings]');
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    await p.setInputFiles('#p-settings input[type=file]', { name: 'cv.pdf', mimeType: 'application/pdf', buffer: pdf }); await p.waitForTimeout(300);
    await p.click('#pages .row:has-text("About")'); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => !document.getElementById('frame').contentDocument.querySelector('.cvdl').hidden), 'CV upload shows the download card');
    const [dz] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
    const d4 = fs.mkdtempSync(path.join(os.tmpdir(), 'dz4-')); await dz.saveAs(d4 + '/x.zip');
    execFileSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', d4 + '/x.zip', d4]);
    const site = d4 + '/droplates-portfolio/';
    ok(fs.existsSync(site + 'assets/cv.pdf') && fs.readdirSync(site + 'assets').some(f => /^img-projects-0\.png$/.test(f)), 'export writes CV and project image as files');
    const q4 = await ctx.newPage(); await q4.goto('file://' + site + 'index.html'); await q4.waitForTimeout(200);
    ok(await q4.locator('.grid .it').count() === 6 && await q4.locator('.feat h2').innerText() === 'Northpeak identity', 'exported home renders projects offline');
    await q4.goto('file://' + site + 'project.html?p=lumen-copy');
    ok(await q4.locator('.case-hero h1').innerText() === 'Lumen app', 'exported case study for duplicated project works');
    await q4.goto('file://' + site + 'about.html'); ok(await q4.locator('.cvdl a').getAttribute('href') === 'assets/cv.pdf', 'exported CV link points to the file');
    await q4.close();
  }

  console.log('Mobile');
  const m = await b.newContext({ ...devices['iPhone 13'] }); const mp = await m.newPage();
  for (const u of ['', 'templates/', 'templates/saas/', 'studio/?t=saas', ...FREE.map(t => 'products/' + t.slug + '/index.html'), 'products/saas/pricing.html', 'products/saas/changelog.html', 'products/portfolio/project.html', 'products/portfolio/projects.html']) {
    await mp.goto(BASE + u); await mp.waitForTimeout(400);
    ok(await mp.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no horizontal scroll: /' + u);
  }
  ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
