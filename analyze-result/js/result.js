/* ========================================================
   analyze-result.js  |  reports skeleton + paid 플래그
   ======================================================== */

/* ───────────── 0. URL 파라미터 ───────────── */
const qs = new URLSearchParams(location.search);
const id = qs.get("id"); // 사진 UUID
const type = qs.get("type"); // base · wealth · love · marriage

/* ───────────── HTML 이스케이프 ───────────── */
function escapeHTML(str = "") {
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}

/* ───────────── 1. IndexedDB 유틸 ───────────── */
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
const getResultById = (id) =>
  new Promise((res, rej) => {
    const tx = analysisDb.transaction("results");
    tx.objectStore("results").get(id).onsuccess = (e) => res(e.target.result);
    tx.onerror = (e) => rej(e);
  });
const saveResultToDB = (data) =>
  new Promise((res, rej) => {
    const tx = analysisDb.transaction("results", "readwrite");
    tx.objectStore("results").put(data).onsuccess = res;
    tx.onerror = rej;
  });

/* ───────────── 2-A. skeleton & helpers ───────────── */
const ALL_TYPES = ["base", "wealth", "love", "marriage", "career"];
function ensureSkeleton(rec) {
  let changed = false;
  if (!rec.reports) {
    rec.reports = {};
    changed = true;
  }
  for (const t of ALL_TYPES)
    if (!rec.reports[t]) {
      rec.reports[t] = { paid: false, data: null };
      changed = true;
    }
  return changed;
}
const isGenerated = (r, t) => !!r.reports?.[t]?.data;
const isPaid = (r, t) => !!r.reports?.[t]?.paid;
const getReport = (r, t) => r.reports[t].data;

/* paid 값이 이미 있으면 **보존** */
async function saveReport(rec, t, normalized, { paid } = {}) {
  // paid 옵셔널
  if (!rec.reports) rec.reports = {};
  if (!rec.reports[t]) rec.reports[t] = { paid: !!paid, data: null };
  else if (paid !== undefined) rec.reports[t].paid = paid; // ← 덮어쓰기 조건
  rec.reports[t].data = normalized;
  await saveResultToDB(rec);
}

/* ───────────── 2-B. 화면 렌더링 ───────────── */
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
  love: [
    "들어가며 – 운명 사랑 나침반",
    "총 연애 횟수 & 나의 사랑 사이클",
    "운명 상대는 지금 어느 동네에?",
    "사랑이 피어나는 계절·장소 & 개운 액션",
    "이상형 스펙 & 첫눈에 끌어당김 스킬",
    "강점·약점 체크 & 사랑 체력 보충법",
    "오래 가는 연애 루틴 & 갈등 해소 키",
  ],
  career: [
    "들어가며 – 커리어 나침반 지도",
    "적성과 장단점 – 천직 레이더",
    "직업 운 곡선 & 전환점 타임라인",
    "강점 극대화 – 퍼스널 브랜딩 레버",
    "직장 vs 창업 – 베스트 시나리오",
    "행운의 업무 환경 – 공간·도시·사람",
    "위기 대비 체크 – 리스크 레이더",
    "관상 개선 실천법 – 아침·저녁 루틴",
  ],
};

