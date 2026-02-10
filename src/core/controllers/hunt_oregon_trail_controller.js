// src/core/controllers/hunt_oregon_trail_controller.js

// 🔥 CACHE-BUST so iOS/GitHub Pages cannot serve an old module
import { TargetRunner } from "../games/target_runner.js?v=boot_001";

let runner = null;

function getActiveScreen() {
  return document.querySelector('.screen.is-active[data-screen="hunt_oregon_trail"]');
}

function ensureTargetsLayer(screenEl) {
  // Prefer existing layer if you have it.
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

function start() {
  const screenEl = getActiveScreen();
  if (!screenEl) return;

  const targetsLayer = ensureTargetsLayer(screenEl);

  runner = new TargetRunner({
    rootEl: screenEl,
    targetsLayerEl: targetsLayer,
    onScore: (delta) => console.log("[hunt] score +", delta),
    onMiss: () => console.log("[hunt] miss")
  });

  // ✅ TOLERANT CALLS: do not crash if older runner is still loaded
  if (typeof runner.setMaxTargets === "function") {
    runner.setMaxTargets(1);
  }
  if (typeof runner.setSpawnRate === "function") {
    runner.setSpawnRate(950);
  }

  runner.start();

  // Debug proof this file is actually live:
  console.log("[hunt] controller started; TargetRunner methods:", {
    setMaxTargets: typeof runner.setMaxTargets,
    setSpawnRate: typeof runner.setSpawnRate
  });
}

function stop() {
  if (!runner) return;
  runner.stop();
  runner = null;
}

export function init_hunt_oregon_trail_controller() {
  window.addEventListener("vc:screenchange", () => {
    const active = getActiveScreen();
    if (!active) {
      stop();
      return;
    }
    if (!runner) start();
  });

  setTimeout(() => {
    if (getActiveScreen() && !runner) start();
  }, 0);
}
