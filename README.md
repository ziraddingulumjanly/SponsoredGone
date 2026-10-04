<p align="center">
  <img src="icons/icon256.png" alt="SponsoredGone Logo" width="140">
</p>

<h1 align="center">SponsoredGone</h1>

<p align="center">
  <strong>Google Search without the sponsored clutter.</strong>
</p>

<p align="center">
  Lightweight • Private • One-click ON/OFF
</p>

---

## SponsoredGone 1.0

A tiny Chrome/Chromium extension that makes Google Search look as though sponsored results were never there.

## Install locally

1. Unzip this folder.
2. Open `chrome://extensions/` in Chrome, Brave, Edge, or another Chromium browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Pin **SponsoredGone** if you want the one-click ON/OFF control visible.

The extension starts **ON** by default.

Click its toolbar icon once to switch it OFF.

Click again to switch it ON.

## How it works

SponsoredGone runs directly on supported Google Search pages and hides sponsored-result sections from the rendered page.

It currently handles known Google advertising containers such as:

- `#tads`
- `#tadsb`
- `#bottomads`
- `[data-text-ad]`
- `[data-is-ad]`

It also includes fallback detection for grouped sponsored-result sections and dynamically inserted results.

A `MutationObserver` keeps watching the page so sponsored results added after the initial page load can also be removed.

## Scope

SponsoredGone primarily targets:

`google.com`

The extension is designed for Google Search users across different countries.

This is a cosmetic search-results cleaner, not a network-level ad blocker.

Sponsored entries may still be delivered by Google as part of the page data. SponsoredGone removes supported sponsored content from the rendered search interface.

## Privacy

SponsoredGone does not collect:

- Search queries
- Browsing history
- Personal information
- Analytics
- Advertising identifiers
- Usage statistics

The only saved value is the ON/OFF state stored using:

`chrome.storage.sync`

Nothing is sent to the developer or to any third-party service.

## Permissions

SponsoredGone only requests the permissions required to:

- Run on supported Google pages
- Remember the ON/OFF setting
- Inject the cleaner into already-open Google tabs
- Update the toolbar state

## Open Source

SponsoredGone is open source.

You are free to:

- Use it
- Modify it
- Fork it
- Distribute it
- Improve it

subject to the terms of the MIT License.

## Developer

**Ziraddin**

Creator and maintainer of SponsoredGone.

## License

MIT License.

Copyright (c) 2026 Ziraddin

See `LICENSE` for the full license text.

---

<p align="center">
  <strong>SponsoredGone</strong><br>
  Google Search without the sponsored clutter.
</p>