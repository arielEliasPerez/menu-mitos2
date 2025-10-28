// ===============================
// Utilidades
// ===============================
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

const currency = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

const state = {
  meta: null,
  sections: [],
  search: "",
  setActive: null,
};

// ===============================
// Carga de datos
// ===============================
const loadMeta = async () =>
  (await fetch("data/meta.json")).json();

const loadSections = async () =>
  (await fetch("data/sections/sections.json")).json();

const loadCategories = async (sectionId) => {
  try {
    return await (await fetch(`data/categories/${sectionId}Categories.json`)).json();
  } catch {
    return [];
  }
};

const loadProducts = async (sectionId) => {
  try {
    return await (await fetch(`data/products/${sectionId}Products.json`)).json();
  } catch {
    return {};
  }
};

// ===============================
// Renderizado
// ===============================
function renderHeaderMeta(meta) {
  if (meta.logo) qs(".logo").src = meta.logo;
  const nav = qs(".socials");
  nav.innerHTML = (meta.social ?? [])
    .map(
      (s) => `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="${s.name}">
        <img src="${s.icon}" alt="" />
      </a>`
    )
    .join("");
  document.title = `${meta.title} — Menú`;
  qs("#year").textContent = new Date().getFullYear();
}

function renderSectionsNav(sections) {
  const nav = qs("#sections-nav");
  nav.innerHTML = sections
    .map((sec) => `<a href="#section-${sec.id}" data-id="${sec.id}">${sec.name}</a>`)
    .join("");

  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    document.getElementById(`section-${a.dataset.id}`).scrollIntoView({
      behavior: "smooth",
      block: "start" ,
    });
  });

  const links = qsa("a", nav);
  const setActive = (id) => {
    links.forEach((l) => l.classList.toggle("active", l.dataset.id === id));
  };
  state.setActive = setActive;
}
function renderProduct(p, categoryId, sectionId) {
  const exclusiveClass = categoryId == "exclusive" ? " exclusive" : "";
  return `<article class="product-card horizontal${exclusiveClass}" data-name="${escapeAttr(p.name)}" data-desc="${escapeAttr(p.description)}">
    <div class="product-image-wrap">
      <img class="product-image" src="assets/products/${sectionId}/${p.image}" alt="${escapeAttr(p.name)}" loading="lazy" />
    </div>
    <div class="product-content">
      <div class="product-name">${p.name}</div>
      <div class="product-desc">${p.description}</div>
      <div class="product-price">${currency(p.price)}</div>
    </div>
  </article>`;
}



