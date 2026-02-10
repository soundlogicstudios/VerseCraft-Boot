console.log("BOOTSTRAP LIVE: v_boot_999");
window.__BOOT_VER = "v_boot_999";
import { createRouter } from "./router.js";
import { createScreenManager } from "./screen_manager.js";
import { createInput } from "./input.js";
import { init_hunt_oregon_trail_controller } from "./controllers/hunt_oregon_trail_controller.js";

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
  const debug = is_debug_enabled();
  if (debug) document.body.classList.add("debug");

  const registry = await load_registry();

  const rootEl = document.getElementById("appRoot");
  if (!rootEl) throw new Error("Missing #appRoot in index.html");

  const screenManager = createScreenManager({ registry, rootEl });
  const router = createRouter({ screenManager, registry });

  // Keep input wired
  createInput({ rootEl, router });

  // Debug-only toolkit (loads its own CSS)
  if (debug) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "styles/debug_toolkit.css";
    document.head.appendChild(link);

    const mod = await import("../overlays/debug_toolkit.js");
    mod.init_debug_toolkit();
  }

  // Controllers should never be able to break boot.
  // Init AFTER core is ready.
  try {
    init_hunt_oregon_trail_controller();
  } catch (e) {
    console.warn("[BOOT] Controller init failed (continuing):", e);
  }

  // =========================================================
  // START SCREEN (GUARANTEED)
  // =========================================================
  const startId = String(registry.start_screen || "menu").trim() || "menu";

  // 1) Try router navigation (normal path)
  try {
    router.go(startId);
  } catch (e) {
    console.warn("[BOOT] router.go failed, falling back to screenManager.show:", e);
  }

  // 2) HARD FAILSAFE: if still no active screen, force show
  setTimeout(async () => {
    const activeCount = rootEl.querySelectorAll(".screen.is-active").length;
    if (activeCount === 0) {
      console.warn("[BOOT] No active screen detected. Forcing show:", startId);
      await screenManager.show(startId);
    }

    const activeId =
      rootEl.querySelector(".screen.is-active")?.getAttribute("data-screen") || null;

    console.log("[BOOT] Active screen:", activeId);
  }, 0);
}

main().catch((err) => {
  console.error("[BOOT] Fatal error:", err);
  alert("Boot error. Open console to see details.");
});
