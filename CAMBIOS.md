# Bitácora de cambios

## 2026-11-02 · Claude Code (Opus 5.5) · creación del repo unificado y lectura de Spotfund

**Qué se hizo y por qué**: Isaac pidió que el sitio de HoP, el Heart Meter y los participation points sean uno solo en GitHub, en la cuenta `isaacvalarezo-equator`, con un repo nuevo y sin romper el link que ya usan los leaders. También pidió trabajar con Spotfund, que es lo que HoP ya usa, y no inventar.

- Sitio: copiado de `~/Desktop/ECG/02 Clientes/HoP website/sitio` (versión publicada en la vista previa del 25 oct), sin cambios de contenido.
- `/leaders/`: el Heart Meter de la rama `leaders-hub` de `~/Projects/hop-heart-meter` (guía y pruebas de la fase 0). `leaders/config.js` vacío a propósito, para que esta copia no escriba en la hoja real.
- `backend/Code.gs`: lector de Spotfund. Lee la página pública de la organización cada hora. Un fundraiser cuenta solo si está asignado a un leader en `Settings` y solo por encima de su monto base. Si la lectura falla o encuentra menos fundraisers que antes, conserva la última lectura buena, guarda el error, lo registra en el Log y lanza el error para que Apps Script avise por correo.
- Página: los corazones y el total suman Spotfund. Los regalos "Spotfund" registrados a mano por un leader ya asignado se muestran pero no cuentan dos veces. Hay un aviso rojo debajo del total, y en la barra de abajo, cuando Spotfund no se pudo leer o la lectura tiene más de 3 horas.
- Pruebas: `tests/leaders.js` (antes `verificar.js`), `tests/sitio.mjs` (antes `sitio/verificar.mjs`, ahora con Playwright fijado en `package.json`) y `tests/movil.py`. Hay un CI que corre los tres. El ejemplo de Spotfund en `tests/fixtures` tiene nombres e ids inventados: no se copian datos de menores al repo.

**Hechos comprobados**: el `robots.txt` de Spotfund permite leer las páginas de organización y de fundraisers. El lector, corrido contra la página real guardada el 2 nov, encontró 19 fundraisers que suman $14,965, lo mismo que dio una extracción independiente. El de un leader se cruzó contra su propia página y coincide en monto, meta y donantes. Ninguno se creó para la temporada 2027: el más nuevo es del 16 ene 2026, y el que se cruzó es del 28 dic 2025. Por eso existe el monto base.

**Verificación**: `node tests/leaders.js` → all checks passed. `node tests/sitio.mjs` → 657/657 checks ok. `tests/movil.py` → all phone checks passed. Mutaciones a propósito, todas en rojo y de vuelta en verde al revertir: sin el freno de "menos fundraisers", con montos negativos permitidos y con doble conteo. Se miró la página en iPhone 13 con Spotfund al día y con Spotfund caído.

**No verificado**: que Google (`UrlFetchApp`) pueda leer Spotfund. Solo se probó desde esta Mac. Spotfund podría bloquear servidores de Google. Se sabrá la primera vez que corra `installSpotfund`, y si falla lo dirá en rojo.

**Despliegue**: ver la entrada siguiente.

**Pendiente**: que Savannah diga qué fundraiser es de cada leader de 2027 y su monto base; publicar el backend nuevo en Apps Script (cuenta de Isaac); conectar `leaders/config.js`; mudar el link de los leaders; participation points.

## 2026-11-02 (2) · Claude Code (Opus 5.5) · inicio nuevo con fotos de HoP

**Qué se hizo**: Isaac pidió que el prototipo se vea de primer nivel, con fotos y el nombre de Heart of Passion al abrir. Cambios en `index.html`, `assets/styles.css` (bloque "Inicio, versión 2") y `assets/main.js`:
- Hero a pantalla completa con 3 fotos que rotan con un acercamiento lento, y "Heart of Passion" en grande.
- La frase de la misión se enciende palabra por palabra.
- Banda de foto con paralaje, historia con foto y cita de Savannah, cifras que cuentan (2002, 2004, 100%, 100%), programas con foto, tarjetas animadas y cierre rojo con el emblema que late.
- Todo el texto sigue saliendo del sitio anterior. Las notas amarillas se mantienen.

