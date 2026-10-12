// Page-aligned literal translation.
// Usage: node build_al.js ch1   reads ch1.al.src.html + ../bi/k1.json → ch1.al.html, ch1.al.pdf
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const { chromium } = require('playwright-core');

const macros = {
  '\\R': '\\mathbb{R}', '\\K': '\\mathbb{K}', '\\C': '\\mathbb{C}',
  '\\N': '\\mathbb{N}', '\\Z': '\\mathbb{Z}',
  '\\v': '\\vec{#1}', '\\Vect': '\\operatorname{Vect}', '\\Ker': '\\operatorname{Ker}',
  '\\Im': '\\operatorname{Im}', '\\rg': '\\operatorname{rg}', '\\id': '\\mathrm{id}',
  '\\dg': 'd^{\\circ}',
};
const tex = (s, display) =>
  katex.renderToString(s, { displayMode: display, throwOnError: true, macros, strict: false });

function render(src) {
  src = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => `<div class="dm">${tex(m.trim(), true)}</div>`);
  src = src.replace(/\$([^$]+?)\$([。，；：、）．,.;:)]?)/g, (_, m, p) =>
    p ? `<span class="nw">${tex(m, false)}${p}</span>` : tex(m, false));
  src = src.replace(/<h([23]) n="([^"]+)"(?: fr="([^"]*)")?>([\s\S]+?)<\/h\1>/g, (_, l, n, fr, t) =>
    `<h${l} class="g"><span class="n">${n}</span><span class="t">${t}${fr ? `<i>${fr}</i>` : ''}</span></h${l}>`);
  return src;
}

function left(s) {
  s = (s || '').trim();
  if (!s) return '';
  if (s.startsWith('«')) return `<i class="anc">${s}</i>`;
  const [zh, fr] = s.split(' / ');
  return `<b>${zh}</b>${fr ? `<i>${fr}</i>` : ''}`;
}

const id = process.argv[2];
const n = id.replace(/\D/g, '');
const dir = __dirname;
// pagesN.json: for each paragraph block of the original, [first page index, last page index]
const chunks = JSON.parse(fs.readFileSync(path.join(dir, `pages${n}.json`), 'utf8'));
const raw = fs.readFileSync(path.join(dir, `${id}.al.src.html`), 'utf8');
const meta = JSON.parse(raw.match(/<!--META([\s\S]*?)-->/)[1]);
const body = raw.replace(/<!--META[\s\S]*?-->/, '');

// ── parse groups "@@ a[-b] [| left]" and check they tile chunks 1..N in order
const parts = body.split(/^@@ /m).slice(1);
let expect = 1;
const groups = parts.map((p) => {
  const nl = p.indexOf('\n');
  const head = p.slice(0, nl), content = p.slice(nl + 1);
  const [rng, lab] = head.split('|');
  const [a, b] = rng.trim().split('-').map(Number);
  const z = b || a;
  if (a !== expect) throw new Error(`group ${rng}: expected to start at ${expect}`);
  expect = z + 1;
  const first = chunks[a - 1][0];
  const last = Math.max(...chunks.slice(a - 1, z).map((c) => c[1]));
  return { a, z, lab, content, page: first + meta.p0, cont: last > first ? last + meta.p0 : 0 };
});
if (expect !== chunks.length + 1) throw new Error(`groups end at ${expect - 1}, chunks: ${chunks.length}`);

// ── assemble page sections
let html = '', cur = null;
for (const g of groups) {
  if (g.page !== cur) {
    if (cur !== null) html += '</section>';
    cur = g.page;
    html += `<section class="op"><div class="pm"><span class="pn">p.${cur}</span>` +
      `<span class="pt">原文第 ${cur} 页<i>page ${cur} de l’original</i></span></div>`;
  }
  const c = render(g.content.trim());
  const cont = g.cont ? `<span class="ct">续见原文 p.${g.cont}</span>` : '';
  if (/^<h[23]/.test(g.content.trim())) html += c;
  else html += `<div class="blk"><div class="lab">${left(g.lab)}${cont}</div><div class="bd">${c}</div></div>`;
}
html += '</section>';

const nm = (p) => 'file://' + path.join(dir, 'node_modules', p);
const inter = [300, 400, 500, 700, 800].flatMap((w) => ['latin', 'latin-ext'].map((s) =>
  `@font-face{font-family:"InterW";font-weight:${w};font-style:normal;` +
  `src:url("${nm(`@fontsource/inter/files/inter-${s}-${w}-normal.woff2`)}") format("woff2");` +
  (s === 'latin-ext' ? 'unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;' : '') +
  '}')).join('\n');

const doc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>${meta.title}</title>
<link rel="stylesheet" href="${nm('katex/dist/katex.min.css')}">
${[300, 400, 500, 700, 900].map((w) => `<link rel="stylesheet" href="${nm(`@fontsource/noto-sans-sc/${w}.css`)}">`).join('\n')}
<style>${inter}</style>
<link rel="stylesheet" href="file://${path.join(dir, 'style_al.css')}">
</head><body>
<header class="cover">
  <div class="num">${meta.num}</div>
  <div class="ttl">
    <div class="kick">第 ${meta.n} 章 · Chapitre ${meta.n} · 逐页对照直译</div>
    <h1>${meta.title}</h1>
    <div class="fr">${meta.fr}</div>
    <p class="how">每节顶部的 p.N 即原文页码；左栏为原文的标签或段首词，可与原 PDF 并排逐段对照。〔译注〕为译者所加。</p>
  </div>
</header>
<main>${html}</main>
</body></html>`;
fs.writeFileSync(path.join(dir, `${id}.al.html`), doc);

(async () => {
  const b64 = fs.readFileSync(path.join(dir, 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2')).toString('base64');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(dir, `${id}.al.html`), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const foot = `<style>@font-face{font-family:FI;src:url(data:font/woff2;base64,${b64}) format("woff2");}</style>
    <div style="width:100%;font-family:FI;font-size:7pt;letter-spacing:.04em;color:#000;padding:0 14mm;
    display:flex;justify-content:space-between;"><span>${meta.num} — ${meta.fr}</span><span class="pageNumber"></span></div>`;
  await page.pdf({
    path: path.join(dir, `${id}.al.pdf`), format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: foot,
    margin: { top: '12mm', bottom: '14mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log('ok', id, groups.length, 'groups');
})();
