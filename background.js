const ROKU_ECP_PORT = 8060;
const PLAY_ON_ROKU_APP_ID = 15985;
const MAX_MEDIA_PER_TAB = 120;

const tabMedia = new Map();

const HLS_CONTENT_TYPE_HINTS = ["application/vnd.apple.mpegurl", "application/x-mpegurl"];
const MP4_CONTENT_TYPE_HINTS = ["video/mp4"];

const hasAnyHint = (value, hints) => {
  const normalized = String(value || "").toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
};

const isMp4Url = (url) => /\.mp4(\?|#|$)/i.test(url || "");
const isHlsUrl = (url) => /\.m3u8(\?|#|$)/i.test(url || "");
const hasHlsUrlHint = (url) => /(m3u8|playlist|manifest|hls)/i.test(url || "");
const hasMp4UrlHint = (url) => /(mp4|video|stream)/i.test(url || "");

const inferKindFromUrlAndType = (url, contentType = "") => {
  if (isHlsUrl(url) || hasAnyHint(contentType, HLS_CONTENT_TYPE_HINTS)) {
    return "hls";
  }

  if (isMp4Url(url) || hasAnyHint(contentType, MP4_CONTENT_TYPE_HINTS)) {
    return "mp4";
  }

  return "other";
};

const pushDetectedMedia = (tabId, url, source = "network", contentType = "") => {
  if (typeof tabId !== "number" || tabId < 0 || !url) {
    return;
  }

  let kind = inferKindFromUrlAndType(url, contentType);
  if (kind === "other") {
    if (source === "headers" && hasHlsUrlHint(url)) {
      kind = "hls";
    } else if (source === "headers" && hasMp4UrlHint(url)) {
      kind = "mp4";
    } else {
      return;
    }
  }

  const current = tabMedia.get(tabId) || [];
  if (current.some((item) => item.url === url)) {
    return;
  }

  const next = [
    {
      id: `${kind}-${url}`,
      title: source === "headers" ? "Detected from response headers" : "Detected from network request",
      url,
      kind,
      source,
      contentType
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

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const contentTypeHeader = (details.responseHeaders || []).find(
      (header) => header.name?.toLowerCase() === "content-type"
    );

    const contentType = contentTypeHeader?.value || "";
    pushDetectedMedia(details.tabId, details.url, "headers", contentType);
  },
  {
    urls: ["http://*/*", "https://*/*"],
    types: ["media", "xmlhttprequest", "other"]
  },
  ["responseHeaders"]
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
