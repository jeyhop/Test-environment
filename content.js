(() => {
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

  const pickBestSource = (videoEl) => {
    const candidateUrls = [];

    if (videoEl.currentSrc) {
      candidateUrls.push(videoEl.currentSrc);
    }

    if (videoEl.src) {
      candidateUrls.push(videoEl.src);
    }

    const sourceChildren = Array.from(videoEl.querySelectorAll("source"));
    for (const sourceEl of sourceChildren) {
      if (sourceEl.src) {
        candidateUrls.push(sourceEl.src);
      }
    }

    for (const candidate of candidateUrls) {
      const normalized = normalizeUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  };

  const collectVideos = () => {
    const seen = new Set();
    const results = [];

    const videos = Array.from(document.querySelectorAll("video"));
    for (const [index, videoEl] of videos.entries()) {
      const videoUrl = pickBestSource(videoEl);
      if (!videoUrl || seen.has(videoUrl)) {
        continue;
      }

      seen.add(videoUrl);

      const title =
        videoEl.getAttribute("title") ||
        videoEl.getAttribute("aria-label") ||
        document.title ||
        `Video ${index + 1}`;

      results.push({
        id: `${index}-${videoUrl}`,
        title,
        url: videoUrl,
        pageUrl: window.location.href
      });
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
