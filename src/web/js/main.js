/* ==========================================================================
   Pizzería Nápoles (Chipiona) · Interacciones
   JavaScript sin dependencias. Animaciones mínimas y suaves.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const D = window.NAPOLES;
  const Art = window.PizzaArt;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const fmt = (n) => money.format(Math.round(n * 100) / 100);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = (n) => String(n).padStart(2, '0');
  const hhmm = (m) => pad2(Math.floor((m % 1440) / 60)) + ':' + pad2(m % 60);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } }
  };
  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* Carta en objetos */
  const CATS = {};
  D.categorias.forEach((c) => { CATS[c.id] = c; });
  const ITEMS = D.carta.map((r, i) => ({
    id: 'c' + i, cat: r[0], nombre: r[1], precio: r[2], desc: r[3], art: r[4],
    patatas: CATS[r[0]].patatas && r[5] !== 'nopatatas',
    foto: (D.fotosPlatos || {})[r[0] + '|' + r[1]] || null
  }));
  const byId = {};
  ITEMS.forEach((it) => { byId[it.id] = it; });
  const TOP = {};
  D.pizza.grupos.forEach((g) => g.items.forEach((t) => { TOP[t[0]] = t[1]; }));

  const PREFIX = { perritos: 'Perrito', sandwiches: 'Sándwich', burguer: 'Burguer', baguettes: 'Baguette', ensaladas: 'Ensalada', salsas: 'Salsa' };
  const artCache = {};
  const artOf = (key) => artCache[key] || (artCache[key] = Art.dish(key));
  function artFromCfg(a) {
    if (!a) return Art.pizza({ seed: 'x' });
    return a.type === 'pizza' ? Art.pizza(a.cfg) : artOf(a.name);
  }
  function toppingIcon(t) {
    return '<svg viewBox="-14 -14 28 28" width="22" height="22" aria-hidden="true" focusable="false">' + (Art.SHAPES[t] ? Art.SHAPES[t]() : '') + '</svg>';
  }

  /* ---------- Avisos ---------- */
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<svg><use href="#i-check"/></svg><span></span>';
    el.querySelector('span').textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 300); }, 2600);
  }

  /* ---------- Logo ---------- */
  $$('[data-logo]').forEach((h) => h.appendChild($('#logo-tpl').content.cloneNode(true)));

  /* ---------- Tema oscuro ---------- */
  const themeBtn = $('#themeToggle');
  function setTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    themeBtn.setAttribute('aria-pressed', t === 'dark');
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Volver al modo claro' : 'Activar modo oscuro');
  }
  setTheme(store.get('napoles-theme', 'light'));
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
    store.set('napoles-theme', next);
  });

  /* ---------- Aparición suave al hacer scroll ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  function reveal(root) {
    $$('[data-reveal]', root).forEach((el) => { if (reduced || !io) el.classList.add('is-in'); else io.observe(el); });
  }

  /* ---------- Cabecera y menú móvil ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const mm = $('#mobileMenu');
  function openMenu() {
    mm.hidden = false;
    requestAnimationFrame(() => mm.classList.add('is-open'));
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    document.body.classList.add('menu-open', 'is-locked');
    setTimeout(() => $('a', mm).focus(), 50);
  }
  function closeMenu(focusBurger) {
    mm.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('menu-open', 'is-locked');
    setTimeout(() => { if (!mm.classList.contains('is-open')) mm.hidden = true; }, 250);
    if (focusBurger) burger.focus();
  }
  burger.addEventListener('click', () => (burger.getAttribute('aria-expanded') === 'true' ? closeMenu(false) : openMenu()));
  $$('a', mm).forEach((a) => a.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') closeMenu(true); });

  const navLinks = $$('.nav__list a');
  if (io) {
    const secIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => {
          const on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['carta', 'crea', 'nosotros', 'reservas', 'info'].forEach((id) => secIO.observe(document.getElementById(id)));
  }

  /* ---------- Horario (verano / invierno) ---------- */
  const H = D.horario;
  const season = (d) => (H.verano.meses.indexOf((d || new Date()).getMonth()) !== -1 ? H.verano : H.invierno);
  function renderHours() {
    const now = new Date();
    const s = season(now);
    const t = now.getHours() * 60 + now.getMinutes();
    const open = t >= s.abre && t < s.cierra;
    const txt = open ? 'Abierto ahora · hasta las ' + hhmm(s.cierra)
      : (t < s.abre ? 'Hoy abrimos a las ' + hhmm(s.abre) : 'Cerrado · mañana abrimos a las ' + hhmm(season(new Date(now.getTime() + 864e5)).abre));
    const box = $('#openNow');
    box.className = 'open-now ' + (open ? 'is-open' : 'is-closed');
    box.textContent = txt;
    $('#heroOpen span').textContent = open ? 'Abierto ahora hasta las ' + hhmm(s.cierra) : 'Hoy de ' + hhmm(s.abre) + ' a ' + hhmm(s.cierra);
  }
  (function hoursText() {
    const cur = season();
    $('#seasons').innerHTML =
      '<div class="' + (cur === H.verano ? 'is-now' : '') + '"><dt>Verano</dt><dd>' + H.verano.texto + '</dd></div>' +
      '<div class="' + (cur === H.invierno ? 'is-now' : '') + '"><dt>Invierno</dt><dd>' + H.invierno.texto + '</dd></div>';
    $('#footerHours').innerHTML = '<li><b>Verano:</b> lunes a domingo<br>20:00 – 23:45</li><li><b>Invierno:</b> lunes a domingo<br>19:30 – 23:30</li>';
  })();
  renderHours();
  setInterval(renderHours, 60000);

  /* ---------- Portada ---------- */
  $('#heroPizza').innerHTML = Art.pizza({ toppings: ['jamon', 'champinon', 'aceituna'], sauce: 'tomate', cheese: 'mozzarella', seed: 'hero-chipiona' });
  $('#yearsOpen').textContent = (new Date().getFullYear() - 1985);

  /* ---------- Carta ---------- */
  const menuState = { cat: 'todas', q: '' };
  const catWrap = $('#menuCats');
  [{ id: 'todas', nombre: 'Todo' }].concat(D.categorias).forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.cat = c.id;
    b.textContent = c.nombre;
    b.setAttribute('aria-pressed', c.id === 'todas');
    b.addEventListener('click', () => {
      menuState.cat = c.id;
      renderMenu();
      catWrap.scrollLeft = b.offsetLeft - catWrap.offsetLeft - catWrap.clientWidth / 2 + b.offsetWidth / 2;
    });
    catWrap.appendChild(b);
  });
  $('#menuSearch').addEventListener('input', debounce(() => { menuState.q = norm($('#menuSearch').value.trim()); renderMenu(); }, 150));
  $('#menuReset').addEventListener('click', () => { menuState.cat = 'todas'; menuState.q = ''; $('#menuSearch').value = ''; renderMenu(); });

  function patatasSelect(it) {
    if (!it.patatas) return '';
    return '<label class="mrow__extra"><span class="sr-only">Complemento para ' + esc(it.nombre) + '</span><select data-extra="' + it.id + '">' +
      D.patatas.map((p) => '<option value="' + p.id + '">' + p.nombre + (p.precio ? ' (' + fmt(p.precio) + ')' : '') + '</option>').join('') + '</select></label>';
  }
  function rowHTML(it) {
    return '<li class="mrow">' +
      '<div class="mrow__art">' + (it.foto ? '<img class="mrow__photo" src="' + it.foto + '" alt="" loading="lazy" width="58" height="58">' : artOf(it.art)) + '</div>' +
      '<div class="mrow__main"><h4>' + esc(it.nombre) + '</h4>' + (it.desc ? '<p>' + esc(it.desc) + '</p>' : '') + patatasSelect(it) + '</div>' +
      '<div class="mrow__end"><span class="price">' + fmt(it.precio) + '</span>' +
      '<button class="add" type="button" data-add="' + it.id + '" aria-label="Añadir ' + esc((PREFIX[it.cat] ? PREFIX[it.cat] + ' ' : '') + it.nombre) + ' al pedido"><svg><use href="#i-plus"/></svg></button></div></li>';
  }
  function pizzaBlockHTML() {
    const sizes = D.pizza.tamanos.map((s) =>
      '<li class="psize"><div class="psize__art" style="--s:' + s.escala + '">' + artOf('pizza') + '</div>' +
      '<h4>' + s.nombre + '</h4><p class="price">' + fmt(s.precio) + '</p>' +
      '<p class="psize__note">' + (s.nota || ('Ingrediente extra +' + fmt(s.extra) + (s.mitad ? '<br>Extra en media pizza +' + fmt(s.mitad) : ''))) + '</p>' +
      '<button class="btn btn--small" type="button" data-size="' + s.id + '">Elegir ingredientes <svg><use href="#i-arrow"/></svg></button></li>').join('');
    const ings = Object.keys(TOP).map((k) => TOP[k].toLowerCase()).join(', ');
    return '<ul class="psizes">' + sizes + '</ul><div class="pings"><img src="assets/fotos/ingredientes.jpg" alt="Ingredientes frescos preparados en la cocina de Pizzería Nápoles" loading="lazy"><p><b>Ingredientes:</b> ' + esc(ings) + '.</p></div>';
  }
  function renderMenu() {
    $$('.chip', catWrap).forEach((b) => b.setAttribute('aria-pressed', b.dataset.cat === menuState.cat));
    const q = menuState.q;
    let html = '', count = 0;
    D.categorias.forEach((c) => {
      if (menuState.cat !== 'todas' && menuState.cat !== c.id) return;
      let body = '';
      if (c.id === 'pizzas') {
        const match = !q || 'pizza'.indexOf(q) !== -1 || q.indexOf('pizza') !== -1 || Object.keys(TOP).some((k) => norm(TOP[k]).indexOf(q) !== -1);
        if (!match) return;
        body = pizzaBlockHTML();
        count += D.pizza.tamanos.length;
      } else {
        const list = ITEMS.filter((it) => it.cat === c.id && (!q || norm(c.nombre + ' ' + it.nombre + ' ' + it.desc).indexOf(q) !== -1));
        if (!list.length) return;
        count += list.length;
        body = '<ul class="mlist">' + list.map(rowHTML).join('') + '</ul>';
      }
      const lema = '<p>' + esc(c.lema) + (c.patatas ? ' · <span class="mcat__note">+ Patatas 2,00 € / + Patatas deluxe 3,00 €</span>' : '') + '</p>';
      const head = c.foto
        ? '<header class="mcat__head mcat__head--photo"><img src="' + c.foto + '"' + (c.fotoPos ? ' style="object-position:' + c.fotoPos + '"' : '') + ' alt="' + esc(c.nombre) + ' de Pizzería Nápoles" loading="lazy"><div class="mcat__cap"><h3 id="cat-' + c.id + '">' + esc(c.nombre) + '</h3>' + lema + '</div></header>'
        : '<header class="mcat__head"><div class="mcat__art">' + artOf(c.art) + '</div><div><h3 id="cat-' + c.id + '">' + esc(c.nombre) + '</h3>' + lema + '</div></header>';
      html += '<section class="mcat" aria-labelledby="cat-' + c.id + '">' + head + body + '</section>';
    });
    $('#menuBody').innerHTML = html;
    $('#menuEmpty').hidden = count > 0;
    $('#menuLive').textContent = count + (count === 1 ? ' resultado' : ' resultados');
  }
  renderMenu();

  // Añadir productos (carta y menús infantiles)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b) {
      const it = byId[b.dataset.add];
      if (!it) return;
      const sel = $('select[data-extra="' + it.id + '"]');
      const extra = sel ? D.patatas.find((p) => p.id === sel.value) : null;
      const name = (PREFIX[it.cat] ? PREFIX[it.cat] + ' ' : '') + it.nombre;
      cart.add({
        key: it.id + (extra && extra.id ? '-' + extra.id : ''),
        name: name.trim() + (extra && extra.id ? ' ' + extra.nombre.toLowerCase() : ''),
        price: it.precio + (extra ? extra.precio : 0),
        desc: it.desc,
        art: { type: 'dish', name: it.art }
      });
      b.classList.add('is-added');
      b.innerHTML = '<svg><use href="#i-check"/></svg>';
      setTimeout(() => { b.classList.remove('is-added'); b.innerHTML = '<svg><use href="#i-plus"/></svg>'; }, 1000);
      return;
    }
    const s = e.target.closest('[data-size]');
    if (s) {
      bState.size = s.dataset.size;
      renderBuilder();
      document.getElementById('crea').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      setTimeout(() => { const f = $('#bSize input:checked'); if (f) f.focus({ preventScroll: true }); }, 500);
    }
  });

  /* ---------- Pizza a tu gusto ---------- */
  const P = D.pizza;
  const MAX_TOP = 12;
  const bDefault = { size: 'mediana', toppings: ['jamon', 'champinon', 'aceituna'], name: '' };
  let bState = JSON.parse(JSON.stringify(bDefault));
  const sizeOf = () => P.tamanos.find((s) => s.id === bState.size);

  $('#bSize').innerHTML = P.tamanos.map((s) =>
    '<label class="opt opt--size"><input type="radio" name="size" value="' + s.id + '"><span><b>' + s.nombre + '</b><small>' + fmt(s.precio) + '</small></span></label>').join('');
  $('#bToppings').innerHTML = P.grupos.map((g) =>
    '<div class="tgroup"><p class="tgroup__name">' + g.nombre + '</p><div class="opts">' +
    g.items.map((t) => '<label class="opt"><input type="checkbox" name="top" value="' + t[0] + '"><span><i>' + toppingIcon(t[0]) + '</i>' + esc(t[1]) + '</span></label>').join('') +
    '</div></div>').join('');

  function bPrice() {
    const s = sizeOf();
    return s.precio + Math.max(0, bState.toppings.length - P.incluidos) * s.extra;
  }
  function bDesc() {
    return 'Pizza ' + sizeOf().nombre.toLowerCase() + ' · tomate y queso' + (bState.toppings.length ? ' · ' + bState.toppings.map((t) => TOP[t].toLowerCase()).join(', ') : '');
  }
  function bCfg(newOnes) {
    const t = bState.toppings;
    return {
      toppings: t.filter((x) => P.sinDibujo.indexOf(x) === -1),
      sauce: 'tomate',
      cheese: t.indexOf('dobleQueso') !== -1 ? 'doble' : 'mozzarella',
      thick: t.indexOf('dobleMasa') !== -1,
      extraSauce: t.indexOf('dobleSalsa') !== -1,
      seed: 'builder',
      animateNew: newOnes || []
    };
  }
  function renderBuilder(newOnes) {
    const s = sizeOf();
    const host = $('#bPizza');
    host.innerHTML = Art.pizza(bCfg(newOnes));
    host.style.setProperty('--scale', s.escala);
    const price = fmt(bPrice());
    $('#bPrice').textContent = price;
    $('#bPriceBtn').textContent = price;
    $('#bNameOut').textContent = bState.name || 'Mi pizza';
    $('#bMeta').textContent = bDesc();
    const n = bState.toppings.length;
    const extras = Math.max(0, n - P.incluidos);
    $('#bCount').textContent = n + (n === 1 ? ' elegido' : ' elegidos');
    $('#bHint').textContent = n <= P.incluidos
      ? 'Te quedan ' + (P.incluidos - n) + ' de ' + P.incluidos + ' ingredientes incluidos.'
      : extras + (extras === 1 ? ' ingrediente extra' : ' ingredientes extra') + ' × ' + fmt(s.extra) + ' (tamaño ' + s.nombre.toLowerCase() + ').';
    const full = n >= MAX_TOP;
    $$('#bToppings input').forEach((i) => { i.checked = bState.toppings.indexOf(i.value) !== -1; i.disabled = full && !i.checked; });
    $$('#bSize input').forEach((i) => { i.checked = i.value === bState.size; });
    $('#bName').value = bState.name;
  }
  $('#builderForm').addEventListener('change', (e) => {
    const i = e.target;
    if (i.name === 'top') {
      if (i.checked) bState.toppings.push(i.value); else bState.toppings = bState.toppings.filter((t) => t !== i.value);
      renderBuilder(i.checked ? [i.value] : []);
    } else if (i.name === 'size') {
      bState.size = i.value;
      renderBuilder();
    }
  });
  $('#bName').addEventListener('input', (e) => { bState.name = e.target.value.trim(); $('#bNameOut').textContent = bState.name || 'Mi pizza'; });
  $('#bRandom').addEventListener('click', () => {
    const all = Object.keys(TOP).filter((k) => P.sinDibujo.indexOf(k) === -1);
    const picks = all.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3));
    bState.toppings = picks;
    renderBuilder(picks);
  });
  $('#bReset').addEventListener('click', () => { bState = JSON.parse(JSON.stringify(bDefault)); renderBuilder(); });
  $('#builderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    cart.add({
      key: 'pizza-' + bState.size + '-' + bState.toppings.slice().sort().join('.') + '-' + (bState.name || ''),
      name: (bState.name ? bState.name + ' · ' : '') + 'Pizza ' + sizeOf().nombre.toLowerCase(),
      price: bPrice(),
      desc: bState.toppings.length ? bState.toppings.map((t) => TOP[t]).join(', ') : 'Tomate y queso',
      art: { type: 'pizza', cfg: Object.assign(bCfg(), { animateNew: [] }) }
    });
  });
  renderBuilder();

  /* ---------- Menú infantil y equipo ---------- */
  $('#kidsMenus').innerHTML = ITEMS.filter((it) => it.cat === 'infantil').map((it) =>
    '<article class="kmenu"><div class="kmenu__art">' + artOf(it.art) + '</div><h3>' + esc(it.nombre) + '</h3><p>' + esc(it.desc) + '</p>' +
    '<div class="kmenu__foot"><span class="price">' + fmt(it.precio) + '</span><button class="add" type="button" data-add="' + it.id + '" aria-label="Añadir ' + esc(it.nombre) + ' al pedido"><svg><use href="#i-plus"/></svg></button></div></article>').join('');
  const teamColors = ['#D62828', '#2D6A4F', '#E9A23B', '#9E1B1B', '#2A1F1A'];
  $('#team').innerHTML = D.equipo.map((p, i) =>
    '<li><span class="avatar" style="--c:' + teamColors[i % teamColors.length] + '" aria-hidden="true">' + esc(p.nombre.charAt(0)) + '</span><span><b>' + esc(p.nombre) + '</b><small>' + esc(p.rol) + '</small></span></li>').join('');

  /* ---------- Galería ---------- */
  function nest(svg, x, y, w, h) { return svg.replace('<svg ', '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" '); }
  let sid = 0;
  const SCENES = {
    horno() {
      const u = 'sc' + (++sid);
      return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs><pattern id="' + u + 'b" width="60" height="30" patternUnits="userSpaceOnUse"><rect width="60" height="30" fill="#8A4226"/><path d="M0,1.5H60M0,16.5H60M30,0V15M1.5,15V30" stroke="#4A2213" stroke-width="3"/></pattern>' +
        '<radialGradient id="' + u + 'f"><stop offset="0" stop-color="#FFE08A"/><stop offset=".45" stop-color="#F28C28"/><stop offset="1" stop-color="#D62828" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="400" height="400" fill="#2A1F1A"/><path d="M20,400 L20,210 A180,180 0 0 1 380,210 L380,400Z" fill="url(#' + u + 'b)"/>' +
        '<path d="M80,345 L80,262 A120,120 0 0 1 320,262 L320,345Z" fill="#140C08"/><ellipse cx="200" cy="320" rx="150" ry="80" fill="url(#' + u + 'f)" opacity=".9"/>' +
        '<path d="M240,345 C226,310 252,292 246,256 C276,284 292,318 280,345Z" fill="#F28C28"/><path d="M262,345 C256,322 270,310 268,288 C288,308 296,330 290,345Z" fill="#F7C95C"/>' +
        '<g transform="translate(140 330) scale(1 .34)">' + nest(Art.pizza({ toppings: ['jamon', 'champinon'], seed: 'horno' }), -60, -60, 120, 120) + '</g>' +
        '<rect x="0" y="345" width="400" height="55" fill="#3B2418"/><path d="M60,372 L340,360 L346,368 L64,384Z" fill="#B07A45"/>' +
        '<text x="200" y="118" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="34" fill="#F7C95C">Nápoles</text></svg>';
    },
    faro() {
      const u = 'sc' + (++sid);
      return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style="overflow:visible" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs><linearGradient id="' + u + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9E1B1B"/><stop offset=".5" stop-color="#E9A23B"/><stop offset="1" stop-color="#F7C95C"/></linearGradient></defs>' +
        '<rect x="-600" y="-200" width="1600" height="800" fill="url(#' + u + 's)"/><circle cx="110" cy="250" r="44" fill="#FFF4E0" opacity=".85"/>' +
        '<rect x="-600" y="270" width="1600" height="400" fill="#1F4E5F"/><path d="M70,282 h80 M84,296 h52 M96,310 h28" stroke="#F7C95C" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M222,300 L236,96 L268,96 L282,300Z" fill="#FFF4E0"/><path d="M226,240 L278,240 L280,262 L224,262Z" fill="#E9DCC5"/>' +
        '<rect x="230" y="80" width="44" height="18" fill="#2A1F1A"/><rect x="236" y="56" width="32" height="26" fill="#F7C95C"/><path d="M232,56 L252,36 L272,56Z" fill="#2A1F1A"/>' +
        '<path d="M268,66 L400,30 L400,100Z" fill="#FFF4E0" opacity=".25"/>' +
        '<path d="M180,300 L330,300 L350,320 L160,320Z" fill="#E9DCC5"/><rect x="150" y="318" width="210" height="10" fill="#C9B79A"/>' +
        '<text x="200" y="378" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="26" fill="#FFF4E0">Chipiona</text></svg>';
    },
    pizzaBg(bg, top, seed) {
      return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="400" height="400" fill="' + bg + '"/>' +
        '<circle cx="230" cy="230" r="210" fill="#2A1F1A" opacity=".18"/>' + nest(Art.pizza({ toppings: top, seed: seed }), 10, 10, 420, 420) + '</svg>';
    },
    masa() {
      const u = 'sc' + (++sid);
      let dots = '';
      for (let i = 0; i < 60; i++) dots += '<circle cx="' + ((i * 97) % 400) + '" cy="' + ((i * 53) % 400) + '" r="' + (1 + (i % 3)) + '" fill="#fff" opacity=".6"/>';
      return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs><radialGradient id="' + u + 'd" cx="40%" cy="35%"><stop offset="0" stop-color="#FFFDF5"/><stop offset="1" stop-color="#EBD3A8"/></radialGradient></defs>' +
        '<rect width="400" height="400" fill="#C08A55"/><ellipse cx="200" cy="215" rx="125" ry="105" fill="#2A1F1A" opacity=".2"/><ellipse cx="195" cy="200" rx="122" ry="100" fill="url(#' + u + 'd)"/>' +
        '<g transform="rotate(-28 200 200)"><rect x="40" y="320" width="320" height="34" rx="17" fill="#B07A45"/><rect x="10" y="328" width="40" height="18" rx="9" fill="#8A5A3C"/><rect x="350" y="328" width="40" height="18" rx="9" fill="#8A5A3C"/></g>' + dots + '</svg>';
    },
    mesa() {
      const u = 'sc' + (++sid);
      return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs><pattern id="' + u + 'c" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="#FFF4E0"/><rect width="25" height="25" fill="#D62828" opacity=".85"/><rect x="25" y="25" width="25" height="25" fill="#D62828" opacity=".85"/></pattern></defs>' +
        '<rect width="400" height="400" fill="url(#' + u + 'c)"/><circle cx="190" cy="215" r="150" fill="#2A1F1A" opacity=".25"/>' +
        nest(Art.pizza({ toppings: ['bacon', 'cebollaCaram', 'cabra'], seed: 'mesa' }), 40, 60, 300, 300) +
        nest(Art.dish('cerveza'), 290, 10, 110, 110) + '</svg>';
    },
    burger() {
      return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="400" height="400" fill="#BFD8B8"/>' +
        nest(Art.dish('burger'), 40, 40, 320, 320) + '</svg>';
    }
  };
  const photo = (src, alt) => '<img src="' + src + '" alt="' + esc(alt) + '" loading="lazy">';
  const gallery = [
    { cls: 'gtile--wide', cap: 'La familia de Pizzería Nápoles', img: 'assets/fotos/familia.jpg' },
    { cls: 'gtile--tall', cap: 'Ingredientes frescos', img: 'assets/fotos/ingredientes.jpg' },
    { cls: '', cap: 'Masa casera hecha cada día', img: 'assets/fotos/masa-bolas.jpg' },
    { cls: 'gtile--wide', cap: 'Nuestras pizzas', img: 'assets/fotos/pizzas.jpg' },
    { cls: '', cap: 'Estirando la masa a mano', img: 'assets/fotos/masa-estirar.jpg' },
    { cls: 'gtile--wide', cap: 'Burguers 100 % americanas', img: 'assets/fotos/burger.jpg' },
    { cls: '', cap: 'Así hacemos nuestra masa', img: 'assets/fotos/masa-volteo.jpg' },
    { cls: '', cap: 'Desde 1985 en Chipiona', art: () => SCENES.faro() }
  ];
  const galleryHTML = (g) => (g.img ? photo(g.img, g.cap) : g.art());
  gallery.forEach((g, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gtile ' + g.cls;
    b.setAttribute('aria-label', 'Ampliar imagen: ' + g.cap);
    b.innerHTML = '<div class="gtile__art">' + galleryHTML(g) + '</div><figcaption aria-hidden="true">' + esc(g.cap) + '</figcaption>';
    b.addEventListener('click', () => openLightbox(i));
    $('#galleryGrid').appendChild(b);
  });

  /* ---------- Diálogos accesibles ---------- */
  let lastFocus = null;
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', container).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  const modal = $('#modal');
  function openModal(html) {
    lastFocus = document.activeElement;
    $('#modalBody').innerHTML = html;
    modal.hidden = false;
    document.body.classList.add('is-locked');
    $('#modalClose').focus();
  }
  function closeModal() { modal.hidden = true; document.body.classList.remove('is-locked'); if (lastFocus) lastFocus.focus(); }
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close-modal]')) closeModal(); });
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); trapFocus(modal, e); });

  const lb = $('#lightbox');
  let lbIndex = 0;
  function showLb(i) {
    lbIndex = (i + gallery.length) % gallery.length;
    $('#lbArt').innerHTML = galleryHTML(gallery[lbIndex]);
    $('#lbCap').textContent = gallery[lbIndex].cap + ' (' + (lbIndex + 1) + '/' + gallery.length + ')';
  }
  function openLightbox(i) { lastFocus = document.activeElement; lb.hidden = false; document.body.classList.add('is-locked'); showLb(i); $('#lbClose').focus(); }
  function closeLightbox() { lb.hidden = true; document.body.classList.remove('is-locked'); if (lastFocus) lastFocus.focus(); }
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => showLb(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => showLb(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
    trapFocus(lb, e);
  });
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Pedido ---------- */
  const cartEl = $('#cart');
  const overlay = $('#overlay');
  const cart = {
    items: store.get('napoles-chipiona-cart', []),
    save() { store.set('napoles-chipiona-cart', this.items); },
    count() { return this.items.reduce((s, i) => s + i.qty, 0); },
    total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },
    mode() { return ($('input[name="modo"]:checked') || {}).value || 'domicilio'; },
    add(item) {
      const ex = this.items.find((i) => i.key === item.key);
      if (ex) ex.qty++; else this.items.push(Object.assign({ qty: 1 }, item));
      this.save();
      renderCart();
      const btn = $('#cartOpen');
      btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
      toast(item.name + ' · añadido al pedido');
    },
    setQty(key, d) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      it.qty += d;
      if (it.qty <= 0) this.items = this.items.filter((i) => i.key !== key);
      this.save(); renderCart();
    }
  };
  function totalsHTML() {
    const t = cart.total();
    return '<dt>Productos</dt><dd>' + cart.count() + '</dd><dt class="tot">Total</dt><dd class="tot">' + fmt(t) + '</dd>';
  }
  function renderCart() {
    const n = cart.count();
    const c = $('#cartCount');
    c.textContent = n;
    c.classList.toggle('has-items', n > 0);
    $('#cartOpen').setAttribute('aria-label', 'Abrir pedido, ' + n + (n === 1 ? ' producto' : ' productos'));
    $('#cartList').innerHTML = cart.items.map((i) =>
      '<li class="citem"><div class="citem__art">' + artFromCfg(i.art) + '</div><div><h4>' + esc(i.name) + '</h4>' +
      (i.desc ? '<small>' + esc(i.desc.length > 70 ? i.desc.slice(0, 68) + '…' : i.desc) + '</small>' : '') +
      '<div class="citem__price">' + fmt(i.price * i.qty) + '</div></div>' +
      '<div class="qty"><button type="button" data-q="-1" data-k="' + esc(i.key) + '" aria-label="Quitar uno de ' + esc(i.name) + '"><svg><use href="#' + (i.qty === 1 ? 'i-trash' : 'i-minus') + '"/></svg></button>' +
      '<span>' + i.qty + '</span><button type="button" data-q="1" data-k="' + esc(i.key) + '" aria-label="Añadir otro de ' + esc(i.name) + '"><svg><use href="#i-plus"/></svg></button></div></li>').join('');
    const empty = !cart.items.length;
    $('#cartEmpty').hidden = !empty;
    $('#cartFoot').hidden = empty;
    $('#totals').innerHTML = totalsHTML();
    $('#totals2').innerHTML = totalsHTML();
  }
  $('#emptyArt').innerHTML = Art.pizza({ toppings: [], cheese: 'ninguno', seed: 'vacia' });
  $('#cartList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const key = b.dataset.k;
    cart.setQty(key, parseInt(b.dataset.q, 10));
    const again = $('#cartList [data-k="' + CSS.escape(key) + '"][data-q="' + b.dataset.q + '"]');
    (again || $('#cartClose')).focus();
  });
  $$('input[name="modo"]').forEach((r) => r.addEventListener('change', () => { $('#oAddrField').hidden = cart.mode() === 'recoger'; }));

  function goStep(n) {
    $$('.cart__panel').forEach((p) => { p.hidden = p.dataset.panel !== String(n); });
    $$('.cart__steps li').forEach((li) => {
      const s = +li.dataset.s;
      li.classList.toggle('is-active', s === n);
      li.classList.toggle('is-done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    const p = $('.cart__panel[data-panel="' + n + '"]');
    p.scrollTop = 0;
    if (n === 2) setTimeout(() => $('#oName').focus(), 50);
  }
  function openCart() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    cartEl.removeAttribute('inert');
    cartEl.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => { overlay.classList.add('is-on'); cartEl.classList.add('is-open'); });
    $('#cartOpen').setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    if (!$('.cart__panel[data-panel="3"]').hidden && cart.items.length) goStep(1);
    setTimeout(() => $('#cartClose').focus(), 60);
  }
  function closeCart() {
    overlay.classList.remove('is-on');
    cartEl.classList.remove('is-open');
    cartEl.setAttribute('inert', '');
    cartEl.setAttribute('aria-hidden', 'true');
    $('#cartOpen').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    setTimeout(() => { if (!cartEl.classList.contains('is-open')) overlay.hidden = true; }, 300);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  $('#cartOpen').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  cartEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); trapFocus(cartEl, e); });
  $$('[data-close-cart]').forEach((a) => a.addEventListener('click', closeCart));
  $('#toCheckout').addEventListener('click', () => { $('#oAddrField').hidden = cart.mode() === 'recoger'; goStep(2); });
  $('#backToCart').addEventListener('click', () => goStep(1));
  $('#newOrder').addEventListener('click', () => { goStep(1); closeCart(); location.hash = '#carta'; });

  /* Validación */
  function validate(rules) {
    let firstBad = null;
    rules.forEach((r) => {
      const el = $(r[0]);
      const err = $(r[0] + 'Err');
      const msg = r[1](el.type === 'checkbox' ? el.checked : el.value.trim());
      if (msg) {
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', err.id);
        err.textContent = msg;
        if (!firstBad) firstBad = el;
      } else { el.removeAttribute('aria-invalid'); err.textContent = ''; }
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  const req = (label) => (v) => (v.length < 2 ? 'Escribe ' + label + '.' : '');
  const phoneOk = (v) => (/^\+?[\d\s]{9,15}$/.test(v) ? '' : 'Introduce un teléfono válido (9 dígitos).');
  const mailOk = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Introduce un email válido.');

  let trackTimers = [];
  $('#checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pickup = cart.mode() === 'recoger';
    const rules = [['#oName', req('tu nombre')], ['#oPhone', phoneOk]];
    if (!pickup) rules.push(['#oAddr', (v) => (v.length < 6 ? 'Necesitamos la dirección para llevártelo.' : '')]);
    if (!validate(rules)) return;
    const id = '#' + Math.floor(1000 + Math.random() * 9000);
    const total = cart.total();
    const orders = store.get('napoles-chipiona-orders', []);
    orders.push({ id: id, fecha: new Date().toISOString(), items: cart.items, total: total, modo: pickup ? 'recoger' : 'domicilio' });
    store.set('napoles-chipiona-orders', orders);
    $('#orderId').textContent = id;
    $('#doneMsg').textContent = (pickup ? 'Te avisamos cuando esté listo para recoger en Av. de la Constitución, 34.' : 'Nuestro reparto te lo lleva a casa.') +
      ' Total ' + fmt(total) + ' · pago en ' + $('input[name="pago"]:checked').value.toLowerCase() + '.';
    $('#trackLast').textContent = pickup ? 'Listo para recoger' : 'En camino';
    $('#donePizza').innerHTML = artFromCfg(cart.items[0] && cart.items[0].art);
    cart.items = []; cart.save(); renderCart();
    e.target.reset();
    goStep(3);
    trackTimers.forEach(clearTimeout);
    const lis = $$('#tracker li');
    lis.forEach((l) => l.classList.remove('is-done', 'is-now'));
    lis.forEach((l, i) => trackTimers.push(setTimeout(() => {
      if (i > 0) { lis[i - 1].classList.remove('is-now'); lis[i - 1].classList.add('is-done'); }
      l.classList.add('is-now');
    }, i * 2000)));
  });
  renderCart();

  /* ---------- Reservas ---------- */
  (function reservas() {
    const dateIn = $('#rDate');
    const timeIn = $('#rTime');
    const iso = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    const maxD = new Date(); maxD.setDate(maxD.getDate() + 60);
    dateIn.min = iso(new Date());
    dateIn.max = iso(maxD);
    let people = 2;
    function slots() {
      timeIn.innerHTML = '';
      if (!dateIn.value) return;
      const d = new Date(dateIn.value + 'T12:00:00');
      const s = season(d);
      const isToday = dateIn.value === iso(new Date());
      const nowM = new Date().getHours() * 60 + new Date().getMinutes();
      for (let m = s.abre; m <= s.cierra - 60; m += 15) {
        if (isToday && m < nowM + 30) continue;
        const o = document.createElement('option');
        o.value = o.textContent = hhmm(m);
        timeIn.appendChild(o);
      }
      if (!timeIn.options.length) timeIn.innerHTML = '<option value="">Hoy ya no quedan horas</option>';
    }
    // Primer día con horas libres
    const d0 = new Date();
    dateIn.value = iso(d0);
    slots();
    if (!timeIn.value) { d0.setDate(d0.getDate() + 1); dateIn.value = iso(d0); slots(); }
    dateIn.addEventListener('change', slots);
    $$('.stepper__btn').forEach((b) => b.addEventListener('click', () => {
      const next = people + parseInt(b.dataset.step, 10);
      if (next > 15) { toast('Para grupos de más de 15 personas, llámanos al 956 37 34 34'); return; }
      people = clamp(next, 1, 15);
      $('#rPeople').textContent = people;
    }));
    $('#reserveForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = validate([
        ['#rDate', (v) => (!v ? 'Elige una fecha.' : v < dateIn.min ? 'Esa fecha ya ha pasado.' : '')],
        ['#rTime', (v) => (v ? '' : 'Elige una hora disponible.')],
        ['#rName', req('tu nombre')], ['#rPhone', phoneOk], ['#rEmail', mailOk]
      ]);
      if (!ok) return;
      const code = 'NAP-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const fecha = new Date(dateIn.value + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const list = store.get('napoles-chipiona-reservas', []);
      list.push({ code: code, fecha: dateIn.value, hora: timeIn.value, personas: people, nombre: $('#rName').value.trim() });
      store.set('napoles-chipiona-reservas', list);
      openModal('<div class="modal__art">' + Art.pizza({ toppings: ['jamon', 'champinon'], seed: code }) + '</div>' +
        '<h3 id="modalTitle">¡Mesa reservada!</h3><p>Te esperamos, ' + esc($('#rName').value.trim().split(' ')[0]) + '.</p>' +
        '<dl class="ticket"><dt>Código</dt><dd>' + code + '</dd><dt>Día</dt><dd>' + fecha + '</dd><dt>Hora</dt><dd>' + timeIn.value + '</dd><dt>Personas</dt><dd>' + people + '</dd>' +
        '<dt>Lugar</dt><dd>Av. de la Constitución, 34</dd></dl><button class="btn btn--primary" data-close-modal><span>Perfecto</span></button>');
      e.target.reset();
      dateIn.value = iso(d0); slots(); people = 2; $('#rPeople').textContent = 2;
    });
  })();

  /* ---------- Contacto ---------- */
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = validate([
      ['#cName', req('tu nombre')], ['#cEmail', mailOk], ['#cSubject', req('un asunto')],
      ['#cMsg', (v) => (v.length < 10 ? 'Cuéntanos un poco más (mínimo 10 caracteres).' : '')],
      ['#cPrivacy', (v) => (v ? '' : 'Debes aceptar la política de privacidad.')]
    ]);
    if (!ok) return;
    e.target.reset();
    toast('¡Mensaje enviado! Te responderemos lo antes posible.');
  });

  /* ---------- Varios ---------- */
  $('#year').textContent = new Date().getFullYear();
  reveal(document);
})();
