/* ==========================================================================
   Pizzeria Napoles · Motor de ilustraciones SVG
   Genera pizzas (y otros platos) 100 % vectoriales a partir de datos.
   No necesita imágenes externas: todo se dibuja en el navegador.
   ========================================================================== */
(function (global) {
  'use strict';

  let uid = 0;

  /* Generador pseudoaleatorio determinista (misma semilla = misma pizza) */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* Contorno irregular (masa hecha a mano) */
  function blobPath(r, cx, cy, radius, wobble, points) {
    const pts = [];
    const off = r() * 10;
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const rr = radius + Math.sin(a * 3 + off) * wobble * 0.6 + (r() - 0.5) * wobble;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      d += (i === 0 ? 'M' + mx.toFixed(1) + ',' + my.toFixed(1) : '') +
        ' Q' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' ' +
        ((p1[0] + pts[(i + 2) % pts.length][0]) / 2).toFixed(1) + ',' +
        ((p1[1] + pts[(i + 2) % pts.length][1]) / 2).toFixed(1);
    }
    return d + 'Z';
  }

  /* Reparto en espiral de girasol: natural y sin amontonarse */
  function spread(r, n, radius) {
    const pts = [];
    const offset = r() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.6) / (n + 0.2);
      const d = Math.sqrt(t) * radius;
      const a = i * 2.39996 + offset;
      pts.push([
        100 + Math.cos(a) * d + (r() - 0.5) * 7,
        100 + Math.sin(a) * d + (r() - 0.5) * 7,
        Math.round(r() * 360)
      ]);
    }
    return pts;
  }

  /* --------- Formas de cada ingrediente (centradas en 0,0) --------- */
  const SHAPES = {
    pepperoni: function () {
      return '<circle r="9.5" fill="#9E1B1B"/><circle r="8" fill="#C0392B"/>' +
        '<circle cx="-3" cy="-2" r="1.3" fill="#7d1410"/><circle cx="3" cy="2.5" r="1.1" fill="#7d1410"/>' +
        '<circle cx="2" cy="-4" r="0.9" fill="#E8735A"/><circle cx="-2.5" cy="4" r="1" fill="#E8735A"/>';
    },
    salami: function () {
      return '<circle r="9" fill="#8E1B1B"/><circle r="7.6" fill="#B0332A"/>' +
        '<circle cx="-2" cy="-3" r="1.6" fill="#F3D9C8"/><circle cx="3" cy="1" r="1.4" fill="#F3D9C8"/><circle cx="-3" cy="3.5" r="1.1" fill="#F3D9C8"/>';
    },
    nduja: function () {
      return '<path d="M-7,-3 C-6,-9 4,-9 7,-4 C10,1 5,8 -1,7 C-7,6 -9,2 -7,-3Z" fill="#B3261E"/>' +
        '<path d="M-3,-3 C-2,-5 2,-5 3,-2" stroke="#E8735A" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    },
    salchicha: function () {
      return '<path d="M-6,-2 C-6,-7 2,-8 5,-4 C8,0 4,6 -1,5 C-5,4 -6,1 -6,-2Z" fill="#8A5A3C"/>' +
        '<circle cx="-1" cy="-2" r="1.2" fill="#A97452"/><circle cx="2" cy="1.5" r="1" fill="#6B4129"/>';
    },
    jamon: function () {
      return '<rect x="-7" y="-5.5" width="14" height="11" rx="3" fill="#E79A98"/>' +
        '<path d="M-6,0 C-2,-2 2,2 6,-1" stroke="#F6C9C4" stroke-width="2" fill="none" stroke-linecap="round"/>';
    },
    mortadela: function () {
      return '<circle r="10" fill="#F0A7A3"/><circle r="8.5" fill="#F4B8B3"/>' +
        '<circle cx="-3" cy="-2" r="1.2" fill="#FFF4E0"/><circle cx="3" cy="3" r="1" fill="#FFF4E0"/><circle cx="2" cy="-4" r="0.9" fill="#FFF4E0"/>' +
        '<circle cx="-4" cy="3" r="0.8" fill="#6fa34a"/>';
    },
    prosciutto: function () {
      return '<path d="M-11,-2 C-7,-8 -2,4 2,-3 C5,-8 9,0 12,-3 L11,3 C8,6 5,-2 2,3 C-2,9 -7,-3 -11,4Z" fill="#D9686A" opacity=".95"/>' +
        '<path d="M-10,1 C-6,-3 -2,6 2,0 C5,-4 8,2 11,0" stroke="#F4C2C2" stroke-width="1.2" fill="none"/>';
    },
    anchoa: function () {
      return '<path d="M-11,0 C-6,-3.5 6,-3.5 10,0 C6,3.5 -6,3.5 -11,0Z" fill="#7C5E4A"/>' +
        '<path d="M-9,0 L9,0" stroke="#A68A73" stroke-width="1"/>';
    },
    champinon: function () {
      return '<path d="M-8.5,1 A8.5,7.5 0 0 1 8.5,1 Z" fill="#D8C2A2"/>' +
        '<rect x="-3" y="0" width="6" height="7" rx="2" fill="#EFE2CC"/>' +
        '<path d="M-6,1 L6,1" stroke="#B59C7A" stroke-width="1.2"/>';
    },
    seta: function () {
      return '<path d="M-9,0 C-9,-7 9,-7 9,0 C5,2 -5,2 -9,0Z" fill="#8B6B4A"/>' +
        '<path d="M-2,1 L-1,8 L2,8 L2,1Z" fill="#E9DCC5"/>';
    },
    aceituna: function () {
      return '<circle r="4.4" fill="none" stroke="#2A1F1A" stroke-width="3.2"/>';
    },
    aceitunaVerde: function () {
      return '<circle r="4.4" fill="none" stroke="#6B7F2A" stroke-width="3.2"/><circle r="1.6" fill="#D62828"/>';
    },
    tomate: function () {
      return '<circle r="8.5" fill="#D62828"/><circle r="6.6" fill="#EE5A42"/>' +
        '<g fill="#F7C95C"><ellipse cx="0" cy="-3.6" rx="1" ry="1.8"/><ellipse cx="3.4" cy="1.8" rx="1" ry="1.8" transform="rotate(120 3.4 1.8)"/><ellipse cx="-3.4" cy="1.8" rx="1" ry="1.8" transform="rotate(-120 -3.4 1.8)"/></g>' +
        '<circle r="1.4" fill="#F59A80"/>';
    },
    cherry: function () {
      return '<circle r="6" fill="#D62828"/><circle cx="-2" cy="-2" r="1.6" fill="#F07D6A"/>';
    },
    cebolla: function () {
      return '<path d="M-9,1 A9,9 0 0 1 9,1" stroke="#9C4F8E" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M-5.5,1 A5.5,5.5 0 0 1 5.5,1" stroke="#C07AB5" stroke-width="2" fill="none" stroke-linecap="round"/>';
    },
    pimiento: function () {
      return '<path d="M-9,2 C-6,-6 6,-6 9,2" stroke="#2D6A4F" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
    },
    pimientoRojo: function () {
      return '<path d="M-9,2 C-6,-6 6,-6 9,2" stroke="#D62828" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
    },
    jalapeno: function () {
      return '<circle r="5.2" fill="#4C9A2A"/><circle r="3.6" fill="#B9DB8B"/><circle cx="-1" cy="0" r=".8" fill="#FFF4E0"/><circle cx="1.2" cy="1" r=".8" fill="#FFF4E0"/>';
    },
    pina: function () {
      return '<path d="M0,-8 L8,6 L-8,6Z" fill="#F7C95C" stroke="#E9A23B" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M-3,2 L3,2" stroke="#E9A23B" stroke-width="1"/>';
    },
    maiz: function () {
      return '<circle cx="-3" cy="0" r="2.3" fill="#F5C518"/><circle cx="2" cy="-2" r="2.3" fill="#F7D046"/><circle cx="1.5" cy="3" r="2.2" fill="#F5C518"/>';
    },
    albahaca: function () {
      return '<path d="M0,-10 C7,-5 7,5 0,10 C-7,5 -7,-5 0,-10Z" fill="#2D6A4F"/>' +
        '<path d="M0,-8 L0,8" stroke="#1E4D38" stroke-width="1.1"/>' +
        '<path d="M0,-2 L3,-5 M0,2 L-3,-1" stroke="#1E4D38" stroke-width=".8"/>';
    },
    rucula: function () {
      return '<path d="M-10,0 L-6,-3 L-5,0 L-1,-4 L0,-1 L4,-4 L5,-1 L9,-2 L10,0 L6,2 L4,4 L1,1 L-1,4 L-4,1 L-6,4Z" fill="#4E8F3A"/>' +
        '<path d="M-9,0 L9,-0.6" stroke="#376A28" stroke-width=".8"/>';
    },
    friarielli: function () {
      return '<path d="M-9,-2 C-4,-7 4,-7 9,-1 C4,1 4,6 -1,5 C-5,4 -8,2 -9,-2Z" fill="#3E6B2B"/>' +
        '<path d="M-7,-1 L7,-1" stroke="#5F8F3E" stroke-width="1"/>';
    },
    alcachofa: function () {
      return '<path d="M0,-8 C6,-6 8,2 0,8 C-8,2 -6,-6 0,-8Z" fill="#9FB46A"/>' +
        '<path d="M0,-5 C3,-3 4,2 0,5 C-4,2 -3,-3 0,-5Z" fill="#C9D69A"/>';
    },
    burrata: function () {
      return '<circle r="13" fill="#FFFDF5"/><circle cx="-3" cy="-3" r="6" fill="#ffffff"/>' +
        '<path d="M-7,5 C-3,8 4,8 8,3" stroke="#EADBC3" stroke-width="1.4" fill="none"/>';
    },
    parmesano: function () {
      return '<path d="M-5,-3 L5,-4 L3,3 L-4,4Z" fill="#F3E3B5"/><path d="M-1,-2 L3,-2" stroke="#E2CC8B" stroke-width="1"/>';
    },
    ajo: function () {
      return '<ellipse rx="4" ry="2.8" fill="#FBF3E1"/><ellipse rx="2.2" ry="1.3" fill="#F2E3C0"/>';
    },
    pistacho: function () {
      return '<circle cx="-2" cy="-1" r="1.6" fill="#8DB255"/><circle cx="2" cy="1" r="1.4" fill="#A6C46A"/><circle cx="0" cy="3" r="1.2" fill="#6E9B3A"/>';
    },
    oregano: function () {
      return '<circle cx="-2" cy="0" r=".9" fill="#5A6B2A"/><circle cx="2" cy="-1" r=".8" fill="#5A6B2A"/><circle cx="0" cy="2" r=".8" fill="#6F7F35"/>';
    },
    miel: function () {
      return '<path d="M-10,-2 C-5,3 0,-5 5,0 C8,3 10,0 11,-1" stroke="#E9A23B" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".9"/>';
    },
    nutella: function () {
      return '<path d="M-9,-1 C-4,4 1,-5 6,0 C8,2 10,0 11,-1" stroke="#4A2C1E" stroke-width="3" fill="none" stroke-linecap="round"/>';
    },
    bacon: function () {
      return '<path d="M-11,-2 C-7,-6 -3,2 1,-2 C5,-6 8,0 11,-2 L11,3 C8,5 5,-1 1,3 C-3,7 -7,-1 -11,3Z" fill="#B9473C"/>' +
        '<path d="M-10,0.5 C-7,-2 -3,4 1,0.5 C5,-3 8,2.5 10,0.5" stroke="#F2C1A8" stroke-width="1.3" fill="none"/>';
    },
    chorizo: function () {
      return '<circle r="8.5" fill="#A8321C"/><circle r="7" fill="#C94B28"/>' +
        '<circle cx="-2.5" cy="-2" r="1.3" fill="#F3C9A0"/><circle cx="2.5" cy="2" r="1.1" fill="#F3C9A0"/><circle cx="2" cy="-3" r=".8" fill="#F3C9A0"/>';
    },
    pollo: function () {
      return '<path d="M-7,-4 C-3,-8 5,-7 7,-2 C9,3 4,7 -1,6 C-6,5 -9,0 -7,-4Z" fill="#E2B477"/>' +
        '<path d="M-4,-3 C-1,-5 3,-4 4,-1" stroke="#F5D9AE" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    },
    salchicha: function () {
      return '<circle r="6.5" fill="#A85A40"/><circle r="5.2" fill="#D98A6A"/><circle cx="-1.5" cy="-1" r="1" fill="#F0B79C"/>';
    },
    ternera: function () {
      return '<path d="M-6,-2 C-6,-7 2,-8 5,-4 C8,0 4,6 -1,5 C-5,4 -6,1 -6,-2Z" fill="#6B4129"/>' +
        '<circle cx="-1" cy="-2" r="1.2" fill="#8A5A3C"/><circle cx="2" cy="1.5" r="1" fill="#4A2A17"/>';
    },
    taco: function () {
      return '<path d="M-5,-3 C-3,-7 4,-6 5,-2 C7,2 2,6 -2,4 C-6,3 -7,0 -5,-3Z" fill="#8E3B1F"/>' +
        '<circle cx="-1" cy="-1" r="1" fill="#C0602F"/><circle cx="2" cy="2" r=".9" fill="#5A2410"/>';
    },
    atun: function () {
      return '<path d="M-7,-3 C-3,-6 4,-5 7,-1 C5,3 -2,5 -7,2Z" fill="#D7B597"/>' +
        '<path d="M-4,-1 L4,-2 M-3,1.5 L3,1" stroke="#B8926F" stroke-width=".9"/>';
    },
    gambas: function () {
      return '<path d="M-6,4 C-9,-4 0,-9 6,-4 C9,-1 7,4 2,3" stroke="#F0845F" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
        '<path d="M-4,-2 L-2,0 M0,-5 L1,-2 M4,-4 L3,-1" stroke="#FBC2A8" stroke-width="1"/>';
    },
    alcaparras: function () {
      return '<circle cx="-3" cy="-1" r="2.1" fill="#6B7F2A"/><circle cx="2" cy="-2.5" r="1.9" fill="#7E9334"/><circle cx="0.5" cy="2.5" r="2" fill="#5D7025"/>';
    },
    cebollaCaram: function () {
      return '<path d="M-9,1 C-6,-6 6,-6 9,1" stroke="#8A4B1F" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M-5,3 C-3,-2 3,-2 5,3" stroke="#B26A2E" stroke-width="2" fill="none" stroke-linecap="round"/>';
    },
    esparragos: function () {
      return '<path d="M-10,1 L7,-1" stroke="#6E9B3A" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="8.5" cy="-1.2" rx="3" ry="2.4" fill="#4F7F2B"/>';
    },
    patatas: function () {
      return '<rect x="-9" y="-2.5" width="16" height="4" rx="1.5" fill="#F5C518" transform="rotate(-12)"/>' +
        '<rect x="-6" y="1.5" width="14" height="4" rx="1.5" fill="#E9B416" transform="rotate(10)"/>';
    },
    roquefort: function () {
      return '<path d="M-5,-4 L4,-5 L6,2 L-1,5 L-6,1Z" fill="#EEF0E6"/><circle cx="-2" cy="-1" r="1" fill="#5C7FA3"/><circle cx="2" cy="1" r=".9" fill="#5C7FA3"/><circle cx="1" cy="-3" r=".7" fill="#7A97B5"/>';
    },
    cabra: function () {
      return '<circle r="8" fill="#F3EDDC"/><circle r="6.2" fill="#FFFDF7"/><circle cx="-2" cy="-1.5" r="1.4" fill="#F1EADA"/>';
    },
    huevo: function () {
      return '<path d="M-9,0 C-9,-7 -2,-9 3,-7 C9,-5 10,3 5,7 C0,10 -9,7 -9,0Z" fill="#FFFFFF"/><circle cx="0" cy="0" r="4.2" fill="#F7B500"/><circle cx="-1.2" cy="-1.2" r="1.2" fill="#FFD866"/>';
    },
    nata: function () {
      return '<path d="M-10,-2 C-5,3 0,-5 5,0 C8,3 10,0 11,-1" stroke="#FFF8EA" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    },
    bbq: function () {
      return '<path d="M-10,-2 C-5,3 0,-5 5,0 C8,3 10,0 11,-1" stroke="#5A2E1A" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    },
    /* solo iconos (no se dibujan sobre la pizza) */
    dobleQueso: function () {
      return '<path d="M-10,5 L10,5 L10,-2 L-10,-6Z" fill="#F7C95C"/><path d="M-10,-6 L10,-2 L4,-8Z" fill="#FBDA85"/><circle cx="-4" cy="1" r="1.6" fill="#E9A23B"/><circle cx="4" cy="2" r="1.3" fill="#E9A23B"/>';
    },
    dobleSalsa: function () {
      return '<path d="M0,-10 C5,-3 8,1 8,4 C8,9 4,11 0,11 C-4,11 -8,9 -8,4 C-8,1 -5,-3 0,-10Z" fill="#D62828"/><circle cx="-3" cy="4" r="2" fill="#EE5A42"/>';
    },
    dobleMasa: function () {
      return '<ellipse cx="0" cy="2" rx="11" ry="7" fill="#F2C27B"/><ellipse cx="-2" cy="0" rx="6" ry="3" fill="#F8DDAF"/>';
    },
    fresa: function () {
      return '<path d="M0,8 C-7,3 -7,-5 0,-6 C7,-5 7,3 0,8Z" fill="#D62828"/><path d="M-3,-6 L0,-9 L3,-6" stroke="#2D6A4F" stroke-width="2" fill="none"/>' +
        '<circle cx="-2" cy="0" r=".6" fill="#F7C95C"/><circle cx="2" cy="2" r=".6" fill="#F7C95C"/>';
    }
  };

  /* Cantidad por defecto de cada ingrediente en una pizza */
  const COUNT = {
    pepperoni: 9, salami: 9, nduja: 7, salchicha: 10, jamon: 8, mortadela: 6, prosciutto: 6,
    anchoa: 6, champinon: 9, seta: 8, aceituna: 10, aceitunaVerde: 9, tomate: 7, cherry: 9,
    cebolla: 9, pimiento: 9, pimientoRojo: 8, jalapeno: 10, pina: 9, maiz: 12, albahaca: 6,
    rucula: 14, friarielli: 9, alcachofa: 7, burrata: 1, parmesano: 12, ajo: 10, pistacho: 14,
    oregano: 22, miel: 4, nutella: 6, fresa: 8,
    bacon: 7, chorizo: 9, pollo: 10, ternera: 11, taco: 12, atun: 10, gambas: 7, alcaparras: 10,
    cebollaCaram: 9, esparragos: 7, patatas: 8, roquefort: 10, cabra: 6, huevo: 3, nata: 4, bbq: 4
  };

  const SAUCES = {
    tomate: ['#C8321F', '#E0482F'],
    bianca: ['#F1E2C4', '#FBF1DC'],
    pesto: ['#4F7F2B', '#6E9B3A'],
    pistacho: ['#7FA04A', '#A6C46A'],
    nutella: ['#4A2C1E', '#6B4129'],
    trufa: ['#D9C8A4', '#EADBBE'],
    ninguna: ['#EDBB74', '#F2C98A']
  };
  const CHEESES = {
    mozzarella: { color: '#FFF6DD', n: 11, size: 13 },
    bufala: { color: '#FFFFFF', n: 7, size: 15 },
    provola: { color: '#F6DFA7', n: 10, size: 13 },
    vegano: { color: '#F2E2B0', n: 10, size: 12 },
    doble: { color: '#FFF6DD', n: 17, size: 15 },
    ninguno: null
  };

  /**
   * Dibuja una pizza.
   * opts: { toppings:[], sauce, cheese, seed, crust ('napolitana'|'integral'|'singluten'), animateNew:[] }
   */
  function pizza(opts) {
    opts = opts || {};
    const id = 'pz' + (++uid);
    const seedStr = String(opts.seed || 'napoles');
    const r = rng(hash(seedStr));
    const sauce = opts.extraSauce ? ['#A8261A', '#D63E26'] : (SAUCES[opts.sauce || 'tomate'] || SAUCES.tomate);
    const cheese = CHEESES[opts.cheese === undefined ? 'mozzarella' : opts.cheese];
    const crustCols = {
      napolitana: ['#F0B865', '#C9772E', '#F6CF8E'],
      integral: ['#C99A63', '#8F5E31', '#D9AE7A'],
      singluten: ['#F3CF8A', '#D49A4C', '#F8DFA8']
    }[opts.crust || 'napolitana'];
    const animateNew = opts.animateNew || [];

    let s = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="pizza-svg" aria-hidden="true" focusable="false">';
    s += '<defs>' +
      '<radialGradient id="' + id + 'c" cx="50%" cy="45%" r="55%">' +
      '<stop offset="70%" stop-color="' + crustCols[0] + '"/><stop offset="100%" stop-color="' + crustCols[1] + '"/></radialGradient>' +
      '<radialGradient id="' + id + 's" cx="45%" cy="40%" r="65%">' +
      '<stop offset="0%" stop-color="' + sauce[1] + '"/><stop offset="100%" stop-color="' + sauce[0] + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'g" cx="35%" cy="30%" r="70%">' +
      '<stop offset="0%" stop-color="#fff" stop-opacity=".35"/><stop offset="60%" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '</defs>';

    // Corteza (cornicione) con burbujas tostadas
    s += '<path d="' + blobPath(r, 100, 100, 95, 4, 26) + '" fill="url(#' + id + 'c)"/>';
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2;
      const d = 86 + r() * 8;
      s += '<ellipse cx="' + (100 + Math.cos(a) * d).toFixed(1) + '" cy="' + (100 + Math.sin(a) * d).toFixed(1) +
        '" rx="' + (2 + r() * 4).toFixed(1) + '" ry="' + (1.5 + r() * 2.5).toFixed(1) + '" fill="#4a2a17" opacity="' + (0.25 + r() * 0.45).toFixed(2) +
        '" transform="rotate(' + Math.round(a * 57.3) + ' ' + (100 + Math.cos(a) * d).toFixed(1) + ' ' + (100 + Math.sin(a) * d).toFixed(1) + ')"/>';
    }
    // Base interior
    s += '<path d="' + blobPath(r, 100, 100, opts.thick ? 76 : 82, 3, 22) + '" fill="' + crustCols[2] + '"/>';
    // Salsa
    if (opts.sauce !== 'ninguna') {
      s += '<path d="' + blobPath(r, 100, 100, opts.thick ? 72 : 78, 5, 30) + '" fill="url(#' + id + 's)"/>';
    }
    // Queso
    if (cheese) {
      const pts = spread(r, cheese.n, 58);
      s += '<g class="pz-cheese">';
      pts.forEach(function (p) {
        const rad = cheese.size * (0.7 + r() * 0.5);
        s += '<path d="' + blobPath(r, p[0], p[1], rad, rad * 0.35, 9) + '" fill="' + cheese.color + '" opacity=".95"/>';
      });
      s += '</g>';
    }
    // Ingredientes
    (opts.toppings || []).forEach(function (t, ti) {
      const shape = SHAPES[t];
      if (!shape) return;
      const tr = rng(hash(seedStr + t));
      const n = t === 'burrata' ? 1 : (COUNT[t] || 8);
      const pts = t === 'burrata' ? [[100, 100, 0]] : spread(tr, n, 62);
      const isNew = animateNew.indexOf(t) !== -1;
      s += '<g class="tp' + (isNew ? ' tp--drop' : '') + '" data-t="' + t + '">';
      pts.forEach(function (p, i) {
        const sc = 0.85 + tr() * 0.35;
        s += '<g transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ') rotate(' + p[2] + ') scale(' + sc.toFixed(2) + ')">' +
          '<g class="tp-i" style="--i:' + i + '">' + shape() + '</g></g>';
      });
      s += '</g>';
    });
    // Brillo de aceite
    s += '<circle cx="100" cy="100" r="80" fill="url(#' + id + 'g)"/>';
    s += '</svg>';
    return s;
  }

  /* --------- Otros platos (entrantes, postres, bebidas) --------- */
  function plate(inner, bg) {
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="pizza-svg" aria-hidden="true" focusable="false">' +
      '<circle cx="100" cy="104" r="92" fill="#2A1F1A" opacity=".12"/>' +
      '<circle cx="100" cy="100" r="92" fill="' + (bg || '#FFFDF7') + '"/>' +
      '<circle cx="100" cy="100" r="74" fill="none" stroke="#EADBC3" stroke-width="2"/>' + inner + '</svg>';
  }
  function glass(inner) {
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="pizza-svg" aria-hidden="true" focusable="false">' +
      '<circle cx="100" cy="100" r="92" fill="#F7C95C" opacity=".35"/>' + inner + '</svg>';
  }

  const DISHES = {
    panAjo: function () {
      let g = '';
      for (let i = 0; i < 4; i++) {
        const x = 58 + i * 28, rot = -12 + i * 8;
        g += '<g transform="rotate(' + rot + ' ' + x + ' 100)"><rect x="' + (x - 14) + '" y="62" width="28" height="78" rx="11" fill="#E0A458"/>' +
          '<rect x="' + (x - 10) + '" y="67" width="20" height="68" rx="8" fill="#F6D9A0"/>' +
          '<circle cx="' + (x - 3) + '" cy="85" r="2" fill="#2D6A4F"/><circle cx="' + (x + 4) + '" cy="105" r="2" fill="#2D6A4F"/><circle cx="' + x + '" cy="122" r="2" fill="#2D6A4F"/></g>';
      }
      return plate(g);
    },
    burrata: function () {
      return plate('<circle cx="72" cy="120" r="14" fill="#D62828"/><circle cx="130" cy="126" r="13" fill="#E0482F"/><circle cx="135" cy="76" r="12" fill="#D62828"/>' +
        '<circle cx="100" cy="98" r="36" fill="#FFFFFF"/><circle cx="90" cy="88" r="14" fill="#FFFDF5"/>' +
        '<path d="M84,96 C95,110 112,108 120,96" stroke="#9E7B3A" stroke-width="3" fill="none" opacity=".5"/>' +
        '<path d="M70,70 C80,62 92,66 96,58" stroke="#2D6A4F" stroke-width="7" stroke-linecap="round" fill="none"/>' +
        '<path d="M60,98 C66,104 60,112 70,116" stroke="#E9A23B" stroke-width="2.5" fill="none"/>');
    },
    croquetas: function () {
      let g = '';
      [[70, 80, -20], [110, 70, 15], [140, 110, -5], [95, 120, 30], [60, 125, 5]].forEach(function (p) {
        g += '<g transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')"><ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="24" ry="14" fill="#B86B2B"/>' +
          '<ellipse cx="' + (p[0] - 4) + '" cy="' + (p[1] - 4) + '" rx="14" ry="6" fill="#D98E45"/></g>';
      });
      return plate(g + '<circle cx="128" cy="150" r="10" fill="#FFF4E0" stroke="#E9A23B" stroke-width="3"/>');
    },
    caprese: function () {
      let g = '';
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const x = 100 + Math.cos(a) * 45, y = 100 + Math.sin(a) * 45;
        g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="20" fill="' + (i % 2 ? '#FFFFFF' : '#D62828') + '"/>';
        if (i % 2 === 0) g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="13" fill="#EE5A42"/>';
      }
      g += '<path d="M90,90 C100,78 112,82 112,100 C100,108 90,104 90,90Z" fill="#2D6A4F"/><path d="M98,100 C88,112 96,120 108,116" fill="#3E8A62"/>';
      return plate(g);
    },
    arancini: function () {
      let g = '';
      [[78, 92], [122, 88], [100, 126]].forEach(function (p) {
        g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="26" fill="#C8792E"/><circle cx="' + (p[0] - 8) + '" cy="' + (p[1] - 8) + '" r="9" fill="#E9A23B"/>';
        for (let i = 0; i < 8; i++) g += '<circle cx="' + (p[0] - 15 + (i * 7) % 30) + '" cy="' + (p[1] - 10 + (i * 11) % 24) + '" r="1.6" fill="#8E4F1A"/>';
      });
      return plate(g + '<path d="M60,60 C70,50 80,56 84,48" stroke="#2D6A4F" stroke-width="6" stroke-linecap="round" fill="none"/>');
    },
    tiramisu: function () {
      return plate('<g transform="rotate(-8 100 100)"><rect x="55" y="62" width="90" height="80" rx="6" fill="#F1E2C4"/>' +
        '<rect x="55" y="62" width="90" height="16" rx="6" fill="#6B4129"/><rect x="55" y="92" width="90" height="10" fill="#8A5A3C"/>' +
        '<rect x="55" y="118" width="90" height="10" fill="#8A5A3C"/>' +
        '<circle cx="70" cy="70" r="2" fill="#3B2418"/><circle cx="95" cy="68" r="2" fill="#3B2418"/><circle cx="125" cy="72" r="2" fill="#3B2418"/></g>' +
        '<path d="M140,52 C148,44 156,48 160,40" stroke="#2D6A4F" stroke-width="6" stroke-linecap="round" fill="none"/>');
    },
    cannoli: function () {
      let g = '';
      [[-25, 82], [20, 118]].forEach(function (p) {
        g += '<g transform="rotate(' + p[0] + ' 100 ' + p[1] + ')"><rect x="48" y="' + (p[1] - 16) + '" width="104" height="32" rx="16" fill="#C8792E"/>' +
          '<ellipse cx="48" cy="' + p[1] + '" rx="9" ry="16" fill="#FFF8EC"/><ellipse cx="152" cy="' + p[1] + '" rx="9" ry="16" fill="#FFF8EC"/>' +
          '<circle cx="44" cy="' + (p[1] - 4) + '" r="2.5" fill="#6E9B3A"/><circle cx="156" cy="' + (p[1] + 3) + '" r="2.5" fill="#6E9B3A"/>' +
          '<path d="M66,' + (p[1] - 8) + ' L134,' + (p[1] - 8) + '" stroke="#E9A23B" stroke-width="3" stroke-linecap="round"/></g>';
      });
      return plate(g);
    },
    gelato: function () {
      return plate('<path d="M64,104 L136,104 L124,150 L76,150Z" fill="#9E1B1B"/>' +
        '<circle cx="82" cy="94" r="22" fill="#F6D7A7"/><circle cx="118" cy="94" r="22" fill="#A6C46A"/><circle cx="100" cy="70" r="22" fill="#F4B8B3"/>' +
        '<path d="M120,60 L142,40" stroke="#E9A23B" stroke-width="7" stroke-linecap="round"/>');
    },
    pizzaDulce: function () {
      return pizza({ toppings: ['nutella', 'fresa'], sauce: 'nutella', cheese: 'ninguno', seed: 'dulce' });
    },
    limonada: function () {
      return glass('<path d="M66,46 L134,46 L124,160 L76,160Z" fill="#FFFDF5" opacity=".9" stroke="#2A1F1A" stroke-width="3"/>' +
        '<path d="M70,70 L130,70 L123,156 L77,156Z" fill="#F7E58A"/>' +
        '<circle cx="134" cy="52" r="18" fill="#F7C95C" stroke="#E9A23B" stroke-width="3"/><path d="M134,36 L134,68 M118,52 L150,52" stroke="#E9A23B" stroke-width="2"/>' +
        '<rect x="88" y="86" width="16" height="14" rx="3" fill="#fff" opacity=".7"/><rect x="104" y="110" width="14" height="13" rx="3" fill="#fff" opacity=".7"/>' +
        '<path d="M80,30 L95,120" stroke="#2D6A4F" stroke-width="5" stroke-linecap="round"/><path d="M86,64 C96,56 104,62 108,54" stroke="#2D6A4F" stroke-width="6" stroke-linecap="round" fill="none"/>');
    },
    refresco: function () {
      return glass('<rect x="78" y="40" width="44" height="124" rx="10" fill="#D62828"/><rect x="78" y="40" width="44" height="12" rx="4" fill="#C9C9C9"/>' +
        '<rect x="78" y="80" width="44" height="40" fill="#FFF4E0"/><text x="100" y="105" text-anchor="middle" font-family="Georgia,serif" font-size="15" font-weight="700" fill="#9E1B1B">COLA</text>');
    },
    cerveza: function () {
      return glass('<path d="M70,56 L130,56 L124,164 L76,164Z" fill="#E9A23B"/><path d="M66,44 C70,30 90,32 96,38 C104,28 124,30 134,46 L130,60 L70,60Z" fill="#FFFDF5"/>' +
        '<path d="M130,80 C152,80 152,130 128,130" stroke="#2A1F1A" stroke-width="7" fill="none" opacity=".25"/>' +
        '<circle cx="90" cy="100" r="2.5" fill="#FFF4E0"/><circle cx="104" cy="126" r="2" fill="#FFF4E0"/><circle cx="96" cy="146" r="2.5" fill="#FFF4E0"/>');
    },
    vino: function () {
      return glass('<path d="M68,40 L132,40 C134,90 118,108 100,108 C82,108 66,90 68,40Z" fill="#FFFDF5" stroke="#2A1F1A" stroke-width="3"/>' +
        '<path d="M70,68 L130,68 C128,96 116,106 100,106 C84,106 72,96 70,68Z" fill="#9E1B1B"/>' +
        '<path d="M100,108 L100,152 M78,156 L122,156" stroke="#2A1F1A" stroke-width="5" stroke-linecap="round"/>');
    },
    agua: function () {
      return glass('<path d="M84,30 L116,30 L116,48 C134,58 132,72 132,82 L132,160 C132,166 128,168 122,168 L78,168 C72,168 68,166 68,160 L68,82 C68,72 66,58 84,48Z" fill="#CDE7F0" stroke="#2A1F1A" stroke-width="3"/>' +
        '<rect x="84" y="22" width="32" height="12" rx="3" fill="#2D6A4F"/><rect x="68" y="98" width="64" height="34" fill="#FFF4E0"/>' +
        '<text x="100" y="120" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="#2D6A4F">ACQUA</text>');
    }
  };

  /* ---- Platos de la carta de Chipiona ---- */
  function lettuce(x, y, s) {
    return '<path transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')" d="M-14,0 C-12,-6 -6,-4 -4,-8 C-1,-4 4,-7 6,-3 C10,-5 14,-1 14,2 L-14,2Z" fill="#7DBB4C"/>';
  }
  Object.assign(DISHES, {
    pizza: function () { return pizza({ toppings: ['jamon', 'champinon', 'aceituna'], seed: 'cat' }); },
    lasana: function () {
      return plate('<rect x="48" y="58" width="104" height="84" rx="10" fill="#D9C3A5"/>' +
        '<rect x="54" y="64" width="92" height="72" rx="6" fill="#E9A23B"/><path d="M54,82 H146 M54,102 H146 M54,120 H146" stroke="#C8321F" stroke-width="7"/>' +
        '<path d="M58,68 C80,60 120,74 142,66" stroke="#FFF1C9" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="120" cy="74" r="4" fill="#2D6A4F"/>');
    },
    espaguetis: function (c) {
      let g = '';
      for (let i = 0; i < 9; i++) g += '<path d="M' + (60 + i * 3) + ',' + (80 + i * 5) + ' C90,' + (60 + i * 6) + ' 120,' + (130 - i * 4) + ' ' + (142 - i * 2) + ',' + (95 + i * 3) + '" stroke="#F2CE6B" stroke-width="5" fill="none" stroke-linecap="round"/>';
      return plate(g + (c === 'carbonara'
        ? '<circle cx="100" cy="96" r="22" fill="#FFF3D1"/><circle cx="100" cy="96" r="9" fill="#F7B500"/><rect x="72" y="118" width="12" height="7" rx="2" fill="#C2554A"/><rect x="118" y="82" width="12" height="7" rx="2" fill="#C2554A"/>'
        : '<path d="M76,96 C78,76 120,72 124,92 C128,112 90,120 76,96Z" fill="#B02A18"/><circle cx="92" cy="92" r="4" fill="#6B4129"/><circle cx="108" cy="98" r="4" fill="#6B4129"/>') +
        '<circle cx="112" cy="80" r="3" fill="#2D6A4F"/>');
    },
    carbonara: function () { return DISHES.espaguetis('carbonara'); },
    perrito: function () {
      return plate('<g transform="rotate(-18 100 100)"><rect x="40" y="82" width="120" height="40" rx="20" fill="#E0A458"/>' +
        '<rect x="34" y="88" width="132" height="22" rx="11" fill="#B0533A"/>' + lettuce(80, 90, 1) + lettuce(118, 90, 1) +
        '<path d="M44,98 l10,-6 10,6 10,-6 10,6 10,-6 10,6 10,-6 10,6 10,-6 10,6 10,-6" stroke="#F7C95C" stroke-width="3.5" fill="none" stroke-linejoin="round"/></g>');
    },
    sandwich: function () {
      return plate('<g transform="rotate(-10 100 100)"><path d="M46,140 L100,58 L118,140Z" fill="#F6E2B8" stroke="#D9A55E" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M58,128 L96,72" stroke="#F4B8B3" stroke-width="6"/><path d="M64,134 L102,78" stroke="#F7C95C" stroke-width="5"/></g>' +
        '<g transform="rotate(14 120 110)"><path d="M98,150 L150,70 L164,150Z" fill="#F6E2B8" stroke="#D9A55E" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M112,140 L148,86" stroke="#7DBB4C" stroke-width="6"/><path d="M118,144 L152,92" stroke="#D62828" stroke-width="4"/></g>');
    },
    burger: function () {
      return plate('<path d="M52,92 C52,56 148,56 148,92Z" fill="#D9883B"/><g fill="#FFF4E0"><ellipse cx="78" cy="74" rx="3" ry="1.6"/><ellipse cx="100" cy="66" rx="3" ry="1.6"/><ellipse cx="122" cy="76" rx="3" ry="1.6"/></g>' +
        lettuce(100, 92, 1.95) + '<rect x="50" y="98" width="100" height="10" rx="3" fill="#D62828"/>' +
        '<path d="M50,108 L150,108 L140,118 L60,118Z" fill="#F5A623"/><rect x="48" y="114" width="104" height="18" rx="9" fill="#5A2E1A"/>' +
        '<path d="M52,132 H148 C148,148 52,148 52,132Z" fill="#D9883B"/>');
    },
    nachos: function () {
      let g = '';
      [[70, 80, 0], [110, 70, 40], [130, 110, 80], [90, 120, 160], [65, 115, 220], [104, 96, 300]].forEach(function (p) {
        g += '<path transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ')" d="M0,-22 L20,14 L-20,14Z" fill="#F2BE4A" stroke="#D9952B" stroke-width="2" stroke-linejoin="round"/>';
      });
      return plate(g + '<path d="M70,96 C86,82 112,86 130,100 C118,112 92,114 70,96Z" fill="#F5A623" opacity=".9"/>' +
        '<circle cx="96" cy="94" r="7" fill="#7FA04A"/><circle cx="112" cy="100" r="5" fill="#D62828"/><circle cx="84" cy="102" r="4" fill="#4C9A2A"/>');
    },
    wrap: function () {
      return plate('<g transform="rotate(-25 100 100)"><rect x="42" y="78" width="116" height="44" rx="22" fill="#EED39A"/>' +
        '<ellipse cx="152" cy="100" rx="12" ry="22" fill="#F6E2B8"/><circle cx="150" cy="94" r="5" fill="#7DBB4C"/><circle cx="154" cy="106" r="4" fill="#8E3B1F"/><circle cx="147" cy="104" r="3" fill="#F5A623"/>' +
        '<path d="M60,84 L60,116 M84,82 L84,118" stroke="#D9B26B" stroke-width="3"/></g>');
    },
    baguette: function () {
      return plate('<g transform="rotate(-20 100 100)"><rect x="26" y="80" width="148" height="40" rx="20" fill="#C9772E"/>' +
        '<rect x="32" y="96" width="136" height="10" fill="#F4B8B3"/>' + lettuce(60, 96, 1) + lettuce(100, 96, 1) + lettuce(140, 96, 1) +
        '<path d="M50,86 l12,-4 M80,86 l12,-4 M110,86 l12,-4 M140,86 l12,-4" stroke="#E9A23B" stroke-width="3" stroke-linecap="round"/></g>');
    },
    ensalada: function () {
      let g = '<circle cx="100" cy="100" r="62" fill="#FFFFFF" stroke="#EADBC3" stroke-width="4"/>';
      [[80, 86, 0], [114, 80, 40], [124, 110, 90], [90, 118, 200], [100, 98, 140], [72, 108, 260]].forEach(function (p) {
        g += '<path transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ')" d="M0,-16 C12,-8 12,8 0,16 C-12,8 -12,-8 0,-16Z" fill="' + (p[2] % 80 ? '#7DBB4C' : '#4E8F3A') + '"/>';
      });
      return plate(g + '<circle cx="104" cy="92" r="9" fill="#D62828"/><circle cx="84" cy="102" r="8" fill="#E0412F"/><circle cx="118" cy="114" r="4.5" fill="#2A1F1A"/>' +
        '<path d="M92,124 A9,9 0 0 1 110,124" stroke="#C07AB5" stroke-width="3" fill="none"/>');
    },
    patatas: function () {
      let g = '';
      for (let i = 0; i < 9; i++) g += '<rect x="' + (68 + i * 7) + '" y="' + (44 + (i % 3) * 8) + '" width="9" height="70" rx="2" fill="' + (i % 2 ? '#F5C518' : '#F7D046') + '" transform="rotate(' + (-12 + i * 3) + ' 100 120)"/>';
      return plate(g + '<path d="M62,96 L138,96 L128,156 L72,156Z" fill="#D62828"/><path d="M80,116 C90,124 110,124 120,116" stroke="#FFF4E0" stroke-width="5" fill="none" stroke-linecap="round"/>');
    },
    alitas: function () {
      let g = '';
      [[78, 84, -30], [120, 82, 20], [100, 124, 80]].forEach(function (p) {
        g += '<g transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ')"><ellipse cx="0" cy="0" rx="26" ry="15" fill="#B85A24"/><ellipse cx="-6" cy="-4" rx="12" ry="5" fill="#D9883B"/>' +
          '<rect x="22" y="-4" width="14" height="8" rx="4" fill="#FFF4E0"/></g>';
      });
      return plate(g);
    },
    nuggets: function () {
      let g = '';
      [[74, 80], [112, 74], [134, 108], [100, 116], [66, 118], [96, 92]].forEach(function (p, i) {
        g += '<path transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + (i * 50) + ')" d="M-16,-6 C-12,-14 10,-14 15,-5 C19,4 10,12 0,11 C-12,10 -19,2 -16,-6Z" fill="#D99A45"/>' +
          '<circle cx="' + (p[0] - 4) + '" cy="' + (p[1] - 3) + '" r="2" fill="#B87A2E"/>';
      });
      return plate(g);
    },
    arroz: function () {
      let g = '<circle cx="100" cy="100" r="60" fill="#F3E2B5"/>';
      for (let i = 0; i < 40; i++) {
        const a = i * 2.4, d = Math.sqrt(i / 40) * 52;
        g += '<ellipse cx="' + (100 + Math.cos(a) * d).toFixed(1) + '" cy="' + (100 + Math.sin(a) * d).toFixed(1) + '" rx="3.2" ry="1.6" fill="#FFF8E6" transform="rotate(' + (i * 37) + ' ' + (100 + Math.cos(a) * d).toFixed(1) + ' ' + (100 + Math.sin(a) * d).toFixed(1) + ')"/>';
      }
      return plate(g + '<circle cx="84" cy="90" r="4" fill="#6E9B3A"/><circle cx="116" cy="108" r="4" fill="#6E9B3A"/><circle cx="100" cy="120" r="3.5" fill="#F5C518"/><rect x="104" y="84" width="10" height="6" rx="2" fill="#E79A98"/><circle cx="78" cy="114" r="3.5" fill="#D62828"/>');
    },
    filete: function () {
      return plate('<path d="M50,110 C44,80 80,62 112,68 C140,74 150,100 136,122 C124,140 64,140 50,110Z" fill="#C8792E"/>' +
        '<path d="M64,104 C64,88 88,78 108,82" stroke="#E9A23B" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<circle cx="80" cy="96" r="1.8" fill="#8E4F1A"/><circle cx="104" cy="104" r="1.8" fill="#8E4F1A"/><circle cx="120" cy="92" r="1.8" fill="#8E4F1A"/>' +
        '<path d="M130,54 L142,46 L150,58Z" fill="#F7E58A" stroke="#E9C23B" stroke-width="2"/>');
    },
    infantil: function (two) {
      return plate((two
        ? '<path d="M52,100 C52,74 112,74 112,100Z" fill="#D9883B"/><rect x="50" y="100" width="64" height="12" rx="5" fill="#5A2E1A"/><rect x="52" y="98" width="60" height="5" fill="#F5A623"/><path d="M52,112 H112 C112,124 52,124 52,112Z" fill="#D9883B"/>'
        : '<path d="M50,84 C52,74 70,72 76,80 C82,90 70,98 60,96 C52,94 48,90 50,84Z" fill="#D99A45"/><path d="M76,108 C78,98 96,96 102,104 C108,114 96,122 86,120 C78,118 74,114 76,108Z" fill="#D99A45"/><path d="M54,118 C56,110 70,110 74,116 C78,124 68,130 60,128 C54,126 52,122 54,118Z" fill="#D99A45"/>') +
        '<g transform="rotate(10 130 80)"><rect x="118" y="44" width="8" height="56" rx="2" fill="#F5C518"/><rect x="128" y="40" width="8" height="60" rx="2" fill="#F7D046"/><rect x="138" y="46" width="8" height="54" rx="2" fill="#F5C518"/><path d="M112,82 L152,82 L146,118 L118,118Z" fill="#D62828"/></g>' +
        '<rect x="120" y="128" width="30" height="40" rx="4" fill="#2D6A4F"/><rect x="132" y="120" width="5" height="12" fill="#FFF4E0"/><circle cx="135" cy="148" r="7" fill="#F7C95C"/>');
    },
    infantil2: function () { return DISHES.infantil(true); },
    salsa: function (c) {
      c = c || '#D62828';
      return plate('<ellipse cx="100" cy="112" rx="50" ry="18" fill="#2A1F1A" opacity=".1"/><path d="M52,92 C52,130 148,130 148,92Z" fill="#FFFFFF" stroke="#EADBC3" stroke-width="4"/>' +
        '<ellipse cx="100" cy="92" rx="48" ry="16" fill="' + c + '"/><ellipse cx="88" cy="88" rx="14" ry="4" fill="#ffffff" opacity=".35"/>');
    },
    vaso: function (c) {
      c = c || '#F28C28';
      return glass('<path d="M66,46 L134,46 L124,160 L76,160Z" fill="#FFFDF5" opacity=".9" stroke="#2A1F1A" stroke-width="3"/>' +
        '<path d="M70,70 L130,70 L123,156 L77,156Z" fill="' + c + '"/>' +
        '<rect x="88" y="86" width="16" height="14" rx="3" fill="#fff" opacity=".6"/><rect x="104" y="110" width="14" height="13" rx="3" fill="#fff" opacity=".6"/>' +
        '<path d="M110,30 L98,120" stroke="#D62828" stroke-width="5" stroke-linecap="round"/>');
    },
    manzanilla: function () {
      return glass('<path d="M78,40 L122,40 L114,112 C112,120 88,120 86,112Z" fill="#FFFDF5" stroke="#2A1F1A" stroke-width="3"/>' +
        '<path d="M82,64 L118,64 L113,110 C111,116 89,116 87,110Z" fill="#F3E3A0"/><path d="M100,118 L100,158 M80,162 L120,162" stroke="#2A1F1A" stroke-width="5" stroke-linecap="round"/>');
    }
  });

  function dish(name) {
    const parts = String(name).split(':');
    return DISHES[parts[0]] ? DISHES[parts[0]](parts[1]) : plate('');
  }

  global.PizzaArt = { pizza: pizza, dish: dish, SHAPES: SHAPES, hash: hash };
})(window);
