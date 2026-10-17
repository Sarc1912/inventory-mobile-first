# Inventario móvil con funcionamiento offline

Next.js, Tailwind y Supabase. Inventario compartido, sesión protegida, búsqueda por nombre o descripción, alta con foto, descuentos e histórico. Interfaz en español diseñada para teléfono.

## Ejecutar

```powershell
npm install
Copy-Item .env.example .env.local
# Completar .env.local con URL y clave pública de Supabase.
npm run dev
```

Abrir [localhost:3000](http://localhost:3000). Sin configuración, el login ofrece una [demo local](http://localhost:3000/demo) con datos de ejemplo. La demo conserva descuentos al recargar y nunca los envía a Supabase.

Aplicar ambas migraciones en orden y crear las cuentas según [la guía de Supabase](supabase/README.md). No se requieren claves secretas en la aplicación.

La validación de origen usa el host con el que abres la app (localhost, IP o dominio). Si despliegas detrás de un proxy que reemplaza `Host`, configura `APP_ORIGIN` con la URL pública exacta, por ejemplo `https://inventario.tudominio.com`, sin rutas. Es una variable de servidor; reinicia Next.js después de cambiarla.

## Probar sin conexión

El service worker se activa solamente en producción:

```powershell
npm run build
npm start
```

1. Entrar con conexión y esperar «Catálogo guardado en este teléfono».
2. Cortar la conexión, buscar un producto y guardar un descuento.
3. Recargar o reabrir la web: el catálogo y los pendientes permanecen.
4. Restablecer conexión con la app abierta, o abrirla nuevamente. Se envían los pendientes automáticamente; también hay un botón Sincronizar.
5. Si falta stock compartido, el movimiento queda en Pendientes para revisar, reintentar o quitar tras el rechazo.

Usar HTTPS en un despliegue real; localhost permite probar sin certificado. No se promete sincronización con la app cerrada, ya que el navegador puede suspenderla.

## Arquitectura

- Next.js verifica identidad y pertenencia activa; RLS protege datos y fotos. `/inventario` requiere sesión válida.
- El service worker guarda un shell público sin datos personales, CSS, JavaScript y fuentes locales. No almacena respuestas de `/api` ni páginas protegidas del servidor.
- IndexedDB guarda por cuenta productos, fotos descargadas, hasta 500 movimientos confirmados y cola local. `/offline` recupera la cuenta recordada en el dispositivo.
- Cada descuento persiste con un UUID antes de enviarse. La RPC deduplica por ese UUID y confirma stock e histórico en una sola transacción.
- El cliente y el endpoint comprueban que la cuenta actual sea la propietaria de la cola. Web Locks coordina pestañas y la RPC evita duplicados entre clientes.
- Las existencias mostradas restan los pendientes locales. Otros dispositivos pueden operar al mismo tiempo; Supabase valida el stock final.
- Se sincroniza al abrir, recuperar conexión, volver a la pestaña y cada 30 segundos mientras esté visible.

## Alcance y límites

El alta y la edición de productos y fotos necesitan conexión. En cada producto, **Editar** permite cambiar nombre, descripción y precio, y añadir o reemplazar su foto posteriormente. Sin seleccionar una foto nueva se conserva la actual. Si el producto cambió mientras estaba abierto el formulario, se solicita sincronizar y volver a abrirlo. La moneda y las cantidades fraccionarias quedan pendientes de definir. Una foto todavía no descargada muestra un indicador de ausencia. El cierre de sesión necesita conexión, conserva la cola por cuenta y retira su acceso visible. El primer acceso y la renovación de sesión necesitan red.

Las fotos reemplazadas conservan su archivo anterior para que los catálogos descargados de otros teléfonos sigan resolviendo su ruta. La limpieza de archivos históricos no referenciados queda para mantenimiento administrativo.

Los datos offline permanecen en el navegador del teléfono, sin cifrado propio de la app. Borrar datos del sitio, usar navegación privada o la expulsión del almacenamiento por el navegador puede eliminar pendientes. Usar un teléfono de confianza. «Guardado» solo se muestra después de completar la transacción local.

Todavía no hay un proyecto Supabase conectado ni cuentas reales creadas. Las migraciones se prueban en PostgreSQL embebido; Auth, Storage real y concurrencia entre conexiones independientes deben comprobarse contra el proyecto de destino.

## Verificación

```powershell
npm run typecheck
npm test
npm run build
```

Las pruebas verifican cola local, límites de stock entre transacciones, aislamiento de cuentas, sesión caducada, errores transitorios, respuesta perdida, reconciliación, migraciones SQL, permisos y deduplicación en PostgreSQL.

Referencias: [PWA con Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps), [sesiones Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [funciones PostgreSQL](https://supabase.com/docs/guides/database/functions).