function renderResultNormalized(obj, reportType) {
  /* Markdown → HTML 최소 파서 */
  function simpleMD(src = "") {
    src = src.replace(
      /```([\s\S]*?)```/g,
      (_, c) =>
        `<pre class="codeblock"><code>${escapeHTML(c)
          /* 스페이스 → &nbsp; 로 100% 보존 */
          .replace(/ /g, "&nbsp;")}</code></pre>`
    );
    src = src.replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`);
    src = src
      .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
      .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
      .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
      .replace(
        /\[([^\]]+?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      )
      .replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>")
      .replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
      .replace(/(<\/ul>\s*)<ul>/g, "")
      .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
      .replace(
        /^(?!<h\d>|<ul>|<ol>|<li>|<pre>|<blockquote>|<img|<p>|<\/?ul>|<\/?ol>|<\/?li>|<\/?pre>|<\/?blockquote>|<\/?h\d>)(.+)$/gm,
        "<p>$1</p>"
      )
      .replace(/(<\/ol>\s*)<ol>/g, "");
    return `<p>${src}</p>`;
  }

  const wrap = document.getElementById("label-container");

  /* ───────── isMulti = true: details 분리 렌더 ───────── */
  if (obj.isMulti) {
    const titles = titleMap[reportType] || [];
    wrap.innerHTML = obj.details
      .map((sec, i) => {
        const heading = titles[i] ? `📙 ${titles[i]}` : `📙 제${i + 1}장`;
        return `
          <section class="report-section" style="margin-top:24px">
            <h2>${heading}</h2>
            <div class="report-body">${simpleMD(sec)}</div>
          </section>`;
      })
      .join(""); // ← 합칠 때 <hr/> 필요 X
    return;
  }

  /* ───────── isMulti = false: 기존 요약·본문 방식 ───────── */
  wrap.innerHTML = `
    <div class="result-summary" style="margin-bottom:16px">
      ${simpleMD(obj.summary)}
    </div>
    <div class="result-detail">
      ${simpleMD(obj.detail)}
    </div>`;
}

function renderPaywall() {
  document.getElementById("label-container").innerHTML = `
    <div style="text-align:center;padding:24px">
      <h2 style="margin-bottom:12px">🔒 결제 후 열람 가능합니다</h2>
      <button id="goto-pay" style="padding:12px 24px;font-size:16px;border-radius:8px;background:#4f46e5;color:#fff;border:none;cursor:pointer">
        보고서 결제하기
      </button>
    </div>`;
  document.getElementById("goto-pay").onclick = () => {
    mixpanel.track("결과 화면에서 결제 클릭", { id, type });
    location.href = `/pay.html?id=${id}&type=${type}`; // 결제 페이지 예시
  };
}

/* ───────────── 3. 로딩 UI ───────────── */
let fakeProgress = 0,
  progressInterval = null,
  messageInterval = null;
const loadingMessages = [
  "얼굴 특징을 분석하는 중입니다…",
  "전통 관상 데이터를 불러오는 중…",
  "당신의 관상을 살펴보는 중…",
  "보고서 문장을 작성하는 중…",
  "조금만 기다려 주세요, 분석 진행중...",
];
function renderLoading() {
  document.getElementById("label-container").innerHTML = `
    <div class="loading-box dark-mode">
      <div id="loading-message" class="loading-text">보고서를 생성 중입니다…</div>
      <div class="progress-bar-container"><div id="progress-bar" class="progress-bar-fill" style="width:0%"></div></div>
    </div>`;
  const bar = document.getElementById("progress-bar");
  const msg = document.getElementById("loading-message");

  fakeProgress = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (fakeProgress < 94) {
      fakeProgress += Math.random() * 0.6;
      bar.style.width = `${Math.min(fakeProgress, 94)}%`;
    }
  }, 300);

  let idx = 0;
  clearInterval(messageInterval);
  messageInterval = setInterval(() => {
    idx = (idx + 1) % loadingMessages.length;
    msg.textContent = loadingMessages[idx];
  }, 6000);
}
function showError(msg) {
  document.getElementById(
    "label-container"
  ).innerHTML = `<div style="color:red;padding:24px;white-space:pre-line;">${msg}</div>`;
}

/* ───────────── 4. 서버 통신 + 정규화 ───────────── */
function normalizeServerData(raw) {
  if (raw.summary && raw.detail)
    return { isMulti: false, summary: raw.summary, detail: raw.detail };
  const details = Object.keys(raw)
    .filter((k) => k.startsWith("detail"))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
    .map((k) => raw[k]);
  if (details.length) return { isMulti: true, details };
  throw new Error("서버 응답 형식을 해석할 수 없습니다.");
}
async function requestReportFromServer(reportType, features) {
  const url = `https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/${reportType}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature: features }),
  });
  if (!res.ok) throw new Error(`서버 오류: ${await res.text()}`);
  return normalizeServerData(await res.json());
}

/* ───────────── 5. 메인 플로우 ───────────── */
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

    if (ensureSkeleton(result)) await saveResultToDB(result);

    if (result.imageBase64) renderImage(result.imageBase64);

    /* 레거시 → reports.base 마이그레이션 */
    if (result.analyzed && result.normalized) {
      await saveReport(result, "base", result.normalized, { paid: true });
      delete result.analyzed;
      delete result.normalized;
    }

    /* ── BASE : 항상 무료 ─────────────────── */
    if (type === "base") {
      if (isGenerated(result, "base")) {
        renderResultNormalized(getReport(result, "base"), "base");
        return;
      }
      if (result.summary && result.detail) {
        const normalized = {
          isMulti: false,
          summary: result.summary,
          detail: result.detail,
        };
        await saveReport(result, "base", normalized, { paid: true });
        renderResultNormalized(normalized, "base");
        return;
      }
      /* summary/detail 없을 확률 거의 없지만, 그 땐 서버 호출로 이어짐 */
    }

    /* ── 타 타입 (wealth·love·marriage) ───────────────────────── */

    /* 1) 이미 생성됨 */
    if (isGenerated(result, type)) {
      if (!isPaid(result, type))
        renderResultNormalized(getReport(result, type), type);
      else renderPaywall();
      return;
    }

    /* 2) 아직 생성 안 됐는데 결제도 안 됨 → 분석 건너뛰고 Paywall */
    if (!isPaid(result, type)) {
      renderPaywall();
      return;
    }

    /* 3) 결제는 완료(paid=true) BUT 데이터 없음 → 이제 서버 분석 */
    if (!result.features) {
      showError("❌ features 필드가 없습니다.");
      return;
    }

    renderLoading();
    const normalized = await requestReportFromServer(type, result.features);

    await saveReport(result, type, normalized); // paid 그대로 유지 (true)

    clearInterval(progressInterval);
    document.getElementById("progress-bar").style.width = "100%";

    setTimeout(() => renderResultNormalized(normalized, type), 400);
  } catch (err) {
    showError("❌ 실행 중 오류: " + (err.message || err));
  }
});
