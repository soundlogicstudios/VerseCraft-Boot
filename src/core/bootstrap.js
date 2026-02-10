// src/core/bootstrap.js
// Hard-reset bootstrap to recover from Safari "SyntaxError: Parser error"
// This MUST parse cleanly or nothing else runs.

console.log("BOOTSTRAP PARSE OK");
window.__BOOT_VER = "v_boot_reset_001";

import { createRouter } from "./router.js";
import { createScreenManager } from "./screen_manager.js";
import { createInput } from "./input.js";

async function load_registry() {
  const res = await fetch("screen_registry.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load screen_registry.json (${res.status})`);
  return await res.json();
}

async function main() {
  console.log("BOOTSTRAP MAIN START");

  const registry = await load_registry();
  console.log("REGISTRY LOADED", registry);

  const appRoot = document.getElementById("appRoot");
  if (!appRoot) throw new Error("Missing #appRoot element in index.html");

  const screenManager = createScreenManager({
    registry,
    rootEl: appRoot
  });

  const router = createRouter({ screenManager, registry });

  createInput({ rootEl: appRoot, router });

  const start = registry.start_screen || "menu";
  console.log("GO START SCREEN:", start);
  router.go(start);
}

main().catch((err) => {
  console.error("BOOT FATAL", err);
});
