# Inventario móvil

MODE: Operate
FORM: seed:1fbca230fa3c8903; dirección asignada 7, Mercado cálido, confirmada por el usuario en el chat.
BUILD: code-first.

El usuario busca un producto, consulta su cantidad y registra un descuento. En el primer viewport debe reconocer búsqueda, catálogo y estado de conexión. Navegación inferior en teléfono: inventario, historial y pendientes. En escritorio se mantiene la misma organización con más ancho, sin comprimir el contenido móvil en columnas arbitrarias.

La dirección presta crema, verde oscuro, terracota, Manrope legible y una comparación alineada de cantidades anterior y posterior. Las fotografías pertenecen a los productos reales; las ausentes se representan como fotografía no disponible, sin inventar imágenes. No hay claims comerciales.

Interacción distintiva: la confirmación muestra unidades antes y después; luego se convierte en un movimiento pendiente visible, y finalmente en un recibo confirmado. Estados pendientes y conflicto tienen texto además de color. Sin conexión se puede consultar el catálogo descargado, buscar y descontar; las existencias locales son una estimación y Supabase decide al sincronizar.

Riesgo: la paleta cálida no debe reducir el contraste de texto ni hacer que un pendiente parezca confirmado. El estado offline solo se declara listo cuando el shell se haya instalado y exista catálogo local.
