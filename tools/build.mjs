#!/usr/bin/env node
/* ==========================================================================
   Доказано Вкусно — генератор на сайта
   ---------------------------------------------------------------------------
   Чете:   data/site.json, data/recipes.json, data/articles.json, content/*.html
   Пише:   всички .html страници в корена, assets/recipes-data.js, sitemap.xml,
           robots.txt

   Стартиране:  node tools/build.mjs
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));
const write = (p, s) => {
  const full = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, s);
};

const site = readJSON('data/site.json');
const recipes = readJSON('data/recipes.json')
  .filter((r) => r.published !== false)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));
const articles = readJSON('data/articles.json').filter((a) => a.published !== false);

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const recipeHref = (r) => `recipe-${r.slug}.html`;

function formatTime(min) {
  if (!min) return '';
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

/** ISO 8601 продължителност за structured data (PT1H30M) */
function isoDuration(min) {
  if (!min) return undefined;
  const h = Math.floor(min / 60), m = min % 60;
  return 'PT' + (h ? h + 'H' : '') + (m ? m + 'M' : (h ? '' : '0M'));
}

/* ==========================================================================
   ЧАСТИ ОТ СТРАНИЦАТА
   ========================================================================== */

function head({ title, description, canonical, image, jsonld = [], extraHead = '' }) {
  const fullTitle = title === site.name ? title : `${title} — ${site.name}`;
  const slug = canonical === 'index.html' ? '' : canonical;
  const url = site.url ? site.url.replace(/\/$/, '') + '/' + slug : '';
  const img = image || '';
  const ogImage = img && site.url && !/^https?:/.test(img)
    ? site.url.replace(/\/$/, '') + '/' + img : img;

  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${url ? `<link rel="canonical" href="${esc(url)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
${url ? `<meta property="og:url" content="${esc(url)}">` : ''}
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2F4A3B">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='19' font-size='19'>🌿</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">
${jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
${site.gaMeasurementId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaMeasurementId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${site.gaMeasurementId}');</script>` : ''}
${site.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClient}" crossorigin="anonymous"></script>` : ''}
${extraHead}`.replace(/\n{2,}/g, '\n');
}

function header(active) {
  const link = (n) =>
    `<li><a href="${esc(n.href)}"${n.href === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`;
  return `<a class="skip-link" href="#main">Към съдържанието</a>
<header>
  <div class="nav">
    <a href="index.html" aria-label="${esc(site.name)} — начало">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3c-3 3-3 7 0 10 3-3 3-7 0-10z"/><path d="M12 13v8"/></svg>
        <span class="logo-text">Доказано<br>Вкусно</span>
      </div>
    </a>
    <ul class="nav-links">
${site.nav.map(link).join('\n')}
    </ul>
    <a href="search.html" class="nav-cart" title="Търсене" aria-label="Търсене">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
    </a>
    <a href="shopping-list.html" class="nav-cart" title="Пазарски списък" aria-label="Пазарски списък">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
      <span class="badge hidden" data-cart-badge>0</span>
    </a>
    <button class="burger-btn" id="burgerBtn" onclick="toggleMobileMenu()" aria-label="Меню" aria-expanded="false" aria-controls="mobileMenu">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<div class="mobile-menu-overlay" id="mobileMenuOverlay" onclick="closeMobileMenu()"></div>
<div class="mobile-menu" id="mobileMenu">
  <button class="mm-close" onclick="closeMobileMenu()" aria-label="Затвори менюто">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
  </button>
  <div class="mm-section-label">Категории</div>
${site.nav.map((n) => `  <a href="${esc(n.href)}"${n.href === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('\n')}
  <div class="mm-section-label">Още</div>
  <a href="recipes.html"${active === 'recipes.html' ? ' aria-current="page"' : ''}>Всички рецепти</a>
  <a href="shopping-list.html">Пазарски списък</a>
  <a href="about.html">За нас</a>
  <a href="contact.html">Контакти</a>
  <a href="search.html">Търсене</a>
</div>`;
}

function ctaBand() {
  return `<section class="cta-band" id="subscribe">
  <h2 class="display">Нова рецепта всяка седмица</h2>
  <p>Абонирай се и получавай прости, вкусни рецепти директно в пощата си.</p>
  <form class="cta-form" onsubmit="event.preventDefault(); this.querySelector('button').textContent='Благодарим!';">
    <label class="sr-only" for="sub-email">Твоят имейл</label>
    <input id="sub-email" type="email" placeholder="Твоят имейл" required>
    <button type="submit">Абонирай се</button>
  </form>
  <div class="cta-note">Без спам. Отписваш се с един клик.</div>
</section>`;
}

function footer() {
  return `<footer>
  <div class="footer-inner">
    <div class="footer-brand">
      <strong>${esc(site.name)}</strong>
      <p>${esc(site.tagline)}</p>
    </div>
    <nav class="footer-links" aria-label="Долна навигация">
${site.footerLinks.map((l) => `      <a href="${esc(l.href)}">${esc(l.label)}</a>`).join('\n')}
    </nav>
  </div>
  <div class="footer-bottom">
    © ${new Date().getFullYear()} ${esc(site.name)} — Приготвено с грижа за твоето хранене.
  </div>
</footer>`;
}

function adSlot(slotId) {
  if (!site.adsenseClient) return '';
  return `<div class="ad-slot">
  <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(site.adsenseClient)}"${slotId ? ` data-ad-slot="${esc(slotId)}"` : ''} data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

function scripts() {
  return `<script src="assets/recipes-data.js"></script>
<script src="assets/site.js"></script>`;
}

/** Обвива съдържанието в пълна HTML страница. */
function page({ title, description, canonical, image, active, body, jsonld, extraHead, showCta = true }) {
  return `<!DOCTYPE html>
<html lang="${site.lang}">
<head>
${head({ title, description, canonical, image, jsonld, extraHead })}
</head>
<body>
${header(active)}
<main id="main">
${body}
</main>
${showCta ? ctaBand() : ''}
${footer()}
${scripts()}
</body>
</html>
`;
}

/* ==========================================================================
   КАРТИ И МРЕЖИ
   ========================================================================== */

function recipeCard(r) {
  return `    <a class="card" data-cat="${esc(r.meal)}" href="${esc(recipeHref(r))}">
      <div class="card-img">
        <span class="card-tag">${esc(r.badge)}</span>
        <button type="button" class="cart-toggle" data-recipe-id="${esc(r.id)}" onclick="toggleCart('${esc(r.id)}', event)" aria-label="Добави в пазарския списък" title="Добави в списъка">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <img src="${esc(r.image)}" alt="${esc(r.imageAlt || r.title)}" loading="lazy" decoding="async" width="700" height="525">
      </div>
      <div class="card-body">
        <h3 class="display">${esc(r.cardTitle || r.title)}</h3>
        <p>${esc(r.excerpt)}</p>
        <div class="card-meta">
          <span>⏱ ${esc(formatTime(r.time))}</span>
          ${r.kcal ? `<span>🔥 ${esc(r.kcal)} ккал</span>` : ''}
        </div>
      </div>
    </a>`;
}

function articleCard(a) {
  return `    <a class="card" href="${esc(a.href)}">
      <div class="card-img">
        <span class="card-tag article">Статия</span>
        <img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" decoding="async" width="700" height="525">
      </div>
      <div class="card-body">
        <h3 class="display">${esc(a.title)}</h3>
        <p>${esc(a.excerpt)}</p>
        <div class="card-meta"><span>📖 ${esc(a.readTime || '5 мин четене')}</span></div>
      </div>
    </a>`;
}

function emptyState(text) {
  return `    <div class="empty-state">${text}</div>`;
}

/** Разгръща <!--PT:GRID ...--> и <!--PT:FILTERS--> в съдържанието. */
function expandPlaceholders(html) {
  html = html.replace(/<!--PT:GRID([^>]*?)-->/g, (_, attrs) => {
    const get = (k) => (attrs.match(new RegExp(k + '="([^"]*)"')) || [])[1];
    const mode = get('mode');
    const id = get('id');
    const idAttr = id ? ` id="${id}"` : '';
    let list = [];

    if (mode === 'all') list = recipes;
    else if (mode === 'latest') list = recipes.slice(0, parseInt(get('limit') || '6', 10));
    else if (mode === 'category') list = recipes.filter((r) => (r.categories || []).includes(get('cat')));
    else if (mode === 'articles') {
      return `<div class="grid"${idAttr}>\n${articles.map(articleCard).join('\n')}\n  </div>`;
    }

    const inner = list.length
      ? list.map(recipeCard).join('\n')
      : emptyState('Скоро тук ще има рецепти. Ако имаш любима рецепта, <a href="contact.html">пиши ми</a> и ще я добавя.');
    return `<div class="grid"${idAttr}>\n${inner}\n  </div>`;
  });

  html = html.replace(/<!--PT:FILTERS-->/g, () => {
    const counts = {};
    recipes.forEach((r) => { counts[r.meal] = (counts[r.meal] || 0) + 1; });
    const btns = site.meals
      .filter((m) => m.key === 'all' || counts[m.key])
      .map((m, i) => {
        const n = m.key === 'all' ? recipes.length : counts[m.key];
        return `    <button type="button" data-filter="${m.key}"${i === 0 ? ' class="active" aria-pressed="true"' : ' aria-pressed="false"'}>${esc(m.label)} <span class="count">${n}</span></button>`;
      })
      .join('\n');
    return `<div class="filters" role="group" aria-label="Филтър по вид хранене">\n${btns}\n  </div>`;
  });

  html = html.replace(/<!--PT:AD(?:\s+slot="([^"]*)")?-->/g, (_, slot) => adSlot(slot));
  return html;
}

/* ==========================================================================
   СТРАНИЦА НА РЕЦЕПТА
   ========================================================================== */

function ingredientItems(r) {
  return (r.ingredients || [])
    .map((i) => {
      if (i.section) return `        <li class="ing-section">${esc(i.section)}</li>`;
      const scalable = typeof i.amount === 'number' && String(i.text).includes(String(i.amount));
      const attrs = scalable ? ` data-amount="${i.amount}" data-text="${esc(i.text)}"` : '';
      return `        <li${attrs}>${esc(i.text)}</li>`;
    })
    .join('\n');
}

function relatedRecipes(r) {
  const same = recipes.filter((x) => x.id !== r.id && (x.categories || []).some((c) => (r.categories || []).includes(c)));
  const pool = same.length >= 3 ? same : recipes.filter((x) => x.id !== r.id);
  return pool.slice(0, 3);
}

function recipeJsonLd(r) {
  const url = site.url ? site.url.replace(/\/$/, '') + '/' + recipeHref(r) : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.title,
    description: r.lead || r.excerpt,
    image: [r.hero || r.image],
    author: { '@type': 'Organization', name: site.author },
    datePublished: r.date,
    inLanguage: site.lang,
    recipeCategory: r.badge,
    keywords: r.keywords,
    recipeYield: `${r.servings} порции`,
    totalTime: isoDuration(r.time),
    url,
    nutrition: r.kcal
      ? { '@type': 'NutritionInformation', calories: `${r.kcal} kcal`, ...(r.protein ? { proteinContent: r.protein } : {}) }
      : undefined,
    recipeIngredient: (r.ingredients || []).filter((i) => !i.section).map((i) => i.text),
    recipeInstructions: (r.steps || []).map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
  };
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name,
      item: site.url ? site.url.replace(/\/$/, '') + '/' + it.href : undefined,
    })),
  };
}

function recipePage(r) {
  const related = relatedRecipes(r);
  const body = `<div class="page-header" style="padding-bottom:0;">
  <nav class="breadcrumb" aria-label="Навигационен път"><a href="index.html">Начало</a> / <a href="recipes.html">Рецепти</a> / ${esc(r.cardTitle || r.title)}</nav>
  <h1 class="display">${esc(r.title)}</h1>
  <p>${esc(r.lead || r.excerpt)}</p>
</div>

<div class="recipe-hero">
  <div class="recipe-hero-img">
    <img src="${esc(r.hero || r.image)}" alt="${esc(r.imageAlt || r.title)}" width="1400" height="600" fetchpriority="high" decoding="async">
  </div>

  <div class="recipe-actions">
    <button class="detail-add-btn" data-recipe-id="${esc(r.id)}" onclick="toggleCart('${esc(r.id)}', event)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      Добави в пазарски списък
    </button>
    <button class="detail-add-btn" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
      Разпечатай
    </button>
  </div>

  <div class="recipe-meta-bar">
    <div class="item"><div class="val">${esc(r.timeLabel || formatTime(r.time))}</div><div class="lbl">Общо време</div></div>
    <div class="item"><div class="val" data-servings-out>${esc(r.servings)}</div><div class="lbl">Порции</div></div>
    ${r.kcal ? `<div class="item"><div class="val">${esc(r.kcal)}</div><div class="lbl">Ккал / порция</div></div>` : ''}
    ${r.protein ? `<div class="item"><div class="val">${esc(r.protein)}</div><div class="lbl">Протеин</div></div>` : ''}
  </div>

  <div class="two-col">
    <div>
      <div class="box-title">
        <div class="icon ing" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2l1.5 4M18 2l-1.5 4M4 8h16l-1.6 11.2A2 2 0 0116.4 21H7.6a2 2 0 01-2-1.8L4 8z"/></svg>
        </div>
        <h4>Съставки</h4>
      </div>
      <div class="servings-box" data-servings="${esc(r.servings)}">
        <span class="lbl">Порции</span>
        <span class="servings-ctrl">
          <button type="button" data-step="-1" aria-label="По-малко порции">−</button>
          <span class="num">${esc(r.servings)}</span>
          <button type="button" data-step="1" aria-label="Повече порции">+</button>
        </span>
      </div>
      <ul class="ing-list">
${ingredientItems(r)}
      </ul>
    </div>
    <div>
      <div class="box-title">
        <div class="icon method" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v6a2 2 0 002 2h0a2 2 0 002-2V2M8 10v12M17 2v20"/></svg>
        </div>
        <h4>Начин на приготвяне</h4>
      </div>
      <ul class="method-list">
${(r.steps || []).map((s) => `        <li>${esc(s)}</li>`).join('\n')}
      </ul>
    </div>
  </div>
${r.note ? `
  <div class="note-strip">${esc(r.note)}</div>` : ''}
</div>
${adSlot()}
${(r.why || []).length ? `
<section class="section" style="max-width:760px; padding-top:10px;">
  <div class="section-head" style="margin-bottom:30px;">
    <div class="kicker">Полезно да знаеш</div>
    <h2>Защо тази рецепта си заслужава</h2>
    <div class="divider"></div>
  </div>
  <div class="why-block">
${r.why.map((w) => `    <div>
      <h4 class="display">${esc(w.h)}</h4>
      <p>${esc(w.p)}</p>
    </div>`).join('\n')}
  </div>
</section>` : ''}
${related.length ? `
<section class="section" style="padding-top:20px;">
  <div class="section-head">
    <div class="kicker">Следващото ястие</div>
    <h2>Още рецепти в същия дух</h2>
    <div class="divider"></div>
  </div>
  <div class="grid">
${related.map(recipeCard).join('\n')}
  </div>
</section>` : ''}`;

  return page({
    title: r.title,
    description: r.lead || r.excerpt,
    canonical: recipeHref(r),
    image: r.hero || r.image,
    active: '',
    body,
    jsonld: [
      recipeJsonLd(r),
      breadcrumbJsonLd([
        { name: 'Начало', href: 'index.html' },
        { name: 'Рецепти', href: 'recipes.html' },
        { name: r.cardTitle || r.title, href: recipeHref(r) },
      ]),
    ],
  });
}

/* ==========================================================================
   СТРАНИЦИ ОТ content/
   ========================================================================== */

const PAGES = [
  { file: 'index.html', title: site.name, description: site.description, active: 'index.html', image: recipes[0] && recipes[0].image },
  { file: 'recipes.html', title: 'Всички рецепти', description: 'Всички рецепти на Доказано Вкусно — филтрирай по закуска, обяд, вечеря или десерт.', active: 'recipes.html' },
  { file: 'salads.html', title: 'Салати', description: 'Хрупкави, освежаващи салати за всеки ден — самостоятелно или като допълнение.', active: 'salads.html' },
  { file: 'mains.html', title: 'Основни ястия', description: 'Засищащи основни ястия с ясни стъпки и точни съставки.', active: 'mains.html' },
  { file: 'breakfast.html', title: 'Закуски', description: 'Бързи и засищащи закуски, с които денят започва правилно.', active: 'breakfast.html' },
  { file: 'desserts.html', title: 'Десерти', description: 'Домашни десерти без излишни съставки и без стабилизатори.', active: 'desserts.html' },
  { file: 'athletes.html', title: 'За спортисти', description: 'Високопротеинови ястия, които работят за тренировките ти.', active: 'athletes.html' },
  { file: 'healthy.html', title: 'Полезно', description: 'Кратки статии за храните — какви витамини съдържат и как помагат на тялото.', active: 'healthy.html' },
  { file: 'about.html', title: 'За нас', description: 'Защо създадохме Доказано Вкусно и какви принципи следваме.', active: '' },
  { file: 'contact.html', title: 'Контакти', description: 'Свържи се с нас — въпроси, идеи за рецепти и предложения.', active: '' },
  { file: 'search.html', title: 'Търсене', description: 'Търси рецепта по име, съставка или категория.', active: '' },
  { file: 'shopping-list.html', title: 'Пазарски списък', description: 'Избери рецепти и получи автоматично събран списък за пазаруване.', active: '', showCta: false },
  { file: 'facts-banana.html', title: '10 факта за банана', description: 'Какви витамини и минерали съдържа бананът и как точно помага на тялото ти.', active: 'healthy.html' },
  { file: 'facts-almonds.html', title: '10 факта за бадемите', description: 'Какви витамини и минерали съдържат бадемите и защо са добра закуска.', active: 'healthy.html' },
  { file: 'facts-walnuts.html', title: '10 факта за орехите', description: 'Какви витамини и минерали съдържат орехите и как помагат на мозъка и сърцето.', active: 'healthy.html' },
];

/* ==========================================================================
   ГЕНЕРИРАНЕ
   ========================================================================== */

function buildDataFile() {
  const payload = recipes.map((r) => ({
    id: r.id, slug: r.slug, title: r.title, cardTitle: r.cardTitle, excerpt: r.excerpt,
    meal: r.meal, categories: r.categories, badge: r.badge, time: r.time, kcal: r.kcal,
    image: r.image, imageAlt: r.imageAlt, keywords: r.keywords,
    ingredients: r.ingredients,
  }));
  write('assets/recipes-data.js',
    '/* Генериран файл — не го променяй на ръка. Източник: data/recipes.json */\n' +
    'window.RECIPES = ' + JSON.stringify(payload, null, 1) + ';\n');
}

function buildSitemap() {
  if (!site.url) return;
  const base = site.url.replace(/\/$/, '');
  const urls = [
    ...PAGES.map((p) => ({ loc: p.file === 'index.html' ? '' : p.file, pri: p.file === 'index.html' ? '1.0' : '0.7' })),
    ...recipes.map((r) => ({ loc: recipeHref(r), pri: '0.9', lastmod: r.date })),
  ];
  write('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${base}/${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.pri}</priority></url>`).join('\n') +
    `\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
}

function build() {
  const written = [];

  buildDataFile();
  written.push('assets/recipes-data.js');

  for (const p of PAGES) {
    const raw = read(path.join('content', p.file));
    const body = expandPlaceholders(raw);
    const jsonld = p.file === 'index.html'
      ? [{
          '@context': 'https://schema.org', '@type': 'WebSite',
          name: site.name, url: site.url, description: site.description, inLanguage: site.lang,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${site.url.replace(/\/$/, '')}/search.html?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }]
      : [];
    write(p.file, page({ ...p, body, jsonld, canonical: p.file }));
    written.push(p.file);
  }

  for (const r of recipes) {
    write(recipeHref(r), recipePage(r));
    written.push(recipeHref(r));
  }

  buildSitemap();
  if (site.url) written.push('sitemap.xml', 'robots.txt');

  // изчистваме страници на изтрити рецепти
  const valid = new Set(recipes.map(recipeHref));
  for (const f of fs.readdirSync(ROOT)) {
    if (/^recipe-.+\.html$/.test(f) && !valid.has(f)) {
      fs.unlinkSync(path.join(ROOT, f));
      console.log('  изтрита остаряла страница:', f);
    }
  }

  console.log(`✓ Генерирани ${written.length} файла (${recipes.length} рецепти, ${articles.length} статии)`);
}

build();
