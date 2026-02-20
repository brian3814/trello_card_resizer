(function () {
  "use strict";
  const STORAGE_KEY_WIDTH = "trello_card_width";
  const STORAGE_KEY_SPLIT = "trello_split_ratio";
  const STORAGE_KEY_SHOW_SPLIT = "trello_show_split_bar";
  const STORAGE_KEY_ENABLED = "trello_resizer_enabled";
  const SPLIT_THRESHOLD = 900;
  const CARD_SELECTOR = '[data-testid="card-back-name"]';

  let detectedDefaultWidth = null;
  let hasSavedWidth = false;
  let cardWidth = 768;
  let splitRatio = 0.5;
  let showSplitBar = true;
  let enabled = true;
  let cardElement = null;

  function getMinCardWidth() {
    return Math.floor(window.innerWidth * 0.3);
  }
  function getMaxCardWidth() {
    return Math.floor(window.innerWidth * 0.95);
  }

  // --- Shared update functions ---
  function updateCardWidth(newWidth) {
    const min = getMinCardWidth();
    const max = getMaxCardWidth();
    cardWidth = Math.max(min, Math.min(max, Math.round(newWidth)));
    document.documentElement.style.setProperty(
      "--trello-card-width",
      cardWidth + "px"
    );
    // The card's ancestor divs constrain its width via their own sizing,
    // and CSS custom properties can't propagate upward, so set inline widths.
    if (cardElement) {
      cardElement.style.width = cardWidth + "px";
      if (cardElement.parentElement) {
        cardElement.parentElement.style.width = cardWidth + "px";
        if (cardElement.parentElement.parentElement) {
          cardElement.parentElement.parentElement.style.width = cardWidth + "px";
        }
      }
    }
  }

  function updateSplitRatio(newRatio) {
    splitRatio = Math.max(0.3, Math.min(0.7, newRatio));
    document.documentElement.style.setProperty(
      "--left-pane-flex",
      splitRatio.toString()
    );
    document.documentElement.style.setProperty(
      "--right-pane-flex",
      (1 - splitRatio).toString()
    );
  }

  function savePrefs() {
    chrome.storage.local.set({
      [STORAGE_KEY_WIDTH]: cardWidth,
      [STORAGE_KEY_SPLIT]: splitRatio,
    });
  }

  // --- Window resize: clamp card width to 30–90% viewport ---
  window.addEventListener("resize", () => {
    const min = getMinCardWidth();
    const max = getMaxCardWidth();
    if (cardWidth > max || cardWidth < min) {
      updateCardWidth(cardWidth);
      savePrefs();
    }
  });

  // --- Message listener for popup communication ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return;
    if (msg.type === "get-state") {
      sendResponse({
        width: cardWidth,
        splitRatio: splitRatio,
        showSplitBar: showSplitBar,
        enabled: enabled,
        viewportWidth: window.innerWidth,
        splitThreshold: SPLIT_THRESHOLD,
      });
    }
  });

  // --- React to storage changes from popup ---
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[STORAGE_KEY_WIDTH] && typeof changes[STORAGE_KEY_WIDTH].newValue === "number") {
      updateCardWidth(changes[STORAGE_KEY_WIDTH].newValue);
    }
    if (changes[STORAGE_KEY_SPLIT] && typeof changes[STORAGE_KEY_SPLIT].newValue === "number") {
      updateSplitRatio(changes[STORAGE_KEY_SPLIT].newValue);
    }
    if (changes[STORAGE_KEY_SHOW_SPLIT] != null && typeof changes[STORAGE_KEY_SHOW_SPLIT].newValue === "boolean") {
      showSplitBar = changes[STORAGE_KEY_SHOW_SPLIT].newValue;
      updateSplitBarVisibility();
    }
    if (changes[STORAGE_KEY_ENABLED] != null && typeof changes[STORAGE_KEY_ENABLED].newValue === "boolean") {
      enabled = changes[STORAGE_KEY_ENABLED].newValue;
      applyEnabledState();
    }
  });

  // --- Load saved preferences ---
  chrome.storage.local.get([STORAGE_KEY_WIDTH, STORAGE_KEY_SPLIT, STORAGE_KEY_SHOW_SPLIT, STORAGE_KEY_ENABLED], (result) => {
    if (typeof result[STORAGE_KEY_WIDTH] === "number") {
      cardWidth = result[STORAGE_KEY_WIDTH];
      hasSavedWidth = true;
    }
    if (typeof result[STORAGE_KEY_SPLIT] === "number") splitRatio = result[STORAGE_KEY_SPLIT];
    if (typeof result[STORAGE_KEY_SHOW_SPLIT] === "boolean") showSplitBar = result[STORAGE_KEY_SHOW_SPLIT];
    if (typeof result[STORAGE_KEY_ENABLED] === "boolean") enabled = result[STORAGE_KEY_ENABLED];
    applyEnabledState();
  });

  // --- Observe DOM for card modal opening ---
  const observer = new MutationObserver(() => {
    const card = document.querySelector(CARD_SELECTOR);
    if (card && !card.dataset.resizeInit) {
      card.dataset.resizeInit = "true";
      initCardResize(card);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function initCardResize(card) {
    cardElement = card;

    // Detect Trello's default card width; use it as initial width if no saved pref
    if (!detectedDefaultWidth) {
      document.documentElement.style.removeProperty("--trello-card-width");
      detectedDefaultWidth = card.offsetWidth;
      if (!hasSavedWidth) {
        cardWidth = detectedDefaultWidth;
      }
    }
    applyEnabledState();

    // ============================
    // A) Card Width Drag Handles
    // ============================
    const widthHandle = document.createElement("div");
    widthHandle.className = "trello-card-width-handle";
    card.style.position = "relative";
    card.appendChild(widthHandle);

    const widthHandleLeft = widthHandle.cloneNode();
    widthHandleLeft.style.right = "auto";
    widthHandleLeft.style.left = "-4px";
    card.appendChild(widthHandleLeft);

    function onWidthDragStart(e) {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = card.offsetWidth;
      const isLeft = e.target === widthHandleLeft;
      function onMouseMove(e) {
        const delta = e.clientX - startX;
        const newWidth = isLeft
          ? startWidth - delta * 2
          : startWidth + delta * 2;
        updateCardWidth(newWidth);
      }
      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        widthHandle.classList.remove("dragging");
        widthHandleLeft.classList.remove("dragging");
        savePrefs();
      }
      widthHandle.classList.add("dragging");
      widthHandleLeft.classList.add("dragging");
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
    widthHandle.addEventListener("mousedown", onWidthDragStart);
    widthHandleLeft.addEventListener("mousedown", onWidthDragStart);

    // ============================
    // B) Split Mode
    // ============================
    setupSplitMode(card);
  }

  function applyEnabledState() {
    if (enabled) {
      document.documentElement.classList.add("trello-resizer-active");
      updateCardWidth(cardWidth);
      updateSplitRatio(splitRatio);
    } else {
      document.documentElement.classList.remove("trello-resizer-active");
      // Clear inline widths so Trello reverts to its defaults
      if (cardElement) {
        cardElement.style.removeProperty("width");
        if (cardElement.parentElement) {
          cardElement.parentElement.style.removeProperty("width");
          if (cardElement.parentElement.parentElement) {
            cardElement.parentElement.parentElement.style.removeProperty("width");
          }
        }
      }
    }
    // Hide/show all extension UI elements
    document.querySelectorAll(
      ".trello-card-width-handle, .trello-resizer-drag-bar"
    ).forEach((el) => {
      el.style.display = enabled ? "" : "none";
    });
  }

  function updateSplitBarVisibility() {
    const bars = document.querySelectorAll(".trello-resizer-drag-bar");
    bars.forEach((bar) => {
      bar.style.display = showSplitBar ? "" : "none";
    });
  }

  function setupSplitMode(card) {
    function tryInit() {
      const mainPane = card.querySelector("main");
      const asidePane = card.querySelector("aside");
      if (!mainPane || !asidePane) return false;

      // The flex row container is the parent of main and aside
      const contentRow = mainPane.parentElement;

      function checkSplitMode() {
        if (cardWidth >= SPLIT_THRESHOLD) {
          ensureDragBar(contentRow, mainPane, asidePane);
          updateSplitBarVisibility();
          updateSplitRatio(splitRatio);
        } else {
          removeDragBar(contentRow);
        }
      }
      const widthObserver = new MutationObserver(checkSplitMode);
      widthObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style"],
      });
      checkSplitMode();
      return true;
    }

    // main/aside may not exist yet — Trello renders them asynchronously
    if (tryInit()) return;
    const cardObserver = new MutationObserver(() => {
      if (tryInit()) cardObserver.disconnect();
    });
    cardObserver.observe(card, { childList: true, subtree: true });
  }

  function ensureDragBar(contentRow, mainPane, asidePane) {
    if (contentRow.querySelector(".trello-resizer-drag-bar")) return;
    const dragBar = document.createElement("div");
    dragBar.className = "trello-resizer-drag-bar";

    // Visual drag indicator
    const indicator = document.createElement("div");
    indicator.className = "trello-resizer-drag-indicator";
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("icons/left-right.png");
    img.width = 14;
    img.height = 14;
    img.draggable = false;
    indicator.appendChild(img);
    dragBar.appendChild(indicator);

    // Insert drag bar between main and aside (replace the 8px spacer if present)
    const spacer = mainPane.nextElementSibling;
    if (spacer && spacer !== asidePane && spacer.tagName === "DIV") {
      spacer.replaceWith(dragBar);
    } else {
      contentRow.insertBefore(dragBar, asidePane);
    }

    dragBar.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const containerRect = contentRow.getBoundingClientRect();
      dragBar.classList.add("dragging");
      function onMouseMove(e) {
        const relativeX = e.clientX - containerRect.left;
        const newRatio = relativeX / containerRect.width;
        updateSplitRatio(newRatio);
      }
      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        dragBar.classList.remove("dragging");
        savePrefs();
      }
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  function removeDragBar(contentRow) {
    const bar = contentRow.querySelector(".trello-resizer-drag-bar");
    if (bar) bar.remove();
  }
})();
