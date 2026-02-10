function pickWeighted(entries) {
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.key;
  }
  return entries[entries.length - 1].key;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export class TargetRunner {
  constructor({ rootEl, targetsLayerEl, config, onResult } = {}) {
    this.rootEl = rootEl;
    this.layer = targetsLayerEl;
    this.onResult = onResult;

    this.config = {
      trackYPercent: 56,
      stripeCenterXPercent: 50,
      stripeHalfWidthPercent: 12,
      perfectBandPercent: 2.5,
      goodBandPercent: 5.5,
      grazeBandPercent: 9.0,
      spawnIntervalMs: 950,
      speedPercentPerSec: 28,
      sizes: { squirrel: 14, rabbit: 15, deer: 16, bear: 18, bear_attack: 18 },
      ...config
    };

    this.running = false;
    this.raf = 0;
    this.lastT = 0;
    this.spawnTimer = 0;

    this.active = null;
    this.pendingBearAttack = false;

    // Filenames must match your assets folder EXACTLY.
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
    if (!this.rootEl || !this.layer) return;

    this.running = true;
    this.lastT = performance.now();
    this.spawnTimer = 0;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;

    if (this.active?.el) this.active.el.remove();
    this.active = null;
  }

  chooseType() {
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
    if (this.active) return;

    const type = this.chooseType();
    const dir = Math.random() < 0.5 ? "L2R" : "R2L";

    const wPct = Number(this.config.sizes?.[type] ?? 15);
    const speed = Number(this.config.speedPercentPerSec ?? 28) * (dir === "L2R" ? 1 : -1);

    // Off-screen only
    const marginPct = 6;
    const startXPct = dir === "L2R" ? -(wPct + marginPct) : (100 + marginPct);
    const endXPct = dir === "L2R" ? (100 + marginPct) : -(wPct + marginPct);

    const yPct = clamp(Number(this.config.trackYPercent ?? 56), 0, 100);

    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;

    if (type === "bear_attack") {
      img.src = this.assets.bear_attack.single;
    } else {
      img.src = dir === "L2R" ? this.assets[type].right : this.assets[type].left;
    }

    img.onerror = () => console.error("[hunt] Missing image:", img.src);

    img.style.position = "absolute";
    img.style.left = `${startXPct}%`;
    img.style.top = `${yPct}%`;
    img.style.width = `${wPct}%`;
    img.style.transform = "translateY(-50%)";
    img.style.pointerEvents = "none";

    this.layer.appendChild(img);

    this.active = {
      type,
      dir,
      el: img,
      xPct: startXPct,
      endXPct,
      speedPctPerSec: speed,
      wPct,
      alive: true
    };
  }

  fire() {
    const cfg = this.config;
    const stripeX = clamp(Number(cfg.stripeCenterXPercent ?? 50), 0, 100);
    const half = Math.max(1, Number(cfg.stripeHalfWidthPercent ?? 12));

    if (!this.active || !this.active.alive) {
      const r = { outcome: "miss", points: 0, type: null };
      this.onResult?.(r);
      return r;
    }

    const t = this.active;
    const centerX = t.xPct + (t.wPct / 2);
    const dist = Math.abs(centerX - stripeX);

    if (dist > half) {
      const r = { outcome: "miss", points: 0, type: t.type };
      this.onResult?.(r);
      return r;
    }

    const perfect = Number(cfg.perfectBandPercent ?? 2.5);
    const good = Number(cfg.goodBandPercent ?? 5.5);
    const graze = Number(cfg.grazeBandPercent ?? 9.0);

    let outcome = "graze";
    let points = 1;

    if (dist <= perfect) { outcome = "perfect"; points = 3; }
    else if (dist <= good) { outcome = "good"; points = 2; }
    else if (dist <= graze) { outcome = "graze"; points = 1; }
    else { outcome = "miss"; points = 0; }

    if (points > 0) {
      t.alive = false;
      t.el.remove();
      this.active = null;
    }

    const r = { outcome, points, type: t.type };
    this.onResult?.(r);
    return r;
  }

  tick(dtSec) {
    if (!this.active || !this.active.alive) return;

    const t = this.active;
    t.xPct += t.speedPctPerSec * dtSec;
    t.el.style.left = `${t.xPct}%`;

    const passed =
      (t.speedPctPerSec > 0 && t.xPct > t.endXPct) ||
      (t.speedPctPerSec < 0 && t.xPct < t.endXPct);

    if (passed) {
      const escapedType = t.type;

      t.alive = false;
      t.el.remove();
      this.active = null;

      // Special attack ONLY if bear escapes off-screen
      if (escapedType === "bear") {
        this.pendingBearAttack = true;
      }
    }
  }

  loop() {
    if (!this.running) return;

    const t = performance.now();
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    if (!this.active) {
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= Number(this.config.spawnIntervalMs ?? 950)) {
        this.spawnTimer = 0;
        this.spawn();
      }
    }

    this.tick(dt);
    this.raf = requestAnimationFrame(() => this.loop());
  }
}
