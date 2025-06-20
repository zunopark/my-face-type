const qs = new URLSearchParams(location.search);
const id = qs.get("id");
const type = qs.get("type"); // base · wealth · marriage · job · love …

/* ───────────────────────── 1. IndexedDB 유틸 ────────────────────── */
let analysisDb = null;

async function openAnalysisDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("FaceAnalysisDB", 1);
    req.onsuccess = () => {
      analysisDb = req.result;
      res();
    };
    req.onerror = () => rej(req.error);
  });
}

async function getResultById(id) {
  return new Promise((res, rej) => {
    const tx = analysisDb.transaction(["results"], "readonly");
    const req = tx.objectStore("results").get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = (e) => rej(e);
  });
}

async function saveResultToDB(data) {
  return new Promise((res, rej) => {
    const tx = analysisDb.transaction(["results"], "readwrite");
    const req = tx.objectStore("results").put(data);
    req.onsuccess = () => res();
    req.onerror = (e) => rej(e);
  });
}

/* ───────────────────────── 2. 화면 렌더링 ───────────────────────── */
function renderImage(base64) {
  document.getElementById("face-image").src = base64;
  document.querySelector(".file-upload-content").style.display = "block";
  document.querySelector(".image-upload-wrap").style.display = "none";
}

const titleMap = {
  wealth: [
    "들어가며 – 관상 재물 분석의 의미",
    "타고난 부와 평생 모을 재산",
    "성향과 재물운의 강·약점",
    "돈이 붙는 적성과 환경",
    "자산을 키울 골든타임",
    "위기 징조와 예방책",
    "관상 개선 실천법",
    "관상가 양반의 인생 조언",
  ],

  marriage: [
    "들어가며 – 결혼 로드맵",
    "연애 성향·결혼관",
    "골든타임 & 만남 스폿",
    "이상적 배우자·끌어당김",
    "결혼 생활·갈등 키워드",
    "관상 개선·실천 체크",
  ],

  job: [
    "서문 – 직업·사명",
    "타고난 재능·역량",
    "맞춤 직종·환경",
    "성공 골든타임",
    "위험 요소와 대처",
    "장기 비전 제언",
  ],
  love: [
    "들어가며 – 운명 사랑 나침반",
    "총 연애 횟수 & 나의 사랑 사이클",
    "운명 상대는 지금 어느 동네에?",
    "사랑이 피어나는 계절·장소 & 개운 액션",
    "이상형 스펙 & 첫눈에 끌어당김 스킬",
    "강점·약점 체크 & 사랑 체력 보충법",
    "오래 가는 연애 루틴 & 갈등 해소 키",
  ],
};

function renderResultNormalized(obj, reportType) {
  const wrap = document.getElementById("label-container");

  /* ── 멀티 섹션(wealth·marriage·job·love 등) ── */
  if (obj.isMulti) {
    const titles = titleMap[reportType] || []; // 없으면 빈 배열

    const html = obj.details
      .map((sec, i) => {
        const h = titles[i] ? `📙 ${titles[i]}` : `📙 제${i + 1}장`;
        return `<h2 style="margin-top:24px">${h}</h2>\n${marked.parse(sec)}`;
      })
      .join("<hr/>");

    wrap.innerHTML = `<div class="result-detail">${html}</div>`;
    return;
  }

  /* ── 단일 요약형(base) ── */
  wrap.innerHTML = `
    <div class="result-summary" style="margin-bottom:16px">${marked.parse(
      obj.summary
    )}</div>
    <div class="result-detail">${marked.parse(obj.detail)}</div>
  `;
}

/* ─────────────── 3. 로딩 UI (기존 그대로, 변수만 남김) ────────────── */
let fakeProgress = 0,
  progressInterval = null,
  messageInterval = null;
const loadingMessages = [
  "얼굴을 분석하는 중입니다...",
  "전통 관상 데이터를 불러오는 중...",
  "당신의 운세를 조심스레 살펴보는 중...",
  "보고서 문장을 정리하는 중입니다...",
  "조금만 기다려 주세요, 마무리 중입니다...",
];