**Fotos**: 5 fotos de HoP del Internet Archive, en `assets/fotos/` con su origen en `FOTOS.md`. Isaac dijo que Savannah confirmó su uso el 2 nov. Pies y textos alternativos sin nombres, fechas ni eventos.

**Verificación**: `node tests/sitio.mjs` → 669/669 checks ok, con la auditoría ajustada para cargar las fotos diferidas y revisar el movimiento del hero nuevo. `node tests/leaders.js` → all checks passed.

**Pendiente**: no miré las capturas del inicio nuevo. Están en el scratchpad de la sesión: Isaac debe abrir `index.html` y revisarlo. Las otras 4 páginas todavía no tienen fotos. No hay commit de este cambio.

## 2026-11-03 · Claude Code (Opus 5.5) · participation points (pedido de Emily Harris)

**Qué se hizo**: el sitio de participation points que pidió Emily el 1 nov ya existe, como pestaña **Points** del Heart Meter (`/leaders/`).
- Formulario con los campos de Emily, en su orden: nombre, con quién trabajó, qué tarea hizo, cuánto tardó (minutos), qué aprendió, qué haría distinto, y foto o video (hasta 3 archivos de 8 MB) o un link.
- Las tareas son las 17 de la hoja "Participation Points" de Savannah. Sus puntos están vacíos, así que el sistema no inventa ninguno: el mentor escribe los puntos al aprobar, o se toman de la pestaña `Tasks` cuando Savannah los llene.
- Revisión de mentor con un `MENTOR_CODE` distinto del código de equipo. El mentor ve qué aprendió el leader, qué haría distinto y los archivos, y aprueba o rechaza. Los puntos solo cuentan aprobados. Cada revisión queda en el Log con la fila como estaba antes.
- Fotos y videos van a la carpeta privada de Drive "HoP Participation media". La página para todos solo muestra "1 attachment", nunca el archivo ni las reflexiones.
- Cada contacto registrado en Outreach crea también una tarea pendiente de "Contact/pitch potential sponsor/partner".
- El resumen de puntos va en orden alfabético, no como ranking, porque los leaders son menores.
- La guía de la página ya explica la pestaña Points.
- En el inicio del sitio se renombraron las clases nuevas (`pilares`, `relato`, `cita-fundadora`) porque chocaban con estilos viejos que tenían el mismo nombre.

**Verificación**: `node tests/leaders.js` → all checks passed (115 checks; 23 nuevos de participation: tareas que no existen, tiempo fuera de rango, reflexiones obligatorias, solo links https, tipos y número de archivos, que un archivo malo no guarde ninguno, que la página pública no reciba reflexiones ni media, códigos de mentor, puntos sin definir, puntos negativos, aprobación, rechazo, Log y la tarea automática de outreach). `tests/movil.py` → all phone checks passed. `node tests/sitio.mjs` → 669/669 checks ok. Además se recorrió el flujo completo en un teléfono de 390 px contra un backend de prueba local: enviar con foto, rechazo del código de mentor equivocado, aprobar sin puntos (pide el número), aprobar con 3 puntos y verlos sumados. 14 de 14 ok y sin errores de consola. Sin desborde a 390 ni a 320 px.

**No verificado**: la subida de archivos contra Google real (`DriveApp`, límite de tamaño del POST de Apps Script). Se prueba al publicar el backend con la cuenta de Isaac.

**Despliegue**: nada. Para activarlo hay que pegar `backend/Code.gs` en Apps Script, correr `setup` (crea las pestañas Participation y Tasks), agregar `MENTOR_CODE` en Script Properties, desplegar una versión nueva y compartir la carpeta "HoP Participation media" con los mentores.

**Pendiente**: que Savannah ponga los puntos de cada tarea; repartir el código de mentor a Emily, Paige y Savannah.

## 2026-11-04 · Claude Code (Opus 5.5) · subida a GitHub y preparación del despliegue del backend

**Qué se hizo**: con el visto bueno de Isaac se subió `6c0ab89` a `origin/main`. El CI `verificar` corrió en verde (run 41860818717, 2m37s). Se instaló `clasp` 3.4.1 en la Mac para publicar `backend/Code.gs` desde la terminal y no pegándolo a mano.

