const ipEl = document.querySelector("#ip");
const saveEl = document.querySelector("#save");
const refreshEl = document.querySelector("#refresh");
const statusEl = document.querySelector("#status");
const mediaEl = document.querySelector("#media");
const itemTpl = document.querySelector("#itemTpl");

const setStatus = (msg, err = false) => {
  statusEl.textContent = msg;
  statusEl.style.color = err ? "#b00020" : "inherit";
};

const activeTab = async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

const getRokuIp = async () => (await chrome.storage.sync.get(["rokuIp"])).rokuIp || "";
const setRokuIp = async (rokuIp) => chrome.storage.sync.set({ rokuIp: rokuIp.trim() });

const normalize = (items = []) => {
  const seen = new Set();
  const out = [];
  for (const m of items) {
    if (!m?.url || seen.has(m.url)) continue;
    seen.add(m.url);
    out.push(m);
  }
  return out;
};

const askTabToScan = async (tabId) => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SCAN_NOW" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    await chrome.tabs.sendMessage(tabId, { type: "SCAN_NOW" });
  }
};

const loadMedia = async (tabId) => {
  const response = await chrome.runtime.sendMessage({ type: "GET_MEDIA", payload: { tabId } });
  return normalize(response?.media || []);
};

const castMedia = async (m) => {
  const rokuIp = ipEl.value.trim();
  if (!rokuIp) throw new Error("Save Roku IP first");

  const response = await chrome.runtime.sendMessage({
    type: "CAST",
    payload: { rokuIp, url: m.url, kind: m.kind }
  });
  if (!response?.ok) throw new Error(response?.error || "Cast failed");
  return response.method;
};

const render = (items) => {
  mediaEl.replaceChildren();
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "No media found yet. Start video playback, wait 3-5s, then refresh.";
    mediaEl.append(li);
    return;
  }

  for (const m of items) {
    const fragment = itemTpl.content.cloneNode(true);
    fragment.querySelector(".title").textContent = `${(m.kind || "media").toUpperCase()} • ${m.source || "detected"}`;
    fragment.querySelector(".url").textContent = m.url;
    fragment.querySelector(".cast").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const method = await castMedia(m);
        setStatus(`Sent to Roku (${method})`);
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        btn.disabled = false;
      }
    });
    mediaEl.append(fragment);
  }
};

const refresh = async () => {
  try {
    setStatus("Scanning...");
    const tab = await activeTab();
    if (!tab?.id) throw new Error("No active tab");
    await askTabToScan(tab.id);
    await new Promise((r) => setTimeout(r, 350));
    const items = await loadMedia(tab.id);
    render(items);
    setStatus(`Found ${items.length} stream(s)`);
  } catch (error) {
    render([]);
    setStatus(error.message, true);
  }
};

(async () => {
  ipEl.value = await getRokuIp();
  saveEl.addEventListener("click", async () => {
    await setRokuIp(ipEl.value);
    setStatus("Roku IP saved");
  });
  refreshEl.addEventListener("click", refresh);
  await refresh();
})();