function renderLoading() {
  document.getElementById("label-container").innerHTML = `
    <div class="loading-box dark-mode">
      <div id="loading-message" class="loading-text">보고서를 생성 중입니다...</div>
      <div class="progress-bar-container"><div id="progress-bar" class="progress-bar-fill" style="width:0%"></div></div>
    </div>`;
  const bar = document.getElementById("progress-bar");
  const msg = document.getElementById("loading-message");

  fakeProgress = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (fakeProgress < 94) {
      fakeProgress += Math.random() * 1.2;
      bar.style.width = `${Math.min(fakeProgress, 94)}%`;
    }
  }, 300);

  let idx = 0;
  clearInterval(messageInterval);
  messageInterval = setInterval(() => {
    idx = (idx + 1) % loadingMessages.length;
    msg.textContent = loadingMessages[idx];
  }, 3000);
}

function showError(msg) {
  document.getElementById(
    "label-container"
  ).innerHTML = `<div style="color:red; padding:24px; white-space:pre-line;">${msg}</div>`;
}

/* ──────────────────── 4. 서버 통신 + 정규화 ────────────────────── */
function normalizeServerData(raw) {
  // 1) summary/detail 있는 경우 → 단일형
  if (raw.summary && raw.detail) {
    return { isMulti: false, summary: raw.summary, detail: raw.detail };
  }
  // 2) detail1~n 형태 → 멀티형
  const details = Object.keys(raw)
    .filter((k) => k.startsWith("detail"))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .map((k) => raw[k]);

  if (details.length) return { isMulti: true, details };

  throw new Error("서버 응답 형식을 해석할 수 없습니다.");
}

async function requestReportFromServer(type, features) {
  const url = `https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/${type}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature: features }),
  });
  if (!res.ok) throw new Error(`서버 오류: ${await res.text()}`);

  const raw = await res.json();
  return normalizeServerData(raw);
}

/* ───────────────────── 5. 메인 플로우 ─────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  if (!id || !type) {
    showError("❌ URL에 id 또는 type이 없습니다.");
    mixpanel.track("report_result_error", {
      id: id || null,
      type: type || null,
      error_message: "Missing ID or type",
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
        error_message: "No result in DB",
      });
      return;
    }

    if (result.imageBase64) renderImage(result.imageBase64);

    /* ── 5-1. 이미 분석 완료된 경우 ────────────────────────────── */
    if (result.analyzed && result.normalized) {
      renderResultNormalized(result.normalized, type);
      mixpanel.track("report_result_loaded_from_db", {
        id,
        type,
        source: "indexeddb",
      });
      return;
    }

    /* ── 5-2. 미분석 → 서버 요청 ──────────────────────────────── */
    if (!result.features) {
      showError("❌ features 필드가 없습니다.");
      mixpanel.track("report_result_error", {
        id,
        type,
        error_message: "Missing features",
      });
      return;
    }

    renderLoading();
    mixpanel.track("report_result_requested_from_server", {
      id,
      type,
      has_features: true,
    });

    const t0 = Date.now();
    const normalized = await requestReportFromServer(type, result.features);
    const duration = Date.now() - t0;

    /* 저장 & 렌더 */
    result.normalized = normalized; // <-- 핵심
    result.analyzed = true;
    await saveResultToDB(result);

    clearInterval(progressInterval);
    document.getElementById("progress-bar").style.width = "100%";

    setTimeout(() => {
      renderResultNormalized(normalized, type);

      mixpanel.track("report_result_generated", {
        id,
        type,
        analyzed: true,
        duration_ms: duration,
      });

      // ✅ 분석 결과 렌더링 완료 이후에만 confirm 창 띄우기
      if (!sessionStorage.getItem("reportSavePromptShown")) {
        setTimeout(() => {
          alert(
            "AI 관상가 양반은 개인정보 보호를 위해\n사진과 리포트 내용을 일절 저장하지 않습니다.\n\n🧾 오른쪽 상단 [보고서 저장] 버튼을 눌러\n보고서를 회원님 기기에 보관해 두시길 바랍니다."
          );
          sessionStorage.setItem("reportSavePromptShown", "true");
        }, 600); // 결과 렌더링 후 약간의 여유
      }
    }, 400);
  } catch (err) {
    showError("❌ 실행 중 오류: " + (err.message || err));
    mixpanel.track("report_result_error", {
      id,
      type,
      error_message: err.message || "Unknown",
    });
  }
});
