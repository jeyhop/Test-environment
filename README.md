# Roku Video Detector & Cast (Chrome Extension)

This extension scans the current tab for HTML5 video sources and lets you send MP4 or HLS (`.m3u8`) links directly to your Roku TV.

## Features

- Detects **MP4** and **HLS** URLs from:
  - `<video src>`
  - `video.currentSrc`
  - nested `<source src type="...">`
- Recognizes HLS using both URL extension (`.m3u8`) and HLS MIME types:
  - `application/vnd.apple.mpegurl`
  - `application/x-mpegurl`
- Saves Roku IP to Chrome sync storage.
- Uses an inline fallback scanner from the popup when a content script is not attached (avoids "Receiving end does not exist" on many pages).
- Inline scan also checks browser performance resource entries to recover media URLs requested by script-driven players.
- Also captures direct MP4/HLS URLs from tab network requests and response headers (helps with players that do not expose `<video>` sources directly).
- Sends video URLs using Roku ECP with two fallback methods:
  - `POST /launch/15985?...`
  - `POST /input/15985?...`

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`Test-environment`).

## Usage

1. Visit a page with HTML5 MP4 or HLS video.
2. Click the extension icon.
3. Enter your Roku TV IP (for example `192.168.1.50`) and click **Save**.
4. Start playback for a few seconds (important for many streaming players), then click **Refresh**.
5. Click **Cast** on a detected entry.

## Notes / Limitations

- It only detects HTML5 media exposed in the page DOM (`<video>` / `<source>`).
- DRM streams, blob URLs, and heavily protected player pipelines may not cast.
- Your Chrome machine and Roku must be on the same local network.
