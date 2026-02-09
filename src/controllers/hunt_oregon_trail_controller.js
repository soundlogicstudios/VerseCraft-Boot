// src/controllers/hunt_oregon_trail_controller.js
import { TargetRunner } from "../games/target_runner.js";

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
    assets: {
      // Adjust to your real target sprites when ready:
      squirrel_right: "assets/targets/squirrel_right.webp",
      squirrel_left: "assets/targets/squirrel_left.webp"
    },
    onScore: (delta) => {
      // Additive hook: later we’ll connect ammo/food/date here
      // For now: just log so you know it works.
      console.log("[hunt] score +", delta);
    },
    onMiss: () => {
      console.log("[hunt] miss");
    }
  });

  runner.setMaxTargets(3);
  runner.setSpawnRate(950);
  runner.start();
}

function stop() {
  if (!runner) return;
  runner.stop();
  runner = null;
}

export function init_hunt_oregon_trail_controller() {
  // Start/stop based on screen changes.
  window.addEventListener("vc:screenchange", () => {
    // If we’re leaving hunt screen, stop.
    const active = getActiveScreen();
    if (!active) {
      stop();
      return;
    }
    // If we’re on hunt screen and not running, start.
    if (!runner) start();
  });

  // Also handle initial load if you land directly on the screen
  // (debug navigation sometimes does that).
  setTimeout(() => {
    if (getActiveScreen() && !runner) start();
  }, 0);
}
