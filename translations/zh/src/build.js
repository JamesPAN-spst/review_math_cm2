// Usage: node build.js ch1  → reads ch1.src.html, writes ch1.html + ch1.pdf
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

function tex(s, display) {
  return katex.renderToString(s, { displayMode: display, throwOnError: true, macros, strict: false });
}

function render(src) {
  // display math first, then inline
  src = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => `<div class="dm">${tex(m.trim(), true)}</div>`);
  src = src.replace(/\$([^$]+?)\$([。，；：、）．,.;:)]?)/g, (_, m, p) =>
    p ? `<span class="nw">${tex(m, false)}${p}</span>` : tex(m, false));
  // <env t="定义" fr="Définition" [k="thm|proof|note"]> … </env>
  src = src.replace(/<env t="([^"]+)"(?: fr="([^"]*)")?(?: k="([^"]*)")?>/g, (_, t, fr, k) =>
    `<section class="env ${k || 'thm'}"><div class="lab"><b>${t}</b>${fr ? `<i>${fr}</i>` : ''}</div><div class="bd">`);
  src = src.replace(/<\/env>/g, '</div></section>');
  // <h2 n="1.1">title</h2>  /  <h3 n="1.1.1">title</h3>
  src = src.replace(/<h([23]) n="([^"]+)"(?: fr="([^"]*)")?>([\s\S]+?)<\/h\1>/g, (_, l, n, fr, t) =>
    `<h${l} class="g"><span class="n">${n}</span><span class="t">${t}${fr ? `<i>${fr}</i>` : ''}</span></h${l}>`);
  return src;
}

const id = process.argv[2];
const dir = __dirname;
const raw = fs.readFileSync(path.join(dir, `${id}.src.html`), 'utf8');
const meta = JSON.parse(raw.match(/<!--META([\s\S]*?)-->/)[1]);
const body = render(raw.replace(/<!--META[\s\S]*?-->/, ''));
const nm = (p) => 'file://' + path.join(dir, 'node_modules', p);

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>${meta.title}</title>
<link rel="stylesheet" href="${nm('katex/dist/katex.min.css')}">
<link rel="stylesheet" href="${nm('@fontsource/noto-sans-sc/300.css')}">
<link rel="stylesheet" href="${nm('@fontsource/noto-sans-sc/400.css')}">
<link rel="stylesheet" href="${nm('@fontsource/noto-sans-sc/500.css')}">
<link rel="stylesheet" href="${nm('@fontsource/noto-sans-sc/700.css')}">
<link rel="stylesheet" href="${nm('@fontsource/noto-sans-sc/900.css')}">
<link rel="stylesheet" href="file://${path.join(dir, 'style.css')}">
</head><body>
<header class="cover">
  <div class="num">${meta.num}</div>
  <div class="ttl">
    <div class="kick">第 ${meta.n} 章 · Chapitre ${meta.n}</div>
    <h1>${meta.title}</h1>
    <div class="fr">${meta.fr}</div>
  </div>
</header>
<main>${body}</main>
</body></html>`;

fs.writeFileSync(path.join(dir, `${id}.html`), html);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(dir, `${id}.html`), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const foot = `<div style="width:100%;font-family:Inter;font-size:7pt;letter-spacing:.04em;color:#000;
    padding:0 18mm 0 18mm;display:flex;justify-content:space-between;">
    <span>${meta.num} — ${meta.fr}</span><span class="pageNumber"></span></div>`;
  await page.pdf({
    path: path.join(dir, `${id}.pdf`), format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: foot,
    margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' },
  });
  await browser.close();
  console.log('ok', id);
})();
