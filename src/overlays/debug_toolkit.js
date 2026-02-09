// src/overlays/debug_toolkit.js
// Debug-only hitbox calibration toolkit.
// ✅ HARD LOCK for iOS: while Draw is ON, prevent ALL scrolling/rubber-band.

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function round2(n) { return Math.round(n * 100) / 100; }

function rect_to_percent(boxPx, screenRect) {
  const x = ((boxPx.left - screenRect.left) / screenRect.width) * 100;
  const y = ((boxPx.top - screenRect.top) / screenRect.height) * 100;
  const w = (boxPx.width / screenRect.width) * 100;
  const h = (boxPx.height / screenRect.height) * 100;
  return {
    x: round2(clamp(x, 0, 100)),
    y: round2(clamp(y, 0, 100)),
    w: round2(clamp(w, 0, 100)),
    h: round2(clamp(h, 0, 100))
  };
}

function percent_to_style({ x, y, w, h }) {
  return { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` };
}

function get_active_screen_el() { return document.querySelector(".screen.is-active"); }
function get_hitbox_buttons(screenEl) { return screenEl ? Array.from(screenEl.querySelectorAll(".vc-hitbox")) : []; }
function get_hitbox_id(btn) { return String(btn?.dataset?.hitboxId || btn?.getAttribute?.("aria-label") || "").trim(); }
function get_hitbox_action(btn) { return String(btn?.dataset?.action || "").trim(); }

function parse_percent_style(btn) {
  const x = parseFloat(btn.style.left || "0");
  const y = parseFloat(btn.style.top || "0");
  const w = parseFloat(btn.style.width || "0");
  const h = parseFloat(btn.style.height || "0");
  return { x: round2(x), y: round2(y), w: round2(w), h: round2(h) };
}

function set_btn_percent_style(btn, perc) {
  const s = percent_to_style(perc);
  btn.style.left = s.left;
  btn.style.top = s.top;
  btn.style.width = s.width;
  btn.style.height = s.height;
}

function copy_text(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (_) {}
  document.body.removeChild(ta);
}

/* ✅ Global scroll killer (passive:false) */
function hard_prevent_scroll(e) {
  e.preventDefault();
}

/* ✅ iOS: stop pinch/zoom while drawing */
function hard_prevent_gesture(e) {
  e.preventDefault();
}

export function init_debug_toolkit() {
  const root = document.createElement("div");
  root.id = "vcDebugToolkit";
  root.className = "vc-debug-toolkit";
  root.innerHTML = `
    <div class="vc-dbg-header">
      <div class="vc-dbg-title">Debug Toolkit</div>
      <button type="button" class="vc-dbg-btn" data-cmd="minimize">Min</button>
      <button type="button" class="vc-dbg-btn" data-cmd="toggleDraw">Draw: OFF</button>
      <button type="button" class="vc-dbg-btn" data-cmd="clear">Clear</button>
      <button type="button" class="vc-dbg-btn" data-cmd="refresh">Refresh</button>
      <div class="vc-dbg-sub">Hitbox Calibrator</div>
    </div>

    <div class="vc-dbg-body">
      <div class="vc-dbg-row">
        <label class="vc-dbg-label">Active Screen</label>
        <div class="vc-dbg-pill" data-field="screenId">—</div>
      </div>

      <div class="vc-dbg-row">
        <label class="vc-dbg-label">Select Hitbox</label>
        <select class="vc-dbg-select" data-field="hitboxSelect"></select>
      </div>

      <div class="vc-dbg-grid">
        <div class="vc-dbg-cell"><div class="vc-dbg-k">x%</div><div class="vc-dbg-v" data-field="xPerc">—</div></div>
        <div class="vc-dbg-cell"><div class="vc-dbg-k">y%</div><div class="vc-dbg-v" data-field="yPerc">—</div></div>
        <div class="vc-dbg-cell"><div class="vc-dbg-k">w%</div><div class="vc-dbg-v" data-field="wPerc">—</div></div>
        <div class="vc-dbg-cell"><div class="vc-dbg-k">h%</div><div class="vc-dbg-v" data-field="hPerc">—</div></div>

        <div class="vc-dbg-cell"><div class="vc-dbg-k">x px</div><div class="vc-dbg-v" data-field="xPx">—</div></div>
        <div class="vc-dbg-cell"><div class="vc-dbg-k">y px</div><div class="vc-dbg-v" data-field="yPx">—</div></div>
        <div class="vc-dbg-cell"><div class="vc-dbg-k">w px</div><div class="vc-dbg-v" data-field="wPx">—</div></div>
        <div class="vc-dbg-cell"><div class="vc-dbg-k">h px</div><div class="vc-dbg-v" data-field="hPx">—</div></div>
      </div>

      <div class="vc-dbg-actions">
        <button type="button" class="vc-dbg-btn" data-cmd="previewToSelected">Preview → Selected</button>
        <button type="button" class="vc-dbg-btn" data-cmd="copyJson">Copy JSON</button>
      </div>

      <div class="vc-dbg-note" data-field="note">
        Tip: Turn Draw ON, drag a rectangle on the screen. Then choose a hitbox and preview-apply.
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const overlay = document.createElement("div");
  overlay.id = "vcDebugOverlay";
  overlay.className = "vc-debug-overlay";
  document.body.appendChild(overlay);

  const drawRect = document.createElement("div");
  drawRect.className = "vc-debug-draw-rect";
  overlay.appendChild(drawRect);

  const els = {
    screenId: root.querySelector('[data-field="screenId"]'),
    hitboxSelect: root.querySelector('[data-field="hitboxSelect"]'),
    xPerc: root.querySelector('[data-field="xPerc"]'),
    yPerc: root.querySelector('[data-field="yPerc"]'),
    wPerc: root.querySelector('[data-field="wPerc"]'),
    hPerc: root.querySelector('[data-field="hPerc"]'),
    xPx: root.querySelector('[data-field="xPx"]'),
    yPx: root.querySelector('[data-field="yPx"]'),
    wPx: root.querySelector('[data-field="wPx"]'),
    hPx: root.querySelector('[data-field="hPx"]'),
    note: root.querySelector('[data-field="note"]'),
    toggleDrawBtn: root.querySelector('[data-cmd="toggleDraw"]'),
    minimizeBtn: root.querySelector('[data-cmd="minimize"]')
  };

  let minimized = false;
  let drawMode = false;
  let activeScreen = null;
  let selectedBtn = null;

  let isDragging = false;
  let startX = 0, startY = 0;

  let lastBoxPx = null;
  let lastPerc = { x: 0, y: 0, w: 0, h: 0 };

  function set_minimized(on) {
    minimized = !!on;
    if (minimized) {
      root.classList.add("is-min");
      els.minimizeBtn.textContent = "Open";
    } else {
      root.classList.remove("is-min");
      els.minimizeBtn.textContent = "Min";
    }
  }

  function enable_hard_lock() {
    // prevent any scroll attempts anywhere
    document.addEventListener("touchmove", hard_prevent_scroll, { passive: false });
    window.addEventListener("gesturestart", hard_prevent_gesture, { passive: false });
    window.addEventListener("gesturechange", hard_prevent_gesture, { passive: false });
    window.addEventListener("gestureend", hard_prevent_gesture, { passive: false });
  }

  function disable_hard_lock() {
    document.removeEventListener("touchmove", hard_prevent_scroll);
    window.removeEventListener("gesturestart", hard_prevent_gesture);
    window.removeEventListener("gesturechange", hard_prevent_gesture);
    window.removeEventListener("gestureend", hard_prevent_gesture);
  }

  function set_draw_mode(on) {
    drawMode = !!on;

    if (drawMode) {
      overlay.classList.add("is-active");
      els.toggleDrawBtn.textContent = "Draw: ON";
      if (els.note) els.note.textContent = "Draw is ON: drag on screen to create a calibration box.";
      enable_hard_lock(); // ✅ the nuke option
    } else {
      overlay.classList.remove("is-active");
      els.toggleDrawBtn.textContent = "Draw: OFF";
      if (els.note) els.note.textContent = "Draw is OFF: navigation works normally. Turn Draw ON to calibrate.";
      disable_hard_lock();
    }
  }

  function set_fields_from_perc(perc, boxPx) {
    els.xPerc.textContent = String(perc.x);
    els.yPerc.textContent = String(perc.y);
    els.wPerc.textContent = String(perc.w);
    els.hPerc.textContent = String(perc.h);

    if (boxPx) {
      els.xPx.textContent = String(Math.round(boxPx.left));
      els.yPx.textContent = String(Math.round(boxPx.top));
      els.wPx.textContent = String(Math.round(boxPx.width));
      els.hPx.textContent = String(Math.round(boxPx.height));
    } else {
      els.xPx.textContent = "—";
      els.yPx.textContent = "—";
      els.wPx.textContent = "—";
      els.hPx.textContent = "—";
    }
  }

  function set_draw_rect(boxPx) {
    if (!boxPx) { drawRect.style.display = "none"; return; }
    drawRect.style.display = "block";
    drawRect.style.left = `${boxPx.left}px`;
    drawRect.style.top = `${boxPx.top}px`;
    drawRect.style.width = `${boxPx.width}px`;
    drawRect.style.height = `${boxPx.height}px`;
  }

  function refresh_active_screen() {
    activeScreen = get_active_screen_el();
    const id = activeScreen?.getAttribute?.("data-screen") || "—";
    els.screenId.textContent = id;

    const options = [];
    const btns = get_hitbox_buttons(activeScreen);

    options.push({ value: "", label: "— (none) —" });
    for (const b of btns) {
      const hbId = get_hitbox_id(b);
      const act = get_hitbox_action(b);
      options.push({ value: hbId, label: hbId ? `${hbId}  [${act}]` : `(unnamed)  [${act}]` });
    }

    els.hitboxSelect.innerHTML = "";
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      els.hitboxSelect.appendChild(o);
    }

    selectedBtn = null;
    els.hitboxSelect.value = "";
  }

  function find_btn_by_id(hbId) {
    if (!activeScreen || !hbId) return null;
    const btns = get_hitbox_buttons(activeScreen);
    for (const b of btns) {
      if (get_hitbox_id(b) === hbId) return b;
    }
    return null;
  }

  function preview_apply_to_selected() {
    if (!selectedBtn || !lastPerc) return;
    set_btn_percent_style(selectedBtn, lastPerc);
  }

  function copy_json() {
    const hbId = get_hitbox_id(selectedBtn) || "new_hitbox";
    const action = get_hitbox_action(selectedBtn) || "go:TARGET_SCREEN";
    const label = selectedBtn?.getAttribute?.("aria-label") || hbId;

    const json = { id: hbId, x: lastPerc.x, y: lastPerc.y, w: lastPerc.w, h: lastPerc.h, action, label };
    copy_text(JSON.stringify(json, null, 2));
    if (els.note) els.note.textContent = "Copied JSON. Paste it into the screen hitboxes JSON file.";
  }

  function on_pointer_down(e) {
    if (!drawMode) return;
    activeScreen = get_active_screen_el();
    if (!activeScreen) return;

    const r = activeScreen.getBoundingClientRect();
    const px = e.clientX;
    const py = e.clientY;

    if (px < r.left || px > r.right || py < r.top || py > r.bottom) return;

    isDragging = true;
    startX = px;
    startY = py;
    e.preventDefault();
  }

  function on_pointer_move(e) {
    if (!drawMode || !isDragging) return;
    activeScreen = get_active_screen_el();
    if (!activeScreen) return;

    const r = activeScreen.getBoundingClientRect();
    const curX = clamp(e.clientX, r.left, r.right);
    const curY = clamp(e.clientY, r.top, r.bottom);

    const left = Math.min(startX, curX);
    const top = Math.min(startY, curY);
    const width = Math.abs(curX - startX);
    const height = Math.abs(curY - startY);

    const boxPx = { left, top, width, height };
    lastBoxPx = boxPx;
    lastPerc = rect_to_percent(boxPx, r);

    set_draw_rect(boxPx);
    set_fields_from_perc(lastPerc, boxPx);
    e.preventDefault();
  }

  function on_pointer_up(e) {
    if (!drawMode) return;
    if (!isDragging) return;
    isDragging = false;
    e.preventDefault();
  }

  root.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-cmd]");
    if (!btn) return;

    const cmd = btn.dataset.cmd;

    if (cmd === "minimize") { set_minimized(!minimized); return; }
    if (cmd === "toggleDraw") { set_draw_mode(!drawMode); return; }

    if (cmd === "clear") {
      lastBoxPx = null;
      lastPerc = { x: 0, y: 0, w: 0, h: 0 };
      set_draw_rect(null);
      set_fields_from_perc(lastPerc, null);
      if (els.note) els.note.textContent = "Cleared. Turn Draw ON and drag a new rectangle.";
      return;
    }

    if (cmd === "refresh") { refresh_active_screen(); if (els.note) els.note.textContent = "Refreshed."; return; }

    if (cmd === "previewToSelected") {
      if (!selectedBtn) { if (els.note) els.note.textContent = "Select a hitbox first."; return; }
      preview_apply_to_selected();
      if (els.note) els.note.textContent = "Preview applied (visual only). Copy JSON to persist.";
      return;
    }

    if (cmd === "copyJson") {
      if (!lastBoxPx) { if (els.note) els.note.textContent = "Draw a rectangle first."; return; }
      copy_json();
      return;
    }
  });

  els.hitboxSelect.addEventListener("change", () => {
    const hbId = String(els.hitboxSelect.value || "").trim();
    selectedBtn = hbId ? find_btn_by_id(hbId) : null;

    if (selectedBtn && els.note) {
      const perc = parse_percent_style(selectedBtn);
      els.note.textContent = `Selected "${hbId}". Current: x=${perc.x}, y=${perc.y}, w=${perc.w}, h=${perc.h}. Draw a new box to replace.`;
    } else if (els.note) {
      els.note.textContent = "No hitbox selected. Draw a rectangle, then select a hitbox to preview-apply.";
    }
  });

  window.addEventListener("vc:screenchange", () => setTimeout(() => refresh_active_screen(), 0));

  overlay.addEventListener("pointerdown", on_pointer_down, { passive: false });
  overlay.addEventListener("pointermove", on_pointer_move, { passive: false });
  overlay.addEventListener("pointerup", on_pointer_up, { passive: false });
  overlay.addEventListener("pointercancel", on_pointer_up, { passive: false });

  refresh_active_screen();
  set_draw_mode(false);
  set_minimized(false);
}
