const rokuIpInput = document.querySelector("#rokuIp");
const saveIpButton = document.querySelector("#saveIp");
const refreshButton = document.querySelector("#refresh");
const statusEl = document.querySelector("#status");
const videoListEl = document.querySelector("#videoList");
const videoTemplate = document.querySelector("#videoTemplate");

const setStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#c62828" : "inherit";
};

const getCurrentTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
};

const getStoredRokuIp = async () => {
  const result = await chrome.storage.sync.get(["rokuIp"]);
  return result.rokuIp || "";
};

const setStoredRokuIp = async (rokuIp) => {
  await chrome.storage.sync.set({ rokuIp: rokuIp.trim() });
};

const normalizeDetectedVideos = (videos = []) => {
  const seen = new Set();
  const normalized = [];

  for (const item of videos) {
    if (!item?.url || seen.has(item.url)) {
      continue;
    }

    seen.add(item.url);
    normalized.push({
      id: item.id || `${item.kind || "video"}-${item.url}`,
      title: item.title || "Detected media",
      kind: item.kind || (item.url.includes(".m3u8") ? "hls" : "mp4"),
      url: item.url,
      pageUrl: item.pageUrl || ""
    });
  }

  return normalized;
};

const runInlineMediaScan = async (tabId) => {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const HLS_MIME_TYPES = new Set([
        "application/vnd.apple.mpegurl",
        "application/x-mpegurl"
      ]);

      const isMp4Url = (url) => /\.mp4(\?|#|$)/i.test(url);
      const isHlsUrl = (url) => /\.m3u8(\?|#|$)/i.test(url);

      const normalizeUrl = (url) => {
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

      const addResult = (out, seen, url, kind, title) => {
        const normalized = normalizeUrl(url);
        if (!normalized || seen.has(normalized)) {
          return;
        }

        const inferred = inferKind(normalized, "");
        const finalKind = kind && kind !== "other" ? kind : inferred;
        if (finalKind === "other") {
          return;
        }

        seen.add(normalized);
        out.push({
          id: `${finalKind}-${normalized}`,
          title: title || document.title || "Detected media",
          kind: finalKind,
          url: normalized,
          pageUrl: window.location.href
        });
      };

      const out = [];
      const seen = new Set();

      const videos = Array.from(document.querySelectorAll("video"));
      for (const [index, videoEl] of videos.entries()) {
        const title =
          videoEl.getAttribute("title") ||
          videoEl.getAttribute("aria-label") ||
          document.title ||
          `Video ${index + 1}`;

        const candidates = [];
        if (videoEl.currentSrc) {
          candidates.push({ url: videoEl.currentSrc, type: videoEl.getAttribute("type") || "" });
        }
        if (videoEl.src) {
          candidates.push({ url: videoEl.src, type: videoEl.getAttribute("type") || "" });
        }
        for (const sourceEl of videoEl.querySelectorAll("source")) {
          if (sourceEl.src) {
            candidates.push({ url: sourceEl.src, type: sourceEl.type || "" });
          }
        }

        for (const candidate of candidates) {
          const normalized = normalizeUrl(candidate.url);
          const kind = normalized ? inferKind(normalized, candidate.type) : "other";
          addResult(out, seen, normalized, kind, title);
        }
      }

      const html = document.documentElement?.outerHTML || "";
      const regex = /(https?:\/\/[^"'\s<>]+?\.(?:mp4|m3u8)(?:\?[^"'\s<>]*)?)/gi;
      for (const match of html.matchAll(regex)) {
        addResult(out, seen, match[1], "other", "Page media URL");
      }

      return out;
    }
  });

  return normalizeDetectedVideos(result || []);
};

const requestVideosFromTab = async (tabId) => {
  let viaContent = [];
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "GET_VIDEOS" });
    viaContent = normalizeDetectedVideos(response?.videos || []);
  } catch (error) {
    if (!String(error?.message || "").includes("Receiving end does not exist")) {
      throw error;
    }
  }

  const viaInline = await runInlineMediaScan(tabId);
  const viaNetwork = await getNetworkDetectedVideos(tabId);

  return normalizeDetectedVideos([...viaContent, ...viaInline, ...viaNetwork]);
};


const getNetworkDetectedVideos = async (tabId) => {
  const response = await chrome.runtime.sendMessage({
    type: "GET_TAB_MEDIA",
    payload: { tabId }
  });

  return normalizeDetectedVideos(response?.videos || []);
};

const castToRoku = async (video) => {
  const videoUrl = video.url;
  const kind = video.kind;
  const rokuIp = rokuIpInput.value.trim();
  if (!rokuIp) {
    throw new Error("Save your Roku IP first.");
  }

  const response = await chrome.runtime.sendMessage({
    type: "CAST_TO_ROKU",
    payload: { rokuIp, videoUrl, kind }
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Unknown cast error.");
  }

  return response.method;
};

const createVideoNode = (video) => {
  const fragment = videoTemplate.content.cloneNode(true);
  const titleEl = fragment.querySelector(".video-title");
  const urlEl = fragment.querySelector(".video-url");
  const castButton = fragment.querySelector(".cast-btn");

  titleEl.textContent = `${video.title || "Untitled video"} (${(video.kind || "media").toUpperCase()})`;
  urlEl.textContent = video.url;

  castButton.addEventListener("click", async () => {
    castButton.disabled = true;
    setStatus(`Casting: ${video.title || video.url}`);

    try {
      const method = await castToRoku(video);
      setStatus(`Sent to Roku using method: ${method}`);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      castButton.disabled = false;
    }
  });

  return fragment;
};

const renderVideos = (videos) => {
  videoListEl.replaceChildren();

  if (!videos.length) {
    const empty = document.createElement("li");
    empty.textContent = "No MP4/HLS HTML5 sources detected on this page.";
    videoListEl.append(empty);
    return;
  }

  for (const video of videos) {
    videoListEl.append(createVideoNode(video));
  }
};

const refreshVideos = async () => {
  setStatus("Detecting videos...");

  try {
    const tab = await getCurrentTab();
    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const videos = await requestVideosFromTab(tab.id);
    renderVideos(videos);
    setStatus(`Found ${videos.length} source(s). If empty, start playback first, then Refresh.`);
  } catch (error) {
    renderVideos([]);
    setStatus(`Could not scan this tab: ${error.message}`, true);
  }
};

const init = async () => {
  const storedIp = await getStoredRokuIp();
  rokuIpInput.value = storedIp;

  saveIpButton.addEventListener("click", async () => {
    try {
      await setStoredRokuIp(rokuIpInput.value);
      setStatus("Roku IP saved.");
    } catch (error) {
      setStatus(`Failed to save IP: ${error.message}`, true);
    }
  });

  refreshButton.addEventListener("click", refreshVideos);

  await refreshVideos();
};

init();
