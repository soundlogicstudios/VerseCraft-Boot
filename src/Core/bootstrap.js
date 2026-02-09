import { createRouter } from "./router.js";
import { createScreenManager } from "./screen_manager.js";
import { createInput } from "./input.js";

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
  if (is_debug_enabled()) document.body.classList.add("debug");

  const registry = await load_registry();

  const screenManager = createScreenManager({
    registry,
    rootEl: document.getElementById("appRoot")
  });

  const router = createRouter({ screenManager, registry });

  createInput({ rootEl: document.getElementById("appRoot"), router });

  // Initial screen
  router.go(registry.start_screen || "menu");
}

main().catch((err) => {
  console.error("[BOOT] Fatal error:", err);
  alert("Boot error. Open console to see details.");
});
