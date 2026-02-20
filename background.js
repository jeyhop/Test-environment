const ROKU_ECP_PORT = 8060;
const PLAY_ON_ROKU_APP_ID = 15985;

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
