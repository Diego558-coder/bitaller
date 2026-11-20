# Bitaller en local + túnel + WhatsApp real (Windows)

Todo corre en **un computador** del equipo. Nada queda desplegado.
La base de datos es local (carpeta `.data`) y el túnel de Cloudflare es gratis y no pide cuenta.

## 0. Instalar (una sola vez)
Abra **PowerShell** y ejecute:
```powershell
winget install OpenJS.NodeJS.LTS
winget install Cloudflare.cloudflared
```
Cierre y vuelva a abrir PowerShell. Compruebe: `node -v` (22 o superior) y `cloudflared --version`.

## 1. Preparar el proyecto (una sola vez)
Descomprima `bitaller-app.zip`, entre a la carpeta y ejecute:
```powershell
npm install
npm run build
```

## 2. Abrir el túnel (ventana 1 de PowerShell)
```powershell
npm run tunel
```
Copie la URL que aparece, del tipo `https://algo-algo-algo.trycloudflare.com`.
**No cierre esta ventana.** Si la cierra, la URL cambia y hay que repetir el paso 4 en Meta.

## 3. Configurar y arrancar Bitaller (ventana 2 de PowerShell)
1. Copie `.env.local.ejemplo` con el nombre `.env.local`.
2. Ábralo con el Bloc de notas y complete las 3 líneas marcadas `<-- COMPLETAR`:
   - `APP_URL`: la URL del túnel del paso 2.
   - `META_ACCESS_TOKEN`: el token que genera Nicolás (empieza por EAA).
   - `META_APP_SECRET`: la clave secreta de la app de Nicolás (Configuración de la app > Básica).
3. Arranque:
```powershell
npm start
```
4. Compruebe en el navegador: `http://localhost:3000/api/health` debe decir `"whatsapp":"meta"`.

## 4. Conectar Meta (lo hace Nicolás, en su app)
WhatsApp > Configuración > Webhook:
- **URL de devolución de llamada:** `https://LA-URL-DEL-TUNEL.trycloudflare.com/api/whatsapp/webhook`
- **Token de verificación:** `Diego&Nico&AngeloLoMasBellako`
- Pulse **Verificar y guardar** (Bitaller debe estar encendido) y suscriba el campo **messages**.
- En "Paso 1 / Configuración de la API", agregue como destinatarios los celulares del equipo.

## 5. Probar
1. Desde un celular agregado como destinatario, escriba **hola** al número de prueba de Nicolás → el bot responde con el menú.
2. Entre a `http://localhost:3000` (usuario `nicolas@bitaller.co`, clave `bitaller123`) y registre un servicio con ese celular → llega el comprobante.
3. Responda **SÍ** y luego escriba la placa → llega el historial.

> Sin plantillas aprobadas, Meta solo deja responder a quien escribió en las últimas 24 h. Por eso el cliente escribe "hola" primero. Si un comprobante no se pudo enviar, queda pendiente y sale solo cuando el cliente escriba.

## Problemas comunes
| Síntoma | Solución |
|---|---|
| Meta: "No se pudo validar la URL" | Bitaller o el túnel están apagados, o la URL del túnel cambió. |
| El bot no responde | Revise la ventana 2: si dice `firma inválida`, `META_APP_SECRET` está mal. Si dice `error de Meta`, el token venció (dura 24 h) o el celular no está en la lista de destinatarios. |
| Se cerró el túnel | Vuelva a abrirlo, cambie `APP_URL` en `.env.local`, reinicie `npm start` y actualice la URL en Meta. |
| Recordatorios | En local se envían con el botón **Enviar ahora** de la página Recordatorios. |
