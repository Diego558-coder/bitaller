# Bitaller · Cada servicio deja huella

MVP funcional de Bitaller: software por suscripción para talleres pequeños de motos y carros. El taller registra cada servicio desde el celular; el propietario del vehículo recibe por WhatsApp el comprobante, los recordatorios y el historial de su vehículo, sin instalar nada.

Proyecto del Taller de Emprendimiento e Innovación · Universidad de la Amazonia · 2026.

## Qué incluye

| Requisito | Dónde |
|---|---|
| RF1 Registro de servicio en menos de 1 minuto (placa, km, trabajos, repuestos, mecánico, total) | `/registrar` |
| RF2 El vehículo se crea en su primer servicio (placa + celular, sin cédula ni RUNT) | `src/lib/servicios.ts` |
| RF3 Comprobante por WhatsApp + autorización Ley 1581 respondiendo «SÍ» | `src/lib/servicios.ts`, `src/lib/bot.ts` |
| RF4 Recordatorios automáticos de aceite (60 días / +3.000 km), SOAT y tecnomecánica (7 días antes) | `src/lib/recordatorios.ts`, `/recordatorios`, `/api/cron/recordatorios` |
| RF5 El propietario escribe la placa y recibe el historial completo (todos los talleres, con precios) | `src/lib/bot.ts` |
| RF6 Consulta de terceros solo si el propietario escribe «PÚBLICO SÍ»: fechas y trabajos, sin precios ni taller | `src/lib/bot.ts` |
| RF7 Límite de 5 consultas de placa por número al día | `src/lib/bot.ts` |
| RF8 Resumen de ventas por día, semana y mecánico; clientes que volvieron; comprobantes | `/resumen` |
| RF9 Inventario básico: los repuestos se descuentan solos y avisan cuando están en el mínimo | `/repuestos` |
| RF10 Usuarios y roles (dueño / mecánico; el mecánico no ve totales de ventas) | `/mecanicos` |
| RF11 El mecánico ve el historial de su taller para una placa | `/vehiculos/[placa]` |
| Simulador de WhatsApp para el pitch (modo demo) | `/demo/whatsapp` |
| Política de tratamiento de datos | `/privacidad` |

Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 · PostgreSQL (Supabase en producción; PGlite embebido para demo local) · WhatsApp Cloud API de Meta · sesiones JWT con contraseñas bcrypt.

## 1. Probarlo en su computador (5 minutos)

Requisito: Node.js 20 o superior.

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
npm run build
npm start                   # abre http://localhost:3000
```

Sin `DATABASE_URL`, la app usa una base de datos embebida en `./.data` y la llena con datos de demostración.

| Cuenta | Correo | Contraseña |
|---|---|---|
| Dueño | nicolas@bitaller.co | bitaller123 |
| Mecánicos | andres@ · carlos@ · jhon@bitaller.co | bitaller123 |

Guion de demo para el pitch: entrar como dueño → **Resumen** → **Registrar servicio** con la placa `XYZ45F`, cambio de aceite + filtro, aceite y filtro del inventario, mano de obra 15000 (total $67.000) → **Ver lo que recibió el cliente** → en el simulador escribir `XYZ45F`, luego `Público sí`, y desde otro número consultar la placa para mostrar que no ve precios.

Reiniciar los datos demo: `npm run db:reset`.

## 2. Pruebas automáticas

```bash
npm test                         # 14 pruebas de reglas de negocio (registro, bot, privacidad, límites, recordatorios, firma de Meta)
pip install playwright && playwright install chromium
python tests/e2e/e2e.py          # 26 pruebas de navegador con la app corriendo en :3000
```

## 3. Publicarlo en internet (gratis)

WhatsApp necesita una URL pública con HTTPS para entregar los mensajes que escriben los clientes.

**Opción rápida para el pitch (desde su computador):**
```bash
npm start
npx cloudflared tunnel --url http://localhost:3000
```
Cloudflare entrega una dirección `https://xxxx.trycloudflare.com`. Póngala en `APP_URL` del `.env` y úsela para el webhook de Meta. Cambia cada vez que se reinicia el túnel.

