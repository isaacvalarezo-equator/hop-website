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
