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
