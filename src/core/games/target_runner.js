// src/games/target_runner.js
// Additive: lightweight runner for moving targets in a hunt screen.
// No external dependencies. Cleans up fully on stop().

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function now() {
  return performance && performance.now ? performance.now() : Date.now();
}

export class TargetRunner {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.rootEl - The hunt screen element (screen[data-screen="hunt_oregon_trail"])
   * @param {HTMLElement} [opts.targetsLayerEl] - Optional layer to append targets into
   * @param {Function} [opts.onScore] - callback(delta) when a target is hit
   * @param {Function} [opts.onMiss] - callback() when a target escapes
   * @param {Object} [opts.assets] - sprite urls for targets
   */
  constructor(opts) {
    this.rootEl = opts.rootEl;
    this.targetsLayerEl = opts.targetsLayerEl || null;

    this.onScore = typeof opts.onScore === "function" ? opts.onScore : null;
    this.onMiss = typeof opts.onMiss === "function" ? opts.onMiss : null;

    this.assets = opts.assets || {
      squirrel_right: "assets/targets/squirrel-right-facing.webp",
      squirrel_left: "assets/targets/squirrel-left-facing.webp"
    };

    this._running = false;
    this._raf = 0;
    this._lastT = 0;

    this._spawnTimer = 0;
    this._spawnEveryMs = 950; // tune later
    this._targets = [];
    this._maxTargets = 3;

    this._screenRect = null;
    this._resizeObs = null;

    this._container = null;
  }

  start() {
    if (this._running) return;
    this._running = true;

    // Ensure a targets layer exists (additive).
    this._container = this.targetsLayerEl || this._ensureTargetsLayer();

    // Cache bounds, keep updated.
    this._screenRect = this.rootEl.getBoundingClientRect();
    this._installResizeObserver();

    this._lastT = now();
    this._loop();
  }

  stop() {
    if (!this._running) return;
    this._running = false;

    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;

    this._uninstallResizeObserver();

    // Remove any spawned targets (DOM cleanup).
    for (const t of this._targets) {
      if (t && t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
    }
    this._targets = [];

    // Do not remove container if it existed already (safe).
    // If we created it, we can remove it to prevent leakage.
    if (this._container && this._container.dataset && this._container.dataset.vcCreated === "1") {
      if (this._container.parentNode) this._container.parentNode.removeChild(this._container);
    }
    this._container = null;
  }

  setSpawnRate(ms) {
    this._spawnEveryMs = clamp(Number(ms || 0), 200, 5000);
  }

  setMaxTargets(n) {
    this._maxTargets = clamp(Number(n || 0), 1, 10);
  }

  _ensureTargetsLayer() {
    // Preferred: find an existing .layer-targets inside the active hunt screen.
    let layer = this.rootEl.querySelector(".layer-targets");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "layer layer-targets";
      layer.dataset.vcCreated = "1";
      // Put it above bg, below UI if present.
      // If your engine has ordering, append near the end but before hitboxes layer.
      this.rootEl.appendChild(layer);
    }
    // Ensure it can position absolute children
    layer.style.position = layer.style.position || "absolute";
    layer.style.inset = layer.style.inset || "0";
    layer.style.pointerEvents = "none"; // targets themselves will re-enable
    return layer;
  }

  _installResizeObserver() {
    try {
      this._resizeObs = new ResizeObserver(() => {
        this._screenRect = this.rootEl.getBoundingClientRect();
      });
      this._resizeObs.observe(this.rootEl);
    } catch (_) {
      this._resizeObs = null;
      // Fallback: update bounds occasionally in loop
    }
  }

  _uninstallResizeObserver() {
    try {
      if (this._resizeObs) this._resizeObs.disconnect();
    } catch (_) {}
    this._resizeObs = null;
  }

  _loop() {
    if (!this._running) return;

    const t = now();
    const dt = Math.min(0.05, (t - this._lastT) / 1000); // cap dt to avoid jumps
    this._lastT = t;

    // Fallback bounds refresh if no ResizeObserver
    if (!this._resizeObs) this._screenRect = this.rootEl.getBoundingClientRect();

    this._spawnTimer += dt * 1000;
    if (this._spawnTimer >= this._spawnEveryMs) {
      this._spawnTimer = 0;
      if (this._targets.length < this._maxTargets) this._spawnOne();
    }

    this._tickTargets(dt);

    this._raf = requestAnimationFrame(() => this._loop());
  }

  _spawnOne() {
    const r = this._screenRect || this.rootEl.getBoundingClientRect();

    // Choose direction randomly
    const fromLeft = Math.random() < 0.5;

    // Y band: keep targets away from UI bottom buttons; tune later.
    const yMin = r.top + r.height * 0.28;
    const yMax = r.top + r.height * 0.72;
    const yPx = yMin + Math.random() * (yMax - yMin);

    const size = r.width * (0.12 + Math.random() * 0.06); // 12–18% of width
    const speed = r.width * (0.22 + Math.random() * 0.18); // px/s

    const xStart = fromLeft ? (r.left - size) : (r.right + size);
    const xEnd = fromLeft ? (r.right + size) : (r.left - size);

    const el = document.createElement("img");
    el.alt = "";
    el.draggable = false;
    el.decoding = "async";

    // Directional sprite
    el.src = fromLeft ? this.assets.squirrel_right : this.assets.squirrel_left;

    el.style.position = "fixed";
    el.style.left = `${xStart}px`;
    el.style.top = `${yPx}px`;
    el.style.width = `${size}px`;
    el.style.height = "auto";
    el.style.zIndex = "20";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.touchAction = "none";

    // Targets must be clickable; layer is pointer-events none.
    el.style.pointerEvents = "auto";

    const target = {
      el,
      fromLeft,
      x: xStart,
      y: yPx,
      size,
      speed: fromLeft ? speed : -speed,
      xEnd,
      alive: true
    };

    // Click = hit
    el.addEventListener("pointerdown", (e) => {
      // Don’t let this interfere with your hitbox layer behind it.
      e.preventDefault();
      e.stopPropagation();

      if (!target.alive) return;
      target.alive = false;

      // Remove immediately for responsiveness
      if (el.parentNode) el.parentNode.removeChild(el);

      // Callback for score
      if (this.onScore) this.onScore(1);
      this._targets = this._targets.filter((t) => t !== target);
    }, { passive: false });

    this._container.appendChild(el);
    this._targets.push(target);
  }

  _tickTargets(dt) {
    const r = this._screenRect;
    if (!r) return;

    const toRemove = [];

    for (const t of this._targets) {
      if (!t.alive) { toRemove.push(t); continue; }

      t.x += t.speed * dt;
      t.el.style.left = `${t.x}px`;

      const passed =
        (t.speed > 0 && t.x >= t.xEnd) ||
        (t.speed < 0 && t.x <= t.xEnd);

      if (passed) {
        t.alive = false;
        if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
        toRemove.push(t);
        if (this.onMiss) this.onMiss();
      }
    }

    if (toRemove.length) {
      this._targets = this._targets.filter((t) => !toRemove.includes(t));
    }
  }
}