**Opción estable:**
1. Cree un proyecto gratis en Supabase → *Project Settings → Database → Connection string → Transaction pooler* (puerto 6543). Esa es su `DATABASE_URL`. Las tablas se crean solas al arrancar.
2. Suba este código a un repositorio de GitHub y créelo como *Web Service* en Render (plan gratuito): build `npm install && npm run build`, start `npm start`. Copie las variables de `.env.example` en *Environment*.
3. Para los recordatorios diarios, cree una tarea en cron-job.org que llame a `https://SU-APP/api/cron/recordatorios?key=SU_CRON_SECRET` una vez al día (por ejemplo, a las 8:00 a. m.).

## 4. Conectar WhatsApp real (Meta, modo desarrollo, sin costo)

En modo desarrollo Meta da un número de prueba gratuito que puede escribir hasta a 5 números verificados.

1. En developers.facebook.com → *Mis apps* → *Crear app* → tipo *Empresa* → agregue el producto **WhatsApp**.
2. En *WhatsApp → Configuración de la API*:
   - Copie el **Phone number ID** → `META_PHONE_NUMBER_ID`.
   - Genere el **token de acceso** → `META_ACCESS_TOKEN`. El temporal dura 24 h; para uno permanente cree un *usuario del sistema* en el Business Manager con permiso `whatsapp_business_messaging`.
   - En **Para**, agregue los celulares de prueba (el suyo y los de sus compañeros); a cada uno le llega un código de verificación.
3. En *Configuración de la app → Básica*, copie la **Clave secreta de la app** → `META_APP_SECRET`.
4. En *WhatsApp → Configuración → Webhook*: URL `https://SU-APP/api/whatsapp/webhook`, token de verificación igual a `META_VERIFY_TOKEN` (por defecto `bitaller-verify`). Pulse *Verificar y guardar* y suscríbase al campo **messages**.
5. Ponga `WHATSAPP_MODE=meta` y reinicie la app. En *Configuración* de Bitaller verá si falta algo.

**Plantillas (recomendado).** Meta solo entrega texto libre si el cliente escribió en las últimas 24 horas. Para enviar el comprobante y los recordatorios en cualquier momento, cree en *WhatsApp Manager → Plantillas* (categoría *Utilidad*, idioma *Español*):

- `bitaller_comprobante`: *Comprobante de servicio en {{1}}: placa {{2}}, fecha {{3}}, trabajo {{4}}, total {{5}}. Responda SÍ para autorizar recordatorios y el historial de su vehículo (Ley 1581 de 2012). Escriba BAJA para no recibir mensajes.*
- `bitaller_recordatorio`: *Recordatorio para su vehículo {{1}}: {{2}}*

Cuando estén aprobadas, ponga `META_TEMPLATE_COMPROBANTE=bitaller_comprobante` y `META_TEMPLATE_RECORDATORIO=bitaller_recordatorio`. Bitaller usa la plantilla cuando la ventana de 24 h está cerrada y texto normal cuando está abierta.

Comandos que entiende el bot: una placa (ej. `XYZ45F`), `SÍ`, `PÚBLICO SÍ`, `PÚBLICO NO`, `BAJA`.

## Estructura

```
db/schema.sql            Tablas (se crean al arrancar)
src/lib/                 Lógica: servicios, bot, recordatorios, reportes, WhatsApp, auth
src/app/(app)/           Pantallas del taller
src/app/api/             Webhook de Meta, cron, simulador, health
src/app/demo/whatsapp/   Simulador de WhatsApp
tests/                   Pruebas unitarias y de navegador
```

## Seguridad y datos

- Cada consulta filtra por el taller de la sesión: un taller nunca ve los servicios de otro.
- El webhook valida la firma `X-Hub-Signature-256` con la clave secreta de la app y descarta reintentos duplicados.
- No se guardan cédulas; la autorización de datos queda con fecha y hora; `BAJA` revoca y cancela recordatorios.
- Cambie `AUTH_SECRET` y `CRON_SECRET` y las contraseñas de demo antes de usarlo con talleres reales (`SEED_DEMO=false`).
