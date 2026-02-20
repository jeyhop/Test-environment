(() => {
  if (window.__freshRokuCastInjected) {
    return;
  }
  window.__freshRokuCastInjected = true;

  const HLS_MIME = new Set(["application/vnd.apple.mpegurl", "application/x-mpegurl"]);

  const inferKind = (url, mime = "") => {
    const m = String(mime || "").toLowerCase();
    if (/\.m3u8(\?|#|$)/i.test(url) || HLS_MIME.has(m) || /hls|manifest|playlist/i.test(url)) {
      return "hls";
    }
    if (/\.mp4(\?|#|$)/i.test(url) || m === "video/mp4") {
      return "mp4";
    }
    return "other";
  };

  const abs = (url) => {
    try {
      return new URL(url, location.href).href;
    } catch {
      return null;
    }
  };

  const sendDetected = (url, mime = "", source = "dom") => {
    const finalUrl = abs(url);
    if (!finalUrl) {
      return;
    }

    const kind = inferKind(finalUrl, mime);
    if (kind === "other") {
      return;
    }

    chrome.runtime.sendMessage({
      type: "DETECTED_MEDIA",
      payload: {
        url: finalUrl,
        type: kind,
        source,
        title: document.title
      }
    });
  };

  const scanDom = () => {
    for (const video of document.querySelectorAll("video")) {
      if (video.currentSrc) sendDetected(video.currentSrc, video.getAttribute("type"), "video.currentSrc");
      if (video.src) sendDetected(video.src, video.getAttribute("type"), "video.src");
      for (const source of video.querySelectorAll("source")) {
        if (source.src) sendDetected(source.src, source.type, "video.source");
      }
    }

    const html = document.documentElement?.outerHTML || "";
    const matches = html.match(/https?:\/\/[^"'\s<>]+(?:\.m3u8|\.mp4)(?:\?[^"'\s<>]*)?/gi) || [];
    for (const url of matches) sendDetected(url, "", "html.regex");

    for (const entry of performance.getEntriesByType("resource")) {
      if (entry?.name) sendDetected(entry.name, "", "performance.resource");
    }
  };

  const observeVideoPlay = () => {
    document.addEventListener(
      "play",
      (event) => {
        const el = event.target;
        if (el instanceof HTMLMediaElement) {
          if (el.currentSrc) sendDetected(el.currentSrc, el.getAttribute("type"), "play-event");
          if (el.src) sendDetected(el.src, el.getAttribute("type"), "play-event-src");
        }
      },
      true
    );
  };

  const hookNetwork = () => {
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const input = args[0];
      if (typeof input === "string") sendDetected(input, "", "fetch");
      else if (input?.url) sendDetected(input.url, "", "fetch");
      return origFetch(...args);
    };

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      if (typeof url === "string") sendDetected(url, "", "xhr");
      return origOpen.call(this, method, url, ...rest);
    };
  };

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "SCAN_NOW") {
      scanDom();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  hookNetwork();
  observeVideoPlay();
  scanDom();
  setInterval(scanDom, 4000);
})();
