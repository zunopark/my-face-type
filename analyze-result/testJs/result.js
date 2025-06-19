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
let messageInterval = null;

const loadingMessages = [
  "얼굴을 분석하는 중입니다...",
  "전통 관상 데이터를 불러오는 중...",
  "당신의 운세를 조심스레 살펴보는 중...",
  "보고서 문장을 정리하는 중입니다...",
  "조금만 기다려 주세요, 마무리 중입니다...",
];

function renderLoading() {
  const container = document.getElementById("label-container");
  container.innerHTML = `
    <div class="loading-box dark-mode">
      <div id="loading-message" class="loading-text">보고서를 생성 중입니다...</div>
      <div class="progress-bar-container">
        <div id="progress-bar" class="progress-bar-fill" style="width: 0%;"></div>
      </div>
    </div>
  `;

  const bar = document.getElementById("progress-bar");
  const messageEl = document.getElementById("loading-message");

  // 1. 프로그레스 느리게
  fakeProgress = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (fakeProgress < 94) {
      fakeProgress += Math.random() * 2.5; // 천천히
      bar.style.width = `${Math.min(fakeProgress, 94)}%`;
    }
  }, 300);

  // 2. 메시지 교체
  let messageIndex = 0;
  clearInterval(messageInterval);
  messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % loadingMessages.length;
    messageEl.textContent = loadingMessages[messageIndex];
  }, 3000);
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
    mixpanel.track("report_result_error", {
      id: id || null,
      type: type || null,
      error_message: "Missing ID or type in URL",
    });
    return;
  }

  try {
    await openAnalysisDB();
    const result = await getResultById(id);

    if (!result) {
      showError("❌ 분석 결과를 찾을 수 없습니다.");
      mixpanel.track("report_result_error", {
        id,
        type,
        error_message: "No result found in IndexedDB",
      });
      return;
    }

    if (result.imageBase64) renderImage(result.imageBase64);

    if (result.analyzed === true) {
      renderResult({ summary: result.summary, detail: result.detail });

      mixpanel.track("report_result_loaded_from_db", {
        id,
        type,
        source: "indexeddb",
      });
      return;
    }

    if (!result.features) {
      showError("❌ features 필드가 없습니다.");
      mixpanel.track("report_result_error", {
        id,
        type,
        error_message: "Missing features in result",
      });
      return;
    }

    renderLoading();

    mixpanel.track("report_result_requested_from_server", {
      id,
      type,
      has_features: true,
    });

    const start = Date.now();

    const { summary: newSummary, detail: newDetail } =
      await requestReportFromServer(type, result.features);

    const duration = Date.now() - start;

    result.summary = newSummary;
    result.detail = newDetail;
    result.analyzed = true;

    await saveResultToDB(result);
    clearInterval(progressInterval);
    document.getElementById("progress-bar").style.width = "100%";

    setTimeout(() => {
      renderResult({ summary: newSummary, detail: newDetail });

      mixpanel.track("report_result_generated", {
        id,
        type,
        analyzed: true,
        duration_ms: duration,
      });
    }, 400);
  } catch (err) {
    showError("❌ 실행 중 오류: " + (err.message || err));

    mixpanel.track("report_result_error", {
      id,
      type,
      error_message: err.message || "Unknown error",
    });
  }
});
