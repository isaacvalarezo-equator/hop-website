# CLAUDE.md

Lee `AGENTS.md`: es la fuente única de este proyecto. Después `VERIFICACION.md`, `TAREAS.md` y la última entrada de `CAMBIOS.md`.

## Filtro de verificación (obligatorio)

Este sistema es **nivel requerido 4, nivel actual 2**. Trabaja como **nivel 2**.

Verificar con: `node tests/leaders.js && node tests/sitio.mjs`

No escribas «verificado», «funciona» ni «listo» sin pegar la salida real de ese comando.

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
