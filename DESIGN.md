---
name: Inventario
description: Mercado cálido: crema, bosque y terracota con cantidades claras.
colors:
  cream: "#f5f1e8"
  surface: "#fffdf8"
  forest: "#183f37"
  muted: "#59665e"
  terracotta: "#8d3e29"
  terracotta-hover: "#75301f"
  on-primary: "#fff9ef"
  line: "#d4d7ca"
  warning: "#f5e5c0"
  warning-ink: "#654314"
  danger: "#9f2e2b"
  sage: "#e4eadd"
  status-ink: "#315341"
  secondary-hover: "#e9eddf"
  pending-ink: "#785017"
  field-line: "#aab4a7"
  placeholder: "#657266"
  notice: "#e8eddf"
  toast: "#e3ecd9"
  conflict: "#f4dfd6"
  conflict-ink: "#8d3826"
  nav-selected: "#e5ecdd"
  nav-mobile-selected: "#e1e8d7"
  photo: "#e6e7db"
  photo-ink: "#6b7b6b"
  confirmed: "#e0e9d7"
typography:
  display:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "clamp(42px, 5vw, 68px)"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "clamp(28px, 4vw, 36px)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "17px"
    fontWeight: 750
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "15px"
    lineHeight: 1.55
  label:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.55
  stock:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "25px"
    lineHeight: 1.3
    letterSpacing: "-0.025em"
rounded:
  compact: "8px"
  navigation: "10px"
  field: "12px"
  surface: "14px"
  badge: "20px"
  circle: "50%"
spacing:
  tight: "8px"
  compact: "12px"
  regular: "16px"
  comfortable: "20px"
  section: "24px"
  large: "32px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.surface}"
    padding: "11px 18px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.surface}"
    padding: "11px 18px"
    typography: "{typography.label}"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.field}"
    padding: "14px"
  notice:
    backgroundColor: "{colors.notice}"
    rounded: "{rounded.surface}"
    padding: "20px"
  stock-transition:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.surface}"
    padding: "24px"
  pending-badge:
    backgroundColor: "{colors.terracotta}"
    rounded: "{rounded.badge}"
    padding: "0 3px"
---

# Design System: Inventario

## Overview

**Creative North Star: "Mercado cálido"**

La dirección confirmada combina crema, terracota y verde bosque. Manrope mantiene una voz cotidiana y legible; las cantidades, los estados y las acciones tienen más protagonismo que la decoración. La implementación es code-first.

Este documento describe el código enviado en `src/app/globals.css`, `src/components/inventory-app.tsx`, `src/components/login.tsx` y `src/app/layout.tsx`. Los requisitos de producto pertenecen a `PRODUCT.md`; la composición específica del inventario pertenece a `.impeccable/surfaces/inventario.md`.

**Key Characteristics:**

- Fondo cálido con tinta verde oscura y acciones terracota.
- Listas abiertas con separadores, cantidades alineadas y números tabulares.
- Contenedores suavemente redondeados y poca elevación.
- Estados expresados mediante texto, iconos y color.

## Colors

### Primary

**Terracota** identifica las acciones principales, los descuentos, el contador de pendientes y el foco. Su variante más oscura aparece al pasar el puntero sobre botones primarios; el texto usa el tono claro `on-primary`.

### Secondary

**Bosque** es la tinta general y el fondo de cabecera e introducción del login. Los verdes suaves distinguen disponibilidad, mensajes y confirmaciones sin competir con la acción principal.

### Neutral

**Crema** cubre la página; **surface** aclara campos, navegación y paneles. **Muted** reduce el énfasis del texto secundario; **line** separa filas y delimita controles. El espacio de foto ausente tiene un fondo neutro verdoso.

Los avisos usan amarillo cálido con tinta marrón; los conflictos, un fondo arcilloso con tinta roja oscura. El error textual usa `danger`. Estos pares complementan las etiquetas explícitas de estado.

**La regla del estado explícito.** Un pendiente o conflicto conserva su texto además del color; el verde de una confirmación acompaña un icono de verificación.

## Typography

Una sola familia variable, **Manrope Variable**, importada localmente por Fontsource, con fallback sans-serif. No hay serif ni fuente monoespaciada distinta.

La jerarquía normativa está en el frontmatter. El display corresponde al login y baja a (43px) en teléfono. Los títulos de producto usan (18px), o (15px) en teléfono; los títulos de login usan (27px), o (24px) en teléfono. La marca usa (21px), o (19px) en teléfono.

Las existencias y los movimientos usan números tabulares; las existencias bajan de (25px) a (23px) en teléfono. La comparación antes/después amplía las cantidades a (35px), o (32px) en teléfono, con interletraje (-0.03em). Precios y cantidades mantienen alineación visual. El texto de apoyo oscila entre (10–14px), según su contexto; no existe una escala modular única.

