/* ==========================================================================
   Доказано Вкусно — общ скрипт за целия сайт
   Зарежда се след assets/recipes-data.js (където живее window.RECIPES).
   ========================================================================== */
(function () {
  'use strict';

  var RECIPES = window.RECIPES || [];
  var byId = {};
  RECIPES.forEach(function (r) { byId[r.id] = r; });
  window.RECIPE_BY_ID = byId;

  /* ---------- помощни ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  window.ptEscape = esc;

  function formatTime(min) {
    if (!min) return '';
    if (min < 60) return min + ' мин';
    var h = Math.floor(min / 60), m = min % 60;
    return m ? h + ' ч ' + m + ' мин' : h + ' ч';
  }
  window.ptFormatTime = formatTime;

  /* ---------- мобилно меню ---------- */
  function toggleMobileMenu() {
    var b = document.getElementById('burgerBtn');
    var m = document.getElementById('mobileMenu');
    var o = document.getElementById('mobileMenuOverlay');
    if (!b || !m || !o) return;
    var open = !m.classList.contains('active');
    b.classList.toggle('active', open);
    m.classList.toggle('active', open);
    o.classList.toggle('active', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function closeMobileMenu() {
    var b = document.getElementById('burgerBtn');
    var m = document.getElementById('mobileMenu');
    var o = document.getElementById('mobileMenuOverlay');
    if (b) { b.classList.remove('active'); b.setAttribute('aria-expanded', 'false'); }
    if (m) m.classList.remove('active');
    if (o) o.classList.remove('active');
    document.body.style.overflow = '';
  }
  window.toggleMobileMenu = toggleMobileMenu;
  window.closeMobileMenu = closeMobileMenu;

  /* ---------- пазарски списък ---------- */
  var KEY = 'ck_cart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function setCart(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
    updateCartUI();
  }
  function toggleCart(id, evt) {
    if (evt) { evt.preventDefault(); evt.stopPropagation(); }
    var cart = getCart();
    cart = cart.indexOf(id) > -1 ? cart.filter(function (x) { return x !== id; }) : cart.concat([id]);
    setCart(cart);
  }
  function clearCart() {
    if (confirm('Изчисти целия пазарски списък?')) {
      setCart([]);
      renderShoppingList();
    }
  }
  function updateCartUI() {
    var cart = getCart();
    document.querySelectorAll('[data-cart-badge]').forEach(function (el) {
      el.textContent = cart.length;
      el.classList.toggle('hidden', cart.length === 0);
    });
    document.querySelectorAll('[data-recipe-id]').forEach(function (el) {
      var active = cart.indexOf(el.getAttribute('data-recipe-id')) > -1;
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (el.classList.contains('detail-add-btn')) {
        el.innerHTML = active
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> Добавено в списъка'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> Добави в пазарски списък';
      } else {
        el.setAttribute('title', active ? 'Премахни от списъка' : 'Добави в списъка');
      }
    });
  }
  window.getCart = getCart;
  window.toggleCart = toggleCart;
  window.clearCart = clearCart;

  /* всички съставки на рецепта, изравнени за пазарски списък */
  function shopIngredients(r) {
    var out = [];
    (r.ingredients || []).forEach(function (i) {
      if (i.section || i.shop === false || !i.name) return;
      out.push({ name: i.name, amount: i.amount, unit: i.unit });
      (i.extra || []).forEach(function (e) { out.push(e); });
    });
    return out;
  }
  window.ptShopIngredients = shopIngredients;

  function label(item) {
    return item.amount !== null && item.amount !== undefined
      ? item.amount + ' ' + item.unit + ' ' + item.name
      : item.name + ' (' + item.unit + ')';
  }

  function renderShoppingList() {
    var container = document.getElementById('shop-content');
    if (!container) return;
    var cart = getCart().filter(function (id) { return byId[id]; });
    var bar = document.getElementById('shop-actions-bar');
    if (bar) bar.style.display = cart.length ? 'flex' : 'none';

    if (!cart.length) {
      container.innerHTML =
        '<div class="shop-empty">Списъкът е празен. <a href="recipes.html">Разгледай рецептите</a> ' +
        'и добави любимите си, за да генерираш списък за пазаруване.</div>';
      return;
    }

    var combined = {};
    cart.forEach(function (id) {
      shopIngredients(byId[id]).forEach(function (ing) {
        var key = ing.name + '|' + ing.unit;
        if (ing.amount === null || ing.amount === undefined) {
          combined[key] = combined[key] || { name: ing.name, unit: ing.unit, amount: null };
        } else {
          if (!combined[key]) combined[key] = { name: ing.name, unit: ing.unit, amount: 0 };
          if (combined[key].amount === null) combined[key].amount = 0;
          combined[key].amount += ing.amount;
        }
      });
    });

    var html = '<div class="shop-recipe-block"><h3>Обобщен списък за пазаруване</h3><ul class="combined-list">';
    Object.keys(combined).forEach(function (k) {
      html += '<li onclick="ptToggleCheck(this)">' +
        '<input type="checkbox" onclick="event.stopPropagation(); this.closest(\'li\').classList.toggle(\'checked\', this.checked);">' +
        '<span>' + esc(label(combined[k])) + '</span></li>';
    });
    html += '</ul></div>';

    html += '<div class="section-head" style="margin-top:40px; margin-bottom:24px;">' +
      '<div class="kicker">Избрани рецепти</div><h2>' + cart.length +
      (cart.length === 1 ? ' рецепта' : ' рецепти') + '</h2></div>';

    cart.forEach(function (id) {
      var r = byId[id];
      html += '<div class="shop-recipe-block"><h3>' +
        '<a href="' + esc(r.slug ? 'recipe-' + r.slug + '.html' : '#') + '" style="color:var(--forest); text-decoration:none;">' +
        esc(r.title) + '</a>' +
        '<button onclick="toggleCart(\'' + esc(id) + '\'); ptRenderShoppingList();">Премахни</button>' +
        '</h3><ul class="shop-ing-list">';
      shopIngredients(r).forEach(function (ing) { html += '<li>' + esc(label(ing)) + '</li>'; });
      html += '</ul></div>';
    });

    container.innerHTML = html;
  }
  window.ptRenderShoppingList = renderShoppingList;
  window.renderShoppingList = renderShoppingList;
  window.ptToggleCheck = function (li) {
    li.classList.toggle('checked');
    var cb = li.querySelector('input');
    if (cb) cb.checked = li.classList.contains('checked');
  };

  /* ---------- карти ---------- */
  function cardHtml(r) {
    var href = 'recipe-' + r.slug + '.html';
    var img = r.image || 'images/placeholder.svg';
    var imgCls = r.image ? '' : ' class="is-placeholder"';
    return '<a class="card" data-cat="' + esc(r.meal) + '" href="' + esc(href) + '">' +
      '<div class="card-img">' +
        '<span class="card-tag">' + esc(r.badge) + '</span>' +
        '<button type="button" class="cart-toggle" data-recipe-id="' + esc(r.id) + '" ' +
          'onclick="toggleCart(\'' + esc(r.id) + '\', event)" aria-label="Добави в пазарския списък" title="Добави в списъка">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
        '</button>' +
        '<img src="' + esc(img) + '"' + imgCls + ' alt="' + esc(r.imageAlt || r.title) + '" loading="lazy" decoding="async">' +
      '</div>' +
      '<div class="card-body">' +
        '<h3 class="display">' + esc(r.cardTitle || r.title) + '</h3>' +
        '<p>' + esc(r.excerpt) + '</p>' +
        '<div class="card-meta"><span>⏱ ' + esc(formatTime(r.time)) + '</span>' +
        (r.kcal ? '<span>🔥 ' + esc(r.kcal) + ' ккал</span>' : '') + '</div>' +
      '</div></a>';
  }
  window.ptCardHtml = cardHtml;

  /* ---------- търсене ---------- */
  function initSearch() {
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var count = document.getElementById('search-count');
    if (!input || !results) return;

    // Българските думи сменят окончанията си („закуска“ / „закуски“,
    // „пилешко“ / „пилешка“), затова търсим по корена на думата, а не буква
    // по буква. Всяка дума от заявката трябва да се среща в рецептата.
    // Махаме само последната буква: „основни“ → „основн“ хваща „основни“,
    // но не и „основата“, която би хванала, ако режем повече.
    function stem(word) {
      return word.length >= 4 ? word.slice(0, -1) : word;
    }

    function run() {
      var raw = input.value.trim();
      var q = raw.toLowerCase();
      var stems = q.split(/[\s,.;]+/).filter(Boolean).map(stem);
      var matches = q === '' ? RECIPES : RECIPES.filter(function (r) {
        var text = r.search ||
          (r.title + ' ' + r.excerpt + ' ' + (r.keywords || '') + ' ' + r.badge).toLowerCase();
        return stems.every(function (s) { return text.indexOf(s) > -1; });
      });
      if (count) {
        count.textContent = q === '' ? '' :
          matches.length + (matches.length === 1 ? ' резултат' : ' резултата') + ' за „' + raw + '“';
      }
      results.innerHTML = matches.length
        ? matches.map(cardHtml).join('')
        : '<div class="empty-state">Няма намерени рецепти. Опитай друга дума или разгледай <a href="recipes.html">всички рецепти</a>.</div>';
      updateCartUI();

      var url = new URL(window.location.href);
      if (raw) url.searchParams.set('q', raw); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }

    var initial = new URLSearchParams(window.location.search).get('q');
    if (initial) input.value = initial;
    input.addEventListener('input', run);
    window.setQuery = function (q) { input.value = q; run(); input.focus(); };
    run();
  }

  /* ---------- филтри по категория ---------- */
  function initFilters() {
    var wrap = document.querySelector('.filters');
    var grid = document.getElementById('recipe-grid');
    if (!wrap || !grid) return;

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      var cat = btn.getAttribute('data-filter');
      wrap.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      var shown = 0;
      grid.querySelectorAll('.card').forEach(function (card) {
        var hit = cat === 'all' || card.dataset.cat === cat;
        card.style.display = hit ? 'flex' : 'none';
        if (hit) shown++;
      });
      var empty = grid.querySelector('.empty-state');
      if (empty) empty.remove();
      if (!shown) {
        grid.insertAdjacentHTML('beforeend',
          '<div class="empty-state">В тази категория още няма рецепти. Скоро ще има!</div>');
      }
    });
  }

  /* ---------- калкулатор за порции ---------- */
  function initServings() {
    var box = document.querySelector('[data-servings]');
    if (!box) return;
    var base = parseInt(box.getAttribute('data-servings'), 10) || 4;
    var cur = base;
    var numEl = box.querySelector('.num');
    var items = document.querySelectorAll('.ing-list li[data-amount]');

    function render() {
      numEl.textContent = cur;
      var factor = cur / base;
      items.forEach(function (li) {
        var amount = parseFloat(li.getAttribute('data-amount'));
        var text = li.getAttribute('data-text');
        if (isNaN(amount)) return;
        var scaled = amount * factor;
        // големите количества се закръглят до цяло, малките — до половинки
        scaled = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 2) / 2;
        li.textContent = text.replace(String(amount), String(scaled));
      });
      var servingsOut = document.querySelector('[data-servings-out]');
      if (servingsOut) servingsOut.textContent = cur;
    }

    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-step]');
      if (!b) return;
      cur = Math.min(24, Math.max(1, cur + parseInt(b.getAttribute('data-step'), 10)));
      render();
    });
  }

  /* ---------- сянка на хедъра при скрол ---------- */
  function initHeaderShadow() {
    var h = document.querySelector('header');
    if (!h) return;
    var tick = function () { h.classList.toggle('scrolled', window.scrollY > 8); };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
  }

  /* ---------- старт ---------- */
  function init() {
    updateCartUI();
    renderShoppingList();
    initSearch();
    initFilters();
    initServings();
    initHeaderShadow();
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', closeMobileMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
