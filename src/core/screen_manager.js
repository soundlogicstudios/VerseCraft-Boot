const loadedCss = new Set();
const loadedControllers = new Set();

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

/**
 * Load a controller module safely.
 * Controller module can export:
 *   - init({ screenEl, screenId, registry })
 *   - OR default export with init()
 */
async function ensure_controller_loaded(controllerPath, ctx) {
  if (!controllerPath) return;
  const key = String(controllerPath).trim();
  if (!key || loadedControllers.has(key)) return;

  try {
    // Dynamic import MUST be a relative URL that the browser can fetch.
    // controllerPath here is like "src/core/controllers/hunt_oregon_trail_controller.js"
    const mod = await import(`../../${key}`.replace(/\/{2,}/g, "/"));
    const initFn = mod?.init || mod?.default?.init || mod?.default;
    if (typeof initFn === "function") {
      await initFn(ctx);
      loadedControllers.add(key);
      console.log("[SCREEN] controller loaded:", key);
    } else {
      console.warn("[SCREEN] controller has no init():", key);
      loadedControllers.add(key); // prevent re-tries spam
    }
  } catch (err) {
    // CRITICAL: never black-screen just because a controller is missing.
    console.warn("[SCREEN] controller load failed:", key, err);
  }
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

    // Inject hitboxes
    const hitboxData = await load_hitboxes(screenDef.hitboxes);
    inject_hitboxes(screenEl, hitboxData);

    // ✅ Load controller (safe)
    await ensure_controller_loaded(screenDef.controller, {
      screenEl,
      screenId: id,
      registry
    });

    // Notify listeners (debug toolkit etc)
    window.dispatchEvent(new CustomEvent("vc:screenchange", { detail: { screenId: id } }));
  }

  function get_active() {
    return active;
  }

  return { show, get_active };
}
