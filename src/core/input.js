export function createInput({ rootEl, router }) {
  function handle_action(action) {
    const a = String(action || "").trim();
    if (!a) return;

    if (a.startsWith("go:")) {
      const screen = a.slice(3).trim();
      if (screen) router.go(screen);
      return;
    }

    console.warn("[INPUT] Unknown action:", a);
  }

  rootEl.addEventListener("click", (e) => {
    const btn = e.target?.closest?.(".vc-hitbox");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    handle_action(btn.dataset.action);
  }, { passive: false });

  // Mobile-friendly pointer support
  rootEl.addEventListener("pointerdown", (e) => {
    const btn = e.target?.closest?.(".vc-hitbox");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    // Click will follow; we keep this to reduce iOS delay
  }, { passive: false });
}
