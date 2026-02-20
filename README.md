# Trello Card Resizer

A Chrome extension that lets you resize Trello's card modal and adjust the column split between description and comments.

![Demo](img/Screen%20Recording%202026-02-20%20at%2017.06.49.gif)

## Features

- **Drag to resize card width** — Grab the left or right edge of any card modal to make it wider or narrower (30%–95% of viewport)
- **Adjustable column split** — Drag the handle between the description and comments columns to control their ratio
- **Popup controls** — Click the extension icon to adjust card width and column split with sliders
- **Enable/disable toggle** — Turn the extension's effects on or off without uninstalling
- **Persistent settings** — Your width, split ratio, and preferences are saved across sessions

## Installation

1. Download or clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select this directory
5. Navigate to [trello.com](https://trello.com) and open a card

## Usage

### Drag handles

- Hover over the **left or right edge** of a card modal to see the resize cursor
- Drag to resize the card width

### Column split

- When the card is wide enough (900px+), a **drag handle** appears between the main content and the comments/activity sidebar
- Drag it to adjust the split ratio

### Popup

Click the extension icon in the toolbar to access:

- **Enable extension** — Toggle all effects on/off
- **Card Width** — Slider to set card width as a percentage of viewport
- **Column Split** — Slider to set the description/comments ratio
- **Show column drag handle** — Toggle the in-page split drag handle

## Requirements

- Chrome (Manifest V3)
- No dependencies, no build step
