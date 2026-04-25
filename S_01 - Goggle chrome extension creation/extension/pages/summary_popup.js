const KEY = "summaryGoPopup";

async function main() {
  const { [KEY]: payload } = await chrome.storage.session.get(KEY);
  const heading = document.getElementById("heading");
  const bodyEl = document.getElementById("summary-body");
  const tabLine = document.getElementById("tab-line");
  const meta = document.getElementById("meta");
  const copyBtn = document.getElementById("copy");
  const closeBtn = document.getElementById("close");

  if (!payload || typeof payload.body !== "string") {
    heading.textContent = "Nothing to show";
    bodyEl.textContent = "Use “Summarize this page” from the SummaryGo popup or context menu.";
    copyBtn.hidden = true;
    closeBtn.addEventListener("click", () => window.close());
    return;
  }

  heading.textContent = payload.heading || "Summary";
  bodyEl.textContent = payload.body;
  if (payload.tabTitle) {
    tabLine.textContent = `Source tab: ${payload.tabTitle}`;
  }
  if (typeof payload.sourceChars === "number") {
    meta.textContent = `Summarized from about ${payload.sourceChars.toLocaleString()} characters of page text.`;
  }

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(payload.body);
      copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = "Copy summary";
      }, 1600);
    } catch {
      copyBtn.textContent = "Copy failed";
    }
  });

  closeBtn.addEventListener("click", () => window.close());
}

main();
