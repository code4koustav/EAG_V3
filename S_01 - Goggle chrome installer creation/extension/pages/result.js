async function main() {
  const { summaryGoPayload } = await chrome.storage.session.get("summaryGoPayload");
  const heading = document.getElementById("heading");
  const body = document.getElementById("body");
  const closeBtn = document.getElementById("close");

  if (!summaryGoPayload) {
    heading.textContent = "Nothing to show";
    body.textContent = "Open SummaryGo from a web page while the local server is running.";
  } else {
    heading.textContent = summaryGoPayload.heading || "SummaryGo";
    const lines = Array.isArray(summaryGoPayload.lines)
      ? summaryGoPayload.lines
      : [String(summaryGoPayload.text || "")];
    body.textContent = lines.join("\n\n");
  }

  closeBtn.addEventListener("click", () => window.close());
}

main();
