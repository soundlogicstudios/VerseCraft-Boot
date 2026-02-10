// src/core/controllers/hunt_oregon_trail_controller.js
import { TargetRunner } from "../games/target_runner.js";

let runner = null;

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

function start() {
  const screenEl = getActiveScreen();
  if (!screenEl) return;

  const targetsLayer = ensureTargetsLayer(screenEl);

  runner = new TargetRunner({
    rootEl: screenEl,
    targetsLayerEl: targetsLayer,
    assets: {
      squirrel_right: "assets/targets/squirrel_right.webp",
      squirrel_left: "assets/targets/squirrel_left.webp"
    },
    onScore: (delta) => {
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
