export function createInput({ rootEl, router }) {
  function handle_click(e) {
    const btn = e.target?.closest?.(".vc-hitbox");
    if (!btn) return;

    const action = String(btn.dataset.action || "").trim();
    if (!action) return;

    // Only supported action for Phase 1:
    // "go:screen_id"
    if (action.startsWith("go:")) {
      const target = action.slice(3).trim();
      router.go(target);
      return;
    }

    console.warn("[INPUT] Unknown action:", action);
  }

  rootEl.addEventListener("click", handle_click, { passive: true });
}
