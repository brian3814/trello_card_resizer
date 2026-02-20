(function () {
  "use strict";
  const STORAGE_KEY_WIDTH = "trello_card_width";
  const STORAGE_KEY_SPLIT = "trello_split_ratio";
  const DEFAULT_WIDTH = 768;
  const MIN_CARD_WIDTH = 500;
  const MAX_CARD_WIDTH = 1600;
  let cardWidth = DEFAULT_WIDTH;
  let splitRatio = 0.5; // 0..1, left pane proportion
  // --- Load saved preferences ---
  chrome.storage.local.get([STORAGE_KEY_WIDTH, STORAGE_KEY_SPLIT], (result) => {
    if (result[STORAGE_KEY_WIDTH]) cardWidth = result[STORAGE_KEY_WIDTH];
    if (result[STORAGE_KEY_SPLIT]) splitRatio = result[STORAGE_KEY_SPLIT];
    applyCardWidth();
  });
  function savePrefs() {
    chrome.storage.local.set({
      [STORAGE_KEY_WIDTH]: cardWidth,
      [STORAGE_KEY_SPLIT]: splitRatio,
    });
  }
  function applyCardWidth() {
    document.documentElement.style.setProperty(
      "--trello-card-width",
      cardWidth + "px"
    );
  }
  function applySplitRatio() {
    document.documentElement.style.setProperty(
      "--left-pane-flex",
      splitRatio.toString()
    );
    document.documentElement.style.setProperty(
      "--right-pane-flex",
      (1 - splitRatio).toString()
    );
  }
  // --- Observe DOM for card modal opening ---
  const observer = new MutationObserver(() => {
    const cardWindow = document.querySelector(".window-overlay .window");
    if (cardWindow && !cardWindow.dataset.resizeInit) {
      cardWindow.dataset.resizeInit = "true";
      initCardResize(cardWindow);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  function initCardResize(cardWindow) {
    applyCardWidth();
    // ============================
    // A) Card Width Drag Handle
    // ============================
    const widthHandle = document.createElement("div");
    widthHandle.className = "trello-card-width-handle";
    cardWindow.style.position = "relative";
    cardWindow.appendChild(widthHandle);
    // Also add a left-side handle for symmetry
    const widthHandleLeft = widthHandle.cloneNode();
    widthHandleLeft.style.right = "auto";
    widthHandleLeft.style.left = "-4px";
    cardWindow.appendChild(widthHandleLeft);
    function onWidthDragStart(e) {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = cardWindow.offsetWidth;
      const isLeft = e.target === widthHandleLeft;
      function onMouseMove(e) {
        const delta = e.clientX - startX;
        // Dragging right edge → increase; left edge → mirrored
        const newWidth = isLeft
          ? startWidth - delta * 2
          : startWidth + delta * 2;
        cardWidth = Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, newWidth));
        applyCardWidth();
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
    // B) Split Mode: Drag Bar between Content & Comments
    // ============================
    setupSplitMode(cardWindow);
  }
  function setupSplitMode(cardWindow) {
    // Trello's card layout: find the main content column
    const mainCol = cardWindow.querySelector(".window-main-col");
    if (!mainCol) return;
    // Find the description/data section and activity section
    const dataSection = mainCol.querySelector(".card-detail-data");
    const activitySection = mainCol.querySelector(
      ".window-module.mod-activity"
    );
    if (!dataSection || !activitySection) return;
    // Enable split mode only when card is wide enough
    function checkSplitMode() {
      if (cardWidth >= 900) {
        cardWindow.classList.add("split-mode");
        ensureDragBar(mainCol, dataSection, activitySection);
        applySplitRatio();
      } else {
        cardWindow.classList.remove("split-mode");
        removeDragBar(mainCol);
      }
    }
    // Watch for width changes
    const widthObserver = new MutationObserver(checkSplitMode);
    widthObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    checkSplitMode();
  }
  function ensureDragBar(mainCol, dataSection, activitySection) {
    if (mainCol.querySelector(".trello-resizer-drag-bar")) return;
    const dragBar = document.createElement("div");
    dragBar.className = "trello-resizer-drag-bar";
    // Insert the drag bar between data section and activity section
    activitySection.parentNode.insertBefore(dragBar, activitySection);
    dragBar.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const containerRect = mainCol.getBoundingClientRect();
      dragBar.classList.add("dragging");
      function onMouseMove(e) {
        const relativeX = e.clientX - containerRect.left;
        const newRatio = relativeX / containerRect.width;
        splitRatio = Math.max(0.2, Math.min(0.8, newRatio));
        applySplitRatio();
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
  function removeDragBar(mainCol) {
    const bar = mainCol.querySelector(".trello-resizer-drag-bar");
    if (bar) bar.remove();
  }
})();
