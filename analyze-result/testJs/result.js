const qs = new URLSearchParams(location.search);
const id = qs.get("id");
const type = qs.get("type");

let analysisDb = null;

async function openAnalysisDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("FaceAnalysisDB", 1);
    req.onsuccess = () => {
      analysisDb = req.result;
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

async function getResultById(id) {
  return new Promise((resolve, reject) => {
    const tx = analysisDb.transaction(["results"], "readonly");
    const store = tx.objectStore("results");
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

async function saveResultToDB(data) {
  return new Promise((resolve, reject) => {
    const tx = analysisDb.transaction(["results"], "readwrite");
    const store = tx.objectStore("results");
    const req = store.put(data);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e);
  });
}

function renderImage(base64) {
  const img = document.getElementById("face-image");
  img.src = base64;
  document.querySelector(".file-upload-content").style.display = "block";
  document.querySelector(".image-upload-wrap").style.display = "none";
}

function renderResult({ summary, detail }) {
  document.getElementById("label-container").innerHTML = `
    <div class="result-summary" style="margin-bottom:16px">${marked.parse(summary)}</div>
    <div class="result-detail">${marked.parse(detail)}</div>
  `;
}

function renderLoading() {
  document.getElementById("label-container").innerHTML = `
    <div style="text-align:center; font-size:18px; padding:40px;">
      리포트를 생성 중입니다. 잠시만 기다려주세요...<br/><br/>
      <div style="font-size:40px;">⏳</div>
    </div>
  `;
}

function showError(msg) {
  document.getElementById("label-container").innerHTML = `
    <div style="color:red; padding: 24px; white-space: pre-line;">${msg}</div>
  `;
}

async function requestReportFromServer(type, features) {
  const url = `https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/${type}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature: features }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`서버 오류: ${msg}`);
  }

  const data = await res.json();
  if (!data.summary || !data.detail) {
    throw new Error("서버 응답에 summary/detail이 없습니다.");
  }

  return data;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!id || !type) {
    showError("❌ URL에 id 또는 type이 없습니다.");
    return;
  }

  try {
    await openAnalysisDB();
    const result = await getResultById(id);

    if (!result) {
      showError("❌ 분석 결과를 찾을 수 없습니다.");
      return;
    }

    if (result.imageBase64) renderImage(result.imageBase64);

    const summary = result.summary?.trim();
    const detail = result.detail?.trim();

    if (summary && detail) {
      renderResult({ summary, detail });
      return;
    }

    if (!result.features) {
      showError("❌ features 필드가 없습니다.");
      return;
    }

    renderLoading();

    const { summary: newSummary, detail: newDetail } = await requestReportFromServer(type, result.features);

    result.summary = newSummary;
    result.detail = newDetail;

    await saveResultToDB(result);
    renderResult({ summary: newSummary, detail: newDetail });

  } catch (err) {
    showError("❌ 실행 중 오류: " + (err.message || err));
  }
});