function escapeAttr(str = "") {
  return String(str).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

async function renderSection(section) {
  const container = document.createElement("section");
  container.className = "section-block";
  container.id = `section-${section.id}`;

  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `<h2>${section.name}</h2>`;
  container.appendChild(header);

  if (section.hasCategories) {
    const categories = await loadCategories(section.id);
    const productsByCat = await loadProducts(section.id);

    for (const cat of categories) {
      const block = document.createElement("div");
      block.className = "category-block";
      block.innerHTML = `<h3 class="category-title">${cat.name}</h3>`;

      const grid = document.createElement("div");
      grid.className = "products-grid";

      for (const product of productsByCat[cat.id] || []) {
        grid.innerHTML += renderProduct(product, cat.id, section.id);
      }

      block.appendChild(grid);
      container.appendChild(block);
    }
  } else {
    const products = await loadProducts(section.id);
    const grid = document.createElement("div");
    grid.className = "products-grid";

    for (const product of products.default || []) {
      grid.innerHTML += renderProduct(product, "", section.id);
    }

    container.appendChild(grid);
  }

  qs("#menu-root").appendChild(container);
}

// ===============================
// Búsqueda
// ===============================
function filterProducts(term) {
  const showAll = !term;

  // 1. Filtrar productos
  const cards = qsa(".product-card");
  cards.forEach((card) => {
    if (showAll) {
      card.style.display = "";
      return;
    }
    const name = card.dataset.name.toLowerCase();
    const desc = card.dataset.desc.toLowerCase();
    const match = name.includes(term) || desc.includes(term);
    card.style.display = match ? "" : "none";
  });

  // 2. Filtrar categorías
  const categories = qsa(".category-block");
  categories.forEach((cat) => {
    const visibleProducts = qsa(".product-card", cat).some(
      (p) => p.style.display !== "none"
    );
    cat.style.display = visibleProducts ? "" : "none";
  });

  // 3. Filtrar secciones
  const sections = qsa(".section-block");
  sections.forEach((sec) => {
    const visibleProducts = qsa(".product-card", sec).some(
      (p) => p.style.display !== "none"
    );
    sec.style.display = visibleProducts ? "" : "none";
  });
}

function observeActiveSection() {
  const sections = Array.from(qsa(".section-block"));
  const nav = document.getElementById("sections-nav");
  let lastActiveId = null;

  function update() {
    let currentId = null;

    for (const sec of sections) {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= 500) {                         // tu umbral
        currentId = sec.id.replace("section-", "");
      }
    }

    if (currentId && currentId !== lastActiveId) {
      lastActiveId = currentId;

      // Resaltar en el nav
      nav.querySelectorAll("a").forEach(a => a.classList.remove("active"));
      const link = nav.querySelector(`a[href="#section-${currentId}"]`);
      if (link) {
        link.classList.add("active");

        // 👇 en vez de scrollIntoView, cálculo manual
        const navRect = nav.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        const offset = link.offsetLeft - nav.offsetLeft;
        const targetScroll = offset - (navRect.width / 2 - linkRect.width / 2);

        nav.scrollTo({
          left: targetScroll,
          behavior: "smooth"
        });
      }
    }
  }

  window.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(update), { passive: true });

  update(); // inicial
}


// ===============================
// cambiar tema según festividad
// ===============================
async function applyTheme() {
  try {
    const res = await fetch("data/themes/themes.json");
    const themes = await res.json();

    // Fecha actual en formato MM-DD
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const today = `${month}-${day}`;

    console.log("Fecha actual:", today);

    let activeTheme = themes.default;

    // Buscar si alguna festividad coincide
    for (const key in themes) {
      if (key === "default") continue;
      const t = themes[key];
      if (t.dateRange && t.dateRange.length === 2) {
        const [start, end] = t.dateRange;
        if (isInRange(today, start, end)) {
          activeTheme = t;
          break;
        }
      }
    }

    // Aplicar clase al body
    document.body.classList.add(activeTheme.class);
    console.log("Tema aplicado:", activeTheme);
    // Si usás CSS separados, cargalo dinámicamente
    if (activeTheme.cssFile) {
      console.log("Cargando archivo CSS del tema:", activeTheme.cssFile);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      console.log("Ruta del CSS:", `themes/${activeTheme.cssFile}`);
      link.href = `data/themes/${activeTheme.cssFile}`;
      document.head.appendChild(link);
    }

  } catch (err) {
    console.error("Error cargando temas:", err);
  }
}

// Función auxiliar para chequear rango de fechas MM-DD
function isInRange(today, start, end) {
  // Caso simple: rango dentro del mismo mes
  if (start <= end) {
    return today >= start && today <= end;
  }
  // Caso especial: rango cruza de diciembre a enero (ej. 12-30 a 01-02)
  return today >= start || today <= end;
}

// ===============================
// Inicialización
// ===============================
// Llamar al iniciar


async function initMenu() {
  try {
    applyTheme();

    const meta = await loadMeta();
    const sections = await loadSections();
    state.meta = meta;
    state.sections = sections;

    renderHeaderMeta(meta);
    renderSectionsNav(sections);

    for (const section of sections) {
      await renderSection(section);
    }

    observeActiveSection();

    // buscador
    qs("#search").addEventListener("input", (e) => {
      state.search = e.target.value.trim().toLowerCase();
      filterProducts(state.search);
    });
  } catch (err) {
    console.error("Error cargando menú", err);
    qs("#menu-root").innerHTML = `<p>No se pudo cargar el menú. Intenta recargar.</p>`;
  }
}

window.addEventListener("DOMContentLoaded", initMenu);