## Layout

La cabecera y el área de trabajo comparten un máximo de (1120px), centrado. El área de trabajo tiene relleno (42px 32px 140px); el espacio inferior reserva sitio a la navegación fija. Las listas permanecen en una columna también en escritorio, con foto, descripción flexible y cantidades alineadas a la derecha. La búsqueda ocupa la fila completa; el listado muestra siempre productos con stock disponible. Los editores tienen máximo (560px); el formulario de alta conserva dos columnas para cantidad y precio.

El único breakpoint de composición es `max-width:640px`. En teléfono, el área de trabajo pasa a (30px 20px 124px), se reducen los huecos y la foto de producto pasa de (76 × 88px) a (56 × 72px). El botón de alta muestra solo el icono. La navegación inferior distribuye tres botones flexibles con icono sobre etiqueta; en escritorio, los iconos y etiquetas van en línea. El área segura inferior se respeta en ambos tamaños.

El login tiene dos columnas iguales en escritorio: introducción verde y formulario de hasta (370px). En teléfono se apilan; el formulario admite hasta (440px), y se ocultan el bloque auxiliar offline y la línea final de la introducción.

## Elevation & Depth

Predominan fondos planos, separadores y capas tonales. El panel de cuenta es la única superficie con sombra exterior (`0 12px 36px #132f3426`). Los botones secundarios delimitan su forma con una sombra interior de (1px). En móvil, un halo sólido de (7px) resalta el icono de la pestaña activa; no representa elevación.

Los botones cambian de fondo con una transición de (.15s ease). El icono de sincronización gira en (1.3s linear infinite). La preferencia de movimiento reducido elimina animaciones y transiciones. No hay desplazamientos decorativos ni una animación especial de pulsación.

## Shapes

El radio principal corresponde a `surface`; campos, fotos de escritorio y avisos compactos usan `field`. La navegación usa `navigation`; el avatar y los símbolos de movimiento son círculos. Las fotos recortan su contenido con `object-fit:cover`. El campo de subida se distingue mediante borde discontinuo, sin crear otra tarjeta elevada.

## Components

### Buttons

Acciones de aspecto compacto y firme. El botón común tiene altura mínima (46px), separación de icono (9px) y el relleno definido en frontmatter; los botones de formulario suben a (54px). El secundario usa borde interior. Los botones de texto van subrayados; descontar muestra el subrayado al hover. Un botón deshabilitado usa opacidad (.5) y cursor `not-allowed`. No hay estilo `:active` específico.

El foco global es un contorno terracota de (3px) separado (4px). La búsqueda usa en cambio un contorno de grupo `focus-within` de (2px), separado (2px).

### Inputs / Fields

Campos claros de altura mínima (50px), borde de (1px), texto de (16px) y relleno uniforme. Las etiquetas pesan (700). La búsqueda tiene altura mínima (54px), o (50px) en teléfono, y el input interior es transparente. Los errores son texto rojo con `role="alert"`; el código no aplica un borde de error al campo. Los inputs deshabilitados usan el comportamiento nativo, sin una variante visual propia.

### Navigation

Barra inferior fija con separador superior. Las tres pestañas son Inventario, Historial y Pendientes; la activa usa `aria-current="page"` y peso (800). En escritorio recibe fondo verde suave; en teléfono se resalta solo el área del icono. El contador de pendientes es una cápsula terracota de texto blanco, con tamaño de texto (10px). No hay hover de pestaña específico aparte del foco global.

### Cards / Containers

Los productos y movimientos son filas separadas por líneas, no tarjetas individuales. Los avisos son contenedores tonales de relleno (20px), o (17px) en teléfono. El toast tiene radio de campo, un icono y cierre explícito. La cabecera de conexión combina icono, texto y acción de sincronizar; el modo offline cambia a amarillo cálido.

### Stock transition

Dos cantidades grandes, alineadas a extremos opuestos y unidas por una flecha, hacen visible el cambio antes de confirmar. El stepper que las precede tiene borde continuo, radio de campo y botones de (62 × 60px); la cifra editable usa (24px) y peso (750). La comparación reduce el relleno de (24px) a (20px) en teléfono.

## Do's and Don'ts

- **Do** usar la paleta cálida confirmada y conservar la jerarquía de las cantidades.
- **Do** mantener etiquetas e iconos junto al color de estado.
- **Do** conservar el foco visible y la reserva de espacio para la navegación inferior.
- **Do** mostrar una ausencia de foto de forma explícita; las fotos corresponden a productos reales.
- **Don't** convertir una fila de producto en una tarjeta elevada por defecto: el código establece listas abiertas y separadores.
- **Don't** presentar pendientes con el tratamiento de confirmación.
- **Don't** sustituir el contenido de `PRODUCT.md` con reglas visuales o promesas de integración.
