# SponsoredGone 1.0

A tiny Chrome/Chromium extension that makes Google Search look as though sponsored results were not present.

## What changed in 2.0

- Rebuilt for **Manifest V3**.
- Runs at **`document_start`** so known Google ad containers are hidden before normal page rendering.
- Handles current Google ad containers (`#tads`, `#tadsb`, `#bottomads`, `data-text-ad`, `data-is-ad`).
- Adds a conservative label-based fallback for Google's newer grouped **Sponsored results** / **Sponsored products** layouts.
- Uses a `MutationObserver`, so ads inserted after the initial page load are removed too.
- Does not force hidden elements back to `display:block`; turning the extension OFF restores Google's own layout.
- One-click toolbar control. The badge shows **ON** or **OFF**.
- No analytics, no tracking, no external requests.

## Install locally

1. Unzip this folder.
2. Open `chrome://extensions/` in Chrome, Brave, Edge, or another Chromium browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Pin **SponsoredGone** if you want the one-click ON/OFF control visible.

The extension starts **ON** by default. Click its toolbar icon once to switch it OFF; click again to switch it ON.

## Scope

Google announced that country-specific Search domains are being redirected to `google.com`, so the extension primarily targets `google.com`. `google.az` is also included as a compatibility fallback.

This is a cosmetic search-results cleaner, not a network-level ad blocker. Sponsored entries may still be delivered by Google in the page data; the extension removes them from the rendered results.

## Privacy

The only saved value is the ON/OFF setting in `chrome.storage.sync`. Nothing is sent to the developer or to any third-party service.

## License / attribution

Based on the MIT-licensed **SponsoredGone** project by dumbRoss. See `LICENSE`.
