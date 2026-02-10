// src/core/controllers/hunt_oregon_trail_controller.js
import { TargetRunner } from "../games/target_runner.js";

let runner = null;

export function init({ screenEl, screenId }) {
  if (!screenEl || screenId !== "hunt_oregon_trail") return;

  // Start runner when this controller is first loaded and the screen is active
  if (runner) return;

  // Prefer existing targets layer if you have one
  const layer = screenEl.querySelector(".layer-targets") || null;

  runner = new TargetRunner({
    screenEl,
    layerEl: layer,
    assets: {
      squirrel_right: "assets/targets/squirrel_right.webp",
      squirrel_left: "assets/targets/squirrel_left.webp"
    },
    onHit: (n) => console.log("[hunt] hit +", n),
    onMiss: () => console.log("[hunt] miss")
  });

  runner.start();

  // Stop when leaving this screen (prevents leakage)
  const onChange = (e) => {
    const next = e?.detail?.screenId;
    if (next !== "hunt_oregon_trail" && runner) {
      runner.stop();
      runner = null;
      window.removeEventListener("vc:screenchange", onChange);
    }
  };

  window.addEventListener("vc:screenchange", onChange);
}
