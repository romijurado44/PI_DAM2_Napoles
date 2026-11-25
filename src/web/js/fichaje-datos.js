/* ==========================================================================
   Pizzería Nápoles · Sistema de fichaje · Capa de datos y reglas
   --------------------------------------------------------------------------
   Esta capa hace de «servidor» mientras no exista la API de Spring Boot.
   Cada función pública equivale a un endpoint REST futuro (ver comentarios),
   así que la interfaz no tendrá que cambiar cuando se conecte al backend.

   Modelo (igual que las tablas MySQL previstas):
   · empleados      → id, nombre, puesto, rol, pin, horasContrato, turnos
   · fichajes       → SOLO INSERCIÓN. id, empId, tipo, ts, metodo, lat, lng,
                      dist, pausaTipo, hash (encadenado con el anterior)
   · correcciones   → nunca se toca un fichaje: se guarda una corrección con
                      autor, fecha, motivo, revisor y estado
   · ausencias      → vacaciones, bajas, permisos…
   · config         → ubicación del local, radio, tolerancia, métodos…
   ========================================================================== */
(function () {
  'use strict';

  const KEY = 'napoles-fichaje-v3';
  const H = 3600000, M = 60000, D = 86400000;

  /* ---------- Utilidades de fecha (hora local) ---------- */
  const pad2 = (n) => String(n).padStart(2, '0');
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  const dayStart = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n).getTime()); };
  const weekday = (key) => new Date(dayStart(key)).getDay(); // 0 = domingo
  const atMin = (key, min) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 0, min).getTime(); };
  const mondayOf = (key) => addDays(key, -((weekday(key) + 6) % 7));

  /* Hash FNV-1a de 32 bits: suficiente para la demo. En el servidor: SHA-256. */
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function haversine(a, b, c, d) {
    const R = 6371000, r = Math.PI / 180;
    const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

  /* ---------- Catálogos ---------- */
  const TIPOS = { entrada: 'Entrada', salida: 'Salida', pausa_inicio: 'Inicio de pausa', pausa_fin: 'Fin de pausa' };
  const PAUSAS = { descanso: 'Descanso', comida: 'Comida / cena', personal: 'Asunto personal' };
  const METODOS = { gps: 'Ubicación', qr: 'QR del mostrador', codigo: 'Código del mostrador', quiosco: 'Quiosco (PIN)', correccion: 'Corrección' };
  const AUSENCIAS = { vacaciones: 'Vacaciones', baja: 'Baja médica (IT)', asuntos: 'Asuntos propios', permiso: 'Permiso retribuido', otros: 'Otros' };

  /* ---------- Datos iniciales ---------- */
  // Turnos: por día de la semana (0 = domingo) lista de [inicio, fin] en minutos.
  // Un fin mayor de 1440 significa que el turno termina pasada la medianoche.
  const T = (a, b) => { const x = hm(a); let y = hm(b); if (y <= x) y += 1440; return [x, y]; };
  function semana(dias, ...rangos) { const t = {}; for (let i = 0; i < 7; i++) t[i] = dias.includes(i) ? rangos.map((r) => r.slice()) : []; return t; }

  function empleadosIniciales() {
    return [
      { id: 'kp', nombre: 'Kino padre', puesto: 'Encargado', rol: 'encargado', pin: '1985', horasContrato: 30, color: '#9E1B1B', activo: true,
        turnos: semana([0, 2, 3, 4, 5, 6], T('19:00', '00:00')) },
      { id: 'ichu', nombre: 'Ichu', puesto: 'Cocina', rol: 'empleado', pin: '1111', horasContrato: 30, color: '#2D6A4F', activo: true,
        turnos: semana([0, 1, 3, 4, 5, 6], T('18:30', '23:30')) },
      { id: 'kino', nombre: 'Kino', puesto: 'Masa y horno', rol: 'empleado', pin: '2222', horasContrato: 30, color: '#E9A23B', activo: true,
        turnos: semana([0, 3, 4, 5, 6], T('12:00', '14:00'), T('19:00', '23:00')) },
      { id: 'rosa', nombre: 'Rosa', puesto: 'Barra y teléfono', rol: 'empleado', pin: '3333', horasContrato: 27, color: '#D62828', activo: true,
        turnos: semana([0, 1, 2, 4, 5, 6], T('19:15', '23:45')) },
      { id: 'lupe', nombre: 'Lupe', puesto: 'Coordinación de reparto', rol: 'empleado', pin: '4444', horasContrato: 20, color: '#5E4B40', activo: true,
        turnos: semana([0, 4, 5, 6], T('19:30', '00:30')) },
      { id: 'antonio', nombre: 'Antonio', puesto: 'Repartidor', rol: 'empleado', pin: '5555', horasContrato: 16, color: '#3A6EA5', activo: true,
        turnos: semana([0, 3, 5, 6], T('20:00', '00:00')) }
    ];
  }

  function configInicial() {
    return {
      local: { lat: 36.7372, lng: -6.4355, nombre: 'Av. de la Constitución, 34 · Chipiona' }, // aproximada: ajústala en Ajustes
      radio: 100,               // metros (OE4)
      tolerancia: 5,            // minutos de cortesía antes de marcar retraso
      metodos: { gps: true, codigo: true, quiosco: true },
      periodoCodigo: 30,        // segundos que dura el código / QR del mostrador
      secreto: Math.random().toString(36).slice(2, 12),
      horasMaxDia: 9,           // ET art. 34.3
      descansoEntreJornadas: 12,// ET art. 34.3 (horas)
      pausaObligatoria: 6,      // ET art. 34.4: más de 6 h seguidas → pausa ≥ 15 min
      maxExtrasAnio: 80,        // ET art. 35.2
      diasVacaciones: 30,       // ET art. 38 (naturales)
      descansoComputable: 20    // minutos de «descanso» que cuentan como trabajo (según convenio; 0 = ninguno)
    };
  }

  /* Genera seis semanas de historial realista hasta «ahora» (determinista). */
  function generarDemo(now) {
    const rnd = mulberry(1985);
    const ri = (a, b) => Math.round(a + rnd() * (b - a));
    const cfg = configInicial();
    const emps = empleadosIniciales();
    const hoy = dayKey(now);
    const fichajes = [], correcciones = [], ausencias = [];

    // Ausencias de ejemplo
    ausencias.push({ id: 'a1', empId: 'ichu', tipo: 'vacaciones', desde: addDays(hoy, -22), hasta: addDays(hoy, -18), motivo: 'Vacaciones de otoño', estado: 'aprobada', creado: now - 40 * D, revisorId: 'kp', revisado: now - 39 * D });
    ausencias.push({ id: 'a2', empId: 'lupe', tipo: 'baja', desde: addDays(hoy, -11), hasta: addDays(hoy, -10), motivo: 'Gripe (parte médico entregado)', estado: 'aprobada', creado: now - 11 * D, revisorId: 'kp', revisado: now - 11 * D });
    ausencias.push({ id: 'a3', empId: 'antonio', tipo: 'asuntos', desde: addDays(hoy, 5), hasta: addDays(hoy, 5), motivo: 'Examen del carné C', estado: 'pendiente', creado: now - 1 * D });
    ausencias.push({ id: 'a4', empId: 'rosa', tipo: 'vacaciones', desde: addDays(hoy, 26), hasta: addDays(hoy, 32), motivo: 'Navidades con la familia', estado: 'pendiente', creado: now - 2 * D });

    const enAusencia = (empId, key) => ausencias.some((a) => a.empId === empId && a.estado === 'aprobada' && key >= a.desde && key <= a.hasta);
    const olvido = { emp: 'rosa', key: addDays(hoy, -3) }; // un día sin fichar la salida
    const sinFichar = { emp: 'antonio', key: addDays(hoy, -6) }; // un turno sin fichar (falta)

    const loc = cfg.local;
    function punto() {
      const ang = rnd() * Math.PI * 2, dist = ri(4, 55);
      return { lat: loc.lat + (dist * Math.cos(ang)) / 111320, lng: loc.lng + (dist * Math.sin(ang)) / (111320 * Math.cos(loc.lat * Math.PI / 180)), dist };
    }
    function push(empId, tipo, ts, extra) {
      if (ts > now) return false;
      const r = rnd(), metodo = r < 0.72 ? 'gps' : r < 0.9 ? 'qr' : 'quiosco';
      const p = metodo === 'gps' ? punto() : {};
      fichajes.push(Object.assign({ id: 'f' + fichajes.length, empId, tipo, ts, metodo, lat: p.lat, lng: p.lng, dist: p.dist }, extra || {}));
      return true;
    }

    for (let i = 42; i >= 0; i--) {
      const key = addDays(hoy, -i);
      const wd = weekday(key);
      const finde = wd === 5 || wd === 6;
      emps.forEach((e) => {
        if (enAusencia(e.id, key)) return;
        if (sinFichar.emp === e.id && sinFichar.key === key) return;
        (e.turnos[wd] || []).forEach((rg, idx) => {
          const tarde = rnd() < 0.06 ? ri(8, 24) : 0;
          const ini = atMin(key, rg[0] + ri(-9, 3) + tarde);
          if (!push(e.id, 'entrada', ini)) return;
          const len = rg[1] - rg[0];
          const extra = finde && rnd() < 0.45 ? ri(15, 55) : ri(-3, 12);
          const fin = atMin(key, rg[1] + extra);
          if (len >= 240 && rnd() < 0.8) {
            const pi = ini + Math.round(len * (0.4 + rnd() * 0.2)) * M;
            const tipo = rnd() < 0.6 ? 'descanso' : 'comida';
            if (push(e.id, 'pausa_inicio', pi, { pausaTipo: tipo })) push(e.id, 'pausa_fin', pi + ri(15, tipo === 'comida' ? 30 : 20) * M);
          }
          if (olvido.emp === e.id && olvido.key === key && idx === 0) return;
          push(e.id, 'salida', fin);
        });
      });
    }

    // Corrección pendiente del olvido de Rosa y una ya aprobada (para el registro de auditoría)
    const rosaTurno = emps.find((e) => e.id === 'rosa').turnos[weekday(olvido.key)][0];
    if (rosaTurno) {
      correcciones.push({ id: 'c1', empId: 'rosa', autorId: 'rosa', creado: dayStart(addDays(hoy, -2)) + 19 * H + 20 * M, accion: 'añadir', tipo: 'salida', ts: atMin(olvido.key, rosaTurno[1] + 5), fecha: olvido.key, motivo: 'Se me olvidó fichar la salida al cerrar; salí a la hora de siempre.', estado: 'pendiente' });
    }
    const viejo = fichajes.find((f) => f.empId === 'kino' && f.tipo === 'entrada' && f.ts < now - 20 * D);
    if (viejo) {
      correcciones.push({ id: 'c0', empId: 'kino', autorId: 'kino', creado: viejo.ts + 3 * H, accion: 'modificar', fichajeId: viejo.id, ts: viejo.ts - 25 * M, fecha: dayKey(viejo.ts), motivo: 'Fiché tarde porque llegué cargado con la harina; ya estaba trabajando desde antes.', estado: 'aprobada', revisorId: 'kp', revisado: viejo.ts + 26 * H, comentario: 'Confirmado, le vi llegar.' });
    }

    fichajes.sort((a, b) => a.ts - b.ts);
    const st = { version: 3, creado: now, config: cfg, empleados: emps, fichajes, correcciones, ausencias };
    rehash(st);
    return st;
  }

  function hashFichaje(f, prev) { return fnv(prev + '|' + f.id + '|' + f.empId + '|' + f.tipo + '|' + f.ts + '|' + f.metodo + '|' + (f.pausaTipo || '')); }
  function hashCorreccion(c, prev) { return fnv(prev + '|' + c.id + '|' + c.empId + '|' + c.autorId + '|' + c.accion + '|' + (c.fichajeId || '') + '|' + (c.tipo || '') + '|' + c.ts + '|' + c.motivo + '|' + c.creado); }
  function rehash(st) {
    let p = '0';
    st.fichajes.forEach((f) => { f.hash = hashFichaje(f, p); p = f.hash; });
    p = '0';
    st.correcciones.forEach((c) => { c.hash = hashCorreccion(c, p); p = c.hash; });
  }

  /* ---------- Persistencia ---------- */
  let S = null;
  const listeners = [];
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
    if (!S || S.version !== 3) { S = generarDemo(Date.now()); save(); }
    return S;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* modo privado */ } listeners.forEach((fn) => fn()); }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { load(); listeners.forEach((fn) => fn()); } });

  /* ---------- Eventos efectivos (fichajes + correcciones aprobadas) ---------- */
  function eventos(empId) {
    const map = new Map();
    S.fichajes.forEach((f) => { if (f.empId === empId) map.set(f.id, Object.assign({}, f)); });
    S.correcciones
      .filter((c) => c.empId === empId && c.estado === 'aprobada')
      .sort((a, b) => a.revisado - b.revisado)
      .forEach((c) => {
        if (c.accion === 'añadir') map.set('c:' + c.id, { id: 'c:' + c.id, empId, tipo: c.tipo, ts: c.ts, metodo: 'correccion', pausaTipo: c.pausaTipo, correccionId: c.id, corregido: true });
        else if (c.accion === 'modificar' && map.has(c.fichajeId)) { const ev = map.get(c.fichajeId); ev.tsOriginal = ev.tsOriginal || ev.ts; ev.ts = c.ts; ev.corregido = true; ev.correccionId = c.id; }
        else if (c.accion === 'anular') map.delete(c.fichajeId);
      });
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }

  /* Agrupa los eventos en sesiones de trabajo (entrada → salida). */
  const LIMITE_ABIERTA = 16 * H;
  function sesiones(empId, now) {
    now = now || Date.now();
    const out = [];
    let s = null;
    const cerrarPausa = (t) => { const p = s.pausas[s.pausas.length - 1]; if (p && !p.fin) p.fin = t; };
    eventos(empId).forEach((ev) => {
      if (ev.tipo === 'entrada') {
        if (s) { s.sinCerrar = true; out.push(s); }
        s = { empId, inicio: ev.ts, fin: null, pausas: [], eventos: [ev], corregido: !!ev.corregido };
      } else if (s) {
        s.eventos.push(ev); if (ev.corregido) s.corregido = true;
        if (ev.tipo === 'pausa_inicio') s.pausas.push({ inicio: ev.ts, fin: null, tipo: ev.pausaTipo || 'descanso' });
        else if (ev.tipo === 'pausa_fin') cerrarPausa(ev.ts);
        else if (ev.tipo === 'salida') { cerrarPausa(ev.ts); s.fin = ev.ts; out.push(s); s = null; }
      }
    });
    if (s) { if (now - s.inicio > LIMITE_ABIERTA) s.sinCerrar = true; else s.abierta = true; out.push(s); }
    out.forEach((x) => {
      x.dia = dayKey(x.inicio);
      const fin = x.fin || (x.abierta ? now : x.inicio);
      x.presencia = Math.max(0, fin - x.inicio);
      const largo = (p) => Math.max(0, (p.fin || (x.abierta ? now : p.inicio)) - p.inicio);
      x.pausaMs = x.pausas.reduce((a, p) => a + largo(p), 0);
      // Si el convenio lo dice, el descanso corto cuenta como trabajo (hasta el máximo configurado)
      const computa = S.config.descansoComputable || 0;
      x.pausaNoComputable = x.pausas.reduce((a, p) => a + (p.tipo === 'descanso' ? Math.max(0, largo(p) - computa * M) : largo(p)), 0);
      x.efectivo = x.sinCerrar ? 0 : Math.max(0, x.presencia - x.pausaNoComputable);
      x.pausaLarga = x.pausas.some((p) => (p.fin || now) - p.inicio >= 15 * M);
    });
    return out;
  }

  function estado(empId, now) {
    now = now || Date.now();
    const ss = sesiones(empId, now);
    const ult = ss[ss.length - 1];
    if (!ult || !ult.abierta) return { estado: 'fuera', sesion: null, desde: ult && ult.fin ? ult.fin : null, sinCerrar: ss.filter((x) => x.sinCerrar) };
    const p = ult.pausas[ult.pausas.length - 1];
    if (p && !p.fin) return { estado: 'pausa', sesion: ult, desde: p.inicio, pausa: p };
    return { estado: 'trabajando', sesion: ult, desde: ult.eventos[ult.eventos.length - 1].ts };
  }

  /* ---------- Turnos y ausencias ---------- */
  const emp = (id) => S.empleados.find((e) => e.id === id);
  function ausenciaDe(empId, key) { return S.ausencias.find((a) => a.empId === empId && a.estado === 'aprobada' && key >= a.desde && key <= a.hasta) || null; }
  function turnosDia(empId, key) { const e = emp(empId); return e ? (e.turnos[weekday(key)] || []) : []; }
  function previstoDia(empId, key) { if (ausenciaDe(empId, key)) return 0; return turnosDia(empId, key).reduce((a, r) => a + (r[1] - r[0]) * M, 0); }
  const horasSemanaPlan = (e) => Object.values(e.turnos).flat().reduce((a, r) => a + (r[1] - r[0]), 0) / 60;

  /* ---------- Resumen por días de un periodo ---------- */
  function resumen(empId, desde, hasta, now) {
    now = now || Date.now();
    const ss = sesiones(empId, now);
    const hoy = dayKey(now);
    const tol = S.config.tolerancia * M;
    const dias = [];
    let tot = { efectivo: 0, previsto: 0, pausas: 0, retrasos: 0, minRetraso: 0, faltas: 0, diasTrab: 0, sinCerrar: 0, corregidos: 0, ausencias: 0 };
    for (let k = desde; k <= hasta; k = addDays(k, 1)) {
      if (k > hoy) break;
      const del = ss.filter((x) => x.dia === k);
      const turnos = turnosDia(empId, k);
      const aus = ausenciaDe(empId, k);
      const prev = previstoDia(empId, k);
      let retraso = 0;
      if (!aus && del.length && turnos.length) {
        const ini = del[0].inicio;
        const cerca = turnos.map((r) => atMin(k, r[0])).sort((a, b) => Math.abs(a - ini) - Math.abs(b - ini))[0];
        if (ini - cerca > tol) retraso = Math.round((ini - cerca) / M);
      }
      const ultimoFin = turnos.length ? atMin(k, turnos[turnos.length - 1][1]) : 0;
      const falta = !aus && turnos.length > 0 && del.length === 0 && (k < hoy ? true : now > atMin(k, turnos[0][0]) + tol && now < ultimoFin ? 'pendiente' : now >= ultimoFin);
      const d = {
        key: k, turnos, ausencia: aus, previsto: prev, sesiones: del,
        efectivo: del.reduce((a, x) => a + x.efectivo, 0),
        pausas: del.reduce((a, x) => a + x.pausaMs, 0),
        retraso, falta: falta === true, faltaHoy: falta === 'pendiente',
        sinCerrar: del.some((x) => x.sinCerrar), corregido: del.some((x) => x.corregido), abierta: del.some((x) => x.abierta)
      };
      dias.push(d);
      tot.efectivo += d.efectivo; tot.previsto += prev; tot.pausas += d.pausas;
      if (retraso) { tot.retrasos++; tot.minRetraso += retraso; }
      if (d.falta) tot.faltas++;
      if (del.length) tot.diasTrab++;
      if (d.sinCerrar) tot.sinCerrar++;
      if (d.corregido) tot.corregidos++;
      if (aus) tot.ausencias++;
    }
    tot.saldo = tot.efectivo - tot.previsto;
    const conTurno = dias.filter((d) => d.turnos.length && !d.ausencia && d.sesiones.length).length;
    tot.puntualidad = conTurno ? Math.round(100 * (conTurno - tot.retrasos) / conTurno) : 100;
    return { dias, tot };
  }

  /* Horas extra del año: exceso semanal sobre las horas de contrato (semanas cerradas + actual). */
  function extrasAnio(empId, now) {
    now = now || Date.now();
    const e = emp(empId);
    const hoy = dayKey(now);
    let k = mondayOf(hoy.slice(0, 4) + '-01-01'), total = 0;
    const desdeDatos = dayKey(S.creado - 43 * D);
    while (k <= hoy) {
      const fin = addDays(k, 6);
      if (fin >= desdeDatos) {
        const r = resumen(empId, k, fin, now);
        const prev = r.tot.previsto ? e.horasContrato * H * (r.tot.previsto / (horasSemanaPlan(e) * H || 1)) : 0;
        total += Math.max(0, r.tot.efectivo - Math.min(prev, e.horasContrato * H));
      }
      k = addDays(k, 7);
    }
    return total;
  }

  function vacacionesUsadas(empId, anio) {
    return S.ausencias.filter((a) => a.empId === empId && a.tipo === 'vacaciones' && a.estado !== 'rechazada' && a.desde.slice(0, 4) === String(anio))
      .reduce((n, a) => n + Math.round((dayStart(a.hasta) - dayStart(a.desde)) / D) + 1, 0);
  }

  /* ---------- Alertas de cumplimiento (Estatuto de los Trabajadores) ---------- */
  function alertas(now, soloEmp) {
    now = now || Date.now();
    const c = S.config;
    const out = [];
    const desde = dayKey(now - 30 * D);
    S.empleados.filter((e) => e.activo && (!soloEmp || e.id === soloEmp)).forEach((e) => {
      const ss = sesiones(e.id, now).filter((x) => x.dia >= desde);
      const pendientes = S.correcciones.filter((q) => q.empId === e.id && q.estado === 'pendiente');
      ss.forEach((x) => {
        if (x.sinCerrar) {
          const tiene = pendientes.some((q) => q.fecha === x.dia);
          out.push({ nivel: 'critico', empId: e.id, dia: x.dia, codigo: 'sin-cerrar', texto: 'Jornada sin fichar la salida' + (tiene ? ' (corrección pendiente)' : '') });
        } else if (!x.abierta && x.presencia > c.pausaObligatoria * H && !x.pausaLarga) {
          out.push({ nivel: 'aviso', empId: e.id, dia: x.dia, codigo: 'sin-pausa', texto: 'Más de ' + c.pausaObligatoria + ' h seguidas sin una pausa de 15 min (art. 34.4 ET)' });
        }
      });
      const porDia = {};
      ss.forEach((x) => { (porDia[x.dia] = porDia[x.dia] || []).push(x); });
      const keys = Object.keys(porDia).sort();
      keys.forEach((k, i) => {
        const ef = porDia[k].reduce((a, x) => a + x.efectivo, 0);
        if (ef > c.horasMaxDia * H) out.push({ nivel: 'aviso', empId: e.id, dia: k, codigo: 'max-dia', texto: 'Más de ' + c.horasMaxDia + ' h de trabajo efectivo en un día (art. 34.3 ET)' });
        const sig = keys[i + 1];
        if (sig && sig === addDays(k, 1)) {
          const finHoy = Math.max(...porDia[k].map((x) => x.fin || 0));
          const iniSig = porDia[sig][0].inicio;
          if (finHoy && iniSig - finHoy < c.descansoEntreJornadas * H) out.push({ nivel: 'aviso', empId: e.id, dia: sig, codigo: 'descanso', texto: 'Menos de ' + c.descansoEntreJornadas + ' h de descanso entre jornadas (art. 34.3 ET)' });
        }
      });
      const ex = extrasAnio(e.id, now) / H;
      if (ex > c.maxExtrasAnio * 0.8) out.push({ nivel: ex > c.maxExtrasAnio ? 'critico' : 'aviso', empId: e.id, dia: dayKey(now), codigo: 'extras', texto: 'Lleva ' + ex.toFixed(1) + ' h extra este año (límite legal ' + c.maxExtrasAnio + ' h, art. 35.2 ET)' });
    });
    return out.sort((a, b) => (a.nivel === b.nivel ? b.dia.localeCompare(a.dia) : a.nivel === 'critico' ? -1 : 1));
  }

  /* ---------- Código rotativo del mostrador (tipo TOTP) ---------- */
  function codigoMostrador(t) {
    const w = Math.floor((t || Date.now()) / (S.config.periodoCodigo * 1000));
    return String(parseInt(fnv(S.config.secreto + ':' + w), 16) % 1000000).padStart(6, '0');
  }
  function validarCodigo(code, t) {
    t = t || Date.now();
    code = String(code).replace(/\D/g, '');
    return code === codigoMostrador(t) || code === codigoMostrador(t - S.config.periodoCodigo * 1000);
  }

  /* ---------- Acciones (futuros endpoints) ---------- */
  const TRANSICIONES = { fuera: ['entrada'], trabajando: ['pausa_inicio', 'salida'], pausa: ['pausa_fin', 'salida'] };

  // POST /api/fichajes
  function fichar(empId, tipo, datos) {
    datos = datos || {};
    const e = emp(empId);
    if (!e || !e.activo) throw new Error('Empleado no válido');
    const st = estado(empId).estado;
    if (!TRANSICIONES[st].includes(tipo)) throw new Error('No puedes registrar «' + TIPOS[tipo].toLowerCase() + '» ahora mismo.');
    const metodo = datos.metodo || 'gps';
    if (metodo === 'gps') {
      if (datos.dist == null) throw new Error('No se ha podido comprobar tu ubicación.');
      if (datos.dist > S.config.radio) throw new Error('Estás a ' + Math.round(datos.dist) + ' m del local. El fichaje solo se permite a menos de ' + S.config.radio + ' m.');
    }
    if (metodo === 'codigo' || metodo === 'qr') { if (!validarCodigo(datos.codigo)) throw new Error('El código del mostrador no es válido o ha caducado.'); }
    const prev = S.fichajes.length ? S.fichajes[S.fichajes.length - 1].hash : '0';
    const f = { id: uid('f'), empId, tipo, ts: Date.now(), metodo, lat: datos.lat, lng: datos.lng, dist: datos.dist != null ? Math.round(datos.dist) : undefined, pausaTipo: tipo === 'pausa_inicio' ? (datos.pausaTipo || 'descanso') : undefined, dispositivo: (navigator.userAgent.match(/Android|iPhone|iPad|Windows|Mac|Linux/) || ['Web'])[0] };
    f.hash = hashFichaje(f, prev);
    S.fichajes.push(f);
    save();
    return f;
  }

  // POST /api/correcciones
  function solicitarCorreccion(c, autorId) {
    if (!c.motivo || c.motivo.trim().length < 5) throw new Error('Explica el motivo de la corrección (mínimo 5 caracteres).');
    const autor = emp(autorId);
    const directa = autor && autor.rol === 'encargado';
    const prev = S.correcciones.length ? S.correcciones[S.correcciones.length - 1].hash : '0';
    const nueva = Object.assign({ id: uid('c'), autorId, creado: Date.now(), estado: directa ? 'aprobada' : 'pendiente' }, c);
    if (directa) { nueva.revisorId = autorId; nueva.revisado = Date.now(); nueva.comentario = 'Corrección hecha por el encargado'; }
    nueva.hash = hashCorreccion(nueva, prev);
    S.correcciones.push(nueva);
    save();
    return nueva;
  }
  // PATCH /api/correcciones/{id}
  function resolverCorreccion(id, aprobar, revisorId, comentario) {
    const c = S.correcciones.find((x) => x.id === id);
    if (!c || c.estado !== 'pendiente') throw new Error('La solicitud ya está resuelta.');
    if (c.empId === revisorId) throw new Error('No puedes aprobar tus propias correcciones.');
    c.estado = aprobar ? 'aprobada' : 'rechazada'; c.revisorId = revisorId; c.revisado = Date.now(); c.comentario = comentario || '';
    save();
  }
  // POST /api/ausencias
  function solicitarAusencia(a, autorId) {
    if (!a.desde || !a.hasta || a.hasta < a.desde) throw new Error('Revisa las fechas: «hasta» no puede ser anterior a «desde».');
    const solapa = S.ausencias.some((x) => x.empId === a.empId && x.estado !== 'rechazada' && !(a.hasta < x.desde || a.desde > x.hasta));
    if (solapa) throw new Error('Ya tienes una ausencia solicitada en esas fechas.');
    const autor = emp(autorId);
    const n = Object.assign({ id: uid('a'), creado: Date.now(), estado: autor && autor.rol === 'encargado' && a.empId !== autorId ? 'aprobada' : 'pendiente' }, a);
    if (n.estado === 'aprobada') { n.revisorId = autorId; n.revisado = Date.now(); }
    S.ausencias.push(n);
    save();
    return n;
  }
  // PATCH /api/ausencias/{id}
  function resolverAusencia(id, aprobar, revisorId, comentario) {
    const a = S.ausencias.find((x) => x.id === id);
    if (!a || a.estado !== 'pendiente') throw new Error('La solicitud ya está resuelta.');
    a.estado = aprobar ? 'aprobada' : 'rechazada'; a.revisorId = revisorId; a.revisado = Date.now(); a.comentario = comentario || '';
    save();
  }
  function cancelarAusencia(id, empId) {
    const i = S.ausencias.findIndex((x) => x.id === id && x.empId === empId && x.estado === 'pendiente');
    if (i < 0) throw new Error('Solo se pueden cancelar solicitudes pendientes.');
    S.ausencias.splice(i, 1); save();
  }

  // GET /api/integridad
  function verificarIntegridad() {
    let p = '0', rotos = [];
    S.fichajes.forEach((f) => { if (hashFichaje(f, p) !== f.hash) rotos.push(f.id); p = f.hash; });
    p = '0';
    S.correcciones.forEach((c) => { if (hashCorreccion(c, p) !== c.hash) rotos.push(c.id); p = c.hash; });
    return { ok: rotos.length === 0, total: S.fichajes.length + S.correcciones.length, rotos };
  }

  function guardarEmpleado(e) {
    if (!e.nombre || !/^\d{4}$/.test(e.pin)) throw new Error('El nombre es obligatorio y el PIN debe tener 4 cifras.');
    if (S.empleados.some((x) => x.pin === e.pin && x.id !== e.id)) throw new Error('Ese PIN ya lo usa otra persona.');
    const i = S.empleados.findIndex((x) => x.id === e.id);
    if (i >= 0) S.empleados[i] = Object.assign(S.empleados[i], e);
    else S.empleados.push(Object.assign({ id: uid('e'), activo: true, color: '#5E4B40', turnos: semana([]) }, e));
    save();
  }
  function guardarConfig(c) { Object.assign(S.config, c); save(); }
  function reiniciar() { S = generarDemo(Date.now()); save(); }

  load();

  window.Fichaje = {
    // utilidades
    H, M, D, dayKey, dayStart, addDays, weekday, atMin, mondayOf, haversine, hm, fnv,
    TIPOS, PAUSAS, METODOS, AUSENCIAS,
    get state() { return S; },
    onChange(fn) { listeners.push(fn); },
    // consultas
    empleado: emp, eventos, sesiones, estado, resumen, alertas, turnosDia, previstoDia, ausenciaDe, horasSemanaPlan,
    extrasAnio, vacacionesUsadas, codigoMostrador, validarCodigo, verificarIntegridad,
    // acciones
    fichar, solicitarCorreccion, resolverCorreccion, solicitarAusencia, resolverAusencia, cancelarAusencia,
    guardarEmpleado, guardarConfig, reiniciar,
    exportarJSON: () => JSON.stringify(S, null, 2)
  };
})();
