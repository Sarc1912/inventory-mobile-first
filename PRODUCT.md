# Sistema de inventario

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js con Tailwind CSS. Supabase para autenticación, base de datos y almacenamiento de fotos. IndexedDB para datos locales y cola de descuentos; service worker para iniciar la web sin conexión. El usuario confirmó operación offline con sincronización posterior.

## Users

Personas autorizadas que consultan y actualizan un mismo inventario compartido desde el teléfono. No se han definido el sector del negocio ni perfiles con permisos diferenciados.

## Product Purpose

Ofrecer un sistema sencillo para buscar productos, consultar sus existencias y precio, descontar unidades y revisar el histórico de esos descuentos dentro de la misma aplicación.

## Operating Context

Uso prioritario desde un teléfono mediante una web mobile first. Todos los usuarios autorizados comparten productos e historial. El acceso requiere login y sesión protegida.

Flujo principal: iniciar sesión, buscar un producto, consultar sus datos, indicar unidades a descontar, confirmar el movimiento y consultar el histórico.

## Capabilities and Constraints

- Cada producto tiene foto, nombre, descripción, cantidad y precio.
- Buscador de productos.
- El inventario y el buscador ocultan productos sin stock disponible, descontando también los movimientos pendientes de este teléfono. Los registros y su historial se conservan.
- Edición de nombre, descripción y precio, con posibilidad de añadir o reemplazar la foto después del alta. Guardar la edición requiere conexión.
- Login con Supabase y sesión protegida en Next.js.
- Catálogo y buscador utilizables sin conexión, incluso al reabrir la web tras una primera descarga con conexión.
- Descuentos offline persistidos en el teléfono y sincronizados al volver la conexión con la app abierta o al abrirla nuevamente.
- Identificadores estables para evitar duplicados y revisión explícita de conflictos de stock.
- Descuento de existencias e histórico consultable en la propia aplicación.
- Estructura de tablas y usuarios preparada en este repositorio para Supabase.
- La prioridad es mantener el sistema sencillo y cómodo de usar en un teléfono.

Interpretación de implementación: «descontar» significa restar existencias. No se ha solicitado aplicar rebajas al precio. Cada reducción debe conservar producto, cantidad, fecha y usuario responsable. El inventario no debe quedar negativo y el movimiento debe registrarse en la misma transacción que modifica las existencias.

Decisiones abiertas: moneda, cantidades fraccionarias, registro público o solo invitaciones, nombre comercial, despliegue y permisos diferenciados. La implementación inicial usa cantidades enteras y precio con dos decimales. El alta de productos y fotos necesita conexión; offline se puede consultar, buscar, revisar el histórico descargado y descontar.

Los datos y la cola se aíslan por cuenta. El primer acceso necesita conexión. La copia local permite continuar tras caducar la sesión remota, pero sincronizar exige renovarla con la misma cuenta. Un descuento local no reserva stock global; Supabase valida las existencias al recibirlo.

## Brand Commitments

El usuario eligió «Mercado cálido»: crema, terracota y verde oscuro, con cambios de cantidad muy claros.

## Evidence on Hand

Requisitos confirmados por el usuario durante `impeccable init`. El repositorio no contenía código de aplicación, catálogo, fotografías, marca ni credenciales de Supabase. No se deben presentar productos ni usuarios ficticios como datos reales.

## Product Principles

- Priorizar la operación cotidiana desde el teléfono.
- Mantener un inventario compartido coherente entre usuarios.
- Hacer que cada descuento sea verificable mediante su histórico.
- Usar la caché para agilizar la consulta y confirmar las operaciones contra la base de datos.
- Mantener el alcance sencillo y proteger los datos mediante autenticación y permisos en la base de datos.
