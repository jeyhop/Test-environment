# Fresh RokuCast (new clean build)

This is a fresh-from-scratch extension build focused on robust MP4/HLS discovery.

## Detection strategy

1. **DOM scan**: `video.currentSrc`, `video.src`, `<source src>`
2. **Runtime hooks in page**: intercept `fetch` + `XMLHttpRequest.open`
3. **Playback events**: capture media URLs when `<video>` starts playing
4. **Performance resources**: inspect `performance.getEntriesByType('resource')`
5. **Background network observers**:
   - `webRequest.onBeforeRequest`
   - `webRequest.onHeadersReceived` (uses `Content-Type` hints)

All these signals are aggregated per tab, then listed in the popup.

## Install

- Open `chrome://extensions`
- Enable Developer mode
- Load unpacked -> select `fresh-rokucast`

## Usage

- Start video playback on a page
- Open extension popup
- Save Roku IP
- Click **Refresh detection**
- Cast any detected MP4/HLS URL