**Contexto**: el backend en vivo es `AKfycbwP5Nzd…/exec`, el que usa el Heart Meter viejo (`jivalare-lab.github.io/hop-heart-meter`). Se comparó con `backend/Code.gs`: las mismas acciones, las mismas columnas de Donations y Outreach, y el GET solo agrega campos. Publicarlo como versión nueva del mismo despliegue no rompe la página vieja y mantiene la URL.

**Verificación**: `node tests/leaders.js && node tests/sitio.mjs` → all checks passed, 669/669 checks ok. Una GET de solo lectura al backend en vivo respondió `ok:true`.

**Despliegue**: el backend todavía no está publicado. Falta que Isaac corra `clasp login` y pase el Script ID.

**Pendiente**: publicar el backend, correr `setup` e `installSpotfund` y autorizar Drive y UrlFetch desde el editor (eso solo lo puede hacer el dueño), poner `MENTOR_CODE`, conectar `leaders/config.js` y decidir dónde vive `/leaders/`.

## 2026-11-04 (2) · Claude Code (Opus 5.5) · backend en vivo en la cuenta de ECG

**Qué se hizo**: Isaac pidió dejarlo todo en info@equatorcg.com y corriendo.
- La hoja vieja ("HoP Nola Heart Meter (data)", de isaacvalarezo30@gmail.com) tenía 0 donaciones y 0 contactos. No se mudó nada: se creó una hoja nueva con el mismo nombre y su Apps Script en info@equatorcg.com con `clasp create`. Script ID en `backend/.clasp.json`.
- Despliegue web `AKfycbzI4lwB…` (ejecuta como el dueño, acceso anónimo), zona horaria America/Chicago. `TEAM_CODE` puesto en Script Properties (no está en el repo, que es público). Isaac aceptó los permisos. Corrieron `setup`, `installSpotfund` e `installBackup`.
- `leaders/config.js` apunta al backend nuevo.
- **Bug corregido**: una fecha guardada como 2026-11-04 volvía como 2026-11-03. Google convierte la celda en Date y, según las zonas horarias, cae el día anterior. `rows_` ahora usa lo que muestra la hoja cuando es yyyy-MM-dd, y si no, formatea en la zona de la propia hoja. Se probó primero solo con la zona de la hoja y no bastó contra Google real; por eso quedó la lectura de lo que se ve. 2 checks nuevos.

**Verificación**: `node tests/leaders.js && node tests/sitio.mjs` → all checks passed (117), 669/669 checks ok. Contra Google real: GET `ok:true` con los 17 leaders y las 17 tareas; Spotfund leído sin error (`readAt` 2026-11-04T17:09Z); código malo → `wrong_code`; código correcto → `ok`; una entrada de participation con una foto PNG → `ok`, `media: 1`, y la fecha 2026-11-04 después del arreglo (deploy @3). La fila de prueba se borró de la hoja. El archivo de prueba (PNG de 1 px) quedó en la carpeta privada "HoP Participation media".

**Despliegue**: backend en vivo (@3). Se actualiza con `clasp push -f && clasp update-deployment <id>`, misma URL. Para volver atrás: `clasp update-deployment <id> -V 2`, o apuntar `leaders/config.js` al backend viejo.

**Pendiente**: `MENTOR_CODE` (Isaac todavía no lo eligió; sin él nadie abre la revisión de mentor); compartir "HoP Participation media" con Emily, Paige y Savannah; puntos de cada tarea; mandar el link nuevo a los leaders; transferir a una cuenta de HoP según el estándar de entrega de sistemas de ECG.

## 2026-11-04 (3) · Claude Code (Opus 5.5) · código de mentor, limpieza y documento de entrega

**Qué se hizo**: `MENTOR_CODE` puesto en Script Properties (el valor lo tiene Isaac; no está en el repo). Para poder guardar hubo que quitar la propiedad vacía `spotfundError`: el editor no acepta valores vacíos y el código la lee como `|| ''`, así que no cambia nada. La imagen de prueba de 1 px se movió a la papelera de Drive. Nuevo `ENTREGA.md`, en inglés, para HoP: link, qué hace cada pestaña, dónde vive cada pieza, costo, qué puede cambiar el dueño, qué hacer si falla y pendientes.

