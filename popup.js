(function () {
  "use strict";

  const widthSlider = document.getElementById("width-slider");
  const widthLabel = document.getElementById("width-label");
  const splitSlider = document.getElementById("split-slider");
  const splitLabel = document.getElementById("split-label");
  const splitGroup = document.getElementById("split-group");
  const splitToggle = document.getElementById("split-toggle");
  const enabledToggle = document.getElementById("enabled-toggle");
  const settings = document.getElementById("settings");
  const controls = document.getElementById("controls");
  const message = document.getElementById("message");

  let viewportWidth = screen.width;
  let splitThreshold = 900;

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

  function updateSettingsEnabled(on) {
    if (on) {
      settings.classList.remove("disabled");
    } else {
      settings.classList.add("disabled");
    }
  }

  function applyToggles(state) {
    enabledToggle.checked = state.enabled !== false;
    updateSettingsEnabled(enabledToggle.checked);
    splitToggle.checked = state.showSplitBar !== false;
  }

  function applyWidthState(state) {
    if (state.viewportWidth) viewportWidth = state.viewportWidth;
    if (state.splitThreshold) splitThreshold = state.splitThreshold;

    // Width slider
    widthSlider.min = "30";
    widthSlider.max = "95";
    const width = state.width || Math.round(viewportWidth * 0.56);
    const pct = widthToPercent(width);
    widthSlider.value = String(Math.max(30, Math.min(95, pct)));
    widthLabel.textContent = "Card Width: " + pct + "%";

    // Split slider
    const splitPct = Math.round((state.splitRatio || 0.5) * 100);
    splitSlider.value = String(splitPct);
    splitLabel.textContent = "Column Split: " + splitPct + "% / " + (100 - splitPct) + "%";
    updateSplitEnabled(width);
  }

  function init() {
    // Always show controls, loading from storage (source of truth for toggles)
    controls.style.display = "block";

    chrome.storage.local.get(
      ["trello_card_width", "trello_split_ratio", "trello_show_split_bar", "trello_resizer_enabled"],
      (result) => {
        applyToggles({
          enabled: result.trello_resizer_enabled,
          showSplitBar: result.trello_show_split_bar,
        });
        applyWidthState({
          width: result.trello_card_width,
          splitRatio: result.trello_split_ratio,
        });

        // Refine width display with live viewport from content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
          chrome.tabs.sendMessage(tabs[0].id, { type: "get-state" }, (response) => {
            if (chrome.runtime.lastError || !response) return;
            applyWidthState(response);
          });
        });
      }
    );
  }

  // Enabled toggle — enable/disable extension effects
  enabledToggle.addEventListener("change", () => {
    updateSettingsEnabled(enabledToggle.checked);
    chrome.storage.local.set({ trello_resizer_enabled: enabledToggle.checked });
  });

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
