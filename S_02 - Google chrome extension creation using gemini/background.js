/**
 * background.js — PageVoice Chrome Extension
 * Service worker: handles install lifecycle and any future messaging.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[PageVoice] Extension installed. Welcome!");
  } else if (details.reason === "update") {
    console.log("[PageVoice] Extension updated to version", chrome.runtime.getManifest().version);
  }
});

// Keep service worker alive if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ping") {
    sendResponse({ status: "alive" });
  }
});
