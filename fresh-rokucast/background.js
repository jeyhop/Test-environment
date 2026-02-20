const ROKU_PORT = 8060;
const PLAY_ON_ROKU_APP_ID = 15985;
const MAX_PER_TAB = 150;

const perTabMedia = new Map();

const HLS_CT = ["application/vnd.apple.mpegurl", "application/x-mpegurl"];

const normalizeMedia = (entry = {}) => {
  const url = String(entry.url || "").trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return null;
  }

  const type = String(entry.type || "").toLowerCase();
  const contentType = String(entry.contentType || "").toLowerCase();

  let kind = "other";
  if (/\.m3u8(\?|#|$)/i.test(url) || HLS_CT.some((hint) => contentType.includes(hint)) || /hls|manifest|playlist/i.test(url)) {
    kind = "hls";
  } else if (/\.mp4(\?|#|$)/i.test(url) || contentType.includes("video/mp4")) {
    kind = "mp4";
  }

  if (kind === "other") {
    return null;
  }

  return {
    id: `${kind}-${url}`,
    kind,
    url,
    title: entry.title || "Detected stream",
    source: entry.source || type || "unknown",
    contentType
  };
};

const addMediaForTab = (tabId, media) => {
  if (typeof tabId !== "number" || tabId < 0 || !media) {
    return;
  }

  const curr = perTabMedia.get(tabId) || [];
  if (curr.some((item) => item.url === media.url)) {
    return;
  }

  perTabMedia.set(tabId, [media, ...curr].slice(0, MAX_PER_TAB));
};

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    addMediaForTab(
      details.tabId,
      normalizeMedia({ url: details.url, source: `webRequest:${details.type}` })
    );
  },
  { urls: ["http://*/*", "https://*/*"], types: ["media", "xmlhttprequest", "other"] }
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const contentType = (details.responseHeaders || []).find(
      (header) => header.name?.toLowerCase() === "content-type"
    )?.value;

    addMediaForTab(
      details.tabId,
      normalizeMedia({
        url: details.url,
        source: `headers:${details.type}`,
        contentType
      })
    );
  },
  { urls: ["http://*/*", "https://*/*"], types: ["media", "xmlhttprequest", "other"] },
  ["responseHeaders"]
);

chrome.tabs.onRemoved.addListener((tabId) => perTabMedia.delete(tabId));

const rokuUrl = (ip, path = "") => {
  const host = String(ip || "").trim();
  if (!host) {
    throw new Error("Roku IP required");
  }
  return `http://${host.includes(":") ? host : `${host}:${ROKU_PORT}`}${path}`;
};

const rokuPost = async (ip, path) => {
  const res = await fetch(rokuUrl(ip, path), { method: "POST" });
  if (!res.ok) {
    throw new Error(`Roku request failed (${res.status})`);
  }
};

const cast = async ({ rokuIp, url, kind }) => {
  const mediaType = kind === "hls" ? "live" : "movie";
  const encoded = encodeURIComponent(url);

  try {
    await rokuPost(rokuIp, `/launch/${PLAY_ON_ROKU_APP_ID}?mediaType=${mediaType}&contentID=${encoded}`);
    return "launch";
  } catch {
    await rokuPost(rokuIp, `/input/${PLAY_ON_ROKU_APP_ID}?t=v&u=${encoded}`);
    return "input";
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "DETECTED_MEDIA") {
    addMediaForTab(sender.tab?.id, normalizeMedia(message.payload));
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "GET_MEDIA") {
    const tabId = message?.payload?.tabId;
    sendResponse({ ok: true, media: perTabMedia.get(tabId) || [] });
    return false;
  }

  if (message?.type === "CAST") {
    cast(message.payload)
      .then((method) => sendResponse({ ok: true, method }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
