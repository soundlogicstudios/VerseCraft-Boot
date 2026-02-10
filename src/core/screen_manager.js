// src/core/screen_manager.js

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

  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.warn("[SCREEN] hitboxes fetch failed:", url, err);
    return { hitboxes: [] };
  }

  if (!res.ok) {
    console.warn("[SCREEN] hitboxes missing:", url, res.status);
    return { hitboxes: [] };
  }

  const text = await res.text();
  const trimmed = text.trim();

  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    console.warn("[SCREEN] hitboxes URL returned HTML:", url);
    return { hitboxes: [] };
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("[SCREEN] JSON parse failed:", url, err);
    return { hitboxes: [] };
  }
}

function ensure_hitbox_layer(screenEl) {
  let layer = screenEl.querySelector(".hitbox-layer");
  if (layer) return layer;

  layer = document.createElement("div");
  layer.className = "hitbox-layer";
  layer.dataset.vcCreated = "1";

  layer.style.position = "absolute";
  layer.style.inset = "0";
  layer.style.zIndex = "9999";   // 🔥 FIX — ABOVE ALL UI ART
  layer.style.pointerEvents = "none";

  screenEl.appendChild(layer);
  return layer;
}

function clear_hitboxes(screenEl) {
  const layer = screenEl.querySelector(".hitbox-layer");
  if (layer) layer.innerHTML = "";
}

function inject_hitboxes(screenEl, hitboxData) {
  const layer = ensure_hitbox_layer(screenEl);
  layer.innerHTML = "";

  const boxes = Array.isArray(hitboxData?.hitboxes)
    ? hitboxData.hitboxes
    : [];

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

    btn.style.position = "absolute";
    btn.style.left = `${x}%`;
    btn.style.top = `${y}%`;
    btn.style.width = `${w}%`;
    btn.style.height = `${h}%`;

    btn.style.pointerEvents = "auto";

    layer.appendChild(btn);
  }

  console.log(
    `[SCREEN] injected ${boxes.length} hitboxes into`,
    screenEl.getAttribute("data-screen")
  );
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
      console.warn("[SCREEN] Missing screen:", id);
      return;
    }

    if (active && screens.get(active)) {
      const oldEl = screens.get(active);
      oldEl.classList.remove("is-active");
      clear_hitboxes(oldEl);
    }

    ensure_css_loaded(screenDef.css);

    screenEl.classList.add("is-active");
    active = id;

    const hitboxData = await load_hitboxes(screenDef.hitboxes);
    inject_hitboxes(screenEl, hitboxData);

    console.log("[SCREEN] show:", id);
  }

  function get_active() {
    return active;
  }

  return { show, get_active };
}
