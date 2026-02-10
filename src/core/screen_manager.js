const loadedCss = new Set();

function ensure_css_loaded(href) {
  if (!href || loadedCss.has(href)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  loadedCss.add(href);
}

async function load_hitboxes(url) {
  if (!url) return { hitboxes: [] };
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.warn("[SCREEN] hitboxes missing:", url, res.status);
    return { hitboxes: [] };
  }
  return await res.json();
}

function clear_hitboxes(screenEl) {
  const layer = screenEl.querySelector(".hitbox-layer");
  if (layer) layer.innerHTML = "";
}

function inject_hitboxes(screenEl, hitboxData) {
  const layer = screenEl.querySelector(".hitbox-layer");
  if (!layer) return;

  layer.innerHTML = "";

  const boxes = Array.isArray(hitboxData?.hitboxes) ? hitboxData.hitboxes : [];
  for (const hb of boxes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vc-hitbox";
    btn.setAttribute("aria-label", hb.label || hb.id || "hitbox");

    btn.dataset.action = String(hb.action || "").trim();

    const x = Number(hb.x ?? 0);
    const y = Number(hb.y ?? 0);
    const w = Number(hb.w ?? 0);
    const h = Number(hb.h ?? 0);

    btn.style.left = `${x}%`;
    btn.style.top = `${y}%`;
    btn.style.width = `${w}%`;
    btn.style.height = `${h}%`;

    layer.appendChild(btn);
  }
}

function dispatch_screenchange(activeId) {
  try {
    window.dispatchEvent(new CustomEvent("vc:screenchange", { detail: { screen: activeId } }));
  } catch (_) {}
}

export function createScreenManager({ registry, rootEl }) {
  const screens = new Map();
  const screenEls = Array.from(rootEl.querySelectorAll(".screen"));
  for (const el of screenEls) {
    const id = el.getAttribute("data-screen");
    if (id) screens.set(id, el);
  }

  let active = null;

  async function show(screenId) {
    const id = String(screenId || "").trim();
    if (!id) return;

    const screenDef = registry?.screens?.[id];
    const screenEl = screens.get(id);

    if (!screenDef || !screenEl) {
      console.warn("[SCREEN] Missing screen in registry or HTML:", id);
      return;
    }

    // Hide old
    if (active && screens.get(active)) {
      const oldEl = screens.get(active);
      oldEl.classList.remove("is-active");
      clear_hitboxes(oldEl);
    }

    // Ensure CSS
    ensure_css_loaded(screenDef.css);

    // Show new
    screenEl.classList.add("is-active");
    active = id;

    // Hitboxes
    const hb = await load_hitboxes(screenDef.hitboxes);
    inject_hitboxes(screenEl, hb);

    // Screen change event for controllers
    dispatch_screenchange(active);
  }

  function get_active() {
    return active;
  }

  return { show, get_active };
}
