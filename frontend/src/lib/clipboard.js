/**
 * Robust copy-to-clipboard that works in sandboxed/iframe/preview contexts.
 * Falls back to a hidden textarea + execCommand("copy") if the async
 * Clipboard API rejects (e.g. NotAllowedError in headless or non-secure contexts).
 * Always resolves with a boolean — never throws.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_err) {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_err2) {
    return false;
  }
}
