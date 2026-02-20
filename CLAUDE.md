# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) that enhances Trello's card modal with drag-to-resize width and a split-pane mode for side-by-side description/comments viewing. Vanilla JS, no build system, no dependencies.

## Development

**Load the extension:** Go to `chrome://extensions/`, enable Developer Mode, click "Load unpacked", select this directory. Navigate to trello.com to test.

There is no build step, no package manager, no test framework, and no linter configured.

## Architecture

Single content script (`content.js`) injected into `trello.com/*` at `document_idle`, paired with `content.css`.

**content.js** — IIFE wrapping all logic:
- `MutationObserver` on `document.body` watches for Trello's card modal (`.window-overlay .window`) to appear, then calls `initCardResize()`
- **Width resizing**: Creates left/right drag handles on the card modal. Drag events compute new width (clamped 500–1600px) and set the `--trello-card-width` CSS custom property on `<html>`
- **Split pane mode**: When width >= 900px, adds `.split-mode` class to the card, converting `.window-main-col` to horizontal flexbox. A draggable bar between `.card-detail-data` and `.window-module.mod-activity` controls `--left-pane-flex` / `--right-pane-flex` CSS variables (ratio clamped 0.2–0.8)
- **Persistence**: `chrome.storage.local` with keys `trello_card_width` and `trello_split_ratio`

**content.css** — Uses CSS custom properties driven by JS for dynamic sizing. The `.split-mode` class toggles the flexbox split layout.

## Key Trello DOM Selectors

The extension depends on these Trello DOM elements:
- `.window-overlay .window` — card modal
- `.window-main-col` — main content column
- `.card-detail-data` — description/attachments area
- `.window-module.mod-activity` — comments/activity section

If Trello changes their DOM structure, these selectors will need updating.
