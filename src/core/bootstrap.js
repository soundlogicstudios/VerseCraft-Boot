// src/core/bootstrap.js

import { createRouter } from "./router.js";
import { createScreenManager } from "./screen_manager.js";
import { createInput } from "./input.js";

// 🚫 TEMPORARILY DISABLED — DO NOT IMPORT CONTROLLERS YET
// import { init_hunt_oregon_trail_controller } from "./controllers/hunt_oregon_trail_controller.js";

function is_debug_enabled() {
  try {
    const params = new URLSearchParams(location.search);
    return params.get("debug") === "1";
  } catch (_) {
    return false;
  }
}

async function load_registry() {
  const res = await fetch("screen_registry.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load screen_registry.json (${res.status})`);
  return await res.json();
}

async function main() {
  window.__BOOT_VER = "v_boot_reset_001";
  console.log("[BOOT]", window.__BOOT_VER);

  const debug = is_debug_enabled();
  if (debug) document.body.classList.add("debug");

  const registry = await load_registry();

  const screenManager = createScreenManager({
    registry,
    rootEl: document.getElementById("appRoot")
  });

  const router = createRouter({ screenManager, registry });

  createInput({
    rootEl: document.getElementById("appRoot"),
    router
  });

  // Debug toolkit
  if (debug) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "styles/debug_toolkit.css";
    document.head.appendChild(link);

    const mod = await import("../overlays/debug_toolkit.js");
    mod.init_debug_toolkit();
  }

  router.go(registry.start_screen || "menu");
}

main().catch((err) => {
  console.error("[BOOT] Fatal error:", err);
});
});
