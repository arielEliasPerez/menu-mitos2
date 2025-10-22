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
      block: "start",
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

// ===============================
// Scrollspy (resaltar sección activa)
// ===============================
function observeActiveSection() {
  const sections = qsa(".section-block");
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        const id = visible[0].target.id.replace("section-", "");
        state.setActive?.(id);
      }
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
  );
  sections.forEach((sec) => observer.observe(sec));
}

// ===============================
// Inicialización
// ===============================
async function initMenu() {
  try {
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