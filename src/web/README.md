# 🍕 Pizzería Nápoles · Chipiona

Web para **Pizzería Nápoles** (Av. de la Constitución, 34 · Chipiona), basada en los datos de
[napolespizzeria.es](https://napolespizzeria.es/): carta y precios, horario, contacto y la historia de la familia.

Está hecha con **HTML, CSS y JavaScript**, sin librerías ni instalación.

## Cómo abrirla

- **Doble clic en `iniciar.bat`.** Arranca un servidor local y abre `http://localhost:5500`. Necesita Python.
- **Doble clic en `index.html`.** También debería abrirse directamente.
- **Desde VS Code:** con la extensión **Live Server**, haz clic derecho en `index.html` y elige «Open with Live Server».

Con internet se cargan también las fuentes y el mapa de Google Maps.

## Secciones

| Sección | Contenido |
|---|---|
| **Portada** | Logo, dirección, teléfono y el estado «abierto ahora» en directo. |
| **Por qué nosotros** | Masa propia, ingredientes de calidad, abierto todo el año y delivery propio. |
| **Carta** | La carta completa de la pizzería, con 13 categorías y buscador. En perritos, sándwiches y burguers se pueden añadir patatas (+2 €) o patatas deluxe (+3 €). |
| **Pizza a tu gusto** | Los 4 tamaños reales (6,50 / 8,60 / 9,70 / 10,80 €) y los 36 ingredientes de la carta. La pizza se dibuja en directo y el precio se calcula solo: 3 ingredientes incluidos y los demás se cobran a precio de extra según el tamaño. |
| **Menú infantil** | Los dos menús de 7 €. |
| **Nosotros** | La historia desde 1985 y la familia: Ichu, Kino, Kino padre, Rosa y Lupe. |
| **Galería** | Fotos reales del local: la familia, la masa, los ingredientes, las pizzas y las burguers. Incluye un enlace al Instagram. |
| **Reservas** | Formulario con las horas disponibles según el horario de verano o de invierno. |
| **Contacto** | Horario, mapa, teléfono, email y formulario. |
| **Pedido** | Cesta → datos → seguimiento. Es una **simulación**: no se cobra ni se envía nada. |

Además tiene modo oscuro. Funciona en móvil, tablet y escritorio, se puede usar con teclado y respeta la opción «reducir movimiento» del sistema.

## Fotos

Las fotos de `assets/fotos/` son de napolespizzeria.es, reducidas para la web. Aparecen en la carta (cabeceras de Pizzas, Burguer y Menú infantil, la burguer May y los ingredientes), en Nosotros (la familia) y en la galería.
Para las demás categorías la web original no tiene fotos, así que se mantienen las ilustraciones. Si la pizzería pasa más fotos, se añaden en `js/data.js`: `foto` en cada categoría o `fotosPlatos` para un plato concreto.

## Editar datos

Los precios, platos, ingredientes, el horario y el contacto están en **`js/data.js`**.
Después de cambiar algo, recarga la página con `Ctrl + F5`.

## Supuestos que conviene confirmar con la pizzería

- **3 ingredientes incluidos en todos los tamaños.** En la web original solo se indica en la individual.
- **Verano = junio a septiembre.** El horario de verano es 20:00–23:45 y el de invierno 19:30–23:30.
- **Formas de pago:** efectivo y tarjeta.
- **Ingrediente extra en media pizza.** Su precio aparece en la carta, pero el configurador no lo calcula.

## Estructura

```
index.html · iniciar.bat · README.md
css/styles.css
js/data.js   ← datos de la pizzería
js/pizza.js  ← dibuja pizzas y platos en SVG
js/main.js   ← interacciones
assets/logo_napoles.svg · assets/favicon.svg
```