**Verificación**: contra Google real, `mentor_queue` con el código de equipo → `wrong_mentor_code`; con el código de mentor → `ok:true, entries:[]`. La carpeta "HoP Participation media" aparece como privada en Drive. `node tests/leaders.js && node tests/sitio.mjs`, salida en el commit de esta entrada.

**No se hizo**: el link viejo (`jivalare-lab.github.io/hop-heart-meter`) sigue apuntando a la hoja vieja; la cuenta de GitHub de esta Mac no tiene permiso de escritura en ese repo. A los leaders hay que mandarles el link nuevo.

**Pendiente**: compartir la carpeta de media con los mentores (faltan sus correos), mandar el link a los leaders, puntos por tarea, fundraisers de Spotfund por leader, cuenta de HoP y transferencia.

## 2026-11-04 (4) · Claude Code (Opus 5.5) · código de equipo cambiado y avisos de GitHub Pages

**Qué se hizo**: el código de equipo anterior había quedado escrito en el historial público de este repo (commit 970c10e). Como nadie lo tenía todavía, Isaac eligió cambiarlo. El valor nuevo solo vive en Script Properties.

**Verificación**: contra Google real, el código nuevo → `ok:true` y el anterior → `wrong_code`.

**GitHub Pages**: el deploy de 7be9d6a se atascó en `updating_pages` del lado de GitHub y falló por timeout. Un rerun y un build pedido por API también terminaron en failure o cancelados, y cada uno mandó un correo. Aun así `pages` dice `built` con 7be9d6a, y el sitio sirve la versión nueva (`ENTREGA.md` y `/leaders/` → 200). Se dejó de reintentar.

**Despliegue**: este commit queda local, sin push, para no disparar otro deploy mientras Pages siga inestable.

## 2026-11-05 · Claude Code (Opus 5.5) · archivos de traspaso entre agentes

**Qué se hizo**: por la regla nueva de Isaac (traspaso entre agentes), se crearon `AGENTS.md` (fuente única: qué es, dónde vive, cómo publicar, reglas, estilo), `CLAUDE.md` (remite a `AGENTS.md` y al filtro de verificación) y `TAREAS.md` (pendientes en orden con su «hecho cuando»). No se tocó código.

**Estado comprobado hoy**: el backend responde `ok`, 0 donaciones y 0 tareas reales; Spotfund leído a las 15:18 UTC sin error; último respaldo a las 15:38 UTC. Los activadores por hora corrieron solos durante la noche.

**Verificación**: `node tests/leaders.js && node tests/sitio.mjs`, salida pegada en el informe de esta sesión.

**Pendiente**: ver `TAREAS.md`.

## 2026-11-07 · Claude Code (Opus 5.5) · el sitio sale de borrador

**Qué se hizo**: Isaac dijo que HoP aprobó el sitio y lo quiere en vivo hoy. Se quitaron el aviso "Draft for discussion" y las 32 notas amarillas de las 5 páginas públicas, se quitó `noindex`, y `robots.txt` ahora solo bloquea `/leaders/` y apunta a `sitemap.xml` (nuevo, con heartofpassion.org). Las frases que hablaban del sitio de 2023 se reescribieron en presente, sin agregar datos: Hang Time, membresías, quién estuvo en Red Carpet Day, cómo se registra un invitado y el título de la junta. `/leaders/` sigue con `noindex`.

**Ojo, sin confirmar por HoP** (estaban en las notas): la tarjeta "Online" de Donate dice PayPal pero no tiene link; la lista de la junta es la de 2023 más Elaine; fechas y requisitos del LDP y de Red Carpet Day vienen de 2023; las ciudades de la portada vienen de 2023 y no incluyen New Orleans.

**Verificación**: `node tests/leaders.js && node tests/sitio.mjs` → all checks passed, 674/674 checks ok. Las pruebas de `noindex` se invirtieron: el sitio público debe ser indexable y no tener notas ni aviso; `/leaders/` sigue bloqueado.

**Despliegue**: push a main, GitHub Pages. El dominio heartofpassion.org se conecta en Bluehost (4 registros A y CNAME `www`, sin tocar MX). Volver atrás: `git revert` de este commit.
