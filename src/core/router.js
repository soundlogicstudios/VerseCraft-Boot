export function createRouter({ screenManager }) {
  function go(screenId) {
    const id = String(screenId || "").trim();
    if (!id) return;
    screenManager.show(id);
  }
  return { go };
}
