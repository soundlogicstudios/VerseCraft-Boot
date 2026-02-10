// src/core/games/target_runner.js
// Additive: single-target spawner with rarity + conditional "bear attack" target.
// - Only ONE target at a time (hard-locked)
// - Spawn always off-screen
// - Direction-based facing swap
// - Bear miss triggers next spawn = special attack target

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function tnow() {
  return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
}

function pickWeighted(items) {
  // items: [{ key, w }]
  let total = 0;
  for (const it of items) total += it.w;
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.key;
  }
  return items[items.length - 1].key;
}

export class TargetRunner {
  constructor({ rootEl, targetsLayerEl, assets, onScore, onMiss } = {}) {
    this.rootEl = rootEl;
    this.targetsLayerEl = targetsLayerEl || null;

    // Controller can override these paths; otherwise defaults match your filenames.
    this.assets = {
      squirrel_right: "assets/targets/squirrel-right-facing.webp",
      squirrel_left: "assets/targets/squirrel-left-facing.webp",

      rabbit_right: "assets/targets/rabbit-right-facing.webp",
      rabbit_left: "assets/targets/rabbit-left-facing.webp",

      deer_right: "assets/targets/deer-right-facing.webp",
      deer_left: "assets/targets/deer-left-facing.webp",

      bear_right: "assets/targets/bear-right-facing.webp",
      bear_left: "assets/targets/bear-left-facing.webp",

      bear_attack: "assets/targets/bear-attack-target.webp",

      ...(assets || {})
    };

    this.onScore = typeof onScore === "function" ? onScore : null;
    this.onMiss = typeof onMiss === "function" ? onMiss : null;

    this._running = false;
    this._raf = 0;
    this._last = 0;

    this._spawnEvery = 950;
    this._spawnT = 0;

    // HARD-LOCK: only one target at a time
    this._maxTargets = 1;

    this._targets = [];

    // If you miss a bear, the NEXT spawn becomes the special attack target
    this._pendingBearAttack = false;
  }

  start() {
    if (this._running) return;
    if (!this.rootEl) return;

    this._running = true;
    this._last = tnow();

    if (!this.targetsLayerEl) this.targetsLayerEl = this._ensureLayer();

    this._loop();
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;

    for (const t of this._targets) {
      try { t.el?.remove(); } catch (_) {}
    }
    this._targets = [];
  }

  setSpawnRate(ms) {
    this._spawnEvery = clamp(Number(ms || 950), 200, 5000);
  }

  // Kept for API compatibility, but we hard-lock to 1
  setMaxTargets(_n) {
    this._maxTargets = 1;
  }

  _ensureLayer() {
    let layer = this.rootEl.querySelector(".layer-targets");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "layer layer-targets";
      layer.style.position = "absolute";
      layer.style.inset = "0";
      layer.style.pointerEvents = "none";
      this.rootEl.appendChild(layer);
    }
    return layer;
  }

  _loop() {
    if (!this._running) return;

    const t = tnow();
    const dt = Math.min(0.05, (t - this._last) / 1000);
    this._last = t;

    // Spawn only if none exist
    if (this._targets.length < 1) {
      this._spawnT += dt * 1000;
      if (this._spawnT >= this._spawnEvery) {
        this._spawnT = 0;
        this._spawnOne();
      }
    } else {
      // keep timer from exploding while target is alive
      this._spawnT = 0;
    }

    this._tick(dt);
    this._raf = requestAnimationFrame(() => this._loop());
  }

  _chooseType() {
    // Special attack only when pending from a missed bear
    if (this._pendingBearAttack) {
      this._pendingBearAttack = false;
      return "bear_attack";
    }

    // Normal rarity (attack is NOT included here)
    // squirrel 40%, rabbit 30%, deer 20%, bear 8% (remaining 2% is conditional attack)
    return pickWeighted([
      { key: "squirrel", w: 40 },
      { key: "rabbit", w: 30 },
      { key: "deer", w: 20 },
      { key: "bear", w: 8 }
    ]);
  }

  _spriteFor(type, fromLeft) {
    // fromLeft=true means it moves left->right, so we want RIGHT-facing sprite
    const dir = fromLeft ? "right" : "left";

    if (type === "bear_attack") {
      // One image (no facing)
      return this.assets.bear_attack;
    }

    const key = `${type}_${dir}`;
    if (key === "squirrel_right") return this.assets.squirrel_right;
    if (key === "squirrel_left") return this.assets.squirrel_left;

    if (key === "rabbit_right") return this.assets.rabbit_right;
    if (key === "rabbit_left") return this.assets.rabbit_left;

    if (key === "deer_right") return this.assets.deer_right;
    if (key === "deer_left") return this.assets.deer_left;

    if (key === "bear_right") return this.assets.bear_right;
    if (key === "bear_left") return this.assets.bear_left;

    // Fallback
    return this.assets.squirrel_right;
  }

  _spawnOne() {
    const r = this.rootEl.getBoundingClientRect();

    const type = this._chooseType();
    const fromLeft = Math.random() < 0.5;

    // Size + speed tuned by screen width
    // Attack can be slightly larger, bears slightly larger
    const baseSize = r.width * (0.12 + Math.random() * 0.06);
    const size =
      type === "bear_attack" ? baseSize * 1.2 :
      type === "bear" ? baseSize * 1.15 :
      type === "deer" ? baseSize * 1.05 :
      baseSize;

    const baseSpeed = r.width * (0.22 + Math.random() * 0.18);
    const speed =
      type === "bear_attack" ? baseSpeed * 1.25 :
      type === "bear" ? baseSpeed * 0.95 :
      baseSpeed;

    // Y band (avoid bottom UI / frame edges)
    const yMin = r.top + r.height * 0.28;
    const yMax = r.top + r.height * 0.72;
    const y = yMin + Math.random() * (yMax - yMin);

    // Always start OFF-SCREEN with a margin
    const margin = Math.max(24, r.width * 0.03);
    const xStart = fromLeft ? (r.left - size - margin) : (r.right + margin);
    const xEnd = fromLeft ? (r.right + margin) : (r.left - size - margin);

    const el = document.createElement("img");
    el.alt = "";
    el.draggable = false;
    el.decoding = "async";

    el.src = this._spriteFor(type, fromLeft);

    el.style.position = "fixed";
    el.style.left = `${xStart}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = "auto";
    el.style.zIndex = "25";

    el.style.pointerEvents = "auto"; // clickable
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.touchAction = "none";

    const target = {
      type,
      fromLeft,
      el,
      x: xStart,
      y,
      speed: fromLeft ? speed : -speed,
      xEnd,
      alive: true
    };

    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!target.alive) return;
      target.alive = false;

      try { el.remove(); } catch (_) {}
      this._targets = [];

      if (this.onScore) this.onScore(1);
    }, { passive: false });

    this.targetsLayerEl.appendChild(el);
    this._targets = [target];
  }

  _tick(dt) {
    if (!this._targets.length) return;

    const t = this._targets[0];
    if (!t || !t.alive) {
      this._targets = [];
      return;
    }

    t.x += t.speed * dt;
    t.el.style.left = `${t.x}px`;

    const passed =
      (t.speed > 0 && t.x >= t.xEnd) ||
      (t.speed < 0 && t.x <= t.xEnd);

    if (passed) {
      // MISS
      t.alive = false;
      try { t.el.remove(); } catch (_) {}
      this._targets = [];

      // Special rule: missing a bear triggers next spawn = bear attack target
      if (t.type === "bear") {
        this._pendingBearAttack = true;
      }

      if (this.onMiss) this.onMiss();
    }
  }
}
