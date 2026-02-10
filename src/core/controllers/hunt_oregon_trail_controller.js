import { TargetRunner } from "../games/target_runner.js";

let runner = null;
let bound = false;

function getActiveScreen() {
  return document.querySelector('.screen.is-active[data-screen="hunt_oregon_trail"]');
}

function ensureTargetsLayer(screenEl) {
  const existing = screenEl.querySelector(".layer-targets");
  if (existing) return existing;

  const layer = document.createElement("div");
  layer.className = "layer layer-targets";
  layer.dataset.vcCreated = "1";
  layer.style.position = "absolute";
  layer.style.inset = "0";
  layer.style.pointerEvents = "none";
  screenEl.appendChild(layer);
  return layer;
}

function ensureHud(screenEl) {
  let hud = screenEl.querySelector(".hunt-hud");
  if (hud) return hud;

  hud = document.createElement("div");
  hud.className = "hunt-hud";
  hud.dataset.vcCreated = "1";
  hud.innerHTML = `
    <div class="hunt-pill">Ammo: <span id="huntAmmoVal">10</span></div>
    <div class="hunt-pill">Score: <span id="huntScoreVal">0</span></div>
    <button type="button" class="hunt-fire" id="huntFireBtn">FIRE</button>
  `;
  screenEl.appendChild(hud);
  return hud;
}

function ensureModal(screenEl) {
  let bd = screenEl.querySelector(".hunt-modal-backdrop");
  if (bd) return bd;

  bd = document.createElement("div");
  bd.className = "hunt-modal-backdrop";
  bd.dataset.vcCreated = "1";
  bd.innerHTML = `
    <div class="hunt-modal" role="dialog" aria-modal="true" aria-label="How to Play">
      <div class="hunt-modal-title">How to Play</div>
      <div class="hunt-modal-body">
        Targets glide across one fixed track. Tap <b>FIRE</b> as they cross the scoring stripe.
        <br/><br/>
        <b>Perfect</b> = center. <b>Good</b> = close. <b>Graze</b> = barely. Otherwise: <b>Miss</b>.
        <br/><br/>
        Let a bear escape and a special attack target appears next.
      </div>
      <div class="hunt-modal-actions">
        <button type="button" class="hunt-modal-btn" id="huntModalClose">Start</button>
      </div>
    </div>
  `;
  screenEl.appendChild(bd);
  return bd;
}

function start() {
  const screenEl = getActiveScreen();
  if (!screenEl) return;

  const targetsLayer = ensureTargetsLayer(screenEl);
  ensureHud(screenEl);
  const modal = ensureModal(screenEl);

  const ammoEl = screenEl.querySelector("#huntAmmoVal");
  const scoreEl = screenEl.querySelector("#huntScoreVal");
  const fireBtn = screenEl.querySelector("#huntFireBtn");
  const closeBtn = screenEl.querySelector("#huntModalClose");

  let ammo = 10;
  let score = 0;

  if (ammoEl) ammoEl.textContent = String(ammo);
  if (scoreEl) scoreEl.textContent = String(score);

  // Show modal every time you enter hunt (simple + predictable)
  modal.style.display = "block";

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  runner = new TargetRunner({
    rootEl: screenEl,
    targetsLayerEl: targetsLayer,
    config: {
      trackYPercent: 56,
      stripeCenterXPercent: 50,
      stripeHalfWidthPercent: 12,
      perfectBandPercent: 2.5,
      goodBandPercent: 5.5,
      grazeBandPercent: 9.0,
      spawnIntervalMs: 950,
      speedPercentPerSec: 28
    },
    onResult: (r) => {
      if (!r) return;
      if (r.points) {
        score += r.points;
        if (scoreEl) scoreEl.textContent = String(score);
      }
    }
  });

  runner.start();

  if (fireBtn) {
    fireBtn.onclick = () => {
      if (!runner) return;
      if (ammo <= 0) return;

      ammo -= 1;
      if (ammoEl) ammoEl.textContent = String(ammo);

      runner.fire();

      // Ammo end — stop runner (end modal can be added next)
      if (ammo <= 0) {
        runner.stop();
      }
    };
  }
}

function stop() {
  if (!runner) return;
  runner.stop();
  runner = null;
}

export function init_hunt_oregon_trail_controller() {
  if (bound) return;
  bound = true;

  window.addEventListener("vc:screenchange", () => {
    const active = getActiveScreen();
    if (!active) {
      stop();
      return;
    }
    if (!runner) start();
  });

  // If you load directly into hunt screen
  setTimeout(() => {
    if (getActiveScreen() && !runner) start();
  }, 0);
}
