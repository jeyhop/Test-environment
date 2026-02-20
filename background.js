const ROKU_ECP_PORT = 8060;
const PLAY_ON_ROKU_APP_ID = 15985;
const MAX_MEDIA_PER_TAB = 80;

const tabMedia = new Map();

const isMp4Url = (url) => /\.mp4(\?|#|$)/i.test(url || "");
const isHlsUrl = (url) => /\.m3u8(\?|#|$)/i.test(url || "");
const inferKind = (url) => (isHlsUrl(url) ? "hls" : isMp4Url(url) ? "mp4" : "other");

const pushDetectedMedia = (tabId, url, source = "network") => {
  if (typeof tabId !== "number" || tabId < 0 || !url) {
    return;
  }

  const kind = inferKind(url);
  if (kind === "other") {
    return;
  }

  const current = tabMedia.get(tabId) || [];
  if (current.some((item) => item.url === url)) {
    return;
  }

  const next = [
    {
      id: `${kind}-${url}`,
      title: source === "network" ? "Detected from network request" : "Detected media",
      url,
      kind,
      source
    },
    ...current
  ].slice(0, MAX_MEDIA_PER_TAB);

  tabMedia.set(tabId, next);
};

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    pushDetectedMedia(details.tabId, details.url, "network");
  },
  {
    urls: ["http://*/*", "https://*/*"],
    types: ["media", "xmlhttprequest", "other"]
  }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  tabMedia.delete(tabId);
});

const buildRokuUrl = (ip, pathWithQuery = "") => {
  const trimmedIp = (ip || "").trim();
  if (!trimmedIp) {
    throw new Error("Roku IP is required.");
  }

  const host = trimmedIp.includes(":") ? trimmedIp : `${trimmedIp}:${ROKU_ECP_PORT}`;
  return `http://${host}${pathWithQuery}`;
};

const postRoku = async (ip, pathWithQuery) => {
  const endpoint = buildRokuUrl(ip, pathWithQuery);
  const response = await fetch(endpoint, { method: "POST" });

  if (!response.ok) {
    throw new Error(`Roku request failed (${response.status}) for ${endpoint}`);
  }

  return response;
};

const getRokuMediaType = (kind) => (kind === "hls" ? "live" : "movie");

const tryLaunchViaRokuChannel = async (ip, videoUrl, kind) => {
  const encoded = encodeURIComponent(videoUrl);
  const mediaType = getRokuMediaType(kind);
  const launchPath = `/launch/${PLAY_ON_ROKU_APP_ID}?mediaType=${mediaType}&contentID=${encoded}`;
  await postRoku(ip, launchPath);
};

const tryLaunchViaInputEndpoint = async (ip, videoUrl) => {
  const encoded = encodeURIComponent(videoUrl);
  const inputPath = `/input/${PLAY_ON_ROKU_APP_ID}?t=v&u=${encoded}`;
  await postRoku(ip, inputPath);
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_TAB_MEDIA") {
    const tabId = message?.payload?.tabId;
    sendResponse({ ok: true, videos: tabMedia.get(tabId) || [] });
    return false;
  }

  if (message?.type !== "CAST_TO_ROKU") {
    return false;
  }

  (async () => {
    const { rokuIp, videoUrl, kind } = message.payload || {};

    if (!videoUrl) {
      throw new Error("No video URL provided.");
    }

    try {
      await tryLaunchViaRokuChannel(rokuIp, videoUrl, kind);
      sendResponse({ ok: true, method: "launch" });
      return;
    } catch (_launchError) {
      await tryLaunchViaInputEndpoint(rokuIp, videoUrl);
      sendResponse({ ok: true, method: "input" });
    }
  })().catch((error) => {
    sendResponse({
      ok: false,
      error:
        error?.message ||
        "Unable to send to Roku. Verify Roku IP and that your TV is reachable on your network."
    });
  });

  return true;
});
