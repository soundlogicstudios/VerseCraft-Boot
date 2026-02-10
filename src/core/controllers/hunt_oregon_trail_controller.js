// src/core/controllers/hunt_oregon_trail_controller.js
// Safe controller: NEVER hard-crash bootstrap. If TargetRunner import fails or
// methods are missing, we log and keep the app alive.

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
  try {
    const screenEl = getActiveScreen();
    if (!screenEl) return;

    const targetsLayer = ensureTargetsLayer(screenEl);

    runner = new TargetRunner({
      rootEl: screenEl,
      targetsLayerEl: targetsLayer,
      onScore: (delta) => console.log("[hunt] score +", delta),
      onMiss: () => console.log("[hunt] miss")
    });

    // Don’t crash if old runner is loaded
    if (runner && typeof runner.setMaxTargets === "function") runner.setMaxTargets(1);
    if (runner && typeof runner.setSpawnRate === "function") runner.setSpawnRate(950);

    if (runner && typeof runner.start === "function") {
      runner.start();
      console.log("[hunt] runner started");
    } else {
      console.warn("[hunt] TargetRunner missing start()");
    }
  } catch (err) {
    console.error("[hunt] controller start() failed:", err);
    // Keep app alive even if this fails
    runner = null;
  }
}

function stop() {
  try {
    if (!runner) return;
    if (typeof runner.stop === "function") runner.stop();
  } catch (err) {
    console.error("[hunt] controller stop() failed:", err);
  } finally {
    runner = null;
  }
}

export function init_hunt_oregon_trail_controller() {
  try {
    window.addEventListener("vc:screenchange", () => {
      const active = getActiveScreen();
      if (!active) {
        stop();
        return;
      }
      if (!runner) start();
    });

    // If you land directly on the screen
    setTimeout(() => {
      if (getActiveScreen() && !runner) start();
    }, 0);
  } catch (err) {
    console.error("[hunt] init failed:", err);
  }
}
