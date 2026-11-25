/* ==========================================================================
   Pizzería Nápoles (Chipiona) · Datos
   Carta, precios, horario y contacto tomados de napolespizzeria.es
   Edita este archivo para cambiar precios, platos u horarios.
   ========================================================================== */
window.NAPOLES = {
  negocio: {
    nombre: 'Pizzería Nápoles',
    desde: 1985,
    direccion: 'Av. de la Constitución, 34, 11550 Chipiona, Cádiz',
    telefono: '+34 956 37 34 34',
    telefonoHref: 'tel:+34956373434',
    email: 'info@napolespizzeria.es',
    instagram: 'https://www.instagram.com/napolespizzeria_chipiona/',
    facebook: 'https://www.facebook.com/p/Pizzer%C3%ADa-N%C3%A1poles-100043398536497/?locale=es_ES',
    pedidosOnline: 'http://pizzerianapoles.dstorder.com/'
  },

  /* Horario: abierto de lunes a domingo, todo el año.
     Verano (junio–septiembre): 20:00–23:45 · Invierno (resto del año): 19:30–23:30 */
  horario: {
    verano: { meses: [5, 6, 7, 8], abre: 20 * 60, cierra: 23 * 60 + 45, texto: 'De lunes a domingo, de 20:00 a 23:45' },
    invierno: { abre: 19 * 60 + 30, cierra: 23 * 60 + 30, texto: 'De lunes a domingo, de 19:30 a 23:30' }
  },

  /* ---------- Pizzas (se hacen a tu gusto) ---------- */
  pizza: {
    incluidos: 3, // la base lleva tomate y queso + 3 ingredientes
    tamanos: [
      { id: 'individual', nombre: 'Individual', precio: 6.5, extra: 1.3, mitad: null, escala: 0.74, nota: 'Base + 3 ingredientes' },
      { id: 'mediana', nombre: 'Mediana', precio: 8.6, extra: 1.3, mitad: 0.9, escala: 0.84 },
      { id: 'grande', nombre: 'Grande', precio: 9.7, extra: 1.4, mitad: 0.9, escala: 0.92 },
      { id: 'familiar', nombre: 'Familiar', precio: 10.8, extra: 1.6, mitad: 1.2, escala: 1 }
    ],
    grupos: [
      { id: 'carnes', nombre: 'Carnes', items: [
        ['bacon', 'Bacon'], ['chorizo', 'Chorizo'], ['jamon', 'Jamón york'], ['pepperoni', 'Pepperoni'], ['pollo', 'Pollo'],
        ['salami', 'Salami'], ['salchicha', 'Salchicha'], ['ternera', 'Carne de ternera'], ['taco', 'Carne de taco']] },
      { id: 'mar', nombre: 'Del mar', items: [['anchoa', 'Anchoas'], ['atun', 'Atún'], ['gambas', 'Gambas']] },
      { id: 'verduras', nombre: 'Verduras y más', items: [
        ['ajo', 'Ajo'], ['alcachofa', 'Alcachofas'], ['alcaparras', 'Alcaparras'], ['cebolla', 'Cebolla'], ['cebollaCaram', 'Cebolla caramelizada'],
        ['champinon', 'Champiñones'], ['esparragos', 'Espárragos'], ['maiz', 'Maíz'], ['aceituna', 'Olivas negras'], ['aceitunaVerde', 'Olivas verdes'],
        ['patatas', 'Patatas fritas'], ['pina', 'Piña'], ['pimiento', 'Pimiento verde'], ['pimientoRojo', 'Pimiento rojo'], ['tomate', 'Tomate natural']] },
      { id: 'quesos', nombre: 'Quesos', items: [['parmesano', 'Parmesano'], ['roquefort', 'Roquefort'], ['cabra', 'Rulo de cabra'], ['dobleQueso', 'Doble queso']] },
      { id: 'extras', nombre: 'Salsas y extras', items: [['huevo', 'Huevo'], ['nata', 'Nata'], ['bbq', 'Salsa BBQ'], ['dobleSalsa', 'Doble salsa'], ['dobleMasa', 'Doble masa']] }
    ],
    // ingredientes que no se dibujan encima (cambian la base)
    sinDibujo: ['dobleQueso', 'dobleSalsa', 'dobleMasa']
  },

  /* ---------- Carta ---------- */
  categorias: [
    { id: 'pizzas', nombre: 'Pizzas', lema: 'Elige tu favorita', art: 'pizza', foto: 'assets/fotos/pizzas.jpg' },
    { id: 'pasta', nombre: 'Pasta', lema: 'Desde Italia con amor', art: 'espaguetis' },
    { id: 'perritos', nombre: 'Perritos', lema: 'Hechos para devorarlos', art: 'perrito', patatas: true },
    { id: 'sandwiches', nombre: 'Sándwiches', lema: 'Nuestros favoritos', art: 'sandwich', patatas: true },
    { id: 'burguer', nombre: 'Burguer', lema: 'American 100 %', art: 'burger', patatas: true, foto: 'assets/fotos/burger.jpg', fotoPos: '15% 60%' },
    { id: 'texmex', nombre: 'Tex-Mex', lema: 'El sabor que pica y conquista', art: 'nachos' },
    { id: 'baguettes', nombre: 'Baguettes', lema: 'Crujientes y deliciosos', art: 'baguette' },
    { id: 'ensaladas', nombre: 'Ensaladas', lema: 'Frescura en cada bocado', art: 'ensalada' },
    { id: 'fritos', nombre: 'Fritos', lema: 'En la variedad está el gusto', art: 'patatas' },
    { id: 'filetes', nombre: 'Filetes', lema: 'Jugosos, tiernos e irresistibles', art: 'filete' },
    { id: 'infantil', nombre: 'Menú infantil', lema: 'Para los más peques', art: 'infantil', foto: 'assets/fotos/menu-infantil.jpg' },
    { id: 'salsas', nombre: 'Salsas', lema: 'El toque que lo cambia todo', art: 'salsa' },
    { id: 'bebidas', nombre: 'Bebidas', lema: 'Refresca tus momentos', art: 'refresco' }
  ],

  /* [categoría, nombre, precio, descripción, ilustración] */
  carta: [
    ['pasta', 'Lasaña', 6.2, '', 'lasana'],
    ['pasta', 'Espaguetis boloñesa', 5.2, '', 'espaguetis'],
    ['pasta', 'Espaguetis carbonara', 5.2, '', 'carbonara'],

    ['perritos', 'Simple', 3.2, 'Salchicha, tomate y lechuga', 'perrito'],
    ['perritos', 'Completo', 4, 'Salchicha, queso, bacon, tomate y lechuga', 'perrito'],
    ['perritos', 'Taco', 4, 'Salchicha, queso, carne de taco y lechuga', 'perrito'],
    ['perritos', 'Completo de taco', 5, 'Salchicha, queso, carne de taco, bacon y lechuga', 'perrito'],
    ['perritos', 'Completo de huevo', 5, 'Salchicha, queso, bacon, huevo y lechuga', 'perrito'],
    ['perritos', 'Nápoles', 5.2, 'Salchicha, carne de taco, queso, salsa de tomate y cebolla crujiente', 'perrito'],

    ['sandwiches', 'Mixto', 3, 'Jamón york y queso', 'sandwich'],
    ['sandwiches', 'Pollo', 3.9, 'Pollo, tomate, lechuga y mahonesa', 'sandwich'],
    ['sandwiches', 'Vegetal', 3.9, 'Atún, tomate, lechuga y mahonesa', 'sandwich'],
    ['sandwiches', 'Completo', 4.2, 'Queso, huevo, jamón york y bacon', 'sandwich'],
    ['sandwiches', 'Pollo ali-oli', 3.9, 'Pollo, lechuga y salsa ali-oli', 'sandwich'],
    ['sandwiches', 'Taco', 3.9, 'Carne de taco, queso, lechuga y mahonesa', 'sandwich'],
    ['sandwiches', 'Monstruito 1', 6.5, 'Sándwich completo + sándwich de pollo', 'sandwich'],
    ['sandwiches', 'Monstruito 2', 6.5, 'Sándwich completo + sándwich vegetal', 'sandwich'],
    ['sandwiches', 'Monstruito 3', 6.5, 'Sándwich completo + sándwich de taco', 'sandwich'],
    ['sandwiches', 'Monstruito 4', 6.5, 'Sándwich completo + sándwich pollo ali-oli', 'sandwich'],

    ['burguer', 'Simple', 4.2, 'Ternera, lechuga, tomate y cebolla (queso, bacon o huevo +1,00 €)', 'burger'],
    ['burguer', 'Completa', 6.2, 'Ternera, queso, bacon, huevo y verduras', 'burger'],
    ['burguer', 'Doble', 6.5, 'Doble carne de ternera, doble queso cheddar, bacon crujiente, cebolla crujiente y salsa', 'burger'],
    ['burguer', 'May', 6.5, 'Doble carne de ternera, queso cheddar, bacon crujiente, pepinillos, lechuga y mostaza', 'burger'],
    ['burguer', 'Krasty', 5.5, 'Ternera, queso cheddar, pepinillos, lechuga y salsa', 'burger'],
    ['burguer', 'Barbacoa', 5.5, 'Ternera, bacon crujiente, salsa BBQ, cebolla crujiente y lechuga', 'burger'],
    ['burguer', 'Rulo ternera', 6.5, 'Ternera, rulo de cabra, champiñones, cebolla caramelizada, bacon, tomate y mayonesa', 'burger'],
    ['burguer', 'Chicken rulo', 6.5, 'Pollo rebozado, rulo de cabra, champiñones, cebolla caramelizada, tomate y mayonesa', 'burger'],
    ['burguer', 'Napoli', 4.9, 'Medallón de pollo rebozado, lechuga y mahonesa', 'burger'],
    ['burguer', 'Menú XXL', 9.9, 'Carne de buey 200 g, queso cheddar, lechuga, mayonesa, patatas fritas y refresco', 'burger', 'nopatatas'],
    ['burguer', 'Menú XXL salvaje', 11.4, 'Carne de buey 200 g, queso cheddar, lechuga, mayonesa, patatas salvajes y refresco', 'burger', 'nopatatas'],

    ['texmex', 'Nachos con carne picante y queso', 5, '', 'nachos'],
    ['texmex', 'Nachos mex', 8, 'Nachos, carne picante, cheddar, edam, tomate natural, guacamole, salsa yogur y jalapeños', 'nachos'],
    ['texmex', 'Torta de carne', 4.5, 'Carne picante, queso, lechuga y tomate natural', 'wrap'],
    ['texmex', 'Enrollado de pollo', 5, 'Pollo crujiente, salsa BBQ, queso y lechuga', 'wrap'],
    ['texmex', 'Enrollado completo', 5, 'Pollo, york, huevo, queso, lechuga y ali-oli', 'wrap'],
    ['texmex', 'Quesadilla', 6.5, 'Cazuela de carne picante, queso y 2 tortas de trigo', 'wrap'],

    ['baguettes', 'Mixto', 4, 'Jamón york y queso', 'baguette'],
    ['baguettes', 'Pollo', 5.3, 'Pollo, tomate, lechuga y mayonesa', 'baguette'],
    ['baguettes', 'Vegetal', 5, 'Atún, tomate, lechuga y mayonesa', 'baguette'],
    ['baguettes', 'Completo', 5, 'Queso, huevo, jamón york y bacon', 'baguette'],
    ['baguettes', 'Taco', 5.3, 'Carne de taco, queso, lechuga y mayonesa', 'baguette'],
    ['baguettes', 'Pollo ali-oli', 5.3, 'Pollo y salsa ali-oli', 'baguette'],
    ['baguettes', 'Serranito de pollo', 7.5, 'Filete de pollo, jamón, pimiento y mayonesa', 'baguette'],
    ['baguettes', 'Serranito de cerdo', 7.5, 'Filete de cerdo, jamón, pimiento y mayonesa', 'baguette'],

    ['ensaladas', 'Simple', 3.5, 'Lechuga, tomate y cebolla', 'ensalada'],
    ['ensaladas', 'Mixta', 5.5, 'Lechuga, tomate, atún y olivas negras', 'ensalada'],
    ['ensaladas', 'Completa', 6.5, 'Lechuga, tomate, cebolla, atún, olivas negras y variado de verduras', 'ensalada'],
    ['ensaladas', 'De pollo', 6, 'Lechuga, pollo, jamón york y queso', 'ensalada'],
    ['ensaladas', 'Tex-mex', 8.5, 'Torta de trigo, lechuga, tomate, cebolla, pollo, nachos, maíz, crema de yogur, guacamole, salsa mexicana y kebab', 'ensalada'],
    ['ensaladas', 'De arroz', 6, 'Arroz, lechuga, maíz, york, pollo y mayonesa', 'ensalada'],
    ['ensaladas', 'César', 8, 'Lechuga, tomate, cebolla, maíz, picatostes, filete empanado, queso y salsa césar', 'ensalada'],

    ['fritos', 'Patatas', 4, '', 'patatas'],
    ['fritos', 'Patatas deluxe', 5, '', 'patatas'],
    ['fritos', 'Croquetas (12 uds)', 4.5, '', 'croquetas'],
    ['fritos', 'Alitas de pollo (12 uds)', 6.5, '', 'alitas'],
    ['fritos', 'Nuggets de pollo (6 uds)', 4, '', 'nuggets'],
    ['fritos', 'Pollo crujiente (6 uds)', 4.5, '', 'nuggets'],
    ['fritos', 'Arroz frito', 7, 'Ingrediente extra +1,70 €', 'arroz'],

    ['filetes', 'Filete de pollo empanado', 6, 'Con patatas o ensalada', 'filete'],
    ['filetes', 'Pollo a la plancha', 6, 'Con patatas o ensalada', 'filete'],

    ['infantil', 'Menú infantil 1', 7, '5 nuggets de pollo, patatas fritas, Bio Frutas y Petit', 'infantil'],
    ['infantil', 'Menú infantil 2', 7, 'Mini hamburguesa con queso, patatas fritas, Bio Frutas y Petit', 'infantil2'],

    ['salsas', 'Brava', 0.7, '', 'salsa:#D62828'],
    ['salsas', 'Ali-oli', 0.8, '', 'salsa:#FFF6DD'],
    ['salsas', 'Barbacoa', 0.8, '', 'salsa:#5A2E1A'],
    ['salsas', 'Guacamole', 1, '', 'salsa:#7FA04A'],
    ['salsas', 'Cheddar', 1, '', 'salsa:#F5A623'],
    ['salsas', 'Miel y mostaza', 0.8, '', 'salsa:#E9C23B'],
    ['salsas', 'Curry y mango', 0.8, '', 'salsa:#E9A23B'],
    ['salsas', 'Agridulce', 0.6, '', 'salsa:#C8321F'],
    ['salsas', 'Mexicana roja', 0.8, '', 'salsa:#9E1B1B'],
    ['salsas', 'Sobre de kétchup', 0.1, '', 'salsa:#C8321F'],
    ['salsas', 'Sobre de mayonesa', 0.1, '', 'salsa:#FFF6DD'],
    ['salsas', 'Sobre de mostaza', 0.1, '', 'salsa:#E9C23B'],

    ['bebidas', 'Refrescos', 1.7, '', 'refresco'],
    ['bebidas', 'Nestea', 1.9, '', 'vaso:#8A4B1F'],
    ['bebidas', 'Aquarius', 1.9, '', 'vaso:#CDE7F0'],
    ['bebidas', 'Zumos', 1.7, '', 'vaso:#F28C28'],
    ['bebidas', 'Cruzcampo lata 25 cl', 1.7, '', 'cerveza'],
    ['bebidas', 'Cruzcampo lata 50 cl', 2.3, '', 'cerveza'],
    ['bebidas', 'Cerveza sin alcohol', 1.7, '', 'cerveza'],
    ['bebidas', 'Tinto de limón', 2.5, '', 'vaso:#9E1B1B'],
    ['bebidas', 'Copa de manzanilla', 1.7, '', 'manzanilla'],
    ['bebidas', 'Agua grande 1,5 L', 1.9, '', 'agua'],
    ['bebidas', 'Agua pequeña 0,5 L', 1.2, '', 'agua']
  ],

  /* Fotos reales de platos concretos (de napolespizzeria.es) · clave: categoría|nombre */
  fotosPlatos: {
    'burguer|May': 'assets/fotos/burger-may.webp'
  },

  /* Complemento de patatas en perritos, sándwiches y burguers */
  patatas: [
    { id: '', nombre: 'Sin patatas', precio: 0 },
    { id: 'p', nombre: '+ Patatas', precio: 2 },
    { id: 'd', nombre: '+ Patatas deluxe', precio: 3 }
  ],

  /* La familia */
  equipo: [
    { nombre: 'Ichu', rol: 'Al frente de la cocina' },
    { nombre: 'Kino', rol: 'Da forma a las pizzas cada día' },
    { nombre: 'Kino padre', rol: 'El alma de la pizzería' },
    { nombre: 'Rosa', rol: 'En barra y al teléfono' },
    { nombre: 'Lupe', rol: 'Organiza el servicio y el reparto a domicilio' }
  ]
};
