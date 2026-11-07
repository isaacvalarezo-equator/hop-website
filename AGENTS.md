# AGENTS.md · HoP website + Heart Meter

Fuente única para cualquier agente (Claude, Codex u otro). Léelo entero antes de tocar algo. Después lee `VERIFICACION.md`, `TAREAS.md` y la última entrada de `CAMBIOS.md`.

## Qué es

Un repositorio con tres piezas de Heart of Passion (HoP, nonprofit "For Teens From Teens"), cliente de ECG:

| Ruta | Qué es | Para quién |
|---|---|---|
| `/` (`index.html`, `about.html`, `red-carpet-day.html`, `get-involved.html`, `donate.html`, `assets/`) | Sitio nuevo de HoP, aprobado y en vivo desde el 7 nov 2026 | El público |
| `/leaders/` | Heart Meter: donaciones, outreach y participation points de los leaders de HoP Nola | Leaders (menores) y mentores, solo por link |
| `backend/Code.gs` | Apps Script que usa la hoja de Google como base de datos y lee Spotfund cada hora | El dueño de la hoja |

Personas: Savannah Solomon (fundadora y presidenta, mentora), Elaine Marie Ehrensing (board, lleva la visión del sitio), Emily Harris y Paige Butts (mentoras; Emily pidió los participation points el 1 nov 2026). Isaac es mentor del LDP de HoP Nola y dueño de ECG.

## Dónde vive

- Página: GitHub Pages con dominio propio, http://heartofpassion.org/ (HTTPS en espera del certificado) y `/leaders/`. Las URL de github.io redirigen ahí.
- Backend y datos: hoja "HoP Nola Heart Meter (data)" en **info@equatorcg.com**, Apps Script ligado (Script ID en `backend/.clasp.json`), despliegue web `AKfycbzI4lwB…` (URL completa en `leaders/config.js`).
- Carpetas de Drive en info@equatorcg.com: "HoP Participation media" (privada) y "HoP Heart Meter backups".
- El Heart Meter viejo (`jivalare-lab.github.io/hop-heart-meter`, hoja en isaacvalarezo30@gmail.com) está retirado. Estaba vacío y ningún leader tiene ese link.

## Cómo correrlo y publicarlo

```
npm ci                                   # una vez, para la auditoría del sitio
node tests/leaders.js && node tests/sitio.mjs   # la verificación (ver VERIFICACION.md)
cd backend && clasp push -f && clasp update-deployment AKfycbzI4lwBcZF90k4r25h0-JqHnOdI9Gi_J5kEiomXwYN3NxgLDD3BSWHcD2qoFMiDwu9LvA
```

`clasp` tiene que estar con sesión de info@equatorcg.com (`clasp login`). `update-deployment` mantiene la URL. Nunca pegar código a mano en el editor. Funciones que solo corre el dueño desde el editor: `setup`, `installSpotfund`, `installBackup`.

## Reglas que no se rompen

1. **Los códigos nunca van al repo.** El repo es público. `TEAM_CODE` y `MENTOR_CODE` viven solo en Script Properties. El 4 nov se filtró uno en `CAMBIOS.md` y hubo que cambiarlo.
2. **Los leaders son menores.** Sin ranking (los puntos van en orden alfabético), solo nombres de pila, sin correos ni teléfonos, reflexiones y fotos visibles solo para mentores. La página es `noindex` y el sitio público no enlaza a `/leaders/`.
3. **Nada inventado en el sitio.** Todo texto sale del sitio anterior de HoP o de HoP. Lo no confirmado lleva nota amarilla. Los puntos de las tareas no se inventan: el mentor los escribe hasta que Savannah los llene.
4. **El dinero no se cuenta dos veces.** Las reglas de Spotfund (línea base, desvincular lo registrado a mano) tienen pruebas en `tests/leaders.js`. No tocarlas sin prueba.
5. **El cliente es dueño de sus datos.** Estándar ECG «Entrega de sistemas con datos»: al final la hoja pasa a una cuenta de HoP y ECG queda como editor.
6. **Ningún correo sale sin que Isaac lo lea.** Siempre borrador más texto en el chat, y esperar su sí.

## Estilo

- Sin guion largo, en ningún archivo. Hay una prueba que lo revisa.
- Lo que lee HoP va en inglés. Lo interno (`CAMBIOS.md`, `TAREAS.md`, este archivo) va en español.
- Correos a HoP: la petición primero, párrafos cortos, voz humana, sin precio salvo que Isaac lo pida.
- Marca de HoP, no la de ECG: logo, rojo y azul, Open Sans.

## Arquitectura en corto

Página estática que lee con GET y escribe con POST al Apps Script. La hoja tiene las pestañas Donations, Outreach, Settings, Spotfund, Participation, Tasks y Log. Cada escritura queda en Log, con la fila completa si es un borrado. Las fechas se leen como las muestra la hoja (si no, Google las corre un día; ver `CAMBIOS.md` del 4 nov). Tras 25 códigos malos en 10 minutos, las escrituras se pausan 10 minutos.

## Nivel de verificación

Requerido 4, actual 2. Se trabaja como nivel 2: Isaac aprueba el diff antes de integrar. Subir de nivel lo decide Isaac.

<!-- verificacion:inicio -->
## Filtro de verificación (obligatorio)

Antes de trabajar aquí, lee `VERIFICACION.md` en esta misma carpeta.
Este sistema es **nivel requerido 4, nivel actual 2**.
Hay brecha abierta: trabaja como **nivel 2** aunque el sistema exija 4.

Verificar con: `node tests/leaders.js && node tests/sitio.mjs`

No escribas «verificado», «funciona» ni «listo» sin pegar la salida real de ese
comando. Un handoff de otro agente no es evidencia.

En el ciclo LOCK-IN, este filtro es el contenido del paso **Check**, y
el «las validaciones proporcionales al riesgo pasaron» del estándar de
cierre se mide contra el nivel declarado arriba, con la salida real del
comando pegada en el informe. Sin esa salida, la tarea no está cerrada.

Protocolo completo: `~/.claude/verificacion/PROTOCOLO.md`
<!-- verificacion:fin -->
