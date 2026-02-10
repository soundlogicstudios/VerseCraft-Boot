// src/core/bootstrap.js
// Boot-stable bootstrap with "no-black-screen" watchdog.

window.__BOOT_VER = "v_boot_watchdog_001";
console.log("BOOT", window.__BOOT_VER);

import { createRouter } from "./router.js";
import { createScreenManager } from "./screen_manager.js";
import { createInput } from "./input.js";

function install_global_error_traps() {
  window.addEventListener("error", (e) => {
    console.error("[GLOBAL ERROR]", e?.message || e, e?.filename, e?.lineno, e?.colno);
  });

  window.addEventListener("unhandledrejection", (e) => {
    console.error("[UNHANDLED REJECTION]", e?.reason || e);
  });
}

async function load_registry() {
  const res = await fetch("screen_registry.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load screen_registry.json (${res.status})`);
  return await res.json();
}

function force_visible_screen_fallback() {
  const screens = Array.from(document.querySelectorAll(".screen"));
  if (!screens.length) return;

  // If anything is active, we’re good.
  const active = document.querySelector(".screen.is-active");
  if (active) return;

  // Otherwise: force menu (or the first screen) visible.
  const menu = document.querySelector('.screen[data-screen="menu"]');
  const pick = menu || screens[0];

  screens.forEach(s => s.classList.remove("is-active"));
  pick.classList.add("is-active");

  console.warn("[WATCHDOG] No active screen found. Forced:", pick.getAttribute("data-screen"));
}

async function main() {
  install_global_error_traps();

  const appRoot = document.getElementById("appRoot");
  if (!appRoot) throw new Error("Missing #appRoot element in index.html");

  const registry = await load_registry();
  console.log("[BOOT] registry.start_screen =", registry?.start_screen);

  const screenManager = createScreenManager({
    registry,
    rootEl: appRoot
  });

  const router = createRouter({ screenManager, registry });

  createInput({ rootEl: appRoot, router });

  // Start screen
  const start = registry.start_screen || "menu";
  router.go(start);

  // WATCHDOG: if anything ever wipes .is-active, we recover immediately.
  setInterval(force_visible_screen_fallback, 400);

  // iOS/Safari lifecycle recovery
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      // When returning to the tab, ensure something is visible.
      force_visible_screen_fallback();
    }
  });

  window.addEventListener("pageshow", () => {
    // On back-forward cache restores, re-assert visibility.
    force_visible_screen_fallback();
  });
}

main().catch((err) => {
  console.error("[BOOT] Fatal:", err);
});
