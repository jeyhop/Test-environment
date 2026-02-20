# Roku Video Detector & Cast (Chrome Extension)

This extension scans the current tab for HTML5 `<video>` sources and lets you send one directly to your Roku TV.

## Features

- Detects media URLs from `<video src>`, `video.currentSrc`, and nested `<source>` tags.
- Saves Roku IP to Chrome sync storage.
- Sends video URLs using Roku ECP with two fallback methods:
  - `POST /launch/15985?...`
  - `POST /input/15985?...`

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`Test-environment`).

## Usage

1. Visit a page with HTML5 video.
2. Click the extension icon.
3. Enter your Roku TV IP (for example `192.168.1.50`) and click **Save**.
4. Click **Refresh** to detect videos.
5. Click **Cast** on a detected entry.

## Notes / Limitations

- It can only detect videos exposed in the page DOM (`<video>` tags).
- DRM streams, blob URLs, and some site-protected streams may not play on Roku.
- Your Chrome machine and Roku must be on the same local network.
