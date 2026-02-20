(() => {
  const HLS_MIME_TYPES = new Set([
    "application/vnd.apple.mpegurl",
    "application/x-mpegurl"
  ]);

  const isMp4Url = (url) => /\.mp4(\?|#|$)/i.test(url);
  const isHlsUrl = (url) => /\.m3u8(\?|#|$)/i.test(url);

  const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") {
      return null;
    }

    try {
      return new URL(url, window.location.href).href;
    } catch {
      return null;
    }
  };

  const inferKind = (url, mimeType = "") => {
    const normalizedType = (mimeType || "").toLowerCase().trim();

    if (isHlsUrl(url) || HLS_MIME_TYPES.has(normalizedType)) {
      return "hls";
    }

    if (isMp4Url(url) || normalizedType === "video/mp4") {
      return "mp4";
    }

    return "other";
  };

  const detectVideoCandidates = (videoEl) => {
    const candidates = [];

    if (videoEl.currentSrc) {
      candidates.push({ url: videoEl.currentSrc, mimeType: videoEl.getAttribute("type") || "" });
    }

    if (videoEl.src) {
      candidates.push({ url: videoEl.src, mimeType: videoEl.getAttribute("type") || "" });
    }

    const sourceChildren = Array.from(videoEl.querySelectorAll("source"));
    for (const sourceEl of sourceChildren) {
      if (sourceEl.src) {
        candidates.push({ url: sourceEl.src, mimeType: sourceEl.type || "" });
      }
    }

    return candidates;
  };

  const collectVideos = () => {
    const seen = new Set();
    const results = [];
    const videos = Array.from(document.querySelectorAll("video"));

    for (const [index, videoEl] of videos.entries()) {
      const title =
        videoEl.getAttribute("title") ||
        videoEl.getAttribute("aria-label") ||
        document.title ||
        `Video ${index + 1}`;

      for (const candidate of detectVideoCandidates(videoEl)) {
        const normalized = normalizeUrl(candidate.url);
        if (!normalized || seen.has(normalized)) {
          continue;
        }

        const kind = inferKind(normalized, candidate.mimeType);
        if (kind === "other") {
          continue;
        }

        seen.add(normalized);

        results.push({
          id: `${index}-${normalized}`,
          title,
          url: normalized,
          kind,
          pageUrl: window.location.href
        });
      }
    }

    return results;
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_VIDEOS") {
      sendResponse({ videos: collectVideos() });
      return true;
    }

    return false;
  });
})();
