// Menú del teléfono y aparición suave de secciones. Sin dependencias.
const raiz = document.documentElement;
raiz.classList.remove("sin-js");
raiz.classList.add("js");

const boton = document.querySelector(".menu-boton");
const menu = document.getElementById("menu");

if (boton && menu) {
  const cerrar = () => {
    menu.classList.remove("abierto");
    boton.setAttribute("aria-expanded", "false");
  };
  boton.addEventListener("click", () => {
    const abierto = menu.classList.toggle("abierto");
    boton.setAttribute("aria-expanded", String(abierto));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("abierto")) {
      cerrar();
      boton.focus();
    }
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) cerrar();
  });
}

const piezas = document.querySelectorAll(".aparece");
if ("IntersectionObserver" in window) {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px" }
  );
  piezas.forEach((p) => observador.observe(p));
} else {
  piezas.forEach((p) => p.classList.add("visible"));
}

// ---------- Inicio: fotos, frase, cifras y paralaje ----------
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fotos del hero: rotan cada 6,5 s, se detienen si la pestaña no se ve o si se pide menos movimiento.
const fotos = [...document.querySelectorAll(".hero-fotos img")];
const puntos = [...document.querySelectorAll(".hero-puntos i")];
if (fotos.length > 1 && !quieto) {
  let actual = 0;
  let reloj = null;
  const mostrar = (n) => {
    fotos[actual].classList.remove("activa");
    puntos[actual] && puntos[actual].classList.remove("activo");
    actual = n % fotos.length;
    // Reiniciar la animación de acercamiento y la barra de progreso.
    void fotos[actual].offsetWidth;
    fotos[actual].classList.add("activa");
    if (puntos[actual]) { void puntos[actual].offsetWidth; puntos[actual].classList.add("activo"); }
  };
  const arrancar = () => { if (!reloj) reloj = setInterval(() => mostrar(actual + 1), 6500); };
  const parar = () => { clearInterval(reloj); reloj = null; };
  document.addEventListener("visibilitychange", () => (document.hidden ? parar() : arrancar()));
  arrancar();
}

// La frase de la misión se enciende palabra por palabra al bajar.
const frase = document.querySelector("[data-palabras]");
let palabras = [];
if (frase && !quieto) {
  const acentos = new Set(["teens", "cancer", "walls", "spark", "VIP"]);
  frase.innerHTML = frase.textContent
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="palabra${acentos.has(w.replace(/[^\w]/g, "")) ? " acento" : ""}">${w}</span>`)
    .join(" ");
  frase.setAttribute("data-listo", "");
  palabras = [...frase.querySelectorAll(".palabra")];
}

// Paralaje suave de la banda de fotos. Solo transform.
const paralajes = [...document.querySelectorAll(".paralaje")];

let pendiente = false;
const alMover = () => {
  pendiente = false;
  const alto = innerHeight;
  if (palabras.length) {
    const r = frase.getBoundingClientRect();
    const avance = Math.min(1, Math.max(0, (alto * 0.85 - r.top) / (r.height + alto * 0.35)));
    const n = Math.round(avance * palabras.length);
    palabras.forEach((p, i) => p.classList.toggle("encendida", i < n));
  }
  if (!quieto) {
    for (const img of paralajes) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > alto) continue;
      const centro = (r.top + r.height / 2 - alto / 2) / alto;
      img.style.transform = `translate3d(0, ${(centro * -10).toFixed(2)}%, 0)`;
    }
  }
};
const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alMover); } };
if (palabras.length || paralajes.length) {
  addEventListener("scroll", pedir, { passive: true });
  addEventListener("resize", pedir);
  alMover();
}

// Las cifras cuentan hasta su valor la primera vez que se ven.
const cifras = document.querySelectorAll("[data-cuenta]");
if (cifras.length && !quieto && "IntersectionObserver" in window) {
  const contar = (el) => {
    const fin = Number(el.dataset.cuenta);
    const desde = fin > 1000 ? fin - 40 : 0;
    const sufijo = el.dataset.sufijo || "";
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 1400);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(desde + (fin - desde) * e) + sufijo;
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  const obs = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { contar(e.target); obs.unobserve(e.target); }
  }, { threshold: 0.6 });
  cifras.forEach((c) => obs.observe(c));
}
