/**
 * content.js — PageVoice Chrome Extension
 * Runs in the context of every webpage.
 * Extracts clean readable text and sends it back to the popup.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractText") {
    try {
      const text = extractCleanText();
      sendResponse({ text });
    } catch (err) {
      sendResponse({ text: "", error: err.message });
    }
  }
  // Must return true if async (we're sync here but good practice)
  return true;
});

/**
 * Extracts readable text from the page, stripping noise elements.
 * Tries to grab article/main content first, then falls back to body.
 * Caps output at 15,000 characters to stay within Gemini's context budget.
 */
function extractCleanText() {
  // Tags to remove
  const NOISE_TAGS = [
    "script", "style", "noscript", "svg", "iframe",
    "nav", "footer", "aside", "header", "form",
    "button", "input", "select", "textarea", "canvas",
    "figure", "video", "audio", "ads", "advertisement"
  ];

  // Priority selectors for main content
  const CONTENT_SELECTORS = [
    "article",
    "main",
    '[role="main"]',
    ".post-content",
    ".article-body",
    ".entry-content",
    ".content-body",
    "#content",
    "#main-content",
  ];

  let root = null;

  // Try to find the richest content container
  for (const sel of CONTENT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el && el.innerText && el.innerText.trim().length > 200) {
      root = el;
      break;
    }
  }

  // Fall back to body
  if (!root) root = document.body;

  if (!root) return "";

  const clone = root.cloneNode(true);

  // Remove noise elements
  NOISE_TAGS.forEach((tag) => {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  });

  // Also remove hidden elements
  clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
  clone.querySelectorAll('[style*="display:none"]').forEach((el) => el.remove());
  clone.querySelectorAll('[style*="display: none"]').forEach((el) => el.remove());
  clone.querySelectorAll('[style*="visibility:hidden"]').forEach((el) => el.remove());

  // Get clean text
  let text = clone.innerText || clone.textContent || "";

  // Normalise whitespace
  text = text
    .replace(/[ \t]+/g, " ")          // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")       // collapse excessive newlines
    .trim();

  // Include page title for context
  const title = document.title ? `Page Title: ${document.title}\n\n` : "";

  return (title + text).substring(0, 15000);
}
