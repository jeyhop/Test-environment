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

const requestVideosFromTab = async (tabId) => {
  const response = await chrome.tabs.sendMessage(tabId, { type: "GET_VIDEOS" });
  return response?.videos || [];
};

const castToRoku = async (videoUrl) => {
  const rokuIp = rokuIpInput.value.trim();
  if (!rokuIp) {
    throw new Error("Save your Roku IP first.");
  }

  const response = await chrome.runtime.sendMessage({
    type: "CAST_TO_ROKU",
    payload: { rokuIp, videoUrl }
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

  titleEl.textContent = video.title || "Untitled video";
  urlEl.textContent = video.url;

  castButton.addEventListener("click", async () => {
    castButton.disabled = true;
    setStatus(`Casting: ${video.title || video.url}`);

    try {
      const method = await castToRoku(video.url);
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
    empty.textContent = "No <video> sources detected on this page.";
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
    setStatus(`Found ${videos.length} video(s).`);
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
