(function () {
  "use strict";

  const widthSlider = document.getElementById("width-slider");
  const widthLabel = document.getElementById("width-label");
  const splitSlider = document.getElementById("split-slider");
  const splitLabel = document.getElementById("split-label");
  const splitGroup = document.getElementById("split-group");
  const splitToggle = document.getElementById("split-toggle");
  const controls = document.getElementById("controls");
  const message = document.getElementById("message");

  let viewportWidth = 1920;
  let splitThreshold = 900;
  let tabId = null;

  function widthToPercent(w) {
    return Math.round((w / viewportWidth) * 100);
  }
  function percentToWidth(p) {
    return Math.round((p / 100) * viewportWidth);
  }

  function updateSplitEnabled(widthPx) {
    if (widthPx >= splitThreshold) {
      splitGroup.classList.remove("disabled");
      splitSlider.disabled = false;
    } else {
      splitGroup.classList.add("disabled");
      splitSlider.disabled = true;
    }
  }

  function showMessage() {
    controls.style.display = "none";
    message.style.display = "block";
  }

  function showControls() {
    controls.style.display = "block";
    message.style.display = "none";
  }

  function init() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { showMessage(); return; }
      tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { type: "get-state" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          showMessage();
          return;
        }

        showControls();
        viewportWidth = response.viewportWidth || 1920;
        splitThreshold = response.splitThreshold || 900;

        // Width slider (30–90% of viewport)
        widthSlider.min = "30";
        widthSlider.max = "95";
        const pct = widthToPercent(response.width);
        widthSlider.value = String(Math.max(30, Math.min(95, pct)));
        widthLabel.textContent = "Card Width: " + pct + "%";

        // Split toggle
        splitToggle.checked = response.showSplitBar !== false;

        // Split slider
        const splitPct = Math.round(response.splitRatio * 100);
        splitSlider.value = String(splitPct);
        splitLabel.textContent = "Column Split: " + splitPct + "% / " + (100 - splitPct) + "%";
        updateSplitEnabled(response.width);
      });
    });
  }

  // Width slider — write to storage, content script reacts via onChanged
  widthSlider.addEventListener("input", () => {
    const pct = parseInt(widthSlider.value, 10);
    const px = percentToWidth(pct);
    widthLabel.textContent = "Card Width: " + pct + "%";
    updateSplitEnabled(px);
    chrome.storage.local.set({ trello_card_width: px });
  });

  // Split toggle — show/hide column drag handle
  splitToggle.addEventListener("change", () => {
    chrome.storage.local.set({ trello_show_split_bar: splitToggle.checked });
  });

  // Split slider — write to storage, content script reacts via onChanged
  splitSlider.addEventListener("input", () => {
    const pct = parseInt(splitSlider.value, 10);
    splitLabel.textContent = "Column Split: " + pct + "% / " + (100 - pct) + "%";
    chrome.storage.local.set({ trello_split_ratio: pct / 100 });
  });

  init();
})();
