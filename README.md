# Plantilla de restaurantes

App para restaurantes, cafeterías, comida rápida, panaderías o bares. El cliente ve el menú con fotos desde un enlace o el QR de su mesa y hace su pedido sin instalar nada. El mesero acepta, la cocina ve las comandas en pantalla, y la caja cobra con propina, vuelto y ticket. El dueño ve el cierre del día.

**No se edita a mano.** La Súper App crea un repositorio por cliente desde esta plantilla y le escribe `src/cliente.json` con el nombre, los colores, el dueño, las palabras del negocio, los módulos, la moneda y los datos públicos de Firebase.

## Cómo se usa

1. **Menú (dueño):** categorías (Desayunos, Platos fuertes, Bebidas…) y platos con foto, precio y descripción. Se ordenan con flechas.
2. **Mesas y QR (dueño):** crea las mesas e imprime un QR por mesa, más uno general del menú para redes y la puerta.
3. **Pedidos:**
   - Desde el QR de la mesa (`/m/…`) o el menú (`/menu`, para llevar o a domicilio) el cliente escoge, pone notas ("sin cebolla") y envía.
   - El pedido llega "por aceptar" con una campanita. Al aceptarlo, los precios se toman del menú de ese momento.
   - El mesero también toma pedidos desde la app y puede agregar más cosas a un pedido abierto.
   - El cliente sigue su pedido en `/p/…` (se actualiza solo) y puede cancelarlo mientras nadie lo acepta.
   - Si se apagan los pedidos en línea, el menú arma el pedido y lo manda por WhatsApp.
4. **Cocina:** comandas por orden de llegada con el tiempo que llevan (en rojo después de 20 minutos). Empezar → Listo.
5. **Agotados:** cualquiera del equipo marca lo que se acabó y el menú lo muestra al instante.
6. **Caja:** una cuenta por mesa (aunque tenga varios pedidos) y una por cada pedido para llevar o a domicilio. Propina sugerida, descuento, forma de pago, vuelto y ticket para imprimir o mandar por WhatsApp.
7. **Cierre del día (dueño):** total, por forma de pago, propinas, descuentos, lo más vendido y las cuentas cobradas. Se imprime.

## Roles

| Rol | Qué hace |
| --- | --- |
| Dueño (`correoAdmin`) | Todo: menú, mesas, cierre, equipo y ajustes |
| Mesero | Pedidos, caja y agotados |
| Cocina | Comandas y agotados. No ve la caja |

Entran con un enlace de invitación (Más → Equipo).

## Palabras y módulos

- `cliente.json → textos` cambia "plato / mesero / mesa" (por ejemplo, "producto / cajero / mesa" en comida rápida).
- `cliente.json → modulos`: `menu`, `pedidos` y `caja` siempre van. `enlinea` (pedidos desde el menú y los QR) y `cocina` (pantalla de comandas) se pueden quitar. Sin cocina, el mesero marca "Ya está listo".

## Funciona en Firebase Spark (gratis)

- No usa Cloud Functions ni Storage. Las fotos se achican en el teléfono: la miniatura va en el plato y la foto grande aparte (`fotos/{id}`).
- Los pedidos usan códigos de 20 letras al azar: el cliente abre el suyo pero nadie puede listarlos.
- Las reglas (`firestore.plantilla.rules`) solo dejan al público crear pedidos "por aceptar", con el envío correcto y sin marcarlos como pagados.
- `scripts/preparar.mjs` pone el correo del dueño en las reglas al compilar.

## Lo que necesita el proyecto de Firebase del cliente

1. Authentication → Google habilitado.
2. Firestore creado (modo producción).
3. Una app web registrada (sus datos van en `cliente.json → firebase`).
4. La cuenta `publicador` de Carlos agregada como Editor.

## Publicar

En el repositorio del cliente hacen falta el secreto `FIREBASE_SERVICE_ACCOUNT` y la variable `PUBLICAR_APP = si`. Cada cambio en `main` se publica.

## Datos (Firestore)

| Colección | Qué guarda | Quién lee |
| --- | --- | --- |
| `categorias`, `platos`, `mesas` | el menú y las mesas | cualquiera |
| `fotos/{plato}` | foto grande | cualquiera con el id |
| `pedidos/{código}` | mesa o cliente, platos, total, estado | equipo; el cliente con su enlace |
| `ventas` | cuentas cobradas | dueño y meseros |
| `invitaciones/{código}`, `usuarios/{uid}` | equipo | dueño; cada uno lo suyo |
| `ajustes/general` | nombre, WhatsApp, domicilio, propina | cualquiera |

## Probar en la computadora

`firebase emulators:start --only auth,firestore` y luego `VITE_EMULADOR=si npm run dev`.
