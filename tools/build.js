// Generates static pages from data/templates.json. No framework, no dependencies.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = process.env.DROPLATES_SITE || path.join(ROOT, '..', 'droplates-frontend');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/templates.json'), 'utf8'));
const M = D.meta, T = D.templates;
const eur = n => n === 0 ? '€0' : '€' + n.toFixed(2).replace('.00', '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const write = (rel, html) => { const f = path.join(SITE, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const head = (title, desc, depth) => {
  const up = '../'.repeat(depth);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Droplates</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#080808">
<link rel="icon" href="${up}favicon.ico" sizes="any"><link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<meta property="og:title" content="${esc(title)} — Droplates"><meta property="og:image" content="https://droplates.com/og-banner.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}styles.css"><link rel="stylesheet" href="${up}pages.css">
</head><body>
<header class="nav"><div class="wrap nav-inner">
  <a href="${up}" class="brand"><img src="${up}logo-mark.png" class="logo" alt="" width="20" height="20">Droplates</a>
  <nav class="links" aria-label="Main">
    <a href="${up}templates/">Templates</a><a href="${up}match/">Match</a><a href="${up}custom/">Custom</a><a href="${up}docs/">Docs</a><a href="${up}saved/">Saved</a>
  </nav>
  <span class="pill"><span class="dot" aria-hidden="true"></span>In development</span>
</div></header>
<main>`;
};
const foot = depth => {
  const up = '../'.repeat(depth);
  return `</main>
<footer class="wrap footer">
  <div class="foot-top">
    <div class="foot-brand"><a href="${up}" class="brand"><img src="${up}logo-mark.png" class="logo" alt="" width="20" height="20">Droplates</a><p>Pick, drop and launch.</p></div>
    <nav class="foot-social" aria-label="Social media">
      <a href="https://instagram.com/droplates" rel="noopener" aria-label="Instagram, @droplates"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></span></a>
      <a href="https://tiktok.com/@droplates" rel="noopener" aria-label="TikTok, @droplates"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 3v12.2a3.3 3.3 0 1 1-3.3-3.3"/><path d="M14 3c.4 2.6 2.1 4.3 4.7 4.6"/></svg></span></a>
      <a href="https://x.com/droplates" rel="noopener" aria-label="X, @droplates"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4l16 16M20 4 4 20"/></svg></span></a>
      <a href="https://www.linkedin.com/company/investedia" rel="noopener" aria-label="LinkedIn, Investedia"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/></svg></span></a>
      <a href="mailto:contact@droplates.eu" aria-label="Email, contact@droplates.eu"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span></a>
    </nav>
  </div>
  <nav class="foot-links" aria-label="Footer">
    <div><p class="fl-h">Explore</p><a href="${up}templates/">Templates</a><a href="${up}match/">Droplates Match</a><a href="${up}docs/">Documentation</a></div>
    <div><p class="fl-h">Company</p><a href="https://guidify.eu" rel="noopener">Guidify</a><a href="${up}custom/">Custom websites</a><a href="${up}support/">Support</a></div>
    <div><p class="fl-h">Legal</p><a href="${up}legal/terms/">Terms [to be confirmed]</a><a href="${up}legal/privacy/">Privacy [to be confirmed]</a><a href="${up}legal/licence/">Licence [to be confirmed]</a></div>
  </nav>
  <div class="foot-bottom">
    <p>Droplates is a product of <a href="https://guidify.eu" rel="noopener">Guidify</a>, a registered Belgian sole proprietorship.</p>
    <p>© ${new Date().getFullYear()} Guidify</p>
  </div>
</footer>
<script src="${up}pages.js" defer></script>
</body></html>`;
};
const card = t => `<a class="tcard" href="${'/templates/' + t.slug + '/'}" data-slug="${t.slug}">
  <div class="tthumb ${t.tier}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="tbody">
    <div class="trow"><span class="tier">${M.tiers[t.tier]}</span><span class="status">${t.status === 'released' ? 'Free download' : 'Planned'}</span></div>
    <h2>${esc(t.name)}</h2>
    <p>${esc(M.categories[t.category])}</p>
    <div class="trow"><span class="price">${eur(t.price)}</span><span class="plat">${t.platforms.map(p => M.platforms[p]).join(' · ')}</span></div>
  </div></a>`;

// ---- Catalog
write('templates/index.html', head('Templates', 'Browse Droplates website templates by category, platform, price and tier.', 1) + `
<section class="wrap page-head"><p class="eyebrow"><span>Catalog</span> Templates</p><h1>Website templates</h1><p class="sub">Planned templates. Each one is listed once its files are verified. Prices are one-time.</p></section>
<section class="wrap">
  <div class="filters" role="search">
    <input id="q" type="search" placeholder="Search templates" aria-label="Search templates">
    <select id="f-cat" aria-label="Category"><option value="">All categories</option>${Object.entries(M.categories).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <select id="f-plat" aria-label="Platform"><option value="">All platforms</option>${Object.entries(M.platforms).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <select id="f-tier" aria-label="Tier"><option value="">All tiers</option>${Object.entries(M.tiers).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <select id="f-price" aria-label="Price"><option value="">Any price</option><option value="0">Free</option><option value="25">Up to €25</option><option value="40">Up to €40</option></select>
  </div>
  <p class="count" id="count" aria-live="polite"></p>
  <div class="tgrid" id="grid">${T.map(card).join('')}</div>
  <p class="empty" id="empty" hidden>No templates match these filters.</p>
</section>
<script>window.DROPLATES_DATA = ${JSON.stringify(D)};</script>` + foot(1));

// ---- Product pages
for (const t of T) {
  const plats = t.platforms.map(p => `<li>${M.platforms[p]}</li>`).join('');
  write(`templates/${t.slug}/index.html`, head(t.name, t.summary, 2) + `
<section class="wrap product">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="../../templates/">Templates</a> / ${esc(t.name)}</nav>
  <div class="pgrid">
    <div>
      <div class="pshot" role="img" aria-label="${esc(t.name)} preview (planned)">
        <div class="device-switch" role="group" aria-label="Preview size">
          <button type="button" class="on" data-size="desktop" aria-pressed="true">Desktop</button>
          <button type="button" data-size="mobile" aria-pressed="false">Mobile</button>
        </div>
        <div class="frame" data-size="desktop">${t.preview_url ? `<iframe src="${t.preview_url}" title="${esc(t.name)} preview" loading="lazy" tabindex="-1"></iframe>` : '<div class="mock-page"><i></i><i></i><i></i><i></i></div>'}</div>
        ${t.preview_url ? `<p class="pnote"><a class="btn" href="../../preview/?t=${t.slug}">Open live preview</a></p>` : '<p class="pnote">Live preview is available once this template is verified.</p>'}
      </div>
      <h2 class="sec">About</h2><p class="lead2">${esc(t.summary)}</p>
      <h2 class="sec">Features</h2><ul class="feat">${t.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <h2 class="sec">Compatibility</h2><ul class="feat">${plats}</ul>
      <h2 class="sec">Licence</h2><p class="lead2">${esc(M.licence)}</p>
      <h2 class="sec">Documentation</h2><p class="lead2">Installation and customisation guide: <a href="../../docs/${t.slug}/">${esc(t.name)} docs</a> (planned).</p>
    </div>
    <aside class="buy">
      <p class="tier">${M.tiers[t.tier]} · <span class="status">Planned</span></p>
      <h1>${esc(t.name)}</h1>
      <p class="bcat">${esc(M.categories[t.category])}</p>
      <p class="bprice">${eur(t.price)}${t.price ? '<small> one-time</small>' : ''}</p>
      <button type="button" class="btn btn-primary wish" data-slug="${t.slug}" aria-pressed="false">Save to wishlist</button>
      ${t.status === 'released' ? `<div class="acts"><a class="btn btn-primary" href="../../studio/?t=${t.slug}">Customize</a><a class="btn" href="../../studio/?t=${t.slug}&download=1">Download free</a></div>
      <dl class="facts"><div><dt>Version</dt><dd>${esc(t.version)}</dd></div><div><dt>Pages</dt><dd>${t.pages.map(esc).join(', ')}</dd></div><div><dt>Style presets</dt><dd>${t.presets.length}: ${t.presets.map(esc).join(', ')}</dd></div><div><dt>Licence</dt><dd>Free licence (draft, to be confirmed)</dd></div></dl>`
      : '<p class="bnote">Purchasing is not available yet. Checkout will be added at launch.</p>'}
      <a class="link-arrow" href="../../match/">Find a template for my project ${ICON}</a>
    </aside>
  </div>
</section>` + foot(2));
}

// ---- Match
write('match/index.html', head('Droplates Match', 'Answer a few questions and get ranked template recommendations.', 1) + `
<section class="wrap page-head"><p class="eyebrow"><span>Match</span> Droplates Match</p><h1>Find the right template</h1><p class="sub">Answer a few questions. Matching runs in your browser. Nothing is sent or stored.</p></section>
<section class="wrap">
  <form class="match" id="match" novalidate>
    <fieldset><legend>1. What is your goal?</legend>
      <div class="opts" role="radiogroup">${Object.entries(M.goals).map(([k, v]) => `<label class="opt"><input type="radio" name="goal" value="${k}" required><span>${v}</span></label>`).join('')}</div>
    </fieldset>
    <fieldset><legend>2. Describe your project <small>(optional)</small></legend>
      <textarea id="desc" rows="3" maxlength="300" placeholder="e.g. a minimal portfolio for a photography studio"></textarea>
    </fieldset>
    <fieldset><legend>3. Preferred platform</legend>
      <div class="opts" role="radiogroup"><label class="opt"><input type="radio" name="plat" value="any" checked><span>Recommend one</span></label>${Object.entries(M.platforms).map(([k, v]) => `<label class="opt"><input type="radio" name="plat" value="${k}"><span>${v}</span></label>`).join('')}</div>
    </fieldset>
    <fieldset><legend>4. Budget</legend>
      <div class="opts" role="radiogroup">
        <label class="opt"><input type="radio" name="budget" value="1" checked><span>Free or under €25</span></label>
        <label class="opt"><input type="radio" name="budget" value="2"><span>Up to €30</span></label>
        <label class="opt"><input type="radio" name="budget" value="3"><span>Up to €40</span></label>
      </div>
    </fieldset>
    <div class="actions"><p class="error" id="merr" role="alert"></p><button type="submit" class="btn btn-primary">Show recommendations</button></div>
  </form>
  <div id="results" class="results" aria-live="polite"></div>
</section>
<script>window.DROPLATES_DATA = ${JSON.stringify(D)};</script>` + foot(1));

// ---- Custom services
write('custom/index.html', head('Custom websites', 'Custom website development by Guidify. Request a quote.', 1) + `
<section class="wrap page-head"><p class="eyebrow"><span>Custom</span> Custom websites</p><h1>A website built for your project.</h1><p class="sub">For businesses that need something a template can't cover. Pricing is quoted per project.</p>
  <div class="cta"><a class="btn btn-primary" href="quote/">Request a quote</a></div></section>
<section class="wrap block"><h2 class="h2">Who it's for</h2><div class="cols3">
  <div class="cell"><h3>E-commerce brands</h3><p>Storefronts with custom product and checkout flows.</p></div>
  <div class="cell"><h3>Service providers</h3><p>Booking, pricing and client-facing pages.</p></div>
  <div class="cell"><h3>Founders and startups</h3><p>Launch sites with custom sections and integrations.</p></div></div></section>
<section class="wrap block"><h2 class="h2">Types of website</h2><ul class="feat"><li>Multi-page business websites</li><li>Landing pages</li><li>Online stores (platform to be agreed)</li><li>Portfolio and agency sites</li></ul></section>
<section class="wrap block"><h2 class="h2">How it works</h2><ol class="steps2"><li><b>Brief</b><span>Send the questionnaire.</span></li><li><b>Quote</b><span>We reply with scope, timeline and price.</span></li><li><b>Build</b><span>Design, build and review together.</span></li><li><b>Launch</b><span>We help you go live.</span></li></ol></section>
<section class="wrap block cta-block"><h2 class="h2">Ready to start?</h2><a class="btn btn-primary" href="quote/">Request a quote</a></section>` + foot(1));

write('custom/quote/index.html', head('Request a quote', 'Tell us about your project to get a custom website quote.', 2) + `
<section class="wrap page-head"><p class="eyebrow"><span>Quote</span> Request a quote</p><h1>Tell us about your project</h1><p class="sub">We reply within [response time to be confirmed]. Your details are used only to answer this request.</p></section>
<section class="wrap">
<form class="qform" id="quote" novalidate action="#" method="post">
  <div class="qgrid">
    <label>Business or project type<select name="type" required><option value="">Choose…</option><option>E-commerce</option><option>Service business</option><option>Startup or SaaS</option><option>Agency or portfolio</option><option>Other</option></select></label>
    <label>Preferred platform<select name="platform"><option value="">No preference</option><option>HTML</option><option>WordPress</option><option>Shopify</option><option>Other</option></select></label>
    <label class="full">What is the website for?<textarea name="purpose" rows="3" required minlength="10" maxlength="600"></textarea></label>
    <label class="full">Required pages and features<textarea name="pages" rows="3" maxlength="600"></textarea></label>
    <label class="full">Design references (links)<input name="refs" type="url" placeholder="https://"></label>
    <label>Budget range<select name="budget" required><option value="">Choose…</option><option>Under €500</option><option>€500–€1,500</option><option>€1,500–€5,000</option><option>€5,000+</option><option>Not sure</option></select></label>
    <label>Desired timeline<select name="timeline" required><option value="">Choose…</option><option>Within 2 weeks</option><option>Within 1 month</option><option>1–3 months</option><option>Flexible</option></select></label>
    <label>Name<input name="name" required autocomplete="name"></label>
    <label>Email<input name="email" type="email" required autocomplete="email"></label>
    <label>Company <small>(optional)</small><input name="company" autocomplete="organization"></label>
    <label class="check full"><input type="checkbox" name="consent" required> I agree that Guidify may contact me about this request. See the <a href="../../legal/privacy/">privacy notice</a>.</label>
  </div>
  <p class="error" id="qerr" role="alert"></p>
  <div class="actions"><button type="submit" class="btn btn-primary">Send request</button></div>
  <p class="bnote">Form delivery is not connected yet. Submitting shows a confirmation only.</p>
</form>
<div id="qdone" class="done" hidden><h2>Thanks, your request is noted.</h2><p>Delivery is not connected yet, so this is a preview. Email <a href="mailto:contact@droplates.eu">contact@droplates.eu</a> in the meantime.</p></div>
</section>` + foot(2));

// ---- Support
write('support/index.html', head('Support', 'Contact Droplates support.', 1) + `
<section class="wrap page-head"><p class="eyebrow"><span>Support</span> Contact</p><h1>How can we help?</h1><p class="sub">Email us at <a href="mailto:contact@droplates.eu">contact@droplates.eu</a>. Include the template name if your question is about a product.</p></section>
<section class="wrap"><form class="qform" id="support" novalidate>
  <div class="qgrid">
    <label>Topic<select name="topic" required><option value="">Choose…</option><option>Template question</option><option>Installation help</option><option>Licence</option><option>Custom quote</option><option>Other</option></select></label>
    <label>Template <small>(optional)</small><select name="template"><option value="">Not about a template</option>${T.map(t => `<option value="${t.slug}">${esc(t.name)}</option>`).join('')}</select></label>
    <label>Email<input name="email" type="email" required></label>
    <label class="full">Message<textarea name="msg" rows="4" required minlength="10" maxlength="1000"></textarea></label>
  </div>
  <p class="error" id="serr" role="alert"></p>
  <div class="actions"><button type="submit" class="btn btn-primary">Send</button></div>
  <p class="bnote">Form delivery is not connected yet. Submitting shows a confirmation only.</p>
</form><div id="sdone" class="done" hidden><h2>Thanks, message noted.</h2><p>Delivery is not connected yet, so this is a preview.</p></div></section>` + foot(1));

// ---- Docs
write('docs/index.html', head('Documentation', 'Installation and customisation guides for Droplates templates.', 1) + `
<section class="wrap page-head"><p class="eyebrow"><span>Docs</span> Documentation</p><h1>Installation guides</h1><p class="sub">Each guide is written when the template is verified. Steps below are planned.</p></section>
<section class="wrap"><ul class="doclist">${T.map(t => `<li><a href="${t.slug}/"><b>${esc(t.name)}</b><span>${esc(M.platforms[t.platforms[0]])} · ${M.tiers[t.tier]} · Planned</span></a></li>`).join('')}</ul></section>` + foot(1));
for (const t of T.filter(x => x.status !== 'released')) write(`docs/${t.slug}/index.html`, head(t.name + ' docs', 'Installation and customisation guide for ' + t.name + '.', 2) + `
<section class="wrap page-head"><p class="eyebrow"><span>Docs</span> ${esc(t.name)}</p><h1>${esc(t.name)} guide</h1><p class="sub">Planned. Steps are written once the template is verified.</p></section>
<section class="wrap block"><ol class="steps2"><li><b>Download</b><span>Get the template files after purchase [flow to be confirmed].</span></li><li><b>Install</b><span>Platform steps: ${t.platforms.map(p => M.platforms[p]).join(', ')} [to be confirmed].</span></li><li><b>Customise</b><span>Edit text, images and colours.</span></li><li><b>Launch</b><span>Connect your domain and publish.</span></li></ol></section>` + foot(2));

// ---- Saved
write('saved/index.html', head('Saved templates', 'Your saved Droplates templates.', 1) + `
<section class="wrap page-head"><p class="eyebrow"><span>Saved</span> Wishlist</p><h1>Saved templates</h1><p class="sub">Saved in this browser only. No account needed.</p></section>
<section class="wrap"><div class="tgrid" id="saved"></div><p class="empty" id="semp">Nothing saved yet. <a href="../templates/">Browse templates</a>.</p>
<script>window.DROPLATES_DATA = ${JSON.stringify(D)};</script></section>` + foot(1));

// ---- Legal placeholders
const legal = [['terms','Terms of use'],['privacy','Privacy notice'],['licence','Licence terms']];
for (const [s, name] of legal) write(`legal/${s}/index.html`, head(name, name + ' for Droplates.', 2) + `
<section class="wrap page-head"><p class="eyebrow"><span>Legal</span> ${name}</p><h1>${name}</h1>
<p class="sub">[Text to be written and reviewed before launch.] Droplates is a product of Guidify, a registered Belgian sole proprietorship.</p></section>` + foot(2));

write('preview/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — Droplates</title><meta name="robots" content="noindex"><link rel="icon" href="../favicon.ico">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet"><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="../pages.css"></head>
<body class="pv-body"><header class="pv-bar">
  <a class="pv-back" href="../templates/" aria-label="Back to templates">← <img src="../logo-mark.png" alt="" width="18" height="18"></a>
  <p class="pv-name" id="pv-name">Preview</p>
  <div class="device-switch" role="group" aria-label="Preview size">
    <button type="button" class="on" data-w="100%" aria-pressed="true">Desktop</button><button type="button" data-w="820px" aria-pressed="false">Tablet</button><button type="button" data-w="390px" aria-pressed="false">Mobile</button>
  </div>
  <div class="pv-act"><a class="btn" id="pv-open" href="#" target="_blank" rel="noopener">Open in new tab</a><a class="btn btn-primary" id="pv-info" href="../templates/">Template details</a></div>
</header>
<main class="pv-stage"><iframe id="pv-frame" title="Template preview"></iframe><p class="pv-empty" id="pv-empty" hidden>No live preview for this template yet. <a href="../templates/">Back to templates</a>.</p></main>
<script>window.DROPLATES_DATA = ${JSON.stringify(D)};</script><script src="../pages.js" defer></script></body></html>`);
for (const t of T.filter(x => x.status === 'released')) write(`docs/${t.slug}/index.html`, head(t.name + ' docs', 'Setup and customisation guide for the ' + t.name + ' template.', 2) + `
<section class="wrap page-head"><p class="eyebrow"><span>Docs</span> ${esc(t.name)} · v${esc(t.version)}</p><h1>${esc(t.name)} guide</h1><p class="sub">Plain HTML, CSS and JavaScript. No build step.</p></section>
<section class="wrap block"><ol class="steps2">
<li><b>Customize</b><span>Open the <a href="../../studio/?t=${t.slug}">Template Studio</a>, choose a preset and edit your branding.</span></li>
<li><b>Download</b><span>Click Download free. You get a ZIP with every page, config.js, README and licence.</span></li>
<li><b>Edit</b><span>Change settings in config.js. Replace demo text and grey image placeholders in the HTML pages.</span></li>
<li><b>Deploy</b><span>Upload the folder to GitHub Pages, Netlify, Cloudflare Pages or any web host.</span></li></ol></section>
<section class="wrap block"><h2 class="h2">Contact form</h2><p class="lead2">The form validates but sends nothing until you set <code>contact.formEndpoint</code> in config.js to a form service URL (for example Formspree or Basin) or your own endpoint.</p>
<h2 class="h2" style="margin-top:40px">Pages</h2><ul class="feat">${t.pages.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
<h2 class="h2" style="margin-top:40px">Style presets</h2><ul class="feat">${t.presets.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` + foot(2));
console.log('built', T.length, 'product pages');
