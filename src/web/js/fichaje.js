/* ==========================================================================
   Pizzería Nápoles · Portal del empleado (fichaje) · Interfaz
   Vistas del empleado (fichar, historial, ausencias) y del encargado
   (panel, equipo, solicitudes, turnos, informes, ajustes y quiosco).
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Fichaje;
  const { H, M, D } = F;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privado */ } }
  };
  const sess = {
    get() { try { return sessionStorage.getItem('napoles-fichaje-sesion'); } catch (e) { return null; } },
    set(v) { try { v ? sessionStorage.setItem('napoles-fichaje-sesion', v) : sessionStorage.removeItem('napoles-fichaje-sesion'); } catch (e) { /* privado */ } }
  };

  /* ---------- Formatos ---------- */
  const hhmm = (t) => { const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
  const hhmmss = (t) => { const d = new Date(t); return hhmm(t) + ':' + pad2(d.getSeconds()); };
  const minStr = (m) => pad2(Math.floor((m % 1440) / 60)) + ':' + pad2(m % 60);
  const dur = (ms) => { const m = Math.round(Math.abs(ms) / M); const h = Math.floor(m / 60); return (h ? h + ' h ' : '') + pad2(m % 60) + ' min'; };
  const durClock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60); };
  const horas = (ms, dec) => (ms / H).toFixed(dec == null ? 1 : dec).replace('.', ',') + ' h';
  const saldo = (ms) => (ms >= 0 ? '+' : '−') + horas(Math.abs(ms));
  const fFecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fCorta = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const fMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  const fDT = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fechaKey = (k, f) => (f || fCorta).format(new Date(F.dayStart(k)));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const ORDEN = [1, 2, 3, 4, 5, 6, 0];
  const iniciales = (n) => n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const avatar = (e, cls) => '<span class="avatar ' + (cls || '') + '" style="--c:' + e.color + '">' + esc(iniciales(e.nombre)) + '</span>';
  const turnoTxt = (t) => t.length ? t.map((r) => minStr(r[0]) + '–' + minStr(r[1])).join(' y ') : 'Libre';
  const icon = (id) => '<svg aria-hidden="true"><use href="#i-' + id + '"/></svg>';

  function toast(msg, tipo) {
    const el = document.createElement('div');
    el.className = 'toast' + (tipo === 'error' ? ' toast--error' : '');
    el.innerHTML = icon(tipo === 'error' ? 'alert' : 'check') + '<span></span>';
    el.querySelector('span').textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 300); }, tipo === 'error' ? 4200 : 2600);
  }

  /* ---------- Tema (comparte la preferencia con la web) ---------- */
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
    setTheme(next); store.set('napoles-theme', next);
  });

  /* ---------- Modal ---------- */
  const modal = $('#modal');
  let lastFocus = null, onModalClose = null;
  function openModal(html, onClose) {
    lastFocus = document.activeElement;
    $('#modalBody').innerHTML = html;
    modal.hidden = false;
    document.body.classList.add('is-locked');
    onModalClose = onClose || null;
    setTimeout(() => { const f = $('input, select, textarea, button:not(.modal__close)', $('#modalBody')); (f || $('#modalClose')).focus(); }, 30);
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    if (onModalClose) { const fn = onModalClose; onModalClose = null; fn(); }
    if (lastFocus) lastFocus.focus();
  }
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!modal.hidden) closeModal(); else if (!$('#kiosk').hidden) closeKiosk(); } });

  /* ---------- Tooltip de gráficos ---------- */
  const tip = $('#tip');
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.innerHTML = t.getAttribute('data-tip');
    tip.hidden = false;
  });
  document.addEventListener('mousemove', (e) => {
    if (tip.hidden) return;
    const w = tip.offsetWidth, x = Math.min(innerWidth - w - 8, e.clientX + 14);
    tip.style.transform = 'translate(' + Math.max(8, x) + 'px,' + (e.clientY + 16) + 'px)';
  });
  document.addEventListener('focusin', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    const r = t.getBoundingClientRect();
    tip.innerHTML = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.transform = 'translate(' + Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, r.left)) + 'px,' + (r.bottom + 8) + 'px)';
  });

  /* ==========================================================================
     ACCESO
     ========================================================================== */
  let me = null; // empleado con sesión iniciada
  let pinFor = null;
  const S = () => F.state;

  function renderPeople() {
    $('#people').innerHTML = S().empleados.filter((e) => e.activo).map((e) => {
      const st = F.estado(e.id).estado;
      return '<li><button class="fx-person" data-emp="' + e.id + '">' + avatar(e) +
        '<span><b>' + esc(e.nombre) + '</b><small>' + esc(e.puesto) + '</small></span>' +
        '<i class="fx-dot fx-dot--' + st + '" title="' + (st === 'fuera' ? 'Fuera' : st === 'pausa' ? 'En pausa' : 'Trabajando') + '"></i></button></li>';
    }).join('');
  }
  $('#people').addEventListener('click', (e) => {
    const b = e.target.closest('[data-emp]');
    if (!b) return;
    pinFor = F.empleado(b.dataset.emp);
    $('#pinWho').innerHTML = avatar(pinFor, 'avatar--lg') + '<p><b>' + esc(pinFor.nombre) + '</b><br><small>' + esc(pinFor.puesto) + '</small></p>';
    $('#people').hidden = true; $('#pinBox').hidden = false;
    $('#pinInput').value = ''; updateDots(); $('#pinErr').textContent = '';
    $('#pinInput').focus();
  });
  $('#pinBack').addEventListener('click', () => { $('#people').hidden = false; $('#pinBox').hidden = true; pinFor = null; });

  function keypadHTML() {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<button type="button" data-k="' + n + '">' + n + '</button>').join('') +
      '<button type="button" data-k="del" aria-label="Borrar">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="ok" class="is-ok" aria-label="Entrar">' + icon('arrow') + '</button>';
  }
  $('#keypad').innerHTML = keypadHTML();
  function updateDots() { const n = $('#pinInput').value.length; $$('#pinDots i').forEach((d, i) => d.classList.toggle('is-on', i < n)); }
  function tryPin() {
    const v = $('#pinInput').value;
    if (v.length < 4) return;
    if (pinFor && v === pinFor.pin) { login(pinFor.id); }
    else {
      $('#pinErr').textContent = 'PIN incorrecto. Inténtalo de nuevo.';
      $('#pinBox').classList.remove('shake'); void $('#pinBox').offsetWidth; $('#pinBox').classList.add('shake');
      $('#pinInput').value = ''; updateDots();
    }
  }
  $('#keypad').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const inp = $('#pinInput'), k = b.dataset.k;
    if (k === 'del') inp.value = inp.value.slice(0, -1);
    else if (k === 'ok') tryPin();
    else if (inp.value.length < 4) inp.value += k;
    updateDots(); if (inp.value.length === 4 && k !== 'ok') setTimeout(tryPin, 120);
    inp.focus();
  });
  $('#pinInput').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); updateDots(); if (e.target.value.length === 4) tryPin(); });

  function login(id) {
    me = F.empleado(id);
    sess.set(id);
    $('#login').hidden = true; $('#shell').hidden = false;
    $('#logout').hidden = false; $('#userChip').hidden = false;
    $('#userChip').innerHTML = avatar(me) + '<span><b>' + esc(me.nombre) + '</b><small>' + esc(me.puesto) + '</small></span>';
    if (!location.hash || (!isBoss() && BOSS_VIEWS.includes(route().view))) location.hash = isBoss() ? '#panel' : '#fichar';
    render();
  }
  function logout() {
    me = null; sess.set(null); stopCamera();
    $('#shell').hidden = true; $('#login').hidden = false; $('#logout').hidden = true; $('#userChip').hidden = true;
    $('#people').hidden = false; $('#pinBox').hidden = true;
    history.replaceState(null, '', location.pathname);
    renderPeople();
  }
  $('#logout').addEventListener('click', logout);
  const isBoss = () => me && me.rol === 'encargado';

  /* ==========================================================================
     NAVEGACIÓN
     ========================================================================== */
  const EMP_VIEWS = [['fichar', 'Fichar'], ['historial', 'Mi historial'], ['ausencias', 'Ausencias y turnos']];
  const BOSS_TABS = [['panel', 'Panel'], ['equipo', 'Equipo'], ['solicitudes', 'Solicitudes'], ['turnos', 'Turnos'], ['informes', 'Informes'], ['ajustes', 'Ajustes']];
  const BOSS_VIEWS = BOSS_TABS.map((t) => t[0]);
  function route() { const [view, arg] = location.hash.replace('#', '').split('/'); return { view: view || 'fichar', arg }; }
  window.addEventListener('hashchange', () => { if (me) { render(); $('#view').focus({ preventScroll: true }); scrollTo(0, 0); } });

  function renderTabs() {
    const r = route().view;
    const pend = S().correcciones.filter((c) => c.estado === 'pendiente').length + S().ausencias.filter((a) => a.estado === 'pendiente').length;
    const link = (t) => '<a href="#' + t[0] + '"' + (r === t[0] ? ' aria-current="page"' : '') + '>' + t[1] +
      (t[0] === 'solicitudes' && pend ? ' <span class="fx-badge">' + pend + '</span>' : '') + '</a>';
    const group = (label, tabs, cls) => '<div class="fx-tabs__group ' + cls + '">' + (label ? '<span class="fx-tabs__label">' + label + '</span>' : '') + tabs.map(link).join('') + '</div>';
    $('#tabs').innerHTML = isBoss() ? group('Encargado', BOSS_TABS, 'fx-tabs__group--boss') + group('Mi fichaje', EMP_VIEWS, '') : group('', EMP_VIEWS, '');
  }

  function render() {
    if (!me) return;
    me = F.empleado(me.id);
    const r = route();
    if (BOSS_VIEWS.includes(r.view) && !isBoss()) { location.hash = '#fichar'; return; }
    renderTabs();
    const v = $('#view');
    v.dataset.view = r.view;
    switch (r.view) {
      case 'historial': v.innerHTML = viewHistorial(me.id, r.arg, false); break;
      case 'ausencias': v.innerHTML = viewAusencias(me.id); break;
      case 'panel': v.innerHTML = viewPanel(); break;
      case 'equipo': v.innerHTML = r.arg ? viewEmpleado(r.arg) : viewEquipo(); break;
      case 'solicitudes': v.innerHTML = viewSolicitudes(); break;
      case 'turnos': v.innerHTML = viewTurnos(); break;
      case 'informes': v.innerHTML = viewInformes(); break;
      case 'ajustes': v.innerHTML = viewAjustes(); break;
      default: v.innerHTML = viewFichar(); afterFichar();
    }
    tick();
  }
  F.onChange(() => { if (me) render(); else renderPeople(); });

  /* ==========================================================================
     FICHAR
     ========================================================================== */
  let metodo = store.get('napoles-fichaje-metodo', 'gps');
  let simular = store.get('napoles-fichaje-simular', true);
  let loc = { status: 'idle' };

  function saludo() { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'; }

  function viewFichar() {
    const now = Date.now(), hoy = F.dayKey(now);
    const st = F.estado(me.id, now);
    const turnos = F.turnosDia(me.id, hoy);
    const aus = F.ausenciaDe(me.id, hoy);
    const cfg = S().config;
    const mets = [['gps', 'Ubicación', 'pin'], ['codigo', 'QR / código', 'qr']].filter((m) => cfg.metodos[m[0]]);
    if (!mets.some((m) => m[0] === metodo) && mets.length) metodo = mets[0][0];
    const stLabel = { fuera: 'Fuera de turno', trabajando: 'Trabajando', pausa: 'En pausa' }[st.estado];
    const desde = st.estado === 'fuera' ? (st.desde && F.dayKey(st.desde) === hoy ? 'Saliste a las ' + hhmm(st.desde) : turnos.length && !aus ? 'Tu turno: ' + turnoTxt(turnos) : aus ? F.AUSENCIAS[aus.tipo] : 'Hoy libras')
      : st.estado === 'pausa' ? F.PAUSAS[st.pausa.tipo] + ' desde las ' + hhmm(st.desde) : 'Desde las ' + hhmm(st.sesion.inicio);

    let actions = '';
    if (st.estado === 'fuera') actions = '<button class="fx-big fx-big--in" data-act="entrada">' + icon('play') + '<span>Fichar entrada</span></button>';
    else if (st.estado === 'trabajando') actions = '<button class="fx-big fx-big--pause" data-act="pausa">' + icon('pause') + '<span>Hacer una pausa</span></button><button class="fx-big fx-big--out" data-act="salida">' + icon('stop') + '<span>Fichar salida</span></button>';
    else actions = '<button class="fx-big fx-big--in" data-act="pausa_fin">' + icon('play') + '<span>Volver de la pausa</span></button><button class="fx-big fx-big--out" data-act="salida">' + icon('stop') + '<span>Fichar salida</span></button>';

    const al = F.alertas(now, me.id).filter((a) => a.codigo === 'sin-cerrar' || a.codigo === 'sin-pausa').slice(0, 3);
    const misPend = S().correcciones.filter((c) => c.empId === me.id && c.estado === 'pendiente').length;

    return '<div class="fx-fichar">' +
      '<article class="card fx-clock fx-clock--' + st.estado + '">' +
        '<p class="fx-clock__hello">' + saludo() + ', <b>' + esc(me.nombre) + '</b></p>' +
        '<p class="fx-clock__date">' + cap(fFecha.format(new Date())) + '</p>' +
        '<p class="fx-clock__time" data-live="clock">' + hhmmss(now) + '</p>' +
        '<p class="fx-state fx-state--' + st.estado + '"><i></i>' + stLabel + '<span>' + esc(desde) + '</span></p>' +
        '<div class="fx-ring" id="ring"></div>' +
        (mets.length > 1 ? '<div class="seg fx-method" role="radiogroup" aria-label="Cómo fichar">' + mets.map((m) => '<label><input type="radio" name="metodo" value="' + m[0] + '"' + (metodo === m[0] ? ' checked' : '') + '><span>' + icon(m[2]) + m[1] + '</span></label>').join('') + '</div>' : '') +
        '<div class="fx-methodbox" id="methodBox"></div>' +
        '<div class="fx-actions">' + actions + '</div>' +
        '<p class="fx-fine">' + icon('shield') + 'Tus fichajes no se pueden borrar ni modificar. Si te equivocas, pide una corrección: queda registrado quién, cuándo y por qué.</p>' +
      '</article>' +
      '<div class="fx-side">' +
        (al.length ? '<article class="card fx-alerts">' + al.map((a) => '<div class="fx-alert fx-alert--' + a.nivel + '">' + icon('alert') + '<p><b>' + cap(fechaKey(a.dia)) + ':</b> ' + esc(a.texto) + '</p>' + (a.codigo === 'sin-cerrar' && !/pendiente/.test(a.texto) ? '<button class="btn btn--small" data-corr="' + a.dia + '">Corregir</button>' : '') + '</div>').join('') + '</article>' : '') +
        hoyCard(me.id, now) + semanaCard(me.id, now) + mesCard(me.id, now) +
        (misPend ? '<p class="fx-note">Tienes ' + misPend + ' corrección' + (misPend > 1 ? 'es' : '') + ' pendiente' + (misPend > 1 ? 's' : '') + ' de revisar por el encargado. <a href="#historial">Ver</a></p>' : '') +
      '</div></div>';
  }

  function hoyCard(empId, now) {
    const hoy = F.dayKey(now);
    const ss = F.sesiones(empId, now).filter((s) => s.dia === hoy || s.abierta);
    const turnos = F.turnosDia(empId, hoy);
    const evs = ss.flatMap((s) => s.eventos);
    // Línea de tiempo: de la primera hora (turno o fichaje) a la última
    const starts = turnos.map((r) => F.atMin(hoy, r[0])).concat(ss.map((s) => s.inicio));
    const ends = turnos.map((r) => F.atMin(hoy, r[1])).concat(ss.map((s) => s.fin || now));
    let tl = '';
    if (starts.length) {
      const a = Math.min(...starts) - 30 * M;
      const b = Math.max(a + 5 * H, Math.max(...ends) + 30 * M);
      const pct = (t) => ((t - a) / (b - a) * 100).toFixed(2) + '%';
      const w = (x, y) => ((y - x) / (b - a) * 100).toFixed(2) + '%';
      tl = '<div class="fx-tl" aria-hidden="true">' +
        turnos.map((r) => '<i class="fx-tl__plan" style="left:' + pct(F.atMin(hoy, r[0])) + ';width:' + w(F.atMin(hoy, r[0]), F.atMin(hoy, r[1])) + '"></i>').join('') +
        ss.map((s) => '<i class="fx-tl__work" style="left:' + pct(s.inicio) + ';width:' + w(s.inicio, s.fin || now) + '"></i>' +
          s.pausas.map((p) => '<i class="fx-tl__pause" style="left:' + pct(p.inicio) + ';width:' + w(p.inicio, p.fin || now) + '"></i>').join('')).join('') +
        (now > a && now < b ? '<i class="fx-tl__now" style="left:' + pct(now) + '"></i>' : '') +
        '</div><div class="fx-tl__axis"><span>' + hhmm(a + 30 * M) + '</span><span>' + hhmm(b - 30 * M) + '</span></div>' +
        '<ul class="fx-legend"><li><i class="k-plan"></i>Turno previsto</li><li><i class="k-work"></i>Trabajado</li><li><i class="k-pause"></i>Pausa</li></ul>';
    }
    return '<article class="card fx-card"><h3>' + icon('clock') + 'Hoy</h3>' +
      '<p class="fx-kv"><span>Turno</span><b>' + turnoTxt(turnos) + '</b></p>' + tl +
      (evs.length ? '<ol class="fx-events">' + evs.map(eventoLi).join('') + '</ol>' : '<p class="muted">Todavía no has fichado hoy.</p>') + '</article>';
  }
  function eventoLi(ev) {
    return '<li class="fx-ev fx-ev--' + ev.tipo + '"><time>' + hhmm(ev.ts) + '</time><span>' + F.TIPOS[ev.tipo] + (ev.pausaTipo && ev.tipo === 'pausa_inicio' ? ' · ' + F.PAUSAS[ev.pausaTipo] : '') + '</span>' +
      '<small>' + F.METODOS[ev.metodo] + (ev.dist != null ? ' · ' + ev.dist + ' m' : '') + (ev.corregido ? ' · <b class="fx-tag">corregido</b>' : '') + '</small></li>';
  }
  function semanaCard(empId, now) {
    const hoy = F.dayKey(now), lun = F.mondayOf(hoy);
    const r = F.resumen(empId, lun, F.addDays(lun, 6), now);
    const e = F.empleado(empId);
    const max = Math.max(1, ...ORDEN.map((_, i) => { const k = F.addDays(lun, i); const d = r.dias.find((x) => x.key === k); return Math.max(d ? d.efectivo : 0, F.previstoDia(empId, k)); }));
    const bars = ORDEN.map((wd, i) => {
      const k = F.addDays(lun, i), d = r.dias.find((x) => x.key === k);
      const prev = F.previstoDia(empId, k), ef = d ? d.efectivo : 0;
      const tipTxt = '<b>' + cap(fechaKey(k)) + '</b><br>Trabajado: ' + dur(ef) + '<br>Previsto: ' + (prev ? dur(prev) : 'libre');
      return '<div class="fx-wbar' + (k === hoy ? ' is-today' : '') + '" tabindex="0" data-tip="' + esc(tipTxt) + '">' +
        '<div class="fx-wbar__track">' + (prev ? '<i class="fx-wbar__plan" style="bottom:' + (prev / max * 100) + '%"></i>' : '') +
        '<i class="fx-wbar__fill" style="height:' + (ef / max * 100) + '%"></i></div><span>' + DIAS[wd].charAt(0) + '</span></div>';
    }).join('');
    const prevSemana = ORDEN.reduce((a, _, i) => a + F.previstoDia(empId, F.addDays(lun, i)), 0);
    return '<article class="card fx-card"><h3>' + icon('calendar') + 'Esta semana</h3>' +
      '<p class="fx-big-num"><span data-live="week">' + horas(r.tot.efectivo) + '</span><small> de ' + horas(prevSemana) + ' previstas · contrato ' + e.horasContrato + ' h</small></p>' +
      '<div class="fx-progress"><i style="width:' + Math.min(100, r.tot.efectivo / (prevSemana || 1) * 100) + '%"></i></div>' +
      '<div class="fx-week">' + bars + '</div>' +
      '<ul class="fx-legend"><li><i class="k-work"></i>Trabajado</li><li><i class="k-line"></i>Previsto</li></ul></article>';
  }
  function mesCard(empId, now) {
    const hoy = F.dayKey(now);
    const r = F.resumen(empId, hoy.slice(0, 8) + '01', hoy, now);
    const anio = new Date(now).getFullYear();
    const vac = F.vacacionesUsadas(empId, anio);
    return '<article class="card fx-card"><h3>' + icon('calendar') + cap(fMes.format(new Date(now))) + '</h3><div class="fx-minis">' +
      mini('Trabajadas', horas(r.tot.efectivo)) + mini('Saldo', saldo(r.tot.saldo), r.tot.saldo >= 0 ? 'pos' : 'neg') +
      mini('Puntualidad', r.tot.puntualidad + ' %') + mini('Vacaciones', (S().config.diasVacaciones - vac) + ' días libres') + '</div></article>';
  }
  const mini = (l, v, cls) => '<div class="fx-mini' + (cls ? ' fx-mini--' + cls : '') + '"><span>' + l + '</span><b>' + v + '</b></div>';

  function ringHTML(empId, now) {
    const hoy = F.dayKey(now);
    const ss = F.sesiones(empId, now).filter((s) => s.dia === hoy || s.abierta);
    const ef = ss.reduce((a, s) => a + s.efectivo, 0);
    const prev = F.previstoDia(empId, hoy) || 4 * H;
    const p = Math.min(1, ef / prev), R = 52, C = 2 * Math.PI * R;
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="' + R + '" class="fx-ring__bg"/><circle cx="60" cy="60" r="' + R + '" class="fx-ring__fg" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - p)) + '"/></svg>' +
      '<div><b data-live="worked">' + durClock(ef) + '</b><small>trabajado hoy</small></div>';
  }

  function methodBoxHTML() {
    const cfg = S().config;
    if (metodo === 'gps') {
      let s;
      if (loc.status === 'loading') s = '<p class="fx-loc"><span class="fx-spin"></span>Comprobando tu ubicación…</p>';
      else if (loc.status === 'ok') s = '<p class="fx-loc ' + (loc.dist <= cfg.radio ? 'is-ok' : 'is-bad') + '">' + icon(loc.dist <= cfg.radio ? 'check' : 'alert') + (loc.dist <= cfg.radio ? 'Estás en el local (a ' + Math.round(loc.dist) + ' m)' : 'Estás a ' + (loc.dist > 2000 ? (loc.dist / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(loc.dist) + ' m') + ' del local. Máximo: ' + cfg.radio + ' m') + (loc.sim ? ' · simulado' : '') + '</p>';
      else if (loc.status === 'error') s = '<p class="fx-loc is-bad">' + icon('alert') + esc(loc.msg) + '</p>';
      else s = '<p class="fx-loc">' + icon('pin') + 'Se comprobará que estás a menos de ' + cfg.radio + ' m del local.</p>';
      return s + '<div class="fx-locbar"><button class="link-btn" id="relocate">Volver a comprobar</button>' +
        '<label class="check"><input type="checkbox" id="simular"' + (simular ? ' checked' : '') + '><span>Demo: simular que estoy en el local</span></label></div>';
    }
    return '<div class="fx-code"><label for="codeInput">Código de 6 cifras del mostrador</label><div class="fx-code__row">' +
      '<input class="input" id="codeInput" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000">' +
      ('BarcodeDetector' in window ? '<button class="btn btn--small" id="scanQr">' + icon('qr') + 'Escanear QR</button>' : '') +
      '</div><p class="muted">Lo verás en la tablet del mostrador (modo quiosco). En la app Android se escanea el QR con ML Kit.</p></div>';
  }

  function afterFichar() {
    const v = $('#view');
    $('#ring', v).innerHTML = ringHTML(me.id, Date.now());
    $('#methodBox', v).innerHTML = methodBoxHTML();
    if (metodo === 'gps' && loc.status === 'idle') locate();
  }

  function locate() {
    const cfg = S().config;
    if (simular) {
      const d = 8 + Math.random() * 30;
      loc = { status: 'ok', dist: d, lat: cfg.local.lat + d / 111320, lng: cfg.local.lng, sim: true };
      refreshMethod(); return Promise.resolve(loc);
    }
    if (!navigator.geolocation) { loc = { status: 'error', msg: 'Este dispositivo no permite la geolocalización. Usa el código del mostrador.' }; refreshMethod(); return Promise.resolve(loc); }
    loc = { status: 'loading' }; refreshMethod();
    return new Promise((res) => {
      navigator.geolocation.getCurrentPosition((p) => {
        const d = F.haversine(p.coords.latitude, p.coords.longitude, cfg.local.lat, cfg.local.lng);
        loc = { status: 'ok', dist: d, lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
        refreshMethod(); res(loc);
      }, (err) => {
        loc = { status: 'error', msg: err.code === 1 ? 'Has denegado el permiso de ubicación. Actívalo o usa el código del mostrador.' : 'No se ha podido obtener tu ubicación. Prueba otra vez o usa el código.' };
        refreshMethod(); res(loc);
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
    });
  }
  function refreshMethod() { const b = $('#methodBox'); if (b && route().view === 'fichar') b.innerHTML = methodBoxHTML(); }

  async function doFichar(tipo, pausaTipo) {
    try {
      const datos = { metodo, pausaTipo };
      if (metodo === 'gps') {
        const l = loc.status === 'ok' && (simular === !!loc.sim) ? loc : await locate();
        if (l.status !== 'ok') throw new Error(l.msg || 'No se ha podido comprobar tu ubicación.');
        datos.dist = l.dist; datos.lat = l.lat; datos.lng = l.lng;
      } else {
        datos.codigo = ($('#codeInput') || {}).value || datos.codigo || scannedCode;
        datos.metodo = scannedCode && datos.codigo === scannedCode ? 'qr' : 'codigo';
      }
      F.fichar(me.id, tipo, datos);
      scannedCode = null;
      const msg = { entrada: '¡Entrada registrada! Buen turno', salida: 'Salida registrada. ¡Hasta la próxima!', pausa_inicio: 'Pausa iniciada', pausa_fin: 'De vuelta al trabajo' }[tipo];
      toast(msg + ' · ' + hhmm(Date.now()));
    } catch (err) { toast(err.message, 'error'); }
  }

  /* Escaneo de QR con la cámara (BarcodeDetector, Chrome Android) */
  let stream = null, scannedCode = null;
  function stopCamera() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
  async function scanQr() {
    openModal('<h3>Escanea el QR</h3><p class="muted">Apunta al código que aparece en la tablet del mostrador.</p><video id="qrVideo" class="fx-video" playsinline muted></video>', stopCamera);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = $('#qrVideo'); v.srcObject = stream; await v.play();
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const loop = async () => {
        if (!stream) return;
        try {
          const r = await det.detect(v);
          const m = r[0] && r[0].rawValue.match(/^NAPOLES-FICHAJE:(\d{6})$/);
          if (m) { scannedCode = m[1]; closeModal(); const i = $('#codeInput'); if (i) i.value = m[1]; toast('Código leído. Ya puedes fichar.'); return; }
        } catch (e) { /* sigue */ }
        setTimeout(loop, 300);
      };
      loop();
    } catch (e) { closeModal(); toast('No se ha podido abrir la cámara. Escribe el código.', 'error'); }
  }

  function pausaModal(onPick) {
    openModal('<h3>¿Qué tipo de pausa?</h3><p class="muted">Queda registrado para el cálculo de la jornada efectiva.</p><div class="fx-pick">' +
      Object.entries(F.PAUSAS).map(([k, v]) => '<button class="btn btn--ghost" data-pausa="' + k + '">' + v + '</button>').join('') + '</div>');
    $('#modalBody .fx-pick').onclick = (e) => { const b = e.target.closest('[data-pausa]'); if (b) { closeModal(); onPick(b.dataset.pausa); } };
  }

  /* ==========================================================================
     HISTORIAL (empleado y vista del encargado)
     ========================================================================== */
  function monthRange(mes) { const [y, m] = mes.split('-').map(Number); return [mes + '-01', F.dayKey(new Date(y, m, 0).getTime())]; }
  const mesActual = () => F.dayKey(Date.now()).slice(0, 7);
  const mesOpts = (sel) => { let o = ''; const d = new Date(); for (let i = 0; i < 3; i++) { const t = new Date(d.getFullYear(), d.getMonth() - i, 1); const k = t.getFullYear() + '-' + pad2(t.getMonth() + 1); o += '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + cap(fMes.format(t)) + '</option>'; } return o; };

  function diaFila(d, empId, boss) {
    const ss = d.sesiones;
    const ent = ss.map((s) => hhmm(s.inicio)).join('<br>') || '—';
    const sal = ss.map((s) => s.fin ? hhmm(s.fin) : s.abierta ? '<i>en curso</i>' : '<b class="fx-red">sin fichar</b>').join('<br>') || '—';
    const tags = [];
    if (d.ausencia) tags.push('<span class="fx-pill fx-pill--info">' + F.AUSENCIAS[d.ausencia.tipo] + '</span>');
    if (d.falta) tags.push('<span class="fx-pill fx-pill--bad">Falta</span>');
    if (d.faltaHoy) tags.push('<span class="fx-pill fx-pill--warn">Sin fichar</span>');
    if (d.retraso) tags.push('<span class="fx-pill fx-pill--warn">Retraso ' + d.retraso + ' min</span>');
    if (d.sinCerrar) tags.push('<span class="fx-pill fx-pill--bad">Sin salida</span>');
    if (d.corregido) tags.push('<span class="fx-pill">Corregido</span>');
    if (!d.turnos.length && !ss.length) tags.push('<span class="fx-pill fx-pill--muted">Libre</span>');
    const dif = d.efectivo - d.previsto;
    return '<tr class="' + (d.key === F.dayKey(Date.now()) ? 'is-today' : '') + '"><th scope="row">' + cap(fechaKey(d.key)) + '</th><td>' + turnoTxt(d.ausencia ? [] : d.turnos).replace('Libre', '—') + '</td><td>' + ent + '</td><td>' + sal + '</td>' +
      '<td>' + (d.pausas ? Math.round(d.pausas / M) + ' min' : '—') + '</td><td class="num"><b>' + (d.efectivo ? horas(d.efectivo, 2) : '—') + '</b></td>' +
      '<td class="num ' + (dif > 0 ? 'fx-pos' : dif < 0 ? 'fx-neg' : '') + '">' + (d.previsto || d.efectivo ? saldo(dif) : '—') + '</td><td>' + tags.join(' ') + '</td>' +
      '<td><button class="icon-btn icon-btn--sm" data-corr="' + d.key + '" data-emp="' + empId + '" aria-label="' + (boss ? 'Corregir' : 'Solicitar corrección') + ' el ' + fechaKey(d.key) + '" title="' + (boss ? 'Corregir' : 'Solicitar corrección') + '">' + icon('edit') + '</button></td></tr>';
  }

  function viewHistorial(empId, mesArg, boss) {
    const mes = /^\d{4}-\d{2}$/.test(mesArg || '') ? mesArg : mesActual();
    const [a, b] = monthRange(mes);
    const r = F.resumen(empId, a, b);
    const dias = r.dias.slice().reverse();
    const corr = S().correcciones.filter((c) => c.empId === empId).sort((x, y) => y.creado - x.creado);
    const base = boss ? '#equipo/' + empId : '#historial';
    return (boss ? '' : '<div class="fx-head"><div><p class="eyebrow">Mi historial</p><h2 class="fx-h2">Registro de jornada</h2></div>') +
      (boss ? '' : '<div class="fx-head__tools">' + histTools(mes, base, empId) + '</div></div>') +
      (boss ? '<div class="fx-head__tools fx-head__tools--left">' + histTools(mes, base, empId) + '</div>' : '') +
      '<div class="fx-kpis">' +
        kpi('Horas trabajadas', horas(r.tot.efectivo), 'de ' + horas(r.tot.previsto) + ' previstas') +
        kpi('Saldo del mes', saldo(r.tot.saldo), r.tot.saldo >= 0 ? 'a tu favor' : 'por recuperar', r.tot.saldo >= 0 ? 'pos' : 'neg') +
        kpi('Días trabajados', r.tot.diasTrab, r.tot.ausencias ? r.tot.ausencias + ' de ausencia justificada' : 'sin ausencias') +
        kpi('Puntualidad', r.tot.puntualidad + ' %', r.tot.retrasos ? r.tot.retrasos + ' retraso' + (r.tot.retrasos > 1 ? 's' : '') + ' · ' + r.tot.minRetraso + ' min' : 'sin retrasos') +
        kpi('Incidencias', r.tot.sinCerrar + r.tot.faltas, r.tot.sinCerrar + ' sin salida · ' + r.tot.faltas + ' faltas', r.tot.sinCerrar + r.tot.faltas ? 'neg' : '') +
      '</div>' +
      '<div class="card fx-tablecard"><div class="fx-scroll"><table class="fx-table"><caption class="sr-only">Registro diario de ' + esc(F.empleado(empId).nombre) + ', ' + fMes.format(new Date(F.dayStart(a))) + '</caption>' +
      '<thead><tr><th scope="col">Día</th><th scope="col">Turno</th><th scope="col">Entrada</th><th scope="col">Salida</th><th scope="col">Pausas</th><th scope="col" class="num">Efectivo</th><th scope="col" class="num">Dif.</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>' +
      '<tbody>' + (dias.length ? dias.map((d) => diaFila(d, empId, boss)).join('') : '<tr><td colspan="9" class="muted">Sin datos en este mes.</td></tr>') + '</tbody></table></div></div>' +
      '<h3 class="fx-h3">' + (boss ? 'Correcciones de ' + esc(F.empleado(empId).nombre) : 'Mis solicitudes de corrección') + '</h3>' +
      (corr.length ? '<div class="fx-list">' + corr.map((c) => corrCard(c, false)).join('') + '</div>' : '<p class="muted">No hay correcciones.</p>');
  }
  function histTools(mes, base, empId) {
    return '<label class="sr-only" for="mesSel">Mes</label><select class="input input--sm" id="mesSel" data-base="' + base + '">' + mesOpts(mes) + '</select>' +
      '<button class="btn btn--small" data-csv="' + empId + '" data-mes="' + mes + '">' + icon('download') + 'CSV</button>' +
      '<button class="btn btn--small" data-print="' + empId + '" data-mes="' + mes + '">' + icon('print') + 'Imprimir / PDF</button>' +
      '<button class="btn btn--small btn--accent" data-corr="' + F.dayKey(Date.now()) + '" data-emp="' + empId + '">' + icon('plus') + 'Corrección</button>';
  }
  const kpi = (l, v, sub, cls) => '<div class="fx-kpi' + (cls ? ' fx-kpi--' + cls : '') + '"><span>' + l + '</span><b>' + v + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';

  function corrDesc(c) {
    if (c.accion === 'añadir') return 'Añadir <b>' + F.TIPOS[c.tipo].toLowerCase() + '</b> a las <b>' + hhmm(c.ts) + '</b>';
    const f = S().fichajes.find((x) => x.id === c.fichajeId) || {};
    const tipo = f.tipo ? F.TIPOS[f.tipo].toLowerCase() : 'fichaje';
    if (c.accion === 'anular') return 'Anular <b>' + tipo + '</b> de las ' + (f.ts ? hhmm(f.ts) : '?');
    return 'Cambiar <b>' + tipo + '</b>: ' + (f.ts ? '<s>' + hhmm(f.ts) + '</s>' : '?') + ' → <b>' + hhmm(c.ts) + '</b>';
  }
  function corrCard(c, actions) {
    const e = F.empleado(c.empId), autor = F.empleado(c.autorId), rev = c.revisorId ? F.empleado(c.revisorId) : null;
    const est = { pendiente: ['warn', 'Pendiente'], aprobada: ['ok', 'Aprobada'], rechazada: ['bad', 'Rechazada'] }[c.estado];
    return '<article class="fx-req">' + avatar(e) + '<div class="fx-req__body"><p class="fx-req__top"><b>' + esc(e.nombre) + '</b> · ' + cap(fechaKey(c.fecha)) + ' <span class="fx-pill fx-pill--' + est[0] + '">' + est[1] + '</span></p>' +
      '<p>' + corrDesc(c) + '</p><p class="fx-req__why">«' + esc(c.motivo) + '»</p>' +
      '<p class="fx-req__meta">Solicitada por ' + esc(autor ? autor.nombre : '?') + ' el ' + fDT.format(new Date(c.creado)) + (rev ? ' · ' + (c.estado === 'aprobada' ? 'aprobada' : 'rechazada') + ' por ' + esc(rev.nombre) + ' el ' + fDT.format(new Date(c.revisado)) + (c.comentario ? ': «' + esc(c.comentario) + '»' : '') : '') + '</p>' +
      (actions && c.estado === 'pendiente' ? '<div class="fx-req__act"><input class="input input--sm" placeholder="Comentario (opcional)" data-com="' + c.id + '" aria-label="Comentario"><button class="btn btn--small btn--ok" data-res="corr" data-id="' + c.id + '" data-ok="1">' + icon('check') + 'Aprobar</button><button class="btn btn--small" data-res="corr" data-id="' + c.id + '" data-ok="0">Rechazar</button></div>' : '') +
      '</div></article>';
  }

  function corrModal(empId, fecha) {
    const e = F.empleado(empId);
    const boss = isBoss();
    openModal('<h3>' + (boss && empId !== me.id ? 'Corregir fichajes de ' + esc(e.nombre) : boss ? 'Corregir mis fichajes' : 'Solicitar una corrección') + '</h3>' +
      '<p class="muted">' + (boss ? 'La corrección se aplica al momento y queda en el registro de auditoría con tu nombre.' : 'El encargado la revisará. El fichaje original no se borra nunca.') + '</p>' +
      '<form class="form fx-form" id="corrForm" novalidate>' +
      '<div class="form__row"><div class="field"><label for="cFecha">Día de la jornada</label><input class="input" type="date" id="cFecha" value="' + fecha + '" max="' + F.dayKey(Date.now()) + '" required></div>' +
      '<div class="field"><label for="cAccion">¿Qué ha pasado?</label><select class="input" id="cAccion"><option value="añadir">Olvidé fichar</option><option value="modificar">La hora está mal</option><option value="anular">Fichaje duplicado o erróneo</option></select></div></div>' +
      '<div class="field" id="cFichWrap" hidden><label for="cFichaje">Fichaje</label><select class="input" id="cFichaje"></select></div>' +
      '<div class="form__row"><div class="field" id="cTipoWrap"><label for="cTipo">Tipo</label><select class="input" id="cTipo">' + Object.entries(F.TIPOS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
      '<div class="field" id="cHoraWrap"><label for="cHora">Hora real</label><input class="input" type="time" id="cHora" required></div></div>' +
      '<p class="muted fx-small">Las horas entre 00:00 y 05:59 cuentan como del día siguiente (cierres después de medianoche).</p>' +
      '<div class="field"><label for="cMotivo">Motivo</label><textarea class="input" id="cMotivo" rows="3" required placeholder="Ej.: me quedé sin batería al salir"></textarea><p class="field__err" id="cErr"></p></div>' +
      '<button class="btn btn--primary btn--block" type="submit">' + (boss ? 'Aplicar corrección' : 'Enviar solicitud') + '</button></form>');
    const fillFich = () => {
      const k = $('#cFecha').value;
      const evs = F.sesiones(empId).filter((s) => s.dia === k).flatMap((s) => s.eventos).filter((ev) => !String(ev.id).startsWith('c:'));
      $('#cFichaje').innerHTML = evs.length ? evs.map((ev) => '<option value="' + ev.id + '">' + hhmm(ev.ts) + ' · ' + F.TIPOS[ev.tipo] + '</option>').join('') : '<option value="">No hay fichajes ese día</option>';
    };
    const sync = () => {
      const a = $('#cAccion').value;
      $('#cFichWrap').hidden = a === 'añadir'; $('#cTipoWrap').hidden = a !== 'añadir'; $('#cHoraWrap').hidden = a === 'anular';
      fillFich();
    };
    $('#cAccion').addEventListener('change', sync); $('#cFecha').addEventListener('change', fillFich);
    sync();
    $('#corrForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      try {
        const k = $('#cFecha').value, a = $('#cAccion').value, h = $('#cHora').value;
        if (!k) throw new Error('Elige el día.');
        if (a !== 'anular' && !h) throw new Error('Indica la hora real.');
        if (a !== 'añadir' && !$('#cFichaje').value) throw new Error('Ese día no hay fichajes que cambiar.');
        let ts = null;
        if (h) { const min = F.hm(h); ts = F.atMin(k, min < 360 ? min + 1440 : min); if (ts > Date.now()) throw new Error('La hora no puede estar en el futuro.'); }
        const c = { empId, fecha: k, accion: a, motivo: $('#cMotivo').value.trim() };
        if (a === 'añadir') { c.tipo = $('#cTipo').value; c.ts = ts; if (c.tipo === 'pausa_inicio') c.pausaTipo = 'descanso'; }
        else { c.fichajeId = $('#cFichaje').value; c.ts = a === 'anular' ? (S().fichajes.find((f) => f.id === c.fichajeId) || {}).ts : ts; }
        const n = F.solicitarCorreccion(c, me.id);
        closeModal();
        toast(n.estado === 'aprobada' ? 'Corrección aplicada' : 'Solicitud enviada al encargado');
      } catch (err) { $('#cErr').textContent = err.message; }
    });
  }

  /* ==========================================================================
     AUSENCIAS Y TURNOS
     ========================================================================== */
  function viewAusencias(empId) {
    const e = F.empleado(empId), anio = new Date().getFullYear();
    const usadas = F.vacacionesUsadas(empId, anio), total = S().config.diasVacaciones;
    const mias = S().ausencias.filter((a) => a.empId === empId).sort((a, b) => b.desde.localeCompare(a.desde));
    const hoy = F.dayKey(Date.now());
    return '<div class="fx-head"><div><p class="eyebrow">Ausencias y turnos</p><h2 class="fx-h2">Mis días</h2></div></div>' +
      '<div class="fx-kpis">' + kpi('Vacaciones ' + anio, (total - usadas) + ' días', 'disponibles de ' + total + ' (art. 38 ET)') +
        kpi('Ya pedidas', usadas + ' días', 'aprobadas o pendientes') + kpi('Horas por contrato', e.horasContrato + ' h/sem', 'planificadas: ' + String(F.horasSemanaPlan(e)).replace('.', ',') + ' h') + '</div>' +
      '<div class="fx-two">' +
      '<article class="card"><h3 class="fx-h3 fx-h3--card">Pedir una ausencia</h3><form class="form" id="ausForm" novalidate>' +
        '<div class="field"><label for="aTipo">Tipo</label><select class="input" id="aTipo">' + Object.entries(F.AUSENCIAS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
        '<div class="form__row"><div class="field"><label for="aDesde">Desde</label><input class="input" type="date" id="aDesde" value="' + F.addDays(hoy, 7) + '" required></div><div class="field"><label for="aHasta">Hasta</label><input class="input" type="date" id="aHasta" value="' + F.addDays(hoy, 7) + '" required></div></div>' +
        '<div class="field"><label for="aMotivo">Comentario <small>(opcional)</small></label><textarea class="input" id="aMotivo" rows="2" placeholder="Ej.: boda de mi hermana"></textarea><p class="field__err" id="aErr"></p></div>' +
        '<button class="btn btn--primary btn--block" type="submit">Enviar solicitud</button></form></article>' +
      '<article class="card"><h3 class="fx-h3 fx-h3--card">Mis turnos de la semana</h3><table class="fx-table fx-table--plain"><tbody>' +
        ORDEN.map((wd) => '<tr><th scope="row">' + DIAS[wd] + '</th><td>' + turnoTxt(e.turnos[wd] || []) + '</td></tr>').join('') +
        '</tbody></table><p class="muted fx-small">Los turnos los organiza el encargado. Si necesitas un cambio, habla con él.</p></article></div>' +
      '<h3 class="fx-h3">Mis solicitudes</h3>' +
      (mias.length ? '<div class="fx-list">' + mias.map((a) => ausCard(a, false, true)).join('') + '</div>' : '<p class="muted">Todavía no has pedido ninguna ausencia.</p>');
  }
  function ausCard(a, actions, own) {
    const e = F.empleado(a.empId);
    const dias = Math.round((F.dayStart(a.hasta) - F.dayStart(a.desde)) / D) + 1;
    const est = { pendiente: ['warn', 'Pendiente'], aprobada: ['ok', 'Aprobada'], rechazada: ['bad', 'Rechazada'] }[a.estado];
    const rev = a.revisorId ? F.empleado(a.revisorId) : null;
    return '<article class="fx-req">' + avatar(e) + '<div class="fx-req__body"><p class="fx-req__top"><b>' + esc(e.nombre) + '</b> · ' + F.AUSENCIAS[a.tipo] + ' <span class="fx-pill fx-pill--' + est[0] + '">' + est[1] + '</span></p>' +
      '<p>' + (a.desde === a.hasta ? cap(fechaKey(a.desde)) : 'Del ' + fechaKey(a.desde) + ' al ' + fechaKey(a.hasta)) + ' · <b>' + dias + ' día' + (dias > 1 ? 's' : '') + '</b></p>' +
      (a.motivo ? '<p class="fx-req__why">«' + esc(a.motivo) + '»</p>' : '') +
      '<p class="fx-req__meta">Pedida el ' + fDT.format(new Date(a.creado)) + (rev ? ' · revisada por ' + esc(rev.nombre) + (a.comentario ? ': «' + esc(a.comentario) + '»' : '') : '') + '</p>' +
      (actions && a.estado === 'pendiente' ? '<div class="fx-req__act"><input class="input input--sm" placeholder="Comentario (opcional)" data-com="' + a.id + '" aria-label="Comentario"><button class="btn btn--small btn--ok" data-res="aus" data-id="' + a.id + '" data-ok="1">' + icon('check') + 'Aprobar</button><button class="btn btn--small" data-res="aus" data-id="' + a.id + '" data-ok="0">Rechazar</button></div>' : '') +
      (own && a.estado === 'pendiente' ? '<div class="fx-req__act"><button class="link-btn" data-cancel="' + a.id + '">Cancelar solicitud</button></div>' : '') +
      '</div></article>';
  }

  /* ==========================================================================
     ENCARGADO · PANEL
     ========================================================================== */
  function estadoAhora(e, now) {
    const hoy = F.dayKey(now), st = F.estado(e.id, now);
    const aus = F.ausenciaDe(e.id, hoy), turnos = F.turnosDia(e.id, hoy);
    const tol = S().config.tolerancia * M;
    const ss = F.sesiones(e.id, now).filter((s) => s.dia === hoy || s.abierta);
    const ef = ss.reduce((a, s) => a + s.efectivo, 0);
    let k, txt;
    if (st.estado === 'trabajando') { k = 'trabajando'; txt = 'Trabajando desde las ' + hhmm(st.sesion.inicio); }
    else if (st.estado === 'pausa') { k = 'pausa'; txt = F.PAUSAS[st.pausa.tipo] + ' desde las ' + hhmm(st.desde); }
    else if (aus) { k = 'ausente'; txt = F.AUSENCIAS[aus.tipo]; }
    else {
      const prox = turnos.find((r) => now < F.atMin(hoy, r[0]));
      const enCurso = turnos.find((r) => now >= F.atMin(hoy, r[0]) + tol && now < F.atMin(hoy, r[1]));
      if (enCurso && !ss.some((s) => s.inicio >= F.atMin(hoy, enCurso[0]) - 60 * M)) { k = 'tarde'; txt = 'No ha fichado · turno desde las ' + minStr(enCurso[0]); }
      else if (prox) { k = 'fuera'; txt = 'Entra a las ' + minStr(prox[0]); }
      else if (ss.length) { k = 'fuera'; txt = 'Salió a las ' + hhmm(ss[ss.length - 1].fin || now); }
      else { k = 'libre'; txt = turnos.length ? 'Turno terminado' : 'Hoy libra'; }
    }
    return { k, txt, ef, st, ss };
  }

  function viewPanel() {
    const now = Date.now(), hoy = F.dayKey(now), lun = F.mondayOf(hoy);
    const emps = S().empleados.filter((e) => e.activo);
    const est = emps.map((e) => Object.assign({ e }, estadoAhora(e, now)));
    const cnt = (k) => est.filter((x) => x.k === k).length;
    const efHoy = est.reduce((a, x) => a + x.ef, 0);
    let efSem = 0, prevSem = 0;
    emps.forEach((e) => { const r = F.resumen(e.id, lun, F.addDays(lun, 6), now); efSem += r.tot.efectivo; ORDEN.forEach((_, i) => { prevSem += F.previstoDia(e.id, F.addDays(lun, i)); }); });
    const pend = S().correcciones.filter((c) => c.estado === 'pendiente').length + S().ausencias.filter((a) => a.estado === 'pendiente').length;
    const al = F.alertas(now);
    const orden = { trabajando: 0, pausa: 1, tarde: 2, fuera: 3, ausente: 4, libre: 5 };
    const lbl = { trabajando: 'Trabajando', pausa: 'En pausa', tarde: 'Sin fichar', fuera: 'Fuera', ausente: 'Ausente', libre: 'Libre' };

    return '<div class="fx-head"><div><p class="eyebrow">Panel del encargado</p><h2 class="fx-h2">' + cap(fFecha.format(new Date(now))) + ' · <span data-live="clockShort">' + hhmm(now) + '</span></h2></div>' +
      '<div class="fx-head__tools"><button class="btn btn--small" id="openKiosk">' + icon('tablet') + 'Modo quiosco</button><a class="btn btn--small" href="#informes">' + icon('download') + 'Exportar</a></div></div>' +
      '<div class="fx-kpis fx-kpis--6">' +
        kpi('Trabajando ahora', cnt('trabajando') + ' <small>de ' + emps.length + '</small>', cnt('pausa') + ' en pausa', 'live') +
        kpi('Sin fichar', cnt('tarde'), cnt('tarde') ? 'con el turno ya empezado' : 'todo en orden', cnt('tarde') ? 'neg' : '') +
        kpi('Horas hoy', horas(efHoy), 'trabajo efectivo del equipo') +
        kpi('Horas semana', horas(efSem), 'de ' + horas(prevSem) + ' planificadas') +
        kpi('Solicitudes', pend, pend ? '<a href="#solicitudes">Revisar ahora</a>' : 'nada pendiente', pend ? 'warn' : '') +
        kpi('Alertas legales', al.length, al.filter((a) => a.nivel === 'critico').length + ' críticas', al.length ? 'neg' : '') +
      '</div>' +
      '<div class="fx-panel">' +
        '<section class="card fx-now" aria-labelledby="nowT"><h3 id="nowT" class="fx-h3 fx-h3--card">Ahora mismo</h3><ul class="fx-board">' +
          est.sort((a, b) => orden[a.k] - orden[b.k]).map((x) => '<li class="fx-member fx-member--' + x.k + '"><a href="#equipo/' + x.e.id + '">' + avatar(x.e) +
            '<span class="fx-member__txt"><b>' + esc(x.e.nombre) + '</b><small>' + esc(x.txt) + '</small></span>' +
            '<span class="fx-member__end"><span class="fx-pill fx-pill--' + ({ trabajando: 'ok', pausa: 'warn', tarde: 'bad', ausente: 'info' }[x.k] || 'muted') + '">' + lbl[x.k] + '</span><small>' + (x.ef ? horas(x.ef, 2) + ' hoy' : '') + '</small></span></a></li>').join('') +
        '</ul></section>' +
        '<section class="card fx-alertcard" aria-labelledby="alT"><h3 id="alT" class="fx-h3 fx-h3--card">' + icon('alert') + 'Alertas de cumplimiento</h3>' +
          (al.length ? '<ul class="fx-alist">' + al.slice(0, 8).map((a) => { const e = F.empleado(a.empId); return '<li class="fx-alert fx-alert--' + a.nivel + '">' + icon('alert') + '<p><b>' + esc(e.nombre) + ' · ' + fechaKey(a.dia) + '</b><br>' + esc(a.texto) + '</p>' + (a.codigo === 'sin-cerrar' ? '<button class="btn btn--small" data-corr="' + a.dia + '" data-emp="' + a.empId + '">Corregir</button>' : '') + '</li>'; }).join('') + '</ul>' + (al.length > 8 ? '<p class="muted fx-small">Y ' + (al.length - 8) + ' más en los últimos 30 días.</p>' : '')
            : '<p class="fx-allgood">' + icon('check') + 'Sin incidencias en los últimos 30 días.</p>') +
          '<p class="muted fx-small">Se revisan: salidas sin fichar, jornada máxima de ' + S().config.horasMaxDia + ' h, 12 h de descanso entre jornadas, pausa a partir de 6 h y límite de 80 h extra al año.</p>' +
        '</section>' +
        '<section class="card fx-chartcard" aria-labelledby="c1T"><h3 id="c1T" class="fx-h3 fx-h3--card">Horas del equipo · últimos 14 días</h3>' + chartDias(now) + '</section>' +
        '<section class="card fx-chartcard" aria-labelledby="c2T"><h3 id="c2T" class="fx-h3 fx-h3--card">' + cap(fMes.format(new Date(now))) + ' por persona</h3>' + chartPersonas(now) + '</section>' +
      '</div>';
  }

  /* Gráfico 1: barras verticales (trabajado) con marca de lo previsto */
  function chartDias(now) {
    const hoy = F.dayKey(now), emps = S().empleados.filter((e) => e.activo);
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const k = F.addDays(hoy, -i);
      let ef = 0, prev = 0;
      emps.forEach((e) => { const r = F.resumen(e.id, k, k, now); ef += r.tot.efectivo; prev += F.previstoDia(e.id, k); });
      data.push({ k, ef: ef / H, prev: prev / H });
    }
    const max = Math.ceil(Math.max(...data.map((d) => Math.max(d.ef, d.prev)), 1) / 5) * 5;
    const W = 440, Hh = 200, l = 28, r = 4, t = 10, b = 26, cw = (W - l - r) / data.length, bw = Math.min(26, cw * 0.56);
    const y = (v) => t + (Hh - t - b) * (1 - v / max);
    let g = '';
    for (let v = 0; v <= max; v += max / 4) g += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="fx-grid"/><text x="' + (l - 6) + '" y="' + (y(v) + 4) + '" class="fx-axis" text-anchor="end">' + Math.round(v) + '</text>';
    const bars = data.map((d, i) => {
      const cx = l + cw * i + cw / 2, x = cx - bw / 2, h = Math.max(0, y(0) - y(d.ef));
      const wd = F.weekday(d.k);
      const tipTxt = '<b>' + cap(fechaKey(d.k)) + '</b><br>Trabajadas: ' + d.ef.toFixed(1).replace('.', ',') + ' h<br>Previstas: ' + d.prev.toFixed(1).replace('.', ',') + ' h';
      return '<g class="fx-bar" tabindex="0" data-tip="' + esc(tipTxt) + '"><rect x="' + (cx - cw / 2) + '" y="' + t + '" width="' + cw + '" height="' + (Hh - t - b) + '" class="fx-hit"/>' +
        (h > 0 ? '<path d="' + roundTop(x, y(d.ef), bw, h, 4) + '" class="fx-bar__fill' + (d.k === hoy ? ' is-today' : '') + '"/>' : '') +
        (d.prev ? '<line x1="' + (x - 3) + '" x2="' + (x + bw + 3) + '" y1="' + y(d.prev) + '" y2="' + y(d.prev) + '" class="fx-bar__plan"/>' : '') +
        '<text x="' + cx + '" y="' + (Hh - 10) + '" class="fx-axis" text-anchor="middle">' + DIAS[wd].charAt(0) + new Date(F.dayStart(d.k)).getDate() + '</text></g>';
    }).join('');
    return '<ul class="fx-legend"><li><i class="k-work"></i>Horas trabajadas</li><li><i class="k-line"></i>Horas previstas</li></ul>' +
      '<svg class="fx-chart" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Horas trabajadas por día del equipo en los últimos 14 días">' + g + '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="fx-base"/>' + bars + '</svg>' +
      '<details class="fx-datatable"><summary>Ver como tabla</summary><table class="fx-table fx-table--plain"><thead><tr><th>Día</th><th class="num">Trabajadas</th><th class="num">Previstas</th></tr></thead><tbody>' +
      data.map((d) => '<tr><td>' + cap(fechaKey(d.k)) + '</td><td class="num">' + d.ef.toFixed(1).replace('.', ',') + ' h</td><td class="num">' + d.prev.toFixed(1).replace('.', ',') + ' h</td></tr>').join('') + '</tbody></table></details>';
  }
  function roundTop(x, y, w, h, r) { r = Math.min(r, h, w / 2); return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'; }

  /* Gráfico 2: barras horizontales por persona, con marca de lo previsto */
  function chartPersonas(now) {
    const hoy = F.dayKey(now), a = hoy.slice(0, 8) + '01';
    const rows = S().empleados.filter((e) => e.activo).map((e) => { const r = F.resumen(e.id, a, hoy, now); return { e, ef: r.tot.efectivo / H, prev: r.tot.previsto / H }; });
    const max = Math.max(1, ...rows.map((x) => Math.max(x.ef, x.prev))) * 1.08;
    return '<ul class="fx-legend"><li><i class="k-work"></i>Trabajadas</li><li><i class="k-line"></i>Previstas hasta hoy</li></ul><ul class="fx-hbars">' + rows.map((x) => {
      const dif = x.ef - x.prev;
      const tipTxt = '<b>' + esc(x.e.nombre) + '</b><br>Trabajadas: ' + x.ef.toFixed(1).replace('.', ',') + ' h<br>Previstas: ' + x.prev.toFixed(1).replace('.', ',') + ' h<br>Saldo: ' + (dif >= 0 ? '+' : '−') + Math.abs(dif).toFixed(1).replace('.', ',') + ' h';
      return '<li tabindex="0" data-tip="' + esc(tipTxt) + '"><span class="fx-hbars__name">' + esc(x.e.nombre) + '</span><span class="fx-hbars__track"><i class="fx-hbars__fill" style="width:' + (x.ef / max * 100) + '%"></i><i class="fx-hbars__plan" style="left:' + (x.prev / max * 100) + '%"></i></span>' +
        '<span class="fx-hbars__val">' + x.ef.toFixed(1).replace('.', ',') + ' h <small class="' + (dif >= 0 ? 'fx-pos' : 'fx-neg') + '">' + (dif >= 0 ? '+' : '−') + Math.abs(dif).toFixed(1).replace('.', ',') + '</small></span></li>';
    }).join('') + '</ul>';
  }

  /* ==========================================================================
     ENCARGADO · EQUIPO
     ========================================================================== */
  let periodo = 'mes';
  function rangoPeriodo(p, now) {
    const hoy = F.dayKey(now);
    if (p === 'semana') { const l = F.mondayOf(hoy); return [l, F.addDays(l, 6), 'Esta semana']; }
    if (p === 'pasado') { const d = new Date(now); const t = new Date(d.getFullYear(), d.getMonth() - 1, 1); const [a, b] = monthRange(t.getFullYear() + '-' + pad2(t.getMonth() + 1)); return [a, b, cap(fMes.format(t))]; }
    return [hoy.slice(0, 8) + '01', hoy, cap(fMes.format(new Date(now)))];
  }
  function viewEquipo() {
    const now = Date.now(), [a, b] = rangoPeriodo(periodo, now), anio = new Date(now).getFullYear();
    const emps = S().empleados;
    const rows = emps.map((e) => ({ e, r: F.resumen(e.id, a, b, now), ex: F.extrasAnio(e.id, now), vac: F.vacacionesUsadas(e.id, anio), st: estadoAhora(e, now) }));
    return '<div class="fx-head"><div><p class="eyebrow">Equipo</p><h2 class="fx-h2">Horas y asistencia</h2></div><div class="fx-head__tools">' +
      '<div class="seg" role="radiogroup" aria-label="Periodo">' + [['semana', 'Semana'], ['mes', 'Este mes'], ['pasado', 'Mes pasado']].map((p) => '<label><input type="radio" name="periodo" value="' + p[0] + '"' + (periodo === p[0] ? ' checked' : '') + '><span>' + p[1] + '</span></label>').join('') + '</div>' +
      '<button class="btn btn--small btn--accent" id="addEmp">' + icon('plus') + 'Añadir persona</button></div></div>' +
      '<div class="card fx-tablecard"><div class="fx-scroll"><table class="fx-table fx-table--team"><caption class="sr-only">Resumen del equipo</caption><thead><tr><th scope="col">Persona</th><th scope="col">Ahora</th><th scope="col" class="num">Trabajadas</th><th scope="col" class="num">Previstas</th><th scope="col" class="num">Saldo</th><th scope="col" class="num">Extra año</th><th scope="col" class="num">Puntualidad</th><th scope="col" class="num">Faltas</th><th scope="col" class="num">Sin salida</th><th scope="col" class="num">Vacaciones</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      rows.map((x) => '<tr class="' + (x.e.activo ? '' : 'is-off') + '"><th scope="row"><a class="fx-who" href="#equipo/' + x.e.id + '">' + avatar(x.e) + '<span><b>' + esc(x.e.nombre) + '</b><small>' + esc(x.e.puesto) + ' · ' + x.e.horasContrato + ' h/sem' + (x.e.activo ? '' : ' · baja en la empresa') + '</small></span></a></th>' +
        '<td><span class="fx-dot fx-dot--' + (x.st.k === 'tarde' ? 'tarde' : x.st.st.estado) + '"></span> ' + ({ trabajando: 'Trabajando', pausa: 'Pausa', tarde: 'Sin fichar', ausente: 'Ausente' }[x.st.k] || 'Fuera') + '</td>' +
        '<td class="num"><b>' + horas(x.r.tot.efectivo) + '</b></td><td class="num">' + horas(x.r.tot.previsto) + '</td>' +
        '<td class="num ' + (x.r.tot.saldo >= 0 ? 'fx-pos' : 'fx-neg') + '">' + saldo(x.r.tot.saldo) + '</td>' +
        '<td class="num' + (x.ex / H > S().config.maxExtrasAnio * 0.8 ? ' fx-neg' : '') + '">' + horas(x.ex) + '<small> / ' + S().config.maxExtrasAnio + '</small></td>' +
        '<td class="num">' + x.r.tot.puntualidad + ' %</td><td class="num' + (x.r.tot.faltas ? ' fx-neg' : '') + '">' + x.r.tot.faltas + '</td><td class="num' + (x.r.tot.sinCerrar ? ' fx-neg' : '') + '">' + x.r.tot.sinCerrar + '</td>' +
        '<td class="num">' + (S().config.diasVacaciones - x.vac) + ' d</td>' +
        '<td><button class="icon-btn icon-btn--sm" data-editemp="' + x.e.id + '" aria-label="Editar a ' + esc(x.e.nombre) + '" title="Editar">' + icon('edit') + '</button></td></tr>').join('') +
      '</tbody></table></div></div>' +
      '<p class="muted fx-small">Saldo = trabajado − previsto según los turnos (las ausencias aprobadas no cuentan). Extra año = exceso semanal sobre el contrato desde que hay datos.</p>';
  }
  function viewEmpleado(id) {
    const e = F.empleado(id);
    if (!e) return '<p>No existe esa persona. <a href="#equipo">Volver</a></p>';
    const parts = location.hash.split('/');
    const st = estadoAhora(e, Date.now());
    return '<div class="fx-head"><div><a class="fx-backlink" href="#equipo">' + icon('back') + 'Equipo</a><h2 class="fx-h2 fx-h2--who">' + avatar(e, 'avatar--lg') + '<span>' + esc(e.nombre) + '<small>' + esc(e.puesto) + ' · ' + e.horasContrato + ' h/sem · ' + esc(st.txt) + '</small></span></h2></div>' +
      '<div class="fx-head__tools"><button class="btn btn--small" data-editemp="' + e.id + '">' + icon('edit') + 'Editar ficha</button><button class="btn btn--small" data-ausfor="' + e.id + '">' + icon('calendar') + 'Registrar ausencia</button></div></div>' +
      viewHistorial(id, parts[2], true);
  }

  function empModal(id) {
    const e = id ? F.empleado(id) : { nombre: '', puesto: '', rol: 'empleado', pin: '', horasContrato: 20, activo: true, color: '#2D6A4F' };
    openModal('<h3>' + (id ? 'Editar a ' + esc(e.nombre) : 'Añadir persona') + '</h3><form class="form fx-form" id="empForm" novalidate>' +
      '<div class="form__row"><div class="field"><label for="eNombre">Nombre</label><input class="input" id="eNombre" value="' + esc(e.nombre) + '" required></div>' +
      '<div class="field"><label for="ePuesto">Puesto</label><input class="input" id="ePuesto" value="' + esc(e.puesto) + '" placeholder="Cocina, reparto…"></div></div>' +
      '<div class="form__row"><div class="field"><label for="eRol">Permisos</label><select class="input" id="eRol"><option value="empleado"' + (e.rol === 'empleado' ? ' selected' : '') + '>Empleado</option><option value="encargado"' + (e.rol === 'encargado' ? ' selected' : '') + '>Encargado</option></select></div>' +
      '<div class="field"><label for="ePin">PIN (4 cifras)</label><input class="input" id="ePin" inputmode="numeric" maxlength="4" value="' + esc(e.pin) + '" required></div></div>' +
      '<div class="form__row"><div class="field"><label for="eHoras">Horas de contrato a la semana</label><input class="input" id="eHoras" type="number" min="1" max="40" value="' + e.horasContrato + '"></div>' +
      '<div class="field"><label for="eColor">Color</label><input class="input fx-color" id="eColor" type="color" value="' + e.color + '"></div></div>' +
      (id ? '<label class="check"><input type="checkbox" id="eActivo"' + (e.activo ? ' checked' : '') + '><span>Activo (si se desmarca, deja de poder fichar pero sus registros se conservan 4 años)</span></label>' : '') +
      '<p class="field__err" id="eErr"></p><button class="btn btn--primary btn--block" type="submit">Guardar</button></form>');
    $('#empForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      try {
        F.guardarEmpleado({ id: id || undefined, nombre: $('#eNombre').value.trim(), puesto: $('#ePuesto').value.trim() || 'Empleado', rol: $('#eRol').value, pin: $('#ePin').value.trim(), horasContrato: Math.max(1, +$('#eHoras').value || 20), color: $('#eColor').value, activo: id ? $('#eActivo').checked : true });
        closeModal(); toast('Ficha guardada' + (id ? '' : '. Recuerda asignarle turnos.'));
      } catch (err) { $('#eErr').textContent = err.message; }
    });
  }
  function ausForModal(empId) {
    const e = F.empleado(empId), hoy = F.dayKey(Date.now());
    openModal('<h3>Registrar ausencia de ' + esc(e.nombre) + '</h3><p class="muted">Queda aprobada directamente.</p><form class="form fx-form" id="ausForm2" novalidate>' +
      '<div class="field"><label for="bTipo">Tipo</label><select class="input" id="bTipo">' + Object.entries(F.AUSENCIAS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
      '<div class="form__row"><div class="field"><label for="bDesde">Desde</label><input class="input" type="date" id="bDesde" value="' + hoy + '"></div><div class="field"><label for="bHasta">Hasta</label><input class="input" type="date" id="bHasta" value="' + hoy + '"></div></div>' +
      '<div class="field"><label for="bMotivo">Comentario</label><input class="input" id="bMotivo"></div><p class="field__err" id="bErr"></p><button class="btn btn--primary btn--block" type="submit">Guardar</button></form>');
    $('#ausForm2').addEventListener('submit', (ev) => {
      ev.preventDefault();
      try { F.solicitarAusencia({ empId, tipo: $('#bTipo').value, desde: $('#bDesde').value, hasta: $('#bHasta').value, motivo: $('#bMotivo').value.trim() }, me.id); closeModal(); toast('Ausencia registrada'); }
      catch (err) { $('#bErr').textContent = err.message; }
    });
  }

  /* ==========================================================================
     ENCARGADO · SOLICITUDES Y AUDITORÍA
     ========================================================================== */
  function viewSolicitudes() {
    const pc = S().correcciones.filter((c) => c.estado === 'pendiente').sort((a, b) => a.creado - b.creado);
    const pa = S().ausencias.filter((a) => a.estado === 'pendiente').sort((a, b) => a.desde.localeCompare(b.desde));
    const hist = S().correcciones.filter((c) => c.estado !== 'pendiente').sort((a, b) => b.revisado - a.revisado);
    const integ = F.verificarIntegridad();
    return '<div class="fx-head"><div><p class="eyebrow">Solicitudes</p><h2 class="fx-h2">Pendientes de revisar</h2></div></div>' +
      '<div class="fx-two">' +
      '<section><h3 class="fx-h3">Correcciones de fichaje <span class="fx-badge">' + pc.length + '</span></h3>' + (pc.length ? '<div class="fx-list">' + pc.map((c) => corrCard(c, true)).join('') + '</div>' : '<p class="fx-allgood">' + icon('check') + 'No hay correcciones pendientes.</p>') + '</section>' +
      '<section><h3 class="fx-h3">Ausencias <span class="fx-badge">' + pa.length + '</span></h3>' + (pa.length ? '<div class="fx-list">' + pa.map((a) => ausCard(a, true)).join('') + '</div>' : '<p class="fx-allgood">' + icon('check') + 'No hay ausencias pendientes.</p>') + '</section></div>' +
      '<div class="card fx-integrity fx-integrity--' + (integ.ok ? 'ok' : 'bad') + '">' + icon('shield') + '<div><b>' + (integ.ok ? 'Registro íntegro' : 'Se han detectado registros alterados') + '</b><p>' + integ.total + ' registros encadenados con huella digital. ' + (integ.ok ? 'Ninguno se ha modificado ni borrado desde que se creó.' : 'Afectados: ' + integ.rotos.join(', ')) + '</p></div></div>' +
      '<h3 class="fx-h3">Registro de auditoría de correcciones</h3>' +
      '<div class="card fx-tablecard"><div class="fx-scroll"><table class="fx-table"><thead><tr><th>Fecha de la jornada</th><th>Persona</th><th>Cambio</th><th>Motivo</th><th>Solicitó</th><th>Resolvió</th><th>Estado</th><th>Huella</th></tr></thead><tbody>' +
      (hist.length ? hist.map((c) => '<tr><td>' + cap(fechaKey(c.fecha)) + '</td><td>' + esc(F.empleado(c.empId).nombre) + '</td><td>' + corrDesc(c) + '</td><td class="fx-why">' + esc(c.motivo) + '</td><td>' + esc(F.empleado(c.autorId).nombre) + '<br><small>' + fDT.format(new Date(c.creado)) + '</small></td><td>' + esc(F.empleado(c.revisorId).nombre) + '<br><small>' + fDT.format(new Date(c.revisado)) + '</small></td><td><span class="fx-pill fx-pill--' + (c.estado === 'aprobada' ? 'ok' : 'bad') + '">' + cap(c.estado) + '</span></td><td><code>' + c.hash + '</code></td></tr>').join('') : '<tr><td colspan="8" class="muted">Sin correcciones resueltas.</td></tr>') +
      '</tbody></table></div></div>';
  }

  /* ==========================================================================
     ENCARGADO · TURNOS
     ========================================================================== */
  function viewTurnos() {
    const emps = S().empleados.filter((e) => e.activo);
    const cobertura = ORDEN.map((wd) => emps.filter((e) => (e.turnos[wd] || []).length).length);
    // Descanso planificado entre el último turno de un día y el primero del siguiente (art. 34.3 ET)
    const avisos = (e) => ORDEN.filter((wd) => {
      const hoy = e.turnos[wd] || [], sig = e.turnos[(wd + 1) % 7] || [];
      return hoy.length && sig.length && (1440 + sig[0][0]) - hoy[hoy.length - 1][1] < S().config.descansoEntreJornadas * 60;
    }).map((wd) => DIAS[wd] + '→' + DIAS[(wd + 1) % 7]);
    return '<div class="fx-head"><div><p class="eyebrow">Turnos</p><h2 class="fx-h2">Planificación semanal</h2></div><div class="fx-head__tools"><button class="btn btn--small btn--accent" id="saveTurnos">' + icon('check') + 'Guardar turnos</button></div></div>' +
      '<p class="muted">Escribe el horario como <code>19:00-23:30</code>. Para jornada partida: <code>11:00-13:30, 19:00-23:30</code>. Déjalo vacío si libra. Si la hora de fin es menor que la de inicio, se entiende que acaba pasada la medianoche.</p>' +
      '<div class="card fx-tablecard"><div class="fx-scroll"><table class="fx-table fx-table--shifts"><thead><tr><th>Persona</th>' + ORDEN.map((wd) => '<th>' + DIAS[wd] + '</th>').join('') + '<th class="num">Plan</th><th class="num">Contrato</th></tr></thead><tbody>' +
      emps.map((e) => { const plan = F.horasSemanaPlan(e); const av = avisos(e); return '<tr><th scope="row"><span class="fx-who">' + avatar(e) + '<span><b>' + esc(e.nombre) + '</b>' + (av.length ? '<small class="fx-neg" title="Menos de ' + S().config.descansoEntreJornadas + ' h de descanso entre jornadas">⚠ Descanso &lt; ' + S().config.descansoEntreJornadas + ' h: ' + av.join(', ') + '</small>' : '') + '</span></span></th>' +
        ORDEN.map((wd) => '<td><input class="input input--sm fx-shift" data-emp="' + e.id + '" data-wd="' + wd + '" value="' + (e.turnos[wd] || []).map((r) => minStr(r[0]) + '-' + minStr(r[1])).join(', ') + '" aria-label="Turno de ' + esc(e.nombre) + ' el ' + DIAS[wd] + '" placeholder="Libre"></td>').join('') +
        '<td class="num ' + (Math.abs(plan - e.horasContrato) > 0.5 ? 'fx-neg' : '') + '"><b>' + String(+plan.toFixed(2)).replace('.', ',') + ' h</b></td><td class="num">' + e.horasContrato + ' h</td></tr>'; }).join('') +
      '<tr class="fx-coverage"><th scope="row">Personas</th>' + cobertura.map((n) => '<td>' + n + '</td>').join('') + '<td></td><td></td></tr>' +
      '</tbody></table></div></div><p class="field__err" id="tErr"></p>';
  }
  function guardarTurnos() {
    try {
      const nuevos = {};
      $$('.fx-shift').forEach((inp) => {
        const id = inp.dataset.emp, wd = +inp.dataset.wd;
        nuevos[id] = nuevos[id] || {};
        const v = inp.value.trim();
        nuevos[id][wd] = v ? v.split(',').map((p) => {
          const m = p.trim().match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
          if (!m) throw new Error('Formato no válido: «' + p.trim() + '» (' + F.empleado(id).nombre + ', ' + DIAS[wd] + ')');
          const a = +m[1] * 60 + +m[2]; let b = +m[3] * 60 + +m[4]; if (b <= a) b += 1440;
          if (b - a > 12 * 60) throw new Error('Un turno no puede superar 12 h (' + F.empleado(id).nombre + ', ' + DIAS[wd] + ')');
          return [a, b];
        }) : [];
      });
      Object.entries(nuevos).forEach(([id, t]) => F.guardarEmpleado(Object.assign({}, F.empleado(id), { turnos: t })));
      toast('Turnos guardados');
    } catch (err) { $('#tErr').textContent = err.message; toast(err.message, 'error'); }
  }

  /* ==========================================================================
     ENCARGADO · INFORMES (gestoría / Inspección)
     ========================================================================== */
  function viewInformes() {
    const emps = S().empleados;
    return '<div class="fx-head"><div><p class="eyebrow">Informes</p><h2 class="fx-h2">Registro de jornada para la gestoría</h2></div></div>' +
      '<div class="fx-two"><article class="card"><form class="form" id="repForm">' +
        '<div class="form__row"><div class="field"><label for="rMes">Mes</label><select class="input" id="rMes">' + mesOpts(mesActual()) + '</select></div>' +
        '<div class="field"><label for="rEmp">Persona</label><select class="input" id="rEmp"><option value="">Todo el equipo</option>' + emps.map((e) => '<option value="' + e.id + '">' + esc(e.nombre) + '</option>').join('') + '</select></div></div>' +
        '<div class="fx-repbtns"><button type="button" class="btn btn--primary" id="repCsv">' + icon('download') + 'Descargar CSV (Excel)</button><button type="button" class="btn btn--ghost" id="repPrint">' + icon('print') + 'Imprimir / guardar PDF</button></div>' +
        '<hr class="fx-hr"><p class="muted fx-small">Copia de seguridad completa (empleados, fichajes, correcciones y ausencias):</p><button type="button" class="btn btn--small" id="repJson">' + icon('download') + 'Copia de seguridad JSON</button>' +
      '</form></article>' +
      '<article class="card fx-legal"><h3 class="fx-h3 fx-h3--card">' + icon('shield') + 'Qué exige la ley</h3><ul>' +
        '<li><b>Registro diario</b> con la hora de inicio y fin de cada jornada (art. 34.9 ET, RDL 8/2019).</li>' +
        '<li><b>Conservación durante 4 años</b> y a disposición de la persona trabajadora, sus representantes y la Inspección de Trabajo.</li>' +
        '<li><b>Registros fiables e inalterables</b>: aquí cada fichaje se encadena con una huella y las correcciones guardan autor, fecha y motivo.</li>' +
        '<li><b>Sin biometría</b>: se ficha con ubicación, QR o PIN (criterio de la AEPD, 2023).</li>' +
        '<li>Pendiente: el real decreto de <b>registro digital</b> obligatorio aún no se ha publicado. Este sistema ya cumple su borrador (registro digital, acceso remoto y exportable).</li>' +
      '</ul></article></div>';
  }

  function filasMes(empId, mes) {
    const [a, b] = monthRange(mes);
    return F.resumen(empId, a, b).dias;
  }
  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function exportCsv(empId, mes) {
    const emps = empId ? [F.empleado(empId)] : S().empleados;
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = [['Empleado', 'Puesto', 'Fecha', 'Turno previsto', 'Entrada', 'Salida', 'Pausas (min)', 'Horas efectivas', 'Horas previstas', 'Diferencia', 'Método', 'Incidencias']];
    emps.forEach((e) => filasMes(e.id, mes).forEach((d) => {
      const inc = [d.ausencia ? F.AUSENCIAS[d.ausencia.tipo] : '', d.falta ? 'Falta' : '', d.retraso ? 'Retraso ' + d.retraso + ' min' : '', d.sinCerrar ? 'Sin salida' : '', d.corregido ? 'Corregido' : ''].filter(Boolean).join(' / ');
      const base = [e.nombre, e.puesto, d.key];
      const num = (ms) => (ms / H).toFixed(2).replace('.', ',');
      if (!d.sesiones.length) { if (d.previsto || inc) rows.push(base.concat([turnoTxt(d.turnos), '', '', '', '0,00', num(d.previsto), num(-d.previsto), '', inc])); return; }
      d.sesiones.forEach((s, i) => rows.push(base.concat([i ? '' : turnoTxt(d.turnos), hhmm(s.inicio), s.fin ? hhmm(s.fin) : '', Math.round(s.pausaMs / M), num(s.efectivo), i ? '' : num(d.previsto), i ? '' : num(d.efectivo - d.previsto), F.METODOS[s.eventos[0].metodo], i ? '' : inc])));
    }));
    descargar('registro_jornada_' + mes + (empId ? '_' + empId : '_equipo') + '.csv', '﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    toast('CSV descargado');
  }
  function printReport(empId, mes) {
    const emps = empId ? [F.empleado(empId)] : S().empleados.filter((e) => e.activo);
    const [y, m] = mes.split('-').map(Number);
    const mesTxt = cap(fMes.format(new Date(y, m - 1, 1)));
    $('#printArea').innerHTML = emps.map((e) => {
      const dias = filasMes(e.id, mes);
      const tot = dias.reduce((a, d) => a + d.efectivo, 0), prev = dias.reduce((a, d) => a + d.previsto, 0);
      return '<section class="fx-sheet"><header><img src="assets/logo_napoles.svg" alt="" width="150"><div><h1>Registro diario de jornada</h1><p>' + mesTxt + '</p></div></header>' +
        '<dl><dt>Empresa</dt><dd>Pizzería Nápoles · Av. de la Constitución, 34 · 11550 Chipiona (Cádiz)</dd><dt>Persona trabajadora</dt><dd>' + esc(e.nombre) + ' · ' + esc(e.puesto) + '</dd><dt>Jornada contratada</dt><dd>' + e.horasContrato + ' h semanales</dd></dl>' +
        '<table><thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th>Pausas</th><th>Horas</th><th>Observaciones</th></tr></thead><tbody>' +
        dias.map((d) => '<tr><td>' + cap(fechaKey(d.key)) + '</td><td>' + (d.sesiones.map((s) => hhmm(s.inicio)).join(' / ') || '—') + '</td><td>' + (d.sesiones.map((s) => s.fin ? hhmm(s.fin) : '¿?').join(' / ') || '—') + '</td><td>' + (d.pausas ? Math.round(d.pausas / M) + ' min' : '') + '</td><td>' + (d.efectivo ? horas(d.efectivo, 2) : '') + '</td><td>' + [d.ausencia ? F.AUSENCIAS[d.ausencia.tipo] : '', d.falta ? 'Falta' : '', d.sinCerrar ? 'Sin salida' : '', d.corregido ? 'Corregido' : ''].filter(Boolean).join(', ') + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="4">Total del mes (previsto ' + horas(prev) + ')</td><td>' + horas(tot, 2) + '</td><td></td></tr></tfoot></table>' +
        '<div class="fx-sign"><div>Firma de la empresa</div><div>Firma de la persona trabajadora</div></div>' +
        '<p class="fx-sheet__legal">Registro conforme al art. 34.9 del Estatuto de los Trabajadores (RDL 8/2019). Se conserva durante cuatro años. Generado el ' + fDT.format(new Date()) + '.</p></section>';
    }).join('');
    setTimeout(() => window.print(), 100);
  }

  /* ==========================================================================
     ENCARGADO · AJUSTES
     ========================================================================== */
  function viewAjustes() {
    const c = S().config;
    return '<div class="fx-head"><div><p class="eyebrow">Ajustes</p><h2 class="fx-h2">Reglas del fichaje</h2></div></div>' +
      '<div class="fx-two"><article class="card"><form class="form" id="cfgForm" novalidate>' +
        '<h3 class="fx-h3 fx-h3--card">' + icon('pin') + 'Ubicación del local</h3>' +
        '<div class="form__row"><div class="field"><label for="sLat">Latitud</label><input class="input" id="sLat" type="number" step="0.000001" value="' + c.local.lat + '"></div><div class="field"><label for="sLng">Longitud</label><input class="input" id="sLng" type="number" step="0.000001" value="' + c.local.lng + '"></div></div>' +
        '<button type="button" class="btn btn--small" id="useHere">' + icon('pin') + 'Usar mi ubicación actual (estando en el local)</button>' +
        '<div class="form__row"><div class="field"><label for="sRadio">Radio permitido (m)</label><input class="input" id="sRadio" type="number" min="20" max="1000" value="' + c.radio + '"></div><div class="field"><label for="sTol">Cortesía antes de marcar retraso (min)</label><input class="input" id="sTol" type="number" min="0" max="30" value="' + c.tolerancia + '"></div></div>' +
        '<h3 class="fx-h3 fx-h3--card">' + icon('qr') + 'Formas de fichar</h3>' +
        '<label class="check"><input type="checkbox" id="mGps"' + (c.metodos.gps ? ' checked' : '') + '><span>Desde el móvil con la ubicación (GPS)</span></label>' +
        '<label class="check"><input type="checkbox" id="mCod"' + (c.metodos.codigo ? ' checked' : '') + '><span>Desde el móvil con el QR o el código del mostrador</span></label>' +
        '<label class="check"><input type="checkbox" id="mKio"' + (c.metodos.quiosco ? ' checked' : '') + '><span>En la tablet del mostrador con PIN (modo quiosco)</span></label>' +
        '<div class="field"><label for="sPer">El código del mostrador cambia cada (s)</label><input class="input" id="sPer" type="number" min="15" max="300" value="' + c.periodoCodigo + '"></div>' +
        '<h3 class="fx-h3 fx-h3--card">' + icon('clock') + 'Pausas</h3>' +
        '<div class="field"><label for="sDesc">Minutos de descanso que cuentan como trabajo (según convenio)</label><input class="input" id="sDesc" type="number" min="0" max="60" value="' + (c.descansoComputable || 0) + '"><small class="muted">Solo pausas de tipo «Descanso». Las de comida y asuntos personales nunca cuentan.</small></div>' +
        '<p class="field__err" id="sErr"></p><button class="btn btn--primary btn--block" type="submit">Guardar ajustes</button>' +
      '</form></article>' +
      '<div class="fx-stack"><article class="card"><h3 class="fx-h3 fx-h3--card">' + icon('tablet') + 'Tablet del mostrador</h3><p>Pon una tablet en el mostrador en modo quiosco: muestra un QR que cambia cada ' + c.periodoCodigo + ' s (así nadie puede fichar desde casa con una foto) y permite fichar con PIN.</p><button class="btn btn--primary" id="openKiosk">' + icon('tablet') + 'Abrir modo quiosco</button></article>' +
      '<article class="card"><h3 class="fx-h3 fx-h3--card">Límites legales aplicados</h3><ul class="fx-rules"><li>Jornada máxima: <b>' + c.horasMaxDia + ' h</b> efectivas al día</li><li>Descanso entre jornadas: <b>' + c.descansoEntreJornadas + ' h</b></li><li>Pausa obligatoria si se superan <b>' + c.pausaObligatoria + ' h</b> seguidas</li><li>Horas extra: máximo <b>' + c.maxExtrasAnio + ' h</b> al año</li><li>Vacaciones: <b>' + c.diasVacaciones + ' días</b> naturales</li></ul><p class="muted fx-small">Ajustables según el convenio de hostelería de Cádiz.</p></article>' +
      '<article class="card"><h3 class="fx-h3 fx-h3--card">Datos de demostración</h3><p class="muted">Vuelve a generar seis semanas de fichajes de ejemplo. Se borra todo lo que hayas registrado en este navegador.</p><button class="btn btn--small" id="resetDemo">Regenerar datos</button></article></div></div>';
  }

  /* ==========================================================================
     QUIOSCO DEL MOSTRADOR
     ========================================================================== */
  let kioskEmp = null, kioskTimer = null;
  function openKiosk() {
    if (!S().config.metodos.quiosco && !S().config.metodos.codigo) { toast('Activa el quiosco o el código en Ajustes', 'error'); return; }
    $('#kiosk').hidden = false; document.body.classList.add('is-locked');
    kioskEmp = null; kioskHome(); tick();
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }
  function closeKiosk() {
    $('#kiosk').hidden = true; document.body.classList.remove('is-locked');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  $('#kioskClose').addEventListener('click', closeKiosk);
  function kioskHome() {
    clearTimeout(kioskTimer);
    kioskEmp = null;
    if (!S().config.metodos.quiosco) { $('#kRight').innerHTML = '<div class="fx-kiosk__msg"><p>El fichaje con PIN está desactivado. Usad el QR desde el móvil.</p></div>'; return; }
    $('#kRight').innerHTML = '<p class="fx-kiosk__label">Ficha con tu PIN</p><div class="fx-pin__dots fx-pin__dots--k" id="kDots"><i></i><i></i><i></i><i></i></div><p class="field__err" id="kErr" role="alert"></p><div class="fx-keypad fx-keypad--k" id="kPad">' + keypadHTML() + '</div>';
    let v = '';
    const dots = () => $$('#kDots i').forEach((d, i) => d.classList.toggle('is-on', i < v.length));
    const check = () => {
      const e = S().empleados.find((x) => x.activo && x.pin === v);
      if (e) kioskActions(e);
      else { $('#kErr').textContent = 'PIN no válido'; v = ''; dots(); }
    };
    $('#kPad').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'del') v = v.slice(0, -1); else if (k === 'ok') { if (v.length === 4) check(); } else if (v.length < 4) v += k;
      dots(); $('#kErr').textContent = '';
      if (v.length === 4 && k !== 'ok' && k !== 'del') setTimeout(check, 120);
    });
  }
  function kioskActions(e) {
    kioskEmp = e;
    const st = F.estado(e.id);
    const b = (tipo, txt, cls, ic) => '<button class="fx-big ' + cls + '" data-kact="' + tipo + '">' + icon(ic) + '<span>' + txt + '</span></button>';
    let acts = '';
    if (st.estado === 'fuera') acts = b('entrada', 'Entrada', 'fx-big--in', 'play');
    else if (st.estado === 'trabajando') acts = b('pausa_inicio', 'Pausa', 'fx-big--pause', 'pause') + b('salida', 'Salida', 'fx-big--out', 'stop');
    else acts = b('pausa_fin', 'Volver de la pausa', 'fx-big--in', 'play') + b('salida', 'Salida', 'fx-big--out', 'stop');
    $('#kRight').innerHTML = '<div class="fx-kiosk__who">' + avatar(e, 'avatar--xl') + '<p>Hola, <b>' + esc(e.nombre) + '</b></p><p class="fx-state fx-state--' + st.estado + '"><i></i>' + { fuera: 'Fuera de turno', trabajando: 'Trabajando', pausa: 'En pausa' }[st.estado] + '</p></div>' +
      '<div class="fx-actions fx-actions--k" id="kActs">' + acts + '</div><button class="link-btn" id="kCancel">No soy yo</button>';
    $('#kCancel').addEventListener('click', kioskHome);
    $('#kActs').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-kact]'); if (!btn) return;
      clearTimeout(kioskTimer);
      try {
        F.fichar(e.id, btn.dataset.kact, { metodo: 'quiosco', pausaTipo: 'descanso' });
        $('#kRight').innerHTML = '<div class="fx-kiosk__ok">' + icon('check') + '<p><b>' + F.TIPOS[btn.dataset.kact] + '</b> registrada a las ' + hhmm(Date.now()) + '</p><p>' + esc(e.nombre) + '</p></div>';
      } catch (err) { $('#kRight').innerHTML = '<div class="fx-kiosk__msg">' + esc(err.message) + '</div>'; }
      kioskTimer = setTimeout(kioskHome, 3500);
    });
    kioskTimer = setTimeout(kioskHome, 20000);
  }
  let lastCode = '';
  function kioskTick(now) {
    $('#kClock').textContent = hhmm(now);
    $('#kDate').textContent = cap(fFecha.format(new Date(now)));
    const per = S().config.periodoCodigo;
    $('#kPeriod').textContent = per;
    const code = F.codigoMostrador(now);
    const left = per - Math.floor(now / 1000) % per;
    $('#kBar').style.width = (left / per * 100) + '%';
    if (code !== lastCode) {
      lastCode = code;
      $('#kCode').textContent = code.slice(0, 3) + ' ' + code.slice(3);
      if (window.qrcode) {
        const qr = window.qrcode(0, 'M'); qr.addData('NAPOLES-FICHAJE:' + code); qr.make();
        $('#kQr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      } else $('#kQr').innerHTML = '<div class="fx-qr__off">' + icon('qr') + '<small>QR sin conexión</small></div>';
    }
  }

  /* ==========================================================================
     EVENTOS GLOBALES (delegación)
     ========================================================================== */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const act = t.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'pausa') pausaModal((p) => doFichar('pausa_inicio', p));
      else doFichar(act.dataset.act);
      return;
    }
    const corr = t.closest('[data-corr]');
    if (corr) { corrModal(corr.dataset.emp || me.id, corr.dataset.corr); return; }
    const res = t.closest('[data-res]');
    if (res) {
      const id = res.dataset.id, ok = res.dataset.ok === '1';
      const com = ($('[data-com="' + id + '"]') || {}).value || '';
      try {
        if (res.dataset.res === 'corr') F.resolverCorreccion(id, ok, me.id, com); else F.resolverAusencia(id, ok, me.id, com);
        toast(ok ? 'Solicitud aprobada' : 'Solicitud rechazada');
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const cancel = t.closest('[data-cancel]');
    if (cancel) { try { F.cancelarAusencia(cancel.dataset.cancel, me.id); toast('Solicitud cancelada'); } catch (err) { toast(err.message, 'error'); } return; }
    const csv = t.closest('[data-csv]');
    if (csv) { exportCsv(csv.dataset.csv, csv.dataset.mes); return; }
    const pr = t.closest('[data-print]');
    if (pr) { printReport(pr.dataset.print, pr.dataset.mes); return; }
    const ed = t.closest('[data-editemp]');
    if (ed) { empModal(ed.dataset.editemp); return; }
    const af = t.closest('[data-ausfor]');
    if (af) { ausForModal(af.dataset.ausfor); return; }
    if (t.closest('#addEmp')) { empModal(null); return; }
    if (t.closest('#openKiosk')) { openKiosk(); return; }
    if (t.closest('#relocate')) { loc = { status: 'idle' }; locate(); return; }
    if (t.closest('#scanQr')) { scanQr(); return; }
    if (t.closest('#saveTurnos')) { guardarTurnos(); return; }
    if (t.closest('#repCsv')) { exportCsv($('#rEmp').value, $('#rMes').value); return; }
    if (t.closest('#repPrint')) { printReport($('#rEmp').value, $('#rMes').value); return; }
    if (t.closest('#repJson')) { descargar('napoles_fichaje_copia_' + F.dayKey(Date.now()) + '.json', F.exportarJSON(), 'application/json'); return; }
    if (t.closest('#resetDemo')) { if (confirm('¿Regenerar los datos de demostración? Se perderán los fichajes registrados en este navegador.')) { F.reiniciar(); toast('Datos regenerados'); } return; }
    if (t.closest('#useHere')) {
      if (!navigator.geolocation) { toast('Este dispositivo no permite la geolocalización', 'error'); return; }
      navigator.geolocation.getCurrentPosition((p) => { $('#sLat').value = p.coords.latitude.toFixed(6); $('#sLng').value = p.coords.longitude.toFixed(6); toast('Ubicación capturada (precisión ' + Math.round(p.coords.accuracy) + ' m). Pulsa Guardar.'); },
        () => toast('No se ha podido obtener la ubicación', 'error'), { enableHighAccuracy: true, timeout: 10000 });
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'metodo') { metodo = t.value; store.set('napoles-fichaje-metodo', metodo); refreshMethod(); if (metodo === 'gps' && loc.status === 'idle') locate(); }
    else if (t.id === 'simular') { simular = t.checked; store.set('napoles-fichaje-simular', simular); loc = { status: 'idle' }; locate(); }
    else if (t.id === 'mesSel') location.hash = t.dataset.base + '/' + t.value;
    else if (t.name === 'periodo') { periodo = t.value; render(); }
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'ausForm') {
      e.preventDefault();
      try { F.solicitarAusencia({ empId: me.id, tipo: $('#aTipo').value, desde: $('#aDesde').value, hasta: $('#aHasta').value, motivo: $('#aMotivo').value.trim() }, me.id); toast('Solicitud enviada al encargado'); }
      catch (err) { $('#aErr').textContent = err.message; }
    } else if (e.target.id === 'cfgForm') {
      e.preventDefault();
      const lat = parseFloat($('#sLat').value), lng = parseFloat($('#sLng').value);
      const m = { gps: $('#mGps').checked, codigo: $('#mCod').checked, quiosco: $('#mKio').checked };
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) { $('#sErr').textContent = 'Coordenadas no válidas.'; return; }
      if (!m.gps && !m.codigo && !m.quiosco) { $('#sErr').textContent = 'Deja al menos una forma de fichar.'; return; }
      F.guardarConfig({ local: Object.assign({}, S().config.local, { lat, lng }), radio: Math.max(20, +$('#sRadio').value || 100), tolerancia: Math.max(0, +$('#sTol').value || 0), metodos: m, periodoCodigo: Math.max(15, +$('#sPer').value || 30), descansoComputable: Math.min(60, Math.max(0, +$('#sDesc').value || 0)) });
      loc = { status: 'idle' };
      toast('Ajustes guardados');
    }
  });

  /* ---------- Reloj: actualiza contadores cada segundo ---------- */
  function tick() {
    const now = Date.now();
    if (!$('#kiosk').hidden) kioskTick(now);
    if (!me) return;
    $$('[data-live="clock"]').forEach((el) => { el.textContent = hhmmss(now); });
    $$('[data-live="clockShort"]').forEach((el) => { el.textContent = hhmm(now); });
    const w = $('[data-live="worked"]');
    if (w) {
      const hoy = F.dayKey(now);
      const ss = F.sesiones(me.id, now).filter((s) => s.dia === hoy || s.abierta);
      w.textContent = durClock(ss.reduce((a, s) => a + s.efectivo, 0));
      if (now % 60000 < 1000) { const r = $('#ring'); if (r) r.innerHTML = ringHTML(me.id, now); }
    }
  }
  setInterval(tick, 1000);
  // Refresco completo cada minuto (estados «sin fichar», gráficos…), salvo con un formulario a medias
  setInterval(() => { if (me && modal.hidden && !document.activeElement.matches('input, select, textarea')) render(); }, 60000);

  /* ---------- Arranque ---------- */
  renderPeople();
  const saved = sess.get();
  if (saved && F.empleado(saved) && F.empleado(saved).activo) login(saved);
})();
