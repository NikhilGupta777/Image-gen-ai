// netlify/functions/_lib.js
const RUNWARE_API = "https://api.runware.ai/v1";

const json = (status, body, headers = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  body: JSON.stringify(body),
});

const ensureApiKey = () => {
  const key = process.env.RUNWARE_API_KEY;
  if (!key) throw new Error("Missing RUNWARE_API_KEY");
  return key;
};

async function runwareCall(tasks, signal) {
  const res = await fetch(RUNWARE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ensureApiKey()}`
    },
    body: JSON.stringify(tasks),
    signal
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.data) {
    const msg = data?.error || `Runware error ${res.status}`;
    throw new Error(msg);
  }
  return data.data;
}

async function uploadImage(source, signal) {
  // source may be: dataURL, remote URL, or already a UUID
  if (/^[0-9a-f-]{36}$/i.test(source)) return source; // looks like a UUID
  const task = [{
    taskType: "imageUpload",
    taskUUID: crypto.randomUUID(),
    image: source,           // data: URL or remote URL
  }];
  const data = await runwareCall(task, signal);
  const item = (data || []).find(x => x.taskType === "imageUpload");
  if (!item?.imageUUID && !item?.imageUuid) throw new Error("Upload failed");
  return item.imageUUID || item.imageUuid;
}

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));

function okImages(arr, type) {
  return (arr || []).filter(x => x.taskType === type && x.imageURL).map(x => ({ imageURL: x.imageURL }));
}

export { json, runwareCall, uploadImage, okImages, pick };
