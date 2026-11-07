// Auditoría del prototipo, según la skill sitios-de-cliente-ecg.
// Uso: node tests/sitio.mjs [carpeta-de-capturas]
// Sale con código 1 si algún check falla.
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const capturas = process.argv[2];
if (capturas) mkdirSync(capturas, { recursive: true });

const paginas = ["index.html", "about.html", "red-carpet-day.html", "get-involved.html", "donate.html"];
const vistas = [
  { nombre: "movil", width: 390, height: 844 },
  { nombre: "chico", width: 320, height: 640 },
  { nombre: "escritorio", width: 1440, height: 900 },
];
const temas = ["light", "dark"];

let fallos = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    fallos++;
    console.log("FALLA", msg);
  }
};

// Checks del código fuente
for (const p of paginas) {
  const html = readFileSync(join(raiz, p), "utf8");
  ok(html.startsWith("<!doctype html>"), `${p}: doctype en la primera línea`);
  ok(/<head>\s*<meta charset="utf-8">/.test(html), `${p}: charset primero en head`);
  ok(!html.includes("—"), `${p}: sin guion largo`);
  // Live since 2026-11-07: the public site is indexable and carries no draft markers.
  ok(!html.includes('noindex'), `${p}: indexable (sitio en vivo)`);
  ok(!/class="nota"|aviso-borrador|Draft for discussion/.test(html), `${p}: sin notas ni aviso de borrador`);
}
const css = readFileSync(join(raiz, "assets/styles.css"), "utf8");
ok(!/minmax\(\d/.test(css), "styles.css: ningún minmax con ancho fijo sin min()");

const navegador = await chromium.launch();

for (const tema of temas) {
  for (const v of vistas) {
    const contexto = await navegador.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 2,
      colorScheme: tema,
      reducedMotion: "reduce",
    });
    const pagina = await contexto.newPage();
    const errores = [];
    pagina.on("pageerror", (e) => errores.push(e.message));
    pagina.on("console", (m) => m.type() === "error" && errores.push(m.text()));

    for (const p of paginas) {
      const id = `${p} [${v.nombre} ${tema}]`;
      await pagina.goto(pathToFileURL(join(raiz, p)).href, { waitUntil: "networkidle" });
      // Baja por toda la página para que carguen las fotos con loading="lazy", y vuelve arriba.
      await pagina.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
        scrollTo(0, 0);
      });

      const r = await pagina.evaluate(() => {
        const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
        const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
        const anclas = [...document.querySelectorAll('a[href^="#"]')]
          .map((a) => a.getAttribute("href").slice(1))
          .filter((h) => h && !document.getElementById(h));
        const enlaces = [...document.querySelectorAll("a[href]")]
          .map((a) => a.getAttribute("href"))
          .filter((h) => /^[a-z-]+\.html(#.*)?$/.test(h));
        const imgs = [...document.querySelectorAll("img")]
          .filter((i) => !i.hasAttribute("alt") || !i.getAttribute("width") || !i.getAttribute("height"))
          .map((i) => i.src);
        const rotas = [...document.querySelectorAll("img")].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src);
        const h1 = document.querySelectorAll("h1").length;
        const niveles = [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map((h) => +h.tagName[1]);
        const saltos = niveles.filter((n, i) => i > 0 && n > niveles[i - 1] + 1).length;
        const ancho = document.scrollingElement.scrollWidth - window.innerWidth;
        const fuente = document.fonts.check('800 1em "Open Sans"');
        const blanco = [document.body, ...document.querySelectorAll(".superficie, .alfombra, .pie, .aviso-borrador")]
          .every((el) => getComputedStyle(el).backgroundColor === "rgb(255, 255, 255)");

        // Contraste del texto contra el fondo efectivo
        const lum = (c) => {
          const [r, g, b] = c.map((x) => {
            x /= 255;
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const rgb = (s) => {
          const n = (s.match(/[\d.]+/g) || []).map(Number);
          // color-mix() devuelve color(srgb r g b / a) con canales de 0 a 1
          if (s.startsWith("color(")) return [...n.slice(0, 3).map((x) => x * 255), ...n.slice(3)];
          return n;
        };
        const fondoDe = (el) => {
          for (let e = el; e; e = e.parentElement) {
            const c = rgb(getComputedStyle(e).backgroundColor);
            if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c.slice(0, 3);
          }
          return rgb(getComputedStyle(document.body).backgroundColor).slice(0, 3);
        };
        const bajos = [];
        for (const el of document.querySelectorAll("p, li, a, h1, h2, h3, figcaption, summary, address, span, strong")) {
          if (!el.textContent.trim() || el.closest("[aria-hidden=true]")) continue;
          const est = getComputedStyle(el);
          if (est.visibility === "hidden" || est.display === "none" || el.getClientRects().length === 0) continue;
          const tinta = rgb(est.color);
          if (tinta.length === 4 && tinta[3] < 0.9) continue;
          const f = fondoDe(el);
          const [a, b] = [lum(tinta.slice(0, 3)), lum(f)];
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          const grande = parseFloat(est.fontSize) >= 24 || (parseFloat(est.fontSize) >= 18.6 && +est.fontWeight >= 700);
          if (ratio < (grande ? 3 : 4.5)) bajos.push(`${el.tagName} "${el.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
        }
        return { dup, anclas, enlaces, imgs, rotas, h1, saltos, ancho, fuente, blanco, bajos: [...new Set(bajos)].slice(0, 5) };
      });

      ok(r.dup.length === 0, `${id}: ids duplicados ${r.dup}`);
      ok(r.anclas.length === 0, `${id}: anclas rotas #${r.anclas}`);
      for (const e of r.enlaces) ok(existsSync(join(raiz, e.split("#")[0])), `${id}: enlace a archivo que no existe ${e}`);
      ok(r.imgs.length === 0, `${id}: img sin alt o sin dimensiones ${r.imgs}`);
      ok(r.rotas.length === 0, `${id}: img que no carga ${r.rotas}`);
      ok(r.h1 === 1, `${id}: ${r.h1} h1`);
      ok(r.saltos === 0, `${id}: saltos en la jerarquía de encabezados`);
      ok(r.ancho <= 0, `${id}: desborde lateral de ${r.ancho}px`);
      ok(r.fuente, `${id}: Open Sans no cargó`);
      ok(r.blanco, `${id}: el fondo de la página o de una sección no es blanco`);
      ok(r.bajos.length === 0, `${id}: contraste bajo ${r.bajos.join(" | ")}`);

      if (capturas) {
        await pagina.screenshot({ path: join(capturas, `${p.replace(".html", "")}-${v.nombre}-${tema}.png`), fullPage: true });
      }
    }
    ok(errores.length === 0, `[${v.nombre} ${tema}] errores de consola: ${errores.join(" | ")}`);
    await contexto.close();
  }
}

// Enlaces cruzados a #id de otra página
const ctx = await navegador.newContext();
const pg = await ctx.newPage();
for (const p of paginas) {
  const html = readFileSync(join(raiz, p), "utf8");
  for (const [, archivo, ancla] of html.matchAll(/href="([a-z-]+\.html)#([a-z-]+)"/g)) {
    await pg.goto(pathToFileURL(join(raiz, archivo)).href);
    ok(await pg.evaluate((a) => !!document.getElementById(a), ancla), `${p}: ${archivo}#${ancla} no existe`);
  }
}

// Menú del teléfono: abre, cierra con Escape y devuelve el foco
const movil = await navegador.newContext({ viewport: { width: 390, height: 844 } });
const m = await movil.newPage();
await m.goto(pathToFileURL(join(raiz, "index.html")).href);
await m.click(".menu-boton");
ok(await m.isVisible("#menu a[href='about.html']"), "menú: se abre en el teléfono");
ok((await m.getAttribute(".menu-boton", "aria-expanded")) === "true", "menú: aria-expanded true al abrir");
await m.keyboard.press("Escape");
ok(!(await m.isVisible("#menu a[href='about.html']")), "menú: Escape lo cierra");

// Movimiento: entrada única, secciones visibles al avanzar y respeto a la preferencia reducida.
const movimiento = await navegador.newContext({ reducedMotion: "no-preference" });
const animada = await movimiento.newPage();
await animada.goto(pathToFileURL(join(raiz, "index.html")).href);
ok(await animada.locator(".hero-titulo .linea > span").first().evaluate((el) => getComputedStyle(el).animationName === "subir"), "movimiento: el título del inicio entra una vez");
ok(await animada.locator(".hero-titulo .linea > span").first().evaluate((el) => getComputedStyle(el).animationIterationCount === "1"), "movimiento: la entrada del título no se repite");
await animada.locator(".pilares li").last().scrollIntoViewIfNeeded();
await animada.waitForFunction(() => document.querySelector(".pilares li:last-child").classList.contains("visible"));
ok(true, "movimiento: el contenido aparece al entrar en pantalla");
await movimiento.close();

const reducido = await navegador.newContext({ reducedMotion: "reduce" });
const sinMovimiento = await reducido.newPage();
await sinMovimiento.goto(pathToFileURL(join(raiz, "index.html")).href);
ok(await sinMovimiento.locator(".hero-titulo .linea > span").first().evaluate((el) => getComputedStyle(el).animationName === "none"), "movimiento reducido: el título no se desplaza");
ok(await sinMovimiento.locator(".hero-fotos img.activa").evaluate((el) => getComputedStyle(el).animationName === "none"), "movimiento reducido: la foto no hace zoom");
ok(await sinMovimiento.locator(".pilares li").first().evaluate((el) => getComputedStyle(el).opacity === "1"), "movimiento reducido: el contenido es visible");
await reducido.close();

await navegador.close();
console.log(`${checks - fallos}/${checks} checks ok${fallos ? `, ${fallos} fallan` : ""}`);
process.exit(fallos ? 1 : 0);
