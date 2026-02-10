import { createRouter } from "./router.js";
import { createScreenManager } from "./screen_manager.js";
import { createInput } from "./input.js";

async function load_registry() {
  const res = await fetch("screen_registry.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load screen_registry.json (${res.status})`);
  return await res.json();
}

async function init_controllers_safe() {
  try {
    const mod = await import("./controllers/hunt_oregon_trail_controller.js");
    if (typeof mod.init_hunt_oregon_trail_controller === "function") {
      mod.init_hunt_oregon_trail_controller();
    } else {
      console.warn("[BOOT] Controller export missing: init_hunt_oregon_trail_controller");
    }
  } catch (err) {
    console.warn("[BOOT] Controller load failed (non-fatal):", err);
  }
}

async function main() {
  const registry = await load_registry();

  const rootEl = document.getElementById("appRoot");
  if (!rootEl) throw new Error("Missing #appRoot");

  const screenManager = createScreenManager({ registry, rootEl });
  const router = createRouter({ screenManager, registry });
  createInput({ rootEl, router });

  await init_controllers_safe();

  router.go(registry.start_screen || "menu");
}

main().catch((err) => {
  console.error("[BOOT] Fatal error:", err);
  alert("Boot error. Open console to see details.");
});
