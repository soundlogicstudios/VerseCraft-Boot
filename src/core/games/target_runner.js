// src/core/games/target_runner.js
// Oregon Trail hunting target runner
// Single target at a time, off-screen spawns, rarity-based animals,
// conditional bear-attack target, correct facing by direction.

function now() {
  return performance?.now ? performance.now() : Date.now();
}

function pickWeighted(entries) {
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.key;
  }
  return entries[entries.length - 1].key;
}

export class TargetRunner {
  constructor({ rootEl, targetsLayerEl, onScore, onMiss } = {}) {
    this.rootEl = rootEl;
    this.layer = targetsLayerEl;
    this.onScore = onScore;
    this.onMiss = onMiss;

    this.running = false;
    this.raf = 0;
    this.lastTime = now();
    this.spawnTimer = 0;

    this.activeTarget = null;
    this.spawnInterval = 950;

    this.pendingBearAttack = false;

    // ✅ SINGLE SOURCE OF TRUTH FOR FILENAMES
    this.assets = {
      squirrel: {
        left: "assets/targets/squirrel-left-facing.webp",
        right: "assets/targets/squirrel-right-facing.webp"
      },
      rabbit: {
        left: "assets/targets/rabbit-left-facing.webp",
        right: "assets/targets/rabbit-right-facing.webp"
      },
      deer: {
        left: "assets/targets/deer-left-facing.webp",
        right: "assets/targets/deer-right-facing.webp"
      },
      bear: {
        left: "assets/targets/bear-left-facing.webp",
        right: "assets/targets/bear-right-facing.webp"
      },
      bear_attack: {
        single: "assets/targets/bear-attack-target.webp"
      }
    };
  }

  start() {
    if (this.running) return;
    if (!this.rootEl) return;

    this.running = true;
    this.lastTime = now();

    if (!this.layer) this.layer = this.ensureLayer();
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;

    if (this.activeTarget?.el) {
      this.activeTarget.el.remove();
    }
    this.activeTarget = null;
  }

  ensureLayer() {
    const layer = document.createElement("div");
    layer.className = "layer layer-targets";
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    this.rootEl.appendChild(layer);
    return layer;
  }

  chooseAnimal() {
    if (this.pendingBearAttack) {
      this.pendingBearAttack = false;
      return "bear_attack";
    }

    return pickWeighted([
      { key: "squirrel", w: 40 },
      { key: "rabbit", w: 30 },
      { key: "deer", w: 20 },
      { key: "bear", w: 8 }
    ]);
  }

  spawn() {
    if (this.activeTarget) return;

    const rect = this.rootEl.getBoundingClientRect();
    const type = this.chooseAnimal();
    const fromLeft = Math.random() < 0.5;

    const size = rect.width * (type === "bear" ? 0.18 : 0.14);
    const speed = rect.width * 0.28 * (fromLeft ? 1 : -1);

    const y = rect.top + rect.height * (0.35 + Math.random() * 0.3);
    const margin = rect.width * 0.05;

    const startX = fromLeft
      ? rect.left - size - margin
      : rect.right + margin;

    const endX = fromLeft
      ? rect.right + margin
      : rect.left - size - margin;

    const img = document.createElement("img");
    img.draggable = false;
    img.decoding = "async";

    if (type === "bear_attack") {
      img.src = this.assets.bear_attack.single;
    } else {
      img.src = fromLeft
        ? this.assets[type].right
        : this.assets[type].left;
    }

    img.onerror = () => {
      console.error("[hunt] Missing image:", img.src);
    };

    img.style.position = "fixed";
    img.style.left = `${startX}px`;
    img.style.top = `${y}px`;
    img.style.width = `${size}px`;
    img.style.zIndex = "25";
    img.style.pointerEvents = "auto";

    const target = {
      type,
      el: img,
      x: startX,
      endX,
      speed,
      alive: true
    };

    img.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!target.alive) return;

      target.alive = false;
      img.remove();
      this.activeTarget = null;
      this.onScore?.(1);
    });

    this.layer.appendChild(img);
    this.activeTarget = target;
  }

  tick(dt) {
    if (!this.activeTarget) return;

    const t = this.activeTarget;
    t.x += t.speed * dt;
    t.el.style.left = `${t.x}px`;

    const passed =
      (t.speed > 0 && t.x > t.endX) ||
      (t.speed < 0 && t.x < t.endX);

    if (passed) {
      t.alive = false;
      t.el.remove();
      this.activeTarget = null;

      if (t.type === "bear") {
        this.pendingBearAttack = true;
      }

      this.onMiss?.();
    }
  }

  loop() {
    if (!this.running) return;

    const t = now();
    const dt = Math.min(0.05, (t - this.lastTime) / 1000);
    this.lastTime = t;

    if (!this.activeTarget) {
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawn();
      }
    }

    this.tick(dt);
    this.raf = requestAnimationFrame(() => this.loop());
  }
}
