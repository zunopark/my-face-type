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
    <div class="result-summary" style="margin-bottom:16px">${marked.parse(
      summary
    )}</div>
    <div class="result-detail">${marked.parse(detail)}</div>
  `;
}

let fakeProgress = 0;
let progressInterval = null;

function renderLoading() {
  const container = document.getElementById("label-container");
  container.innerHTML = `
    <div class="loading-title"; style="text-align:center; font-size:18px; padding:40px;">
      리포트를 생성 중입니다. 잠시만 기다려주세요...<br/><br/>
      <div class="progress-bar-container">
        <div id="progress-bar" class="progress-bar-fill" style="width: 0%;"></div>
      </div>
    </div>
  `;

  const bar = document.getElementById("progress-bar");
  fakeProgress = 0;

  progressInterval = setInterval(() => {
    if (fakeProgress < 94) {
      fakeProgress += Math.random() * 2; // 자연스러운 증가
      bar.style.width = `${Math.min(fakeProgress, 94)}%`;
    }
  }, 120);
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

    // ✅ analyzed가 true면 바로 렌더
    if (result.analyzed === true) {
      renderResult({ summary: result.summary, detail: result.detail });
      return;
    }

    // ✅ features 없으면 분석 못 함
    if (!result.features) {
      showError("❌ features 필드가 없습니다.");
      return;
    }

    renderLoading();

    // ✅ 서버에 리포트 요청
    const { summary: newSummary, detail: newDetail } =
      await requestReportFromServer(type, result.features);

    result.summary = newSummary;
    result.detail = newDetail;
    result.analyzed = true; // ✅ 분석 완료 처리

    await saveResultToDB(result);
    clearInterval(progressInterval);
    document.getElementById("progress-bar").style.width = "100%";

    // 0.4초 후 결과 표시 (꽉 찬 느낌 주기)
    setTimeout(() => {
      renderResult({ summary: newSummary, detail: newDetail });
    }, 400);
  } catch (err) {
    showError("❌ 실행 중 오류: " + (err.message || err));
  }
});
