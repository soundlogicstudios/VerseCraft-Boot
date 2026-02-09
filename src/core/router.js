export function createRouter({ screenManager, registry }) {
  function go(screenId) {
    const id = String(screenId || "").trim();
    if (!id) return;

    if (!registry?.screens?.[id]) {
      console.warn("[ROUTER] Unknown screen:", id);
      return;
    }

    screenManager.show(id);

    // Broadcast a clean, simple event
    window.dispatchEvent(new CustomEvent("vc:screenchange", { detail: { screen: id } }));
  }

  return { go };
}
