# TAREAS.md · HoP website + Heart Meter

Actualizado: 2026-11-05. En orden.

## Esperando a Isaac

1. **Mandar el correo a Savannah y Elaine.** Borrador en Gmail de isaacvalarezo30@gmail.com, hilo "An idea for tracking fundraising this year". Pide una reunión y empuja que acepten el sitio sin hablar de precio.
   Hecho cuando: Isaac lo revisa y lo envía él. Pregunta abierta: ¿"la otra chica" es Elaine o Emily? ¿Emily va en copia?
2. **Correos de los mentores** (Emily, Paige, Savannah) para compartir la carpeta "HoP Participation media".
   Hecho cuando: Isaac aprueba compartir y la carpeta muestra a los tres como lectores.
3. **Mandar el link `/leaders/` a los leaders** con el código de equipo.
   Hecho cuando: Isaac lo envía y entra la primera donación o tarea real.

## Esperando a HoP

4. **Puntos de las 17 tareas** (Savannah, pestaña `Tasks`).
   Hecho cuando: ninguna tarea tiene `points` vacío.
5. **Fundraiser de Spotfund de cada leader y su monto base** (Savannah).
   Hecho cuando: `Settings` > `spotfund` tiene los 17 leaders y sus corazones suman Spotfund.
6. **Reunión sobre el sitio** con Savannah y Elaine: contenido, notas amarillas, camino de donación, Bluehost y correo de HoP.
   Hecho cuando: HoP aprueba el contenido y decide el dominio.

## Trabajo de ECG

7. **Fotos y estilo nuevo en las otras 4 páginas** (about, red-carpet-day, get-involved, donate). Solo fotos de HoP con origen anotado en `assets/fotos/FOTOS.md`.
   Hecho cuando: las 5 páginas comparten el estilo del inicio y `node tests/sitio.mjs` pasa.
8. **Planeación en el Heart Meter**, que pidió Savannah el 22 oct (por ejemplo, "venue confirmed for RCD Day 2, 1-4 pm" con costo).
   Hecho cuando: Savannah aprueba el diseño y hay pruebas de la regla.
9. **Transferir la hoja a una cuenta de HoP** con ECG como editor.
   Hecho cuando: el dueño es HoP, el backend responde y los activadores corren.
10. **Archivar el repo viejo** `jivalare-lab/hop-heart-meter` (lo hace Isaac desde esa cuenta).
11. **Cerrar la brecha 2 de 4.** El CI corre en verde en GitHub; falta que Isaac apruebe subir de nivel.

## Avisos

- GitHub Pages falló tres veces el 4 nov por timeouts de GitHub, aunque el sitio quedó publicado con la última versión. Si vuelve a fallar, comprobar `gh api repos/isaacvalarezo-equator/hop-website/pages --jq .status` y la página antes de reintentar; cada reintento manda un correo a Isaac.